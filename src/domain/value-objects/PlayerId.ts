import { TeamId } from './TeamId';

export class PlayerId {
  private readonly value: string;

  constructor(value: string) {
    this.value = this.validate(value);
  }

  private validate(value: string): string {
    if (!value || value.trim().length === 0) {
      throw new Error('PlayerId cannot be empty');
    }
    if (value.length > 50) {
      throw new Error('PlayerId cannot exceed 50 characters');
    }
    return value.trim();
  }

  getValue(): string { 
    return this.value; 
  }

  equals(other: PlayerId): boolean { 
    return this.value === other.value; 
  }

  toString(): string { 
    return this.value; 
  }

  static generate(teamId: TeamId): PlayerId {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return new PlayerId(`${teamId.getValue()}-player-${timestamp}-${random}`);
  }
}