import { GameState, GameStateType } from '../value-objects/GameState';
import { TeamId } from '../value-objects/TeamId';
import { Score } from '../value-objects/Score';
import { Word } from './Word';

export interface GameConstructorProps {
  teamIds: TeamId[];
  targetScore: Score;
  currentWord: Word;
}

export class Game {
  private readonly id: string;
  private state: GameState;
  private readonly teamIds: TeamId[];
  private readonly targetScore: Score;
  private currentWord: Word;
  private teamScores: Map<string, Score>;
  private winner?: TeamId;
  private readonly createdAt: number;

  constructor(props: GameConstructorProps) {
    this.validateProps(props);
    this.id = this.generateId();
    this.state = new GameState(GameStateType.WAITING_FOR_PLAYERS);
    this.teamIds = [...props.teamIds];
    this.targetScore = props.targetScore;
    this.currentWord = props.currentWord;
    this.teamScores = new Map();
    this.createdAt = Date.now();
    
    // Initialize all team scores to zero
    this.teamIds.forEach(teamId => {
      this.teamScores.set(teamId.getValue(), Score.zero());
    });
  }

  private validateProps(props: GameConstructorProps): void {
    if (!props.teamIds || props.teamIds.length < 2) {
      throw new Error('Game requires at least 2 teams');
    }
    
    if (props.teamIds.length > 8) {
      throw new Error('Game cannot have more than 8 teams');
    }
    
    if (!props.targetScore || props.targetScore.getValue() <= 0) {
      throw new Error('Target score must be positive');
    }
    
    if (!props.currentWord) {
      throw new Error('Current word is required');
    }
    
    // Check for duplicate team IDs
    const uniqueTeamIds = new Set(props.teamIds.map(id => id.getValue()));
    if (uniqueTeamIds.size !== props.teamIds.length) {
      throw new Error('Duplicate team IDs are not allowed');
    }
  }

  private generateId(): string {
    return `game-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  // Getters
  getId(): string { return this.id; }
  getState(): GameState { return this.state; }
  getTeamIds(): TeamId[] { return [...this.teamIds]; }
  getTargetScore(): Score { return this.targetScore; }
  getCurrentWord(): Word { return this.currentWord; }
  getCreatedAt(): number { return this.createdAt; }
  getWinner(): TeamId | undefined { return this.winner; }

  // Game State Management
  start(): void {
    this.transitionTo(GameStateType.STARTING);
    this.transitionTo(GameStateType.IN_PROGRESS);
  }

  finish(): void {
    this.transitionTo(GameStateType.FINISHED);
  }

  pause(): void {
    this.transitionTo(GameStateType.PAUSED);
  }

  resume(): void {
    if (this.state.getType() !== GameStateType.PAUSED) {
      throw new Error('Can only resume from paused state');
    }
    this.transitionTo(GameStateType.IN_PROGRESS);
  }

  private transitionTo(newStateType: GameStateType): void {
    if (!this.state.canTransitionTo(newStateType)) {
      throw new Error(`Cannot transition from ${this.state.getType()} to ${newStateType}`);
    }
    this.state = new GameState(newStateType);
  }

  // Score Management
  addScore(teamId: TeamId, points: Score): void {
    if (!this.hasTeam(teamId)) {
      throw new Error('Team not found in game');
    }
    
    const currentScore = this.teamScores.get(teamId.getValue()) || Score.zero();
    const newScore = currentScore.add(points.getValue());
    this.teamScores.set(teamId.getValue(), newScore);
    
    // Check if target score reached
    if (newScore.getValue() >= this.targetScore.getValue()) {
      this.winner = teamId;
    }
  }

  getTeamScore(teamId: TeamId): Score {
    if (!this.hasTeam(teamId)) {
      throw new Error('Team not found in game');
    }
    return this.teamScores.get(teamId.getValue()) || Score.zero();
  }

  getAllTeamScores(): Map<string, Score> {
    return new Map(this.teamScores);
  }

  hasWinner(): boolean {
    return this.winner !== undefined;
  }

  // Word Management
  setCurrentWord(word: Word): void {
    this.currentWord = word;
  }

  // Team Management
  hasTeam(teamId: TeamId): boolean {
    return this.teamIds.some(id => id.equals(teamId));
  }

  getTeamCount(): number {
    return this.teamIds.length;
  }

  // Game Statistics
  getGameDuration(): number {
    return Date.now() - this.createdAt;
  }

  isActive(): boolean {
    return this.state.isActive();
  }

  equals(other: Game): boolean {
    return this.id === other.id;
  }
}