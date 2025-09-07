// TDD: KeyboardId Value Object Tests
// Red フェーズ: まず失敗するテストを書く

import { KeyboardId } from '@domain/value-objects/KeyboardId';

describe('KeyboardId Value Object', () => {
  describe('Construction', () => {
    test('should create KeyboardId with valid string', () => {
      // Arrange
      const idValue = 'kb-001';
      
      // Act
      const keyboardId = new KeyboardId(idValue);
      
      // Assert
      expect(keyboardId.getValue()).toBe(idValue);
    });

    test('should throw error with empty string', () => {
      // Arrange
      const emptyId = '';
      
      // Act & Assert
      expect(() => {
        new KeyboardId(emptyId);
      }).toThrow('KeyboardId cannot be empty');
    });

    test('should throw error with whitespace only', () => {
      // Arrange
      const whitespaceId = '   ';
      
      // Act & Assert
      expect(() => {
        new KeyboardId(whitespaceId);
      }).toThrow('KeyboardId cannot be empty');
    });

    test('should throw error with null or undefined', () => {
      // Act & Assert
      expect(() => {
        new KeyboardId(null as any);
      }).toThrow('KeyboardId cannot be empty');
      
      expect(() => {
        new KeyboardId(undefined as any);
      }).toThrow('KeyboardId cannot be empty');
    });

    test('should trim whitespace from ID', () => {
      // Arrange
      const idWithWhitespace = '  kb-002  ';
      
      // Act
      const keyboardId = new KeyboardId(idWithWhitespace);
      
      // Assert
      expect(keyboardId.getValue()).toBe('kb-002');
    });

    test('should reject ID longer than maximum length', () => {
      // Arrange
      const longId = 'a'.repeat(101); // Assume max length is 100
      
      // Act & Assert
      expect(() => {
        new KeyboardId(longId);
      }).toThrow('KeyboardId cannot exceed 100 characters');
    });
  });

  describe('Equality', () => {
    test('should be equal to KeyboardId with same value', () => {
      // Arrange
      const id1 = new KeyboardId('kb-003');
      const id2 = new KeyboardId('kb-003');
      
      // Act & Assert
      expect(id1.equals(id2)).toBe(true);
      expect(id2.equals(id1)).toBe(true);
    });

    test('should not be equal to KeyboardId with different value', () => {
      // Arrange
      const id1 = new KeyboardId('kb-004');
      const id2 = new KeyboardId('kb-005');
      
      // Act & Assert
      expect(id1.equals(id2)).toBe(false);
      expect(id2.equals(id1)).toBe(false);
    });

    test('should handle case sensitivity', () => {
      // Arrange
      const id1 = new KeyboardId('kb-006');
      const id2 = new KeyboardId('KB-006');
      
      // Act & Assert
      expect(id1.equals(id2)).toBe(false);
    });

    test('should return false when comparing to null or undefined', () => {
      // Arrange
      const id = new KeyboardId('kb-007');
      
      // Act & Assert
      expect(id.equals(null as any)).toBe(false);
      expect(id.equals(undefined as any)).toBe(false);
    });
  });

  describe('String Representation', () => {
    test('should return value as string', () => {
      // Arrange
      const idValue = 'kb-008';
      const keyboardId = new KeyboardId(idValue);
      
      // Act
      const stringValue = keyboardId.toString();
      
      // Assert
      expect(stringValue).toBe(idValue);
    });
  });

  describe('Static Factory Methods', () => {
    test('should generate unique ID', () => {
      // Act
      const id1 = KeyboardId.generate();
      const id2 = KeyboardId.generate();
      
      // Assert
      expect(id1).toBeInstanceOf(KeyboardId);
      expect(id2).toBeInstanceOf(KeyboardId);
      expect(id1.equals(id2)).toBe(false);
    });

    test('should generate ID from device path', () => {
      // Arrange
      const devicePath = '/dev/hidraw0';
      
      // Act
      const id = KeyboardId.fromDevicePath(devicePath);
      
      // Assert
      expect(id).toBeInstanceOf(KeyboardId);
      expect(id.getValue()).toContain('hidraw0');
    });

    test('should handle invalid device path', () => {
      // Arrange
      const invalidPath = '';
      
      // Act & Assert
      expect(() => {
        KeyboardId.fromDevicePath(invalidPath);
      }).toThrow('Device path cannot be empty');
    });
  });

  describe('Validation', () => {
    test('should validate ID format', () => {
      // Arrange & Act & Assert
      expect(KeyboardId.isValidFormat('kb-001')).toBe(true);
      expect(KeyboardId.isValidFormat('keyboard-123')).toBe(true);
      expect(KeyboardId.isValidFormat('KB_456')).toBe(true);
      
      expect(KeyboardId.isValidFormat('')).toBe(false);
      expect(KeyboardId.isValidFormat('   ')).toBe(false);
      expect(KeyboardId.isValidFormat('a'.repeat(101))).toBe(false);
    });
  });
});