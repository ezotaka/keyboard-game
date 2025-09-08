import { PlayerId } from '../value-objects/PlayerId';
import { TeamId } from '../value-objects/TeamId';
import { KeyboardId } from '../value-objects/KeyboardId';

export interface PlayerConstructorProps {
  id: PlayerId;
  teamId: TeamId;
  keyboardId: KeyboardId;
  name?: string;
}

export class Player {
  private readonly id: PlayerId;
  private readonly teamId: TeamId;
  private keyboardId: KeyboardId;
  private name: string;
  private isActive: boolean;
  private lastInputTimestamp?: number;

  constructor(props: PlayerConstructorProps) {
    this.validateProps(props);
    this.id = props.id;
    this.teamId = props.teamId;
    this.keyboardId = props.keyboardId;
    this.name = props.name || `Player ${props.id.getValue()}`;
    this.isActive = true;
  }

  private validateProps(props: PlayerConstructorProps): void {
    if (!props.id || !props.teamId || !props.keyboardId) {
      throw new Error('Player requires id, teamId, and keyboardId');
    }
  }

  // Getters
  getId(): PlayerId { return this.id; }
  getTeamId(): TeamId { return this.teamId; }
  getKeyboardId(): KeyboardId { return this.keyboardId; }
  getName(): string { return this.name; }
  getIsActive(): boolean { return this.isActive; }
  getLastInputTimestamp(): number | undefined { return this.lastInputTimestamp; }

  // Business Logic
  assignKeyboard(keyboardId: KeyboardId): void {
    this.keyboardId = keyboardId;
  }

  recordInput(timestamp: number): void {
    this.lastInputTimestamp = timestamp;
  }

  activate(): void {
    this.isActive = true;
  }

  deactivate(): void {
    this.isActive = false;
  }

  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Player name cannot be empty');
    }
    this.name = name.trim();
  }

  equals(other: Player): boolean {
    return this.id.equals(other.id);
  }
}