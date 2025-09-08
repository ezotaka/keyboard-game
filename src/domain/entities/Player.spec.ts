import { Player, PlayerConstructorProps } from './Player';
import { PlayerId } from '../value-objects/PlayerId';
import { TeamId } from '../value-objects/TeamId';
import { KeyboardId } from '../value-objects/KeyboardId';

describe('Player', () => {
  let testTeamId: TeamId;
  let testPlayerId: PlayerId;
  let testKeyboardId: KeyboardId;

  beforeEach(() => {
    testTeamId = TeamId.create(1);
    testPlayerId = PlayerId.generate(testTeamId);
    testKeyboardId = KeyboardId.generate();
  });

  describe('constructor validation', () => {
    it('should create Player with valid properties', () => {
      const props: PlayerConstructorProps = {
        id: testPlayerId,
        teamId: testTeamId,
        keyboardId: testKeyboardId,
        name: 'Test Player'
      };

      const player = new Player(props);

      expect(player.getId()).toBe(testPlayerId);
      expect(player.getTeamId()).toBe(testTeamId);
      expect(player.getKeyboardId()).toBe(testKeyboardId);
      expect(player.getName()).toBe('Test Player');
      expect(player.getIsActive()).toBe(true);
      expect(player.getLastInputTimestamp()).toBeUndefined();
    });

    it('should create Player with default name when not provided', () => {
      const props: PlayerConstructorProps = {
        id: testPlayerId,
        teamId: testTeamId,
        keyboardId: testKeyboardId
      };

      const player = new Player(props);

      expect(player.getName()).toBe(`Player ${testPlayerId.getValue()}`);
    });

    it('should throw error for missing required properties', () => {
      expect(() => new Player({
        id: testPlayerId,
        teamId: testTeamId,
        keyboardId: testKeyboardId
      })).not.toThrow();

      expect(() => new Player({
        teamId: testTeamId,
        keyboardId: testKeyboardId
      } as any)).toThrow('Player requires id, teamId, and keyboardId');

      expect(() => new Player({
        id: testPlayerId,
        keyboardId: testKeyboardId
      } as any)).toThrow('Player requires id, teamId, and keyboardId');

      expect(() => new Player({
        id: testPlayerId,
        teamId: testTeamId
      } as any)).toThrow('Player requires id, teamId, and keyboardId');
    });
  });

  describe('keyboard management', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player({
        id: testPlayerId,
        teamId: testTeamId,
        keyboardId: testKeyboardId
      });
    });

    it('should assign new keyboard', () => {
      const newKeyboard = KeyboardId.generate();
      player.assignKeyboard(newKeyboard);
      
      expect(player.getKeyboardId()).toBe(newKeyboard);
    });
  });

  describe('input tracking', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player({
        id: testPlayerId,
        teamId: testTeamId,
        keyboardId: testKeyboardId
      });
    });

    it('should record input timestamp', () => {
      const timestamp = Date.now();
      player.recordInput(timestamp);
      
      expect(player.getLastInputTimestamp()).toBe(timestamp);
    });

    it('should update input timestamp on multiple recordings', () => {
      const timestamp1 = Date.now();
      const timestamp2 = timestamp1 + 1000;
      
      player.recordInput(timestamp1);
      expect(player.getLastInputTimestamp()).toBe(timestamp1);
      
      player.recordInput(timestamp2);
      expect(player.getLastInputTimestamp()).toBe(timestamp2);
    });
  });

  describe('activation status', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player({
        id: testPlayerId,
        teamId: testTeamId,
        keyboardId: testKeyboardId
      });
    });

    it('should be active by default', () => {
      expect(player.getIsActive()).toBe(true);
    });

    it('should deactivate player', () => {
      player.deactivate();
      expect(player.getIsActive()).toBe(false);
    });

    it('should reactivate player', () => {
      player.deactivate();
      expect(player.getIsActive()).toBe(false);
      
      player.activate();
      expect(player.getIsActive()).toBe(true);
    });
  });

  describe('name management', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player({
        id: testPlayerId,
        teamId: testTeamId,
        keyboardId: testKeyboardId,
        name: 'Initial Name'
      });
    });

    it('should update player name', () => {
      player.updateName('New Name');
      expect(player.getName()).toBe('New Name');
    });

    it('should trim whitespace from new name', () => {
      player.updateName('  Trimmed Name  ');
      expect(player.getName()).toBe('Trimmed Name');
    });

    it('should throw error for empty name', () => {
      expect(() => player.updateName('')).toThrow('Player name cannot be empty');
      expect(() => player.updateName('   ')).toThrow('Player name cannot be empty');
    });
  });

  describe('equality', () => {
    it('should return true for players with same ID', () => {
      const player1 = new Player({
        id: testPlayerId,
        teamId: testTeamId,
        keyboardId: testKeyboardId,
        name: 'Player 1'
      });

      const player2 = new Player({
        id: testPlayerId,
        teamId: TeamId.create(2), // Different team
        keyboardId: KeyboardId.generate(), // Different keyboard
        name: 'Player 2' // Different name
      });

      expect(player1.equals(player2)).toBe(true);
    });

    it('should return false for players with different IDs', () => {
      const player1 = new Player({
        id: testPlayerId,
        teamId: testTeamId,
        keyboardId: testKeyboardId
      });

      const otherPlayerId = PlayerId.generate(testTeamId);
      const player2 = new Player({
        id: otherPlayerId,
        teamId: testTeamId,
        keyboardId: testKeyboardId
      });

      expect(player1.equals(player2)).toBe(false);
    });
  });
});