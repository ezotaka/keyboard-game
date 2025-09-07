// キーボード入力ハンドラー - 複数キーボードからの入力を個別に処理
import { HID } from 'node-hid';
import { Keyboard } from '@domain/entities/Keyboard';
import { KeyInput } from '@shared/types/keyboard.types';

export interface KeyboardInputCallbacks {
  onKeyInput: (input: KeyInput, keyboard: Keyboard) => void;
  onError?: (error: { message: string; keyboard: Keyboard }) => void;
}

interface KeyboardHIDConnection {
  keyboard: Keyboard;
  hidDevice: any; // Use any for testing flexibility with mocks
}

export class KeyboardInputHandler {
  private isCurrentlyListening: boolean = false;
  private activeConnections: Map<string, KeyboardHIDConnection> = new Map();
  private scanCodeMap: Map<number, string> = new Map();

  constructor() {
    this.initializeScanCodeMap();
  }

  async startListening(keyboards: Keyboard[], callbacks: KeyboardInputCallbacks): Promise<void> {
    try {
      if (this.isCurrentlyListening) {
        await this.stopListening();
      }

      // Connect to each keyboard
      for (const keyboard of keyboards) {
        await this.connectToKeyboard(keyboard, callbacks);
      }

      this.isCurrentlyListening = true;
    } catch (error) {
      this.isCurrentlyListening = false;
      // Clean up any partial connections
      await this.cleanup();
      throw new Error(`Failed to start listening: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async stopListening(): Promise<void> {
    this.isCurrentlyListening = false;
    await this.cleanup();
  }

  isListening(): boolean {
    return this.isCurrentlyListening;
  }

  getListeningKeyboards(): Keyboard[] {
    return Array.from(this.activeConnections.values()).map(conn => conn.keyboard);
  }

  mapScanCodeToKey(scanCode: number): string {
    return this.scanCodeMap.get(scanCode) || 'unknown';
  }

  private async connectToKeyboard(keyboard: Keyboard, callbacks: KeyboardInputCallbacks): Promise<void> {
    try {
      const hidDevice = new HID(keyboard.getDevicePath());
      
      // Set up data event listener
      if (hidDevice.on) {
        hidDevice.on('data', (data: Buffer) => {
          this.handleKeyData(data, keyboard, callbacks.onKeyInput);
        });

        // Set up error event listener
        hidDevice.on('error', (error: Error) => {
          if (callbacks.onError) {
            callbacks.onError({
              message: error.message,
              keyboard: keyboard
            });
          }
        });
      }

      // Store the connection
      this.activeConnections.set(keyboard.getDevicePath(), {
        keyboard,
        hidDevice
      });

    } catch (error) {
      throw new Error(`Failed to connect to keyboard ${keyboard.getDevicePath()}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private handleKeyData(data: Buffer, keyboard: Keyboard, onKeyInput: (input: KeyInput, keyboard: Keyboard) => void): void {
    // HID keyboard data format: [modifier, reserved, key1, key2, key3, key4, key5, key6]
    // We're primarily interested in the first key pressed (index 2)
    if (data.length >= 3) {
      const scanCode = data[2];
      
      // Ignore key release events (scanCode = 0)
      if (scanCode === 0) {
        return;
      }

      const key = this.mapScanCodeToKey(scanCode);
      const keyInput: KeyInput = {
        key,
        keyCode: scanCode,
        timestamp: Date.now(),
        devicePath: keyboard.getDevicePath()
      };

      // Record timestamp on the keyboard entity
      keyboard.recordInputTimestamp(keyInput.timestamp);

      // Trigger callback
      onKeyInput(keyInput, keyboard);
    }
  }

  private async cleanup(): Promise<void> {
    // Close all HID connections
    for (const connection of this.activeConnections.values()) {
      try {
        if (connection.hidDevice.close) {
          connection.hidDevice.close();
        }
      } catch (error) {
        // Ignore cleanup errors - device may already be closed
        console.warn(`Error closing HID device: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    this.activeConnections.clear();
  }

  private initializeScanCodeMap(): void {
    // USB HID scan code to key mapping
    // Based on USB HID specification
    const scanCodes = [
      // Letters a-z (scan codes 0x04-0x1D)
      [0x04, 'a'], [0x05, 'b'], [0x06, 'c'], [0x07, 'd'], [0x08, 'e'],
      [0x09, 'f'], [0x0A, 'g'], [0x0B, 'h'], [0x0C, 'i'], [0x0D, 'j'],
      [0x0E, 'k'], [0x0F, 'l'], [0x10, 'm'], [0x11, 'n'], [0x12, 'o'],
      [0x13, 'p'], [0x14, 'q'], [0x15, 'r'], [0x16, 's'], [0x17, 't'],
      [0x18, 'u'], [0x19, 'v'], [0x1A, 'w'], [0x1B, 'x'], [0x1C, 'y'],
      [0x1D, 'z'],
      
      // Numbers 1-0 (scan codes 0x1E-0x27)
      [0x1E, '1'], [0x1F, '2'], [0x20, '3'], [0x21, '4'], [0x22, '5'],
      [0x23, '6'], [0x24, '7'], [0x25, '8'], [0x26, '9'], [0x27, '0'],
      
      // Special keys
      [0x28, 'enter'], [0x29, 'escape'], [0x2A, 'backspace'], [0x2B, 'tab'],
      [0x2C, 'space'], [0x2D, '-'], [0x2E, '='], [0x2F, '['], [0x30, ']'],
      [0x31, '\\'], [0x33, ';'], [0x34, "'"], [0x35, '`'], [0x36, ','],
      [0x37, '.'], [0x38, '/']
    ];

    for (const [code, key] of scanCodes) {
      this.scanCodeMap.set(code as number, key as string);
    }
  }
}