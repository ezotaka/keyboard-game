// TDD: Keyboard Domain Entity Tests
// Red フェーズ: まず失敗するテストを書く

import { Keyboard } from '@domain/entities/Keyboard';
import { KeyboardId } from '@domain/value-objects/KeyboardId';
import { KeyboardConnectionState } from '@shared/types/keyboard.types';

describe('Keyboard Domain Entity', () => {
  describe('Construction', () => {
    test('should create keyboard with valid properties', () => {
      // Arrange
      const keyboardId = new KeyboardId('kb-001');
      const devicePath = '/dev/hidraw0';
      const vendorId = 0x05ac;
      const productId = 0x0267;
      
      // Act
      const keyboard = new Keyboard({
        id: keyboardId,
        devicePath,
        vendorId,
        productId,
        manufacturer: 'Apple Inc.',
        product: 'Magic Keyboard',
        connectionState: KeyboardConnectionState.CONNECTED
      });
      
      // Assert
      expect(keyboard.getId()).toBe(keyboardId);
      expect(keyboard.getDevicePath()).toBe(devicePath);
      expect(keyboard.getVendorId()).toBe(vendorId);
      expect(keyboard.getProductId()).toBe(productId);
      expect(keyboard.getManufacturer()).toBe('Apple Inc.');
      expect(keyboard.getProduct()).toBe('Magic Keyboard');
      expect(keyboard.getConnectionState()).toBe(KeyboardConnectionState.CONNECTED);
      expect(keyboard.getLastInputTimestamp()).toBeUndefined();
    });

    test('should throw error with invalid device path', () => {
      // Arrange
      const keyboardId = new KeyboardId('kb-002');
      const invalidDevicePath = '';
      
      // Act & Assert
      expect(() => {
        new Keyboard({
          id: keyboardId,
          devicePath: invalidDevicePath,
          vendorId: 0x1234,
          productId: 0x5678,
          connectionState: KeyboardConnectionState.CONNECTED
        });
      }).toThrow('Device path cannot be empty');
    });

    test('should throw error with invalid vendor ID', () => {
      // Arrange
      const keyboardId = new KeyboardId('kb-003');
      
      // Act & Assert
      expect(() => {
        new Keyboard({
          id: keyboardId,
          devicePath: '/dev/hidraw0',
          vendorId: -1, // Invalid vendor ID
          productId: 0x5678,
          connectionState: KeyboardConnectionState.CONNECTED
        });
      }).toThrow('Vendor ID must be a positive number');
    });

    test('should throw error with invalid product ID', () => {
      // Arrange  
      const keyboardId = new KeyboardId('kb-004');
      
      // Act & Assert
      expect(() => {
        new Keyboard({
          id: keyboardId,
          devicePath: '/dev/hidraw0',
          vendorId: 0x1234,
          productId: -1, // Invalid product ID
          connectionState: KeyboardConnectionState.CONNECTED
        });
      }).toThrow('Product ID must be a positive number');
    });
  });

  describe('Connection State Management', () => {
    test('should update connection state', () => {
      // Arrange
      const keyboard = createValidKeyboard();
      
      // Act
      keyboard.updateConnectionState(KeyboardConnectionState.DISCONNECTED);
      
      // Assert
      expect(keyboard.getConnectionState()).toBe(KeyboardConnectionState.DISCONNECTED);
    });

    test('should return true for connected keyboard', () => {
      // Arrange
      const keyboard = createValidKeyboard();
      keyboard.updateConnectionState(KeyboardConnectionState.CONNECTED);
      
      // Act & Assert
      expect(keyboard.isConnected()).toBe(true);
    });

    test('should return false for disconnected keyboard', () => {
      // Arrange
      const keyboard = createValidKeyboard();
      keyboard.updateConnectionState(KeyboardConnectionState.DISCONNECTED);
      
      // Act & Assert
      expect(keyboard.isConnected()).toBe(false);
    });
  });

  describe('Input Tracking', () => {
    test('should record input timestamp', () => {
      // Arrange
      const keyboard = createValidKeyboard();
      const timestamp = Date.now();
      
      // Act
      keyboard.recordInputTimestamp(timestamp);
      
      // Assert
      expect(keyboard.getLastInputTimestamp()).toBe(timestamp);
    });

    test('should update last input timestamp on multiple inputs', () => {
      // Arrange
      const keyboard = createValidKeyboard();
      const firstTimestamp = Date.now();
      const secondTimestamp = firstTimestamp + 1000;
      
      // Act
      keyboard.recordInputTimestamp(firstTimestamp);
      keyboard.recordInputTimestamp(secondTimestamp);
      
      // Assert
      expect(keyboard.getLastInputTimestamp()).toBe(secondTimestamp);
    });
  });

  describe('Equality and Identity', () => {
    test('should be equal to keyboard with same ID', () => {
      // Arrange
      const keyboardId = new KeyboardId('kb-005');
      const keyboard1 = createKeyboardWithId(keyboardId);
      const keyboard2 = createKeyboardWithId(keyboardId);
      
      // Act & Assert
      expect(keyboard1.equals(keyboard2)).toBe(true);
    });

    test('should not be equal to keyboard with different ID', () => {
      // Arrange
      const keyboard1 = createKeyboardWithId(new KeyboardId('kb-006'));
      const keyboard2 = createKeyboardWithId(new KeyboardId('kb-007'));
      
      // Act & Assert
      expect(keyboard1.equals(keyboard2)).toBe(false);
    });
  });

  describe('Device Information', () => {
    test('should provide device identification string', () => {
      // Arrange
      const keyboard = new Keyboard({
        id: new KeyboardId('kb-008'),
        devicePath: '/dev/hidraw0',
        vendorId: 0x05ac,
        productId: 0x0267,
        manufacturer: 'Apple Inc.',
        product: 'Magic Keyboard',
        connectionState: KeyboardConnectionState.CONNECTED
      });
      
      // Act
      const deviceInfo = keyboard.getDeviceInfo();
      
      // Assert
      expect(deviceInfo).toContain('Apple Inc.');
      expect(deviceInfo).toContain('Magic Keyboard');
      expect(deviceInfo).toContain('0x05ac');
      expect(deviceInfo).toContain('0x0267');
    });

    test('should handle missing manufacturer and product', () => {
      // Arrange
      const keyboard = new Keyboard({
        id: new KeyboardId('kb-009'),
        devicePath: '/dev/hidraw0', 
        vendorId: 0x1234,
        productId: 0x5678,
        connectionState: KeyboardConnectionState.CONNECTED
      });
      
      // Act
      const deviceInfo = keyboard.getDeviceInfo();
      
      // Assert
      expect(deviceInfo).toContain('Unknown');
      expect(deviceInfo).toContain('0x1234');
      expect(deviceInfo).toContain('0x5678');
    });
  });
});

// Test Helpers
function createValidKeyboard(): Keyboard {
  return new Keyboard({
    id: new KeyboardId('kb-test'),
    devicePath: '/dev/hidraw0',
    vendorId: 0x1234,
    productId: 0x5678,
    connectionState: KeyboardConnectionState.CONNECTED
  });
}

function createKeyboardWithId(id: KeyboardId): Keyboard {
  return new Keyboard({
    id,
    devicePath: '/dev/hidraw0',
    vendorId: 0x1234,
    productId: 0x5678,
    connectionState: KeyboardConnectionState.CONNECTED
  });
}