// TDD: KeyboardDetectionService Tests
// Red フェーズ: HIDデバイス検知機能のテスト

import { KeyboardDetectionService } from '@infrastructure/keyboard/KeyboardDetectionService';
import { Keyboard } from '@domain/entities/Keyboard';
import { KeyboardId } from '@domain/value-objects/KeyboardId';
import { KeyboardConnectionState } from '@shared/types/keyboard.types';

// Mock node-hid for testing
jest.mock('node-hid', () => ({
  devices: jest.fn(),
  HID: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    read: jest.fn(),
    close: jest.fn(),
    write: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    readSync: jest.fn(),
    readTimeout: jest.fn(),
    sendFeatureReport: jest.fn(),
    getFeatureReport: jest.fn()
  }))
}));

// Import the mock after it's defined
const mockHID = require('node-hid');

describe('KeyboardDetectionService', () => {
  let detectionService: KeyboardDetectionService;

  beforeEach(() => {
    detectionService = new KeyboardDetectionService();
    jest.clearAllMocks();
  });

  describe('Device Detection', () => {
    test('should detect multiple keyboards from HID devices', async () => {
      // Arrange: Mock multiple HID devices including keyboards
      const mockDevices = [
        // Apple Magic Keyboard
        {
          vendorId: 0x05ac,
          productId: 0x0267,
          path: '/dev/hidraw0',
          manufacturer: 'Apple Inc.',
          product: 'Magic Keyboard',
          interface: 0,
          usage: 6, // Keyboard usage
          usagePage: 1 // Generic Desktop
        },
        // Generic USB Keyboard  
        {
          vendorId: 0x1234,
          productId: 0x5678,
          path: '/dev/hidraw1',
          manufacturer: 'Generic',
          product: 'USB Keyboard',
          interface: 0,
          usage: 6, // Keyboard usage
          usagePage: 1
        },
        // Mouse (should be filtered out)
        {
          vendorId: 0x046d,
          productId: 0xc077,
          path: '/dev/hidraw2',
          manufacturer: 'Logitech',
          product: 'USB Mouse',
          interface: 0,
          usage: 2, // Mouse usage
          usagePage: 1
        }
      ];

      mockHID.devices.mockReturnValue(mockDevices);

      // Act
      const keyboards = await detectionService.detectKeyboards();

      // Assert
      expect(keyboards).toHaveLength(2);
      expect(keyboards[0]).toBeInstanceOf(Keyboard);
      expect(keyboards[1]).toBeInstanceOf(Keyboard);
      
      // Check keyboard properties
      expect(keyboards[0].getDevicePath()).toBe('/dev/hidraw0');
      expect(keyboards[0].getVendorId()).toBe(0x05ac);
      expect(keyboards[0].getManufacturer()).toBe('Apple Inc.');
      
      expect(keyboards[1].getDevicePath()).toBe('/dev/hidraw1');
      expect(keyboards[1].getVendorId()).toBe(0x1234);
      expect(keyboards[1].getManufacturer()).toBe('Generic');
    });

    test('should return empty array when no keyboards found', async () => {
      // Arrange: Mock devices with no keyboards
      const mockDevices = [
        {
          vendorId: 0x046d,
          productId: 0xc077,
          path: '/dev/hidraw0',
          manufacturer: 'Logitech',
          product: 'USB Mouse',
          usage: 2, // Mouse usage
          usagePage: 1
        }
      ];

      mockHID.devices.mockReturnValue(mockDevices);

      // Act
      const keyboards = await detectionService.detectKeyboards();

      // Assert
      expect(keyboards).toHaveLength(0);
    });

    test('should handle HID devices() error gracefully', async () => {
      // Arrange
      mockHID.devices.mockImplementation(() => {
        throw new Error('HID access denied');
      });

      // Act & Assert
      await expect(detectionService.detectKeyboards()).rejects.toThrow('Failed to detect keyboards: HID access denied');
    });

    test('should filter keyboard devices correctly', async () => {
      // Arrange: Mix of keyboard and non-keyboard devices
      const mockDevices = [
        // Keyboard with usage page 1, usage 6
        {
          vendorId: 0x1111,
          productId: 0x2222,
          path: '/dev/hidraw0',
          usage: 6,
          usagePage: 1
        },
        // Different usage (not keyboard)
        {
          vendorId: 0x3333,
          productId: 0x4444,
          path: '/dev/hidraw1',
          usage: 2, // Mouse
          usagePage: 1
        },
        // Different usage page
        {
          vendorId: 0x5555,
          productId: 0x6666,
          path: '/dev/hidraw2',
          usage: 6,
          usagePage: 2 // Different page
        }
      ];

      mockHID.devices.mockReturnValue(mockDevices);

      // Act
      const keyboards = await detectionService.detectKeyboards();

      // Assert
      expect(keyboards).toHaveLength(1);
      expect(keyboards[0].getDevicePath()).toBe('/dev/hidraw0');
    });
  });

  describe('Real-time Monitoring', () => {
    test('should start monitoring for device changes', async () => {
      // Arrange
      const onDeviceConnected = jest.fn();
      const onDeviceDisconnected = jest.fn();

      // Act
      await detectionService.startMonitoring({
        onDeviceConnected,
        onDeviceDisconnected
      });

      // Assert
      expect(detectionService.isMonitoring()).toBe(true);
    });

    test('should stop monitoring when requested', async () => {
      // Arrange
      await detectionService.startMonitoring({
        onDeviceConnected: jest.fn(),
        onDeviceDisconnected: jest.fn()
      });

      // Act
      await detectionService.stopMonitoring();

      // Assert
      expect(detectionService.isMonitoring()).toBe(false);
    });

    test('should detect device connection events', async () => {
      // Arrange
      const onDeviceConnected = jest.fn();
      mockHID.devices
        .mockReturnValueOnce([]) // Initial scan: no devices
        .mockReturnValueOnce([   // Second scan: one device connected
          {
            vendorId: 0x1234,
            productId: 0x5678,
            path: '/dev/hidraw0',
            usage: 6,
            usagePage: 1
          }
        ]);

      await detectionService.startMonitoring({
        onDeviceConnected,
        onDeviceDisconnected: jest.fn()
      });

      // Act: Simulate periodic check
      await detectionService.performPeriodicCheck();

      // Assert
      expect(onDeviceConnected).toHaveBeenCalledTimes(1);
      expect(onDeviceConnected).toHaveBeenCalledWith(
        expect.objectContaining({
          devicePath: '/dev/hidraw0',
          vendorId: 0x1234
        })
      );
    });

    test('should detect device disconnection events', async () => {
      // Arrange
      const onDeviceDisconnected = jest.fn();
      mockHID.devices
        .mockReturnValueOnce([   // Initial scan: one device
          {
            vendorId: 0x1234,
            productId: 0x5678,
            path: '/dev/hidraw0',
            usage: 6,
            usagePage: 1
          }
        ])
        .mockReturnValueOnce([]); // Second scan: device disconnected

      await detectionService.startMonitoring({
        onDeviceConnected: jest.fn(),
        onDeviceDisconnected
      });

      // Act: Simulate periodic check
      await detectionService.performPeriodicCheck();

      // Assert
      expect(onDeviceDisconnected).toHaveBeenCalledTimes(1);
      expect(onDeviceDisconnected).toHaveBeenCalledWith('/dev/hidraw0');
    });
  });

  describe('Device Information', () => {
    test('should get device information by path', async () => {
      // Arrange
      const mockDevices = [
        {
          vendorId: 0x05ac,
          productId: 0x0267,
          path: '/dev/hidraw0',
          manufacturer: 'Apple Inc.',
          product: 'Magic Keyboard',
          usage: 6,
          usagePage: 1
        }
      ];

      mockHID.devices.mockReturnValue(mockDevices);

      // Act
      const deviceInfo = await detectionService.getDeviceInfo('/dev/hidraw0');

      // Assert
      expect(deviceInfo).toEqual({
        vendorId: 0x05ac,
        productId: 0x0267,
        path: '/dev/hidraw0',
        manufacturer: 'Apple Inc.',
        product: 'Magic Keyboard',
        usage: 6,
        usagePage: 1
      });
    });

    test('should return null for non-existent device path', async () => {
      // Arrange
      mockHID.devices.mockReturnValue([]);

      // Act
      const deviceInfo = await detectionService.getDeviceInfo('/dev/nonexistent');

      // Assert
      expect(deviceInfo).toBeNull();
    });
  });

  describe('Keyboard Creation', () => {
    test('should create Keyboard entity from HID device', () => {
      // Arrange
      const hidDevice = {
        vendorId: 0x1234,
        productId: 0x5678,
        path: '/dev/hidraw0',
        manufacturer: 'Test Corp',
        product: 'Test Keyboard',
        usage: 6,
        usagePage: 1
      };

      // Act
      const keyboard = detectionService.createKeyboardFromHIDDevice(hidDevice);

      // Assert
      expect(keyboard).toBeInstanceOf(Keyboard);
      expect(keyboard.getDevicePath()).toBe('/dev/hidraw0');
      expect(keyboard.getVendorId()).toBe(0x1234);
      expect(keyboard.getProductId()).toBe(0x5678);
      expect(keyboard.getManufacturer()).toBe('Test Corp');
      expect(keyboard.getProduct()).toBe('Test Keyboard');
      expect(keyboard.getConnectionState()).toBe(KeyboardConnectionState.CONNECTED);
    });
  });
});

// Integration Test Helpers
export class KeyboardDetectionTestHelper {
  static createMockHIDDevice(overrides = {}) {
    return {
      vendorId: 0x1234,
      productId: 0x5678,
      path: '/dev/hidraw0',
      manufacturer: 'Test',
      product: 'Test Keyboard',
      usage: 6,
      usagePage: 1,
      ...overrides
    };
  }

  static async waitForDetection(service: KeyboardDetectionService, timeout = 1000): Promise<Keyboard[]> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Detection timeout'));
      }, timeout);

      service.detectKeyboards().then((keyboards) => {
        clearTimeout(timer);
        resolve(keyboards);
      }).catch(reject);
    });
  }
}