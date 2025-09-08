import { PlayerId } from './PlayerId';
import { TeamId } from './TeamId';

describe('PlayerId', () => {
  describe('constructor validation', () => {
    it('should create PlayerId with valid value', () => {
      const playerId = new PlayerId('player-123');
      expect(playerId.getValue()).toBe('player-123');
    });

    it('should throw error for empty value', () => {
      expect(() => new PlayerId('')).toThrow('PlayerId cannot be empty');
      expect(() => new PlayerId('   ')).toThrow('PlayerId cannot be empty');
    });

    it('should throw error for value exceeding max length', () => {
      const longId = 'a'.repeat(51);
      expect(() => new PlayerId(longId)).toThrow('PlayerId cannot exceed 50 characters');
    });

    it('should trim whitespace from value', () => {
      const playerId = new PlayerId('  player-123  ');
      expect(playerId.getValue()).toBe('player-123');
    });
  });

  describe('equals', () => {
    it('should return true for same player IDs', () => {
      const playerId1 = new PlayerId('player-123');
      const playerId2 = new PlayerId('player-123');
      expect(playerId1.equals(playerId2)).toBe(true);
    });

    it('should return false for different player IDs', () => {
      const playerId1 = new PlayerId('player-123');
      const playerId2 = new PlayerId('player-456');
      expect(playerId1.equals(playerId2)).toBe(false);
    });
  });

  describe('generate static method', () => {
    it('should generate unique player ID with team prefix', () => {
      const teamId = TeamId.create(1);
      const playerId = PlayerId.generate(teamId);
      
      expect(playerId.getValue()).toMatch(/^team-1-player-\d+-\d+$/);
    });

    it('should generate different IDs for multiple calls', () => {
      const teamId = TeamId.create(2);
      const playerId1 = PlayerId.generate(teamId);
      const playerId2 = PlayerId.generate(teamId);
      
      expect(playerId1.equals(playerId2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const playerId = new PlayerId('player-test');
      expect(playerId.toString()).toBe('player-test');
    });
  });
});