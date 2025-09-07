// TDD: KeyboardInputHandler Tests
// 複数キーボードからの入力を個別に処理するテスト

import { KeyboardInputHandler } from '@infrastructure/keyboard/KeyboardInputHandler';
import { Keyboard } from '@domain/entities/Keyboard';
import { KeyboardId } from '@domain/value-objects/KeyboardId';
import { KeyboardConnectionState, KeyInput } from '@shared/types/keyboard.types';

// Mock node-hid for testing
jest.mock('node-hid', () => ({
  devices: jest.fn(),
  HID: jest.fn()
}));

const mockHID = require('node-hid');

describe('KeyboardInputHandler', () => {
  let inputHandler: KeyboardInputHandler;
  let mockKeyboard1: Keyboard;
  let mockKeyboard2: Keyboard;

  beforeEach(() => {
    inputHandler = new KeyboardInputHandler();
    
    // Create mock keyboards
    mockKeyboard1 = new Keyboard({
      id: new KeyboardId('kb-001'),
      devicePath: '/dev/hidraw0',
      vendorId: 0x1234,
      productId: 0x5678,
      connectionState: KeyboardConnectionState.CONNECTED
    });

    mockKeyboard2 = new Keyboard({
      id: new KeyboardId('kb-002'),
      devicePath: '/dev/hidraw1',
      vendorId: 0xabcd,
      productId: 0xef12,
      connectionState: KeyboardConnectionState.CONNECTED
    });

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await inputHandler.stopListening();
  });

  describe('Input Listening', () => {
    test('should start listening to keyboard input', async () => {
      // Arrange
      const onKeyInput = jest.fn();

      // Act
      await inputHandler.startListening([mockKeyboard1], { onKeyInput });

      // Assert
      expect(inputHandler.isListening()).toBe(true);
    });

    test('should stop listening when requested', async () => {
      // Arrange
      const onKeyInput = jest.fn();
      await inputHandler.startListening([mockKeyboard1], { onKeyInput });

      // Act
      await inputHandler.stopListening();

      // Assert
      expect(inputHandler.isListening()).toBe(false);
    });

    test('should listen to multiple keyboards simultaneously', async () => {
      // Arrange
      const onKeyInput = jest.fn();
      const keyboards = [mockKeyboard1, mockKeyboard2];

      // Act
      await inputHandler.startListening(keyboards, { onKeyInput });

      // Assert
      expect(inputHandler.isListening()).toBe(true);
      expect(inputHandler.getListeningKeyboards()).toHaveLength(2);
    });
  });

  describe('Input Separation', () => {
    test('should distinguish input from different keyboards', async () => {
      // Arrange
      const receivedInputs: Array<{ input: KeyInput; keyboard: Keyboard }> = [];
      const onKeyInput = (input: KeyInput, keyboard: Keyboard) => {
        receivedInputs.push({ input, keyboard });
      };

      // Mock HID instances
      const mockHID1 = createMockHIDDevice();
      const mockHID2 = createMockHIDDevice();
      
      mockHID.HID
        .mockReturnValueOnce(mockHID1) // For keyboard 1
        .mockReturnValueOnce(mockHID2); // For keyboard 2

      await inputHandler.startListening([mockKeyboard1, mockKeyboard2], { onKeyInput });

      // Act: Simulate key input from keyboard 1
      const keyData1 = Buffer.from([0, 0, 4, 0, 0, 0, 0, 0]); // 'a' key (scanCode 4 at index 2)
      const dataCallback1 = mockHID1.on.mock.calls.find(call => call[0] === 'data');
      if (dataCallback1) {
        dataCallback1[1](keyData1);
      }

      // Act: Simulate key input from keyboard 2  
      const keyData2 = Buffer.from([0, 0, 5, 0, 0, 0, 0, 0]); // 'b' key (scanCode 5 at index 2)
      const dataCallback2 = mockHID2.on.mock.calls.find(call => call[0] === 'data');
      if (dataCallback2) {
        dataCallback2[1](keyData2);
      }

      // Assert
      expect(receivedInputs).toHaveLength(2);
      expect(receivedInputs[0].keyboard.getId().getValue()).toBe('kb-001');
      expect(receivedInputs[1].keyboard.getId().getValue()).toBe('kb-002');
      expect(receivedInputs[0].input.key).toBe('a');
      expect(receivedInputs[1].input.key).toBe('b');
    });

    test('should handle simultaneous key presses from multiple keyboards', async () => {
      // Arrange
      const receivedInputs: Array<{ input: KeyInput; keyboard: Keyboard }> = [];
      const onKeyInput = (input: KeyInput, keyboard: Keyboard) => {
        receivedInputs.push({ input, keyboard });
      };

      const mockHID1 = createMockHIDDevice();
      const mockHID2 = createMockHIDDevice();
      
      mockHID.HID
        .mockReturnValueOnce(mockHID1)
        .mockReturnValueOnce(mockHID2);

      await inputHandler.startListening([mockKeyboard1, mockKeyboard2], { onKeyInput });

      // Act: Simulate simultaneous key presses
      const keyData = Buffer.from([0, 0, 4, 0, 0, 0, 0, 0]); // Same key from both (scanCode 4 at index 2)
      const dataCallback1 = mockHID1.on.mock.calls.find(call => call[0] === 'data');
      const dataCallback2 = mockHID2.on.mock.calls.find(call => call[0] === 'data');
      if (dataCallback1) dataCallback1[1](keyData);
      if (dataCallback2) dataCallback2[1](keyData);

      // Assert: Should receive inputs from both keyboards
      expect(receivedInputs).toHaveLength(2);
      expect(receivedInputs[0].keyboard.getDevicePath()).toBe('/dev/hidraw0');
      expect(receivedInputs[1].keyboard.getDevicePath()).toBe('/dev/hidraw1');
      expect(receivedInputs[0].input.key).toBe('a');
      expect(receivedInputs[1].input.key).toBe('a');
    });

    test('should ignore key release events', async () => {
      // Arrange
      const receivedInputs: Array<{ input: KeyInput; keyboard: Keyboard }> = [];
      const onKeyInput = (input: KeyInput, keyboard: Keyboard) => {
        receivedInputs.push({ input, keyboard });
      };

      const mockHID1 = createMockHIDDevice();
      mockHID.HID.mockReturnValueOnce(mockHID1);

      await inputHandler.startListening([mockKeyboard1], { onKeyInput });

      // Act: Simulate key press then release
      const keyPress = Buffer.from([0, 0, 4, 0, 0, 0, 0, 0]); // Key press (scanCode 4 at index 2)
      const keyRelease = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]); // Key release (scanCode 0 at index 2)

      const dataCallback = mockHID1.on.mock.calls.find(call => call[0] === 'data');
      if (dataCallback) {
        dataCallback[1](keyPress);
        dataCallback[1](keyRelease);
      }

      // Assert: Should only receive key press, not release
      expect(receivedInputs).toHaveLength(1);
      expect(receivedInputs[0].input.key).toBe('a');
    });
  });

  describe('Error Handling', () => {
    test('should handle HID device connection errors', async () => {
      // Arrange
      const onKeyInput = jest.fn();
      const onError = jest.fn();

      mockHID.HID.mockImplementation(() => {
        throw new Error('Device connection failed');
      });

      // Act & Assert
      await expect(
        inputHandler.startListening([mockKeyboard1], { onKeyInput, onError })
      ).rejects.toThrow('Failed to start listening: Failed to connect to keyboard /dev/hidraw0: Device connection failed');
    });

    test('should handle HID device read errors gracefully', async () => {
      // Arrange
      const onKeyInput = jest.fn();
      const onError = jest.fn();
      const mockHID1 = createMockHIDDevice();

      mockHID.HID.mockReturnValueOnce(mockHID1);

      await inputHandler.startListening([mockKeyboard1], { onKeyInput, onError });

      // Act: Simulate HID error
      const errorCallback = mockHID1.on.mock.calls.find(call => call[0] === 'error');
      errorCallback[1](new Error('HID read error'));

      // Assert
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'HID read error',
          keyboard: mockKeyboard1
        })
      );
    });
  });

  describe('Key Mapping', () => {
    test('should correctly map HID scan codes to keys', () => {
      // Test key mapping function
      expect(inputHandler.mapScanCodeToKey(0x04)).toBe('a');
      expect(inputHandler.mapScanCodeToKey(0x05)).toBe('b');
      expect(inputHandler.mapScanCodeToKey(0x06)).toBe('c');
      expect(inputHandler.mapScanCodeToKey(0x1C)).toBe('y');
      expect(inputHandler.mapScanCodeToKey(0x1D)).toBe('z');
      expect(inputHandler.mapScanCodeToKey(0x27)).toBe('0');
      expect(inputHandler.mapScanCodeToKey(0x1E)).toBe('1');
    });

    test('should handle unknown scan codes', () => {
      // Test unknown scan code
      expect(inputHandler.mapScanCodeToKey(0xFF)).toBe('unknown');
    });
  });

  describe('Input Timestamps', () => {
    test('should record accurate input timestamps', async () => {
      // Arrange
      const receivedInputs: Array<{ input: KeyInput; keyboard: Keyboard }> = [];
      const onKeyInput = (input: KeyInput, keyboard: Keyboard) => {
        receivedInputs.push({ input, keyboard });
      };

      const mockHID1 = createMockHIDDevice();
      mockHID.HID.mockReturnValueOnce(mockHID1);

      await inputHandler.startListening([mockKeyboard1], { onKeyInput });

      const beforeTime = Date.now();

      // Act
      const keyData = Buffer.from([0, 0, 4, 0, 0, 0, 0, 0]); // scanCode 4 at index 2
      const dataCallback = mockHID1.on.mock.calls.find(call => call[0] === 'data');
      if (dataCallback) {
        dataCallback[1](keyData);
      }

      const afterTime = Date.now();

      // Assert
      expect(receivedInputs).toHaveLength(1);
      expect(receivedInputs[0].input.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(receivedInputs[0].input.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });
});

// Test Helper Functions
function createMockHIDDevice() {
  return {
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
  };
}