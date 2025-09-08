import { TeamId } from './TeamId';

describe('TeamId', () => {
  describe('constructor validation', () => {
    it('should create TeamId with valid format', () => {
      const teamId = new TeamId('team-1');
      expect(teamId.getValue()).toBe('team-1');
    });

    it('should throw error for invalid format', () => {
      expect(() => new TeamId('invalid')).toThrow('TeamId must be in format "team-{1-8}"');
    });

    it('should throw error for team number out of range', () => {
      expect(() => new TeamId('team-0')).toThrow('TeamId must be in format "team-{1-8}"');
      expect(() => new TeamId('team-9')).toThrow('TeamId must be in format "team-{1-8}"');
    });

    it('should throw error for empty value', () => {
      expect(() => new TeamId('')).toThrow('TeamId must be in format "team-{1-8}"');
    });
  });

  describe('getTeamNumber', () => {
    it('should extract team number from valid TeamId', () => {
      const teamId = new TeamId('team-5');
      expect(teamId.getTeamNumber()).toBe(5);
    });
  });

  describe('equals', () => {
    it('should return true for same team IDs', () => {
      const teamId1 = new TeamId('team-1');
      const teamId2 = new TeamId('team-1');
      expect(teamId1.equals(teamId2)).toBe(true);
    });

    it('should return false for different team IDs', () => {
      const teamId1 = new TeamId('team-1');
      const teamId2 = new TeamId('team-2');
      expect(teamId1.equals(teamId2)).toBe(false);
    });
  });

  describe('create static method', () => {
    it('should create TeamId from team number', () => {
      const teamId = TeamId.create(3);
      expect(teamId.getValue()).toBe('team-3');
      expect(teamId.getTeamNumber()).toBe(3);
    });

    it('should throw error for invalid team number', () => {
      expect(() => TeamId.create(0)).toThrow('Team number must be between 1 and 8');
      expect(() => TeamId.create(9)).toThrow('Team number must be between 1 and 8');
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const teamId = new TeamId('team-7');
      expect(teamId.toString()).toBe('team-7');
    });
  });
});