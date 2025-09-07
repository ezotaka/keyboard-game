// KeyboardId Value Object - Green フェーズ実装

export class KeyboardId {
  private readonly value: string;
  private static readonly MAX_LENGTH = 100;

  constructor(value: string) {
    this.value = this.validateAndNormalize(value);
  }

  private validateAndNormalize(value: string): string {
    if (!value || typeof value !== 'string') {
      throw new Error('KeyboardId cannot be empty');
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('KeyboardId cannot be empty');
    }

    if (trimmed.length > KeyboardId.MAX_LENGTH) {
      throw new Error('KeyboardId cannot exceed 100 characters');
    }

    return trimmed;
  }

  getValue(): string {
    return this.value;
  }

  equals(other: KeyboardId | null | undefined): boolean {
    if (!other || !(other instanceof KeyboardId)) {
      return false;
    }
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  // Static factory methods
  static generate(): KeyboardId {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return new KeyboardId(`kb-${timestamp}-${random}`);
  }

  static fromDevicePath(devicePath: string): KeyboardId {
    if (!devicePath || typeof devicePath !== 'string' || devicePath.trim().length === 0) {
      throw new Error('Device path cannot be empty');
    }

    // Extract meaningful part from device path
    const pathParts = devicePath.split('/');
    const deviceName = pathParts[pathParts.length - 1] || 'unknown';
    const timestamp = Date.now();
    
    return new KeyboardId(`kb-${deviceName}-${timestamp}`);
  }

  // Validation helper
  static isValidFormat(value: string): boolean {
    try {
      new KeyboardId(value);
      return true;
    } catch {
      return false;
    }
  }
}