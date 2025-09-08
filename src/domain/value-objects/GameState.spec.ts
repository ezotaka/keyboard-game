import { GameState, GameStateType } from './GameState';

describe('GameState', () => {
  describe('constructor', () => {
    it('should create GameState with valid type', () => {
      const gameState = new GameState(GameStateType.WAITING_FOR_PLAYERS);
      expect(gameState.getType()).toBe(GameStateType.WAITING_FOR_PLAYERS);
      expect(gameState.getTimestamp()).toBeGreaterThan(0);
    });

    it('should record timestamp when created', () => {
      const before = Date.now();
      const gameState = new GameState(GameStateType.IN_PROGRESS);
      const after = Date.now();
      
      expect(gameState.getTimestamp()).toBeGreaterThanOrEqual(before);
      expect(gameState.getTimestamp()).toBeLessThanOrEqual(after);
    });
  });

  describe('equals', () => {
    it('should return true for same state types', () => {
      const state1 = new GameState(GameStateType.IN_PROGRESS);
      const state2 = new GameState(GameStateType.IN_PROGRESS);
      expect(state1.equals(state2)).toBe(true);
    });

    it('should return false for different state types', () => {
      const state1 = new GameState(GameStateType.IN_PROGRESS);
      const state2 = new GameState(GameStateType.FINISHED);
      expect(state1.equals(state2)).toBe(false);
    });
  });

  describe('isActive', () => {
    it('should return true for IN_PROGRESS state', () => {
      const gameState = new GameState(GameStateType.IN_PROGRESS);
      expect(gameState.isActive()).toBe(true);
    });

    it('should return false for non-active states', () => {
      const inactiveStates = [
        GameStateType.WAITING_FOR_PLAYERS,
        GameStateType.STARTING,
        GameStateType.ROUND_COMPLETED,
        GameStateType.FINISHED,
        GameStateType.PAUSED,
        GameStateType.ERROR
      ];

      inactiveStates.forEach(stateType => {
        const gameState = new GameState(stateType);
        expect(gameState.isActive()).toBe(false);
      });
    });
  });

  describe('canTransitionTo', () => {
    it('should allow valid transitions from WAITING_FOR_PLAYERS', () => {
      const gameState = new GameState(GameStateType.WAITING_FOR_PLAYERS);
      
      expect(gameState.canTransitionTo(GameStateType.STARTING)).toBe(true);
      expect(gameState.canTransitionTo(GameStateType.ERROR)).toBe(true);
      expect(gameState.canTransitionTo(GameStateType.IN_PROGRESS)).toBe(false);
      expect(gameState.canTransitionTo(GameStateType.FINISHED)).toBe(false);
    });

    it('should allow valid transitions from STARTING', () => {
      const gameState = new GameState(GameStateType.STARTING);
      
      expect(gameState.canTransitionTo(GameStateType.IN_PROGRESS)).toBe(true);
      expect(gameState.canTransitionTo(GameStateType.ERROR)).toBe(true);
      expect(gameState.canTransitionTo(GameStateType.FINISHED)).toBe(false);
    });

    it('should allow valid transitions from IN_PROGRESS', () => {
      const gameState = new GameState(GameStateType.IN_PROGRESS);
      
      expect(gameState.canTransitionTo(GameStateType.ROUND_COMPLETED)).toBe(true);
      expect(gameState.canTransitionTo(GameStateType.PAUSED)).toBe(true);
      expect(gameState.canTransitionTo(GameStateType.FINISHED)).toBe(true);
      expect(gameState.canTransitionTo(GameStateType.ERROR)).toBe(true);
      expect(gameState.canTransitionTo(GameStateType.WAITING_FOR_PLAYERS)).toBe(false);
    });

    it('should allow valid transitions from ROUND_COMPLETED', () => {
      const gameState = new GameState(GameStateType.ROUND_COMPLETED);
      
      expect(gameState.canTransitionTo(GameStateType.IN_PROGRESS)).toBe(true);
      expect(gameState.canTransitionTo(GameStateType.FINISHED)).toBe(true);
      expect(gameState.canTransitionTo(GameStateType.ERROR)).toBe(true);
      expect(gameState.canTransitionTo(GameStateType.PAUSED)).toBe(false);
    });

    it('should allow valid transitions from FINISHED', () => {
      const gameState = new GameState(GameStateType.FINISHED);
      
      expect(gameState.canTransitionTo(GameStateType.WAITING_FOR_PLAYERS)).toBe(true);
      expect(gameState.canTransitionTo(GameStateType.IN_PROGRESS)).toBe(false);
    });

    it('should allow valid transitions from PAUSED', () => {
      const gameState = new GameState(GameStateType.PAUSED);
      
      expect(gameState.canTransitionTo(GameStateType.IN_PROGRESS)).toBe(true);
      expect(gameState.canTransitionTo(GameStateType.FINISHED)).toBe(true);
      expect(gameState.canTransitionTo(GameStateType.ERROR)).toBe(true);
      expect(gameState.canTransitionTo(GameStateType.WAITING_FOR_PLAYERS)).toBe(false);
    });

    it('should allow valid transitions from ERROR', () => {
      const gameState = new GameState(GameStateType.ERROR);
      
      expect(gameState.canTransitionTo(GameStateType.WAITING_FOR_PLAYERS)).toBe(true);
      expect(gameState.canTransitionTo(GameStateType.IN_PROGRESS)).toBe(false);
    });
  });

  describe('GameStateType enum', () => {
    it('should have all required state types', () => {
      expect(GameStateType.WAITING_FOR_PLAYERS).toBe('waiting_for_players');
      expect(GameStateType.STARTING).toBe('starting');
      expect(GameStateType.IN_PROGRESS).toBe('in_progress');
      expect(GameStateType.ROUND_COMPLETED).toBe('round_completed');
      expect(GameStateType.FINISHED).toBe('finished');
      expect(GameStateType.PAUSED).toBe('paused');
      expect(GameStateType.ERROR).toBe('error');
    });
  });
});