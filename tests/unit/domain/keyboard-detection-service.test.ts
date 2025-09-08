// TDD: KeyboardDetectionService Domain Service Tests
// Red フェーズ: ドメインサービスとしてのKeyboardDetectionServiceのテスト

import { KeyboardDetectionService } from '@domain/services/KeyboardDetectionService';
import { KeyboardRepository, DeviceChangeListener } from '@domain/repositories/KeyboardRepository';
import { Keyboard } from '@domain/entities/Keyboard';
import { KeyboardId } from '@domain/value-objects/KeyboardId';
import { KeyboardConnectionState } from '@shared/types/keyboard.types';

// Mock implementations for testing
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

describe('KeyboardDetectionService Domain Service', () => {
  let keyboardRepository: MockKeyboardRepository;
  let keyboardDetectionService: KeyboardDetectionService;
  
  beforeEach(() => {
    keyboardRepository = new MockKeyboardRepository();
    keyboardDetectionService = new KeyboardDetectionService(keyboardRepository);
  });
  
  describe('Keyboard Detection', () => {
    test('should detect and register new keyboards', async () => {
      // Arrange
      const mockKeyboard = createMockKeyboard('kb-001', '/dev/hidraw0');
      await keyboardRepository.save(mockKeyboard);
      
      // Act
      const detectedKeyboards = await keyboardDetectionService.detectAvailableKeyboards();
      
      // Assert
      expect(detectedKeyboards).toHaveLength(1);
      expect(detectedKeyboards[0].getId().getValue()).toBe('kb-001');
    });
    
    test('should return empty array when no keyboards detected', async () => {
      // Act
      const detectedKeyboards = await keyboardDetectionService.detectAvailableKeyboards();
      
      // Assert
      expect(detectedKeyboards).toHaveLength(0);
    });
    
    test('should only return connected keyboards', async () => {
      // Arrange
      const connectedKeyboard = createMockKeyboard('kb-connected', '/dev/hidraw0');
      const disconnectedKeyboard = createMockKeyboard('kb-disconnected', '/dev/hidraw1');
      disconnectedKeyboard.updateConnectionState(KeyboardConnectionState.DISCONNECTED);
      
      await keyboardRepository.save(connectedKeyboard);
      await keyboardRepository.save(disconnectedKeyboard);
      
      // Act
      const detectedKeyboards = await keyboardDetectionService.detectAvailableKeyboards();
      
      // Assert
      expect(detectedKeyboards).toHaveLength(1);
      expect(detectedKeyboards[0].getId().getValue()).toBe('kb-connected');
    });
  });
  
  describe('Device Monitoring', () => {
    test('should start device monitoring through repository', async () => {
      // Act
      await keyboardDetectionService.startMonitoring();
      
      // Assert
      expect(keyboardRepository.isMonitoring()).toBe(true);
    });
    
    test('should stop device monitoring through repository', async () => {
      // Arrange
      await keyboardDetectionService.startMonitoring();
      
      // Act
      await keyboardDetectionService.stopMonitoring();
      
      // Assert
      expect(keyboardRepository.isMonitoring()).toBe(false);
    });
    
    test('should throw error when starting monitoring twice', async () => {
      // Arrange
      await keyboardDetectionService.startMonitoring();
      
      // Act & Assert
      await expect(keyboardDetectionService.startMonitoring())
        .rejects.toThrow('Device monitoring is already active');
    });
    
    test('should handle stop monitoring when not started', async () => {
      // Act & Assert - Should not throw
      await expect(keyboardDetectionService.stopMonitoring())
        .resolves.not.toThrow();
    });
  });
  
  describe('Keyboard Registration', () => {
    test('should register newly detected keyboard', async () => {
      // Arrange
      const keyboard = createMockKeyboard('kb-new', '/dev/hidraw2');
      
      // Act
      await keyboardDetectionService.registerKeyboard(keyboard);
      
      // Assert
      const saved = await keyboardRepository.findById(keyboard.getId());
      expect(saved).not.toBeNull();
      expect(saved!.getId().getValue()).toBe('kb-new');
    });
    
    test('should update existing keyboard state', async () => {
      // Arrange
      const keyboard = createMockKeyboard('kb-existing', '/dev/hidraw3');
      await keyboardRepository.save(keyboard);
      
      // Modify keyboard state
      keyboard.updateConnectionState(KeyboardConnectionState.DISCONNECTED);
      
      // Act
      await keyboardDetectionService.registerKeyboard(keyboard);
      
      // Assert
      const updated = await keyboardRepository.findById(keyboard.getId());
      expect(updated!.getConnectionState()).toBe(KeyboardConnectionState.DISCONNECTED);
    });
  });
  
  describe('Keyboard Lookup', () => {
    test('should find keyboard by device path', async () => {
      // Arrange
      const keyboard = createMockKeyboard('kb-lookup', '/dev/hidraw4');
      await keyboardRepository.save(keyboard);
      
      // Act
      const found = await keyboardDetectionService.findKeyboardByDevicePath('/dev/hidraw4');
      
      // Assert
      expect(found).not.toBeNull();
      expect(found!.getId().getValue()).toBe('kb-lookup');
    });
    
    test('should return null for non-existent device path', async () => {
      // Act
      const found = await keyboardDetectionService.findKeyboardByDevicePath('/dev/nonexistent');
      
      // Assert
      expect(found).toBeNull();
    });
    
    test('should find keyboards by vendor and product ID', async () => {
      // Arrange
      const apple1 = createMockKeyboardWithVendorProduct('apple1', 0x05ac, 0x0267);
      const apple2 = createMockKeyboardWithVendorProduct('apple2', 0x05ac, 0x0267);
      const other = createMockKeyboardWithVendorProduct('other', 0x1234, 0x5678);
      
      await keyboardRepository.save(apple1);
      await keyboardRepository.save(apple2);
      await keyboardRepository.save(other);
      
      // Act
      const appleKeyboards = await keyboardDetectionService.findKeyboardsByVendorProduct(0x05ac, 0x0267);
      
      // Assert
      expect(appleKeyboards).toHaveLength(2);
      expect(appleKeyboards.map(kb => kb.getId().getValue())).toContain('apple1');
      expect(appleKeyboards.map(kb => kb.getId().getValue())).toContain('apple2');
    });
  });
  
  describe('Input Timestamp Management', () => {
    test('should update keyboard input timestamp', async () => {
      // Arrange
      const keyboard = createMockKeyboard('kb-timestamp', '/dev/hidraw5');
      await keyboardRepository.save(keyboard);
      const timestamp = Date.now();
      
      // Act
      await keyboardDetectionService.recordKeyboardInput(keyboard.getId(), timestamp);
      
      // Assert
      const updated = await keyboardRepository.findById(keyboard.getId());
      expect(updated!.getLastInputTimestamp()).toBe(timestamp);
    });
    
    test('should throw error for non-existent keyboard', async () => {
      // Arrange
      const nonExistentId = new KeyboardId('non-existent');
      const timestamp = Date.now();
      
      // Act & Assert
      await expect(keyboardDetectionService.recordKeyboardInput(nonExistentId, timestamp))
        .rejects.toThrow('Keyboard with ID non-existent not found');
    });
  });
});

// Test Helper Functions
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

function createMockKeyboardWithVendorProduct(
  id: string, 
  vendorId: number, 
  productId: number
): Keyboard {
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