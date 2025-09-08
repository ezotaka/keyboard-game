// KeyboardManagementService Application Service Tests
// Tests the application layer orchestration of keyboard management

import { KeyboardManagementService } from '@application/services/KeyboardManagementService';
import { KeyboardDetectionService } from '@domain/services/KeyboardDetectionService';
import { KeyboardRepository } from '@domain/repositories/KeyboardRepository';
import { Keyboard } from '@domain/entities/Keyboard';
import { KeyboardId } from '@domain/value-objects/KeyboardId';
import { KeyboardConnectionState } from '@shared/types/keyboard.types';

// Mock repository for testing
class MockKeyboardRepository implements KeyboardRepository {
  private keyboards: Map<string, Keyboard> = new Map();
  private monitoring = false;
  
  async save(keyboard: Keyboard): Promise<void> {
    this.keyboards.set(keyboard.getId().getValue(), keyboard);
  }
  
  async findById(id: KeyboardId): Promise<Keyboard | null> {
    return this.keyboards.get(id.getValue()) || null;
  }
  
  async findAll(): Promise<Keyboard[]> {
    return Array.from(this.keyboards.values());
  }
  
  async delete(id: KeyboardId): Promise<void> {
    this.keyboards.delete(id.getValue());
  }
  
  async exists(id: KeyboardId): Promise<boolean> {
    return this.keyboards.has(id.getValue());
  }
  
  async findByDevicePath(devicePath: string): Promise<Keyboard | null> {
    return Array.from(this.keyboards.values())
      .find(kb => kb.getDevicePath() === devicePath) || null;
  }
  
  async findConnectedKeyboards(): Promise<Keyboard[]> {
    return Array.from(this.keyboards.values())
      .filter(kb => kb.isConnected());
  }
  
  async findByVendorAndProduct(vendorId: number, productId: number): Promise<Keyboard[]> {
    return Array.from(this.keyboards.values())
      .filter(kb => kb.getVendorId() === vendorId && kb.getProductId() === productId);
  }
  
  async startDeviceMonitoring(): Promise<void> {
    this.monitoring = true;
  }
  
  async stopDeviceMonitoring(): Promise<void> {
    this.monitoring = false;
  }
  
  isMonitoring(): boolean {
    return this.monitoring;
  }
}

describe('KeyboardManagementService', () => {
  let mockRepository: MockKeyboardRepository;
  let keyboardDetectionService: KeyboardDetectionService;
  let keyboardManagementService: KeyboardManagementService;
  
  beforeEach(() => {
    mockRepository = new MockKeyboardRepository();
    keyboardDetectionService = new KeyboardDetectionService(mockRepository);
    keyboardManagementService = new KeyboardManagementService(keyboardDetectionService);
  });
  
  describe('Keyboard Discovery', () => {
    test('should discover available keyboards', async () => {
      // Arrange
      const keyboard = createMockKeyboard('kb-001', '/dev/hidraw0');
      await mockRepository.save(keyboard);
      
      // Act
      const keyboardInfos = await keyboardManagementService.discoverAvailableKeyboards();
      
      // Assert
      expect(keyboardInfos).toHaveLength(1);
      expect(keyboardInfos[0].id).toBe('kb-001');
      expect(keyboardInfos[0].devicePath).toBe('/dev/hidraw0');
      expect(keyboardInfos[0].isConnected).toBe(true);
    });
    
    test('should return empty array when no keyboards available', async () => {
      // Act
      const keyboardInfos = await keyboardManagementService.discoverAvailableKeyboards();
      
      // Assert
      expect(keyboardInfos).toHaveLength(0);
    });
    
    test('should get all registered keyboards', async () => {
      // Arrange
      const connectedKeyboard = createMockKeyboard('kb-connected', '/dev/hidraw0');
      const disconnectedKeyboard = createMockKeyboard('kb-disconnected', '/dev/hidraw1');
      disconnectedKeyboard.updateConnectionState(KeyboardConnectionState.DISCONNECTED);
      
      await mockRepository.save(connectedKeyboard);
      await mockRepository.save(disconnectedKeyboard);
      
      // Act
      const keyboardInfos = await keyboardManagementService.getAllRegisteredKeyboards();
      
      // Assert
      expect(keyboardInfos).toHaveLength(2);
      expect(keyboardInfos.find(kb => kb.id === 'kb-connected')?.isConnected).toBe(true);
      expect(keyboardInfos.find(kb => kb.id === 'kb-disconnected')?.isConnected).toBe(false);
    });
  });
  
  describe('Keyboard Lookup', () => {
    test('should find keyboard by device path', async () => {
      // Arrange
      const keyboard = createMockKeyboard('kb-lookup', '/dev/hidraw5');
      await mockRepository.save(keyboard);
      
      // Act
      const found = await keyboardManagementService.findKeyboardByPath('/dev/hidraw5');
      
      // Assert
      expect(found).not.toBeNull();
      expect(found!.id).toBe('kb-lookup');
      expect(found!.devicePath).toBe('/dev/hidraw5');
    });
    
    test('should return null for non-existent device path', async () => {
      // Act
      const found = await keyboardManagementService.findKeyboardByPath('/dev/nonexistent');
      
      // Assert
      expect(found).toBeNull();
    });
    
    test('should find keyboard by ID', async () => {
      // Arrange
      const keyboard = createMockKeyboard('kb-find-by-id', '/dev/hidraw6');
      await mockRepository.save(keyboard);
      
      // Act
      const found = await keyboardManagementService.findKeyboardById('kb-find-by-id');
      
      // Assert
      expect(found).not.toBeNull();
      expect(found!.id).toBe('kb-find-by-id');
    });
    
    test('should find keyboards by vendor ID', async () => {
      // Arrange
      const apple1 = createMockKeyboardWithVendor('apple1', 0x05ac, 0x0267);
      const apple2 = createMockKeyboardWithVendor('apple2', 0x05ac, 0x0268);
      const logitech = createMockKeyboardWithVendor('logitech', 0x046d, 0xc31c);
      
      await mockRepository.save(apple1);
      await mockRepository.save(apple2);
      await mockRepository.save(logitech);
      
      // Act
      const appleKeyboards = await keyboardManagementService.findKeyboardsByVendor(0x05ac);
      
      // Assert
      expect(appleKeyboards).toHaveLength(2);
      appleKeyboards.forEach(kb => {
        expect(kb.vendorId).toBe(0x05ac);
      });
    });
    
    test('should find keyboards by vendor and product ID', async () => {
      // Arrange
      const apple1 = createMockKeyboardWithVendor('apple1', 0x05ac, 0x0267);
      const apple2 = createMockKeyboardWithVendor('apple2', 0x05ac, 0x0268);
      
      await mockRepository.save(apple1);
      await mockRepository.save(apple2);
      
      // Act
      const specificKeyboards = await keyboardManagementService.findKeyboardsByVendor(0x05ac, 0x0267);
      
      // Assert
      expect(specificKeyboards).toHaveLength(1);
      expect(specificKeyboards[0].id).toBe('apple1');
    });
  });
  
  describe('Keyboard Management', () => {
    test('should register new keyboard', async () => {
      // Act
      const keyboardInfo = await keyboardManagementService.registerNewKeyboard(
        '/dev/hidraw10',
        0x1234,
        0x5678,
        'Test Manufacturer',
        'Test Keyboard'
      );
      
      // Assert
      expect(keyboardInfo.devicePath).toBe('/dev/hidraw10');
      expect(keyboardInfo.manufacturer).toBe('Test Manufacturer');
      expect(keyboardInfo.product).toBe('Test Keyboard');
      expect(keyboardInfo.isConnected).toBe(true);
      
      // Verify it's actually saved
      const found = await keyboardManagementService.findKeyboardByPath('/dev/hidraw10');
      expect(found).not.toBeNull();
    });
    
    test('should unregister keyboard', async () => {
      // Arrange
      const keyboard = createMockKeyboard('kb-unregister', '/dev/hidraw11');
      await mockRepository.save(keyboard);
      
      // Act
      await keyboardManagementService.unregisterKeyboard('kb-unregister');
      
      // Assert
      const found = await keyboardManagementService.findKeyboardById('kb-unregister');
      expect(found).toBeNull();
    });
  });
  
  describe('Input Tracking', () => {
    test('should record keyboard input', async () => {
      // Arrange
      const keyboard = createMockKeyboard('kb-input', '/dev/hidraw12');
      await mockRepository.save(keyboard);
      const timestamp = Date.now();
      
      // Act
      await keyboardManagementService.recordKeyboardInput('kb-input', timestamp);
      
      // Assert
      const updated = await keyboardManagementService.findKeyboardById('kb-input');
      expect(updated!.lastInputTimestamp).toBe(timestamp);
    });
    
    test('should record input with current timestamp when not provided', async () => {
      // Arrange
      const keyboard = createMockKeyboard('kb-input-auto', '/dev/hidraw13');
      await mockRepository.save(keyboard);
      const beforeTime = Date.now();
      
      // Act
      await keyboardManagementService.recordKeyboardInput('kb-input-auto');
      
      const afterTime = Date.now();
      
      // Assert
      const updated = await keyboardManagementService.findKeyboardById('kb-input-auto');
      expect(updated!.lastInputTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(updated!.lastInputTimestamp).toBeLessThanOrEqual(afterTime);
    });
  });
  
  describe('Monitoring', () => {
    test('should start and stop monitoring', async () => {
      // Act & Assert
      expect(keyboardManagementService.isMonitoring()).toBe(false);
      
      await keyboardManagementService.startKeyboardMonitoring();
      expect(keyboardManagementService.isMonitoring()).toBe(true);
      
      await keyboardManagementService.stopKeyboardMonitoring();
      expect(keyboardManagementService.isMonitoring()).toBe(false);
    });
  });
  
  describe('Statistics', () => {
    test('should provide keyboard statistics', async () => {
      // Arrange
      const apple1 = createMockKeyboardWithVendor('apple1', 0x05ac, 0x0267);
      const apple2 = createMockKeyboardWithVendor('apple2', 0x05ac, 0x0268);
      const logitech = createMockKeyboardWithVendor('logitech', 0x046d, 0xc31c);
      logitech.updateConnectionState(KeyboardConnectionState.DISCONNECTED);
      
      await mockRepository.save(apple1);
      await mockRepository.save(apple2);
      await mockRepository.save(logitech);
      
      // Act
      const stats = await keyboardManagementService.getKeyboardStatistics();
      
      // Assert
      expect(stats.totalKeyboards).toBe(3);
      expect(stats.connectedKeyboards).toBe(2);
      expect(stats.keyboardsByVendor.get(0x05ac)).toBe(2);
      expect(stats.keyboardsByVendor.get(0x046d)).toBe(1);
      expect(typeof stats.averageInputsPerKeyboard).toBe('number');
    });
  });
  
  describe('Validation', () => {
    test('should check if keyboard is registered', async () => {
      // Arrange
      const keyboard = createMockKeyboard('kb-validation', '/dev/hidraw14');
      
      // Act & Assert - Before registration
      expect(await keyboardManagementService.isKeyboardRegistered('kb-validation')).toBe(false);
      
      // Register keyboard
      await mockRepository.save(keyboard);
      
      // Act & Assert - After registration
      expect(await keyboardManagementService.isKeyboardRegistered('kb-validation')).toBe(true);
    });
    
    test('should check if device path is available', async () => {
      // Arrange
      const keyboard = createMockKeyboard('kb-path-check', '/dev/hidraw15');
      
      // Act & Assert - Before registration
      expect(await keyboardManagementService.isDevicePathAvailable('/dev/hidraw15')).toBe(true);
      
      // Register keyboard
      await mockRepository.save(keyboard);
      
      // Act & Assert - After registration
      expect(await keyboardManagementService.isDevicePathAvailable('/dev/hidraw15')).toBe(false);
    });
  });
});

// Test helper functions
function createMockKeyboard(id: string, devicePath: string): Keyboard {
  return new Keyboard({
    id: new KeyboardId(id),
    devicePath,
    vendorId: 0x1234,
    productId: 0x5678,
    manufacturer: 'Test Manufacturer',
    product: 'Test Keyboard',
    connectionState: KeyboardConnectionState.CONNECTED
  });
}

function createMockKeyboardWithVendor(id: string, vendorId: number, productId: number): Keyboard {
  return new Keyboard({
    id: new KeyboardId(id),
    devicePath: `/dev/hidraw-${id}`,
    vendorId,
    productId,
    manufacturer: 'Test Manufacturer',
    product: 'Test Keyboard',
    connectionState: KeyboardConnectionState.CONNECTED
  });
}