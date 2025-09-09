import { TeamId } from '../value-objects/TeamId';
import { Score } from '../value-objects/Score';
import { Player } from './Player';
import { PlayerId } from '../value-objects/PlayerId';

export interface TeamConstructorProps {
  id: TeamId;
  name?: string;
  players: Player[];
}

export class Team {
  private readonly id: TeamId;
  private name: string;
  private players: Player[];
  private score: Score;
  private isTeamActive: boolean;
  private readonly createdAt: number;

  constructor(props: TeamConstructorProps) {
    this.validateProps(props);
    this.id = props.id;
    this.name = props.name || `Team ${props.id.getTeamNumber()}`;
    this.players = [...props.players];
    this.score = Score.zero();
    this.isTeamActive = true;
    this.createdAt = Date.now();
  }

  private validateProps(props: TeamConstructorProps): void {
    if (!props.id) {
      throw new Error('Team ID is required');
    }

    if (!props.players || props.players.length === 0) {
      throw new Error('Team must have at least one player');
    }

    // Validate all players belong to this team
    const invalidPlayers = props.players.filter(
      player => !player.getTeamId().equals(props.id)
    );
    
    if (invalidPlayers.length > 0) {
      throw new Error('All players must belong to this team');
    }
  }

  // Getters
  getId(): TeamId { return this.id; }
  getName(): string { return this.name; }
  getPlayers(): Player[] { return [...this.players]; }
  getScore(): Score { return this.score; }
  isActive(): boolean { return this.isTeamActive; }
  getCreatedAt(): number { return this.createdAt; }

  // Player Management
  addPlayer(player: Player): void {
    if (!player.getTeamId().equals(this.id)) {
      throw new Error('Player must belong to this team');
    }

    if (this.hasPlayer(player.getId())) {
      throw new Error('Player already exists in team');
    }

    this.players.push(player);
  }

  removePlayer(playerId: PlayerId): void {
    if (this.players.length <= 1) {
      throw new Error('Cannot remove the last player from team');
    }

    const playerIndex = this.players.findIndex(p => p.getId().equals(playerId));
    if (playerIndex === -1) {
      throw new Error('Player not found in team');
    }

    this.players.splice(playerIndex, 1);
  }

  hasPlayer(playerId: PlayerId): boolean {
    return this.players.some(player => player.getId().equals(playerId));
  }

  getPlayer(playerId: PlayerId): Player | undefined {
    return this.players.find(player => player.getId().equals(playerId));
  }

  // Score Management
  addScore(points: Score): void {
    this.score = this.score.add(points.getValue());
  }

  resetScore(): void {
    this.score = Score.zero();
  }

  // Team State Management
  activate(): void {
    this.isTeamActive = true;
  }

  deactivate(): void {
    this.isTeamActive = false;
  }

  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Team name cannot be empty');
    }
    this.name = name.trim();
  }

  // Statistics
  getPlayerCount(): number {
    return this.players.length;
  }

  getActivePlayerCount(): number {
    return this.players.filter(player => player.getIsActive()).length;
  }

  getActivePlayers(): Player[] {
    return this.players.filter(player => player.getIsActive());
  }

  // Business Logic
  canParticipate(): boolean {
    return this.isTeamActive && this.getActivePlayerCount() > 0;
  }

  equals(other: Team): boolean {
    return this.id.equals(other.id);
  }
}