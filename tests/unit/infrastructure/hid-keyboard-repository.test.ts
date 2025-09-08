// Integration Tests for HIDKeyboardRepository
// Tests the infrastructure implementation of KeyboardRepository

import { HIDKeyboardRepository } from '@infrastructure/keyboard/HIDKeyboardRepository';
import { KeyboardId } from '@domain/value-objects/KeyboardId';
import { Keyboard } from '@domain/entities/Keyboard';
import { KeyboardConnectionState } from '@shared/types/keyboard.types';
import { DeviceChangeListener } from '@domain/repositories/KeyboardRepository';

// Mock node-hid module
jest.mock('node-hid');
const HID = require('node-hid');

describe('HIDKeyboardRepository Integration Tests', () => {
  let repository: HIDKeyboardRepository;
  
  beforeEach(() => {
    repository = new HIDKeyboardRepository(100); // 100ms polling for faster tests
    jest.clearAllMocks();
  });
  
  afterEach(async () => {
    await repository.stopDeviceMonitoring();
  });
  
  describe('Basic CRUD Operations', () => {
    test('should save and find keyboard by ID', async () => {
      // Arrange
      const keyboard = createMockKeyboard();
      
      // Act
      await repository.save(keyboard);
      const found = await repository.findById(keyboard.getId());
      
      // Assert
      expect(found).not.toBeNull();
      expect(found!.getId().equals(keyboard.getId())).toBe(true);
    });
    
    test('should return null for non-existent keyboard', async () => {
      // Arrange
      const nonExistentId = new KeyboardId('non-existent');
      
      // Act
      const found = await repository.findById(nonExistentId);
      
      // Assert
      expect(found).toBeNull();
    });
    
    test('should delete keyboard', async () => {
      // Arrange
      const keyboard = createMockKeyboard();
      await repository.save(keyboard);
      
      // Act
      await repository.delete(keyboard.getId());
      const found = await repository.findById(keyboard.getId());
      
      // Assert
      expect(found).toBeNull();
    });
    
    test('should check keyboard existence', async () => {
      // Arrange
      const keyboard = createMockKeyboard();
      
      // Act & Assert - Before saving
      expect(await repository.exists(keyboard.getId())).toBe(false);
      
      // Act - Save keyboard
      await repository.save(keyboard);
      
      // Assert - After saving
      expect(await repository.exists(keyboard.getId())).toBe(true);
    });
  });
  
  describe('Keyboard Detection from HID', () => {
    test('should find keyboards from HID devices', async () => {
      // Arrange - Mock HID.devices() to return keyboard devices
      HID.devices.mockReturnValue([
        {
          vendorId: 0x05ac,
          productId: 0x0267,
          path: '/dev/hidraw0',
          manufacturer: 'Apple Inc.',
          product: 'Magic Keyboard',
          usage: 6,
          usagePage: 1
        },
        {
          vendorId: 0x046d,
          productId: 0xc31c,
          path: '/dev/hidraw1',
          manufacturer: 'Logitech',
          product: 'Gaming Keyboard',
          usage: 6,
          usagePage: 1
        }
      ]);
      
      // Act
      const keyboards = await repository.findAll();
      
      // Assert
      expect(keyboards).toHaveLength(2);
      expect(keyboards[0].getManufacturer()).toBe('Apple Inc.');
      expect(keyboards[1].getManufacturer()).toBe('Logitech');
    });
    
    test('should filter only keyboard devices from HID', async () => {
      // Arrange - Mock HID.devices() with mixed device types
      HID.devices.mockReturnValue([
        {
          vendorId: 0x05ac,
          productId: 0x0267,
          path: '/dev/hidraw0',
          usage: 6,  // Keyboard
          usagePage: 1
        },
        {
          vendorId: 0x05ac,
          productId: 0x0268,
          path: '/dev/hidraw1',
          usage: 2,  // Mouse - should be filtered out
          usagePage: 1
        }
      ]);
      
      // Act
      const keyboards = await repository.findAll();
      
      // Assert
      expect(keyboards).toHaveLength(1);
      expect(keyboards[0].getDevicePath()).toBe('/dev/hidraw0');
    });
    
    test('should find keyboard by device path', async () => {
      // Arrange
      HID.devices.mockReturnValue([
        {
          vendorId: 0x05ac,
          productId: 0x0267,
          path: '/dev/hidraw0',
          manufacturer: 'Apple Inc.',
          product: 'Magic Keyboard',
          usage: 6,
          usagePage: 1
        }
      ]);
      
      // Act
      const keyboard = await repository.findByDevicePath('/dev/hidraw0');
      
      // Assert
      expect(keyboard).not.toBeNull();
      expect(keyboard!.getDevicePath()).toBe('/dev/hidraw0');
      expect(keyboard!.getManufacturer()).toBe('Apple Inc.');
    });
  });
  
  describe('Vendor and Product Filtering', () => {
    test('should find keyboards by vendor and product ID', async () => {
      // Arrange
      HID.devices.mockReturnValue([
        {
          vendorId: 0x05ac,
          productId: 0x0267,
          path: '/dev/hidraw0',
          usage: 6,
          usagePage: 1
        },
        {
          vendorId: 0x05ac,
          productId: 0x0267,
          path: '/dev/hidraw1',
          usage: 6,
          usagePage: 1
        },
        {
          vendorId: 0x046d,
          productId: 0xc31c,
          path: '/dev/hidraw2',
          usage: 6,
          usagePage: 1
        }
      ]);
      
      // Act
      const appleKeyboards = await repository.findByVendorAndProduct(0x05ac, 0x0267);
      
      // Assert
      expect(appleKeyboards).toHaveLength(2);
      appleKeyboards.forEach(keyboard => {
        expect(keyboard.getVendorId()).toBe(0x05ac);
        expect(keyboard.getProductId()).toBe(0x0267);
      });
    });
  });
  
  describe('Connected Keyboards Filtering', () => {
    test('should find only connected keyboards', async () => {
      // Arrange
      const connectedKeyboard = createMockKeyboard('connected');
      const disconnectedKeyboard = createMockKeyboard('disconnected');
      disconnectedKeyboard.updateConnectionState(KeyboardConnectionState.DISCONNECTED);
      
      await repository.save(connectedKeyboard);
      await repository.save(disconnectedKeyboard);
      
      // Mock HID to return empty (so only stored keyboards are considered)
      HID.devices.mockReturnValue([]);
      
      // Act
      const connectedKeyboards = await repository.findConnectedKeyboards();
      
      // Assert
      expect(connectedKeyboards).toHaveLength(1);
      expect(connectedKeyboards[0].getId().equals(connectedKeyboard.getId())).toBe(true);
    });
  });
  
  describe('Device Monitoring', () => {
    test('should start and stop monitoring', async () => {
      // Arrange
      HID.devices.mockReturnValue([]);
      
      // Act & Assert
      expect(repository.isMonitoring()).toBe(false);
      
      await repository.startDeviceMonitoring();
      expect(repository.isMonitoring()).toBe(true);
      
      await repository.stopDeviceMonitoring();
      expect(repository.isMonitoring()).toBe(false);
    });
    
    test('should throw error when starting monitoring twice', async () => {
      // Arrange
      HID.devices.mockReturnValue([]);
      await repository.startDeviceMonitoring();
      
      // Act & Assert
      await expect(repository.startDeviceMonitoring())
        .rejects.toThrow('Device monitoring is already active');
        
      // Cleanup
      await repository.stopDeviceMonitoring();
    });
  });
  
  describe('Error Handling', () => {
    test('should handle HID.devices() errors gracefully', async () => {
      // Arrange
      HID.devices.mockImplementation(() => {
        throw new Error('HID access denied');
      });
      
      // Act
      const keyboards = await repository.findAll();
      
      // Assert - Should return empty array instead of throwing
      expect(keyboards).toHaveLength(0);
    });
    
    test('should return null when device info retrieval fails', async () => {
      // Arrange
      HID.devices.mockImplementation(() => {
        throw new Error('HID access denied');
      });
      
      // Act
      const deviceInfo = await repository.getDeviceInfo('/dev/hidraw0');
      
      // Assert
      expect(deviceInfo).toBeNull();
    });
  });
  
  describe('Diagnostic Methods', () => {
    test('should return HID device count', async () => {
      // Arrange
      HID.devices.mockReturnValue([
        { path: '/dev/hidraw0' },
        { path: '/dev/hidraw1' }
      ]);
      
      // Act
      const count = await repository.getHIDDeviceCount();
      
      // Assert
      expect(count).toBe(2);
    });
    
    test('should return keyboard device count', async () => {
      // Arrange
      HID.devices.mockReturnValue([
        { path: '/dev/hidraw0', usage: 6, usagePage: 1 },  // Keyboard
        { path: '/dev/hidraw1', usage: 2, usagePage: 1 },  // Mouse
        { path: '/dev/hidraw2', usage: 6, usagePage: 1 }   // Keyboard
      ]);
      
      // Act
      const count = await repository.getKeyboardDeviceCount();
      
      // Assert
      expect(count).toBe(2);
    });
  });
});

// Mock device change listener for testing
class MockDeviceChangeListener implements DeviceChangeListener {
  public connectedKeyboards: Keyboard[] = [];
  public disconnectedKeyboardIds: KeyboardId[] = [];
  
  async onKeyboardConnected(keyboard: Keyboard): Promise<void> {
    this.connectedKeyboards.push(keyboard);
  }
  
  async onKeyboardDisconnected(keyboardId: KeyboardId): Promise<void> {
    this.disconnectedKeyboardIds.push(keyboardId);
  }
}

// Test helper function
function createMockKeyboard(suffix: string = 'test'): Keyboard {
  return new Keyboard({
    id: new KeyboardId(`kb-${suffix}`),
    devicePath: `/dev/hidraw-${suffix}`,
    vendorId: 0x1234,
    productId: 0x5678,
    manufacturer: 'Test Manufacturer',
    product: 'Test Keyboard',
    connectionState: KeyboardConnectionState.CONNECTED
  });
}