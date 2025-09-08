export enum GameStateType {
  WAITING_FOR_PLAYERS = 'waiting_for_players',
  STARTING = 'starting',
  IN_PROGRESS = 'in_progress',
  ROUND_COMPLETED = 'round_completed',
  FINISHED = 'finished',
  PAUSED = 'paused',
  ERROR = 'error'
}

export class GameState {
  private readonly type: GameStateType;
  private readonly timestamp: number;

  constructor(type: GameStateType) {
    this.type = type;
    this.timestamp = Date.now();
  }

  getType(): GameStateType { 
    return this.type; 
  }

  getTimestamp(): number { 
    return this.timestamp; 
  }

  equals(other: GameState): boolean { 
    return this.type === other.type; 
  }
  
  isActive(): boolean {
    return this.type === GameStateType.IN_PROGRESS;
  }
  
  canTransitionTo(newState: GameStateType): boolean {
    const transitions: Record<GameStateType, GameStateType[]> = {
      [GameStateType.WAITING_FOR_PLAYERS]: [GameStateType.STARTING, GameStateType.ERROR],
      [GameStateType.STARTING]: [GameStateType.IN_PROGRESS, GameStateType.ERROR],
      [GameStateType.IN_PROGRESS]: [GameStateType.ROUND_COMPLETED, GameStateType.PAUSED, GameStateType.FINISHED, GameStateType.ERROR],
      [GameStateType.ROUND_COMPLETED]: [GameStateType.IN_PROGRESS, GameStateType.FINISHED, GameStateType.ERROR],
      [GameStateType.FINISHED]: [GameStateType.WAITING_FOR_PLAYERS],
      [GameStateType.PAUSED]: [GameStateType.IN_PROGRESS, GameStateType.FINISHED, GameStateType.ERROR],
      [GameStateType.ERROR]: [GameStateType.WAITING_FOR_PLAYERS]
    };
    
    return transitions[this.type].includes(newState);
  }
}