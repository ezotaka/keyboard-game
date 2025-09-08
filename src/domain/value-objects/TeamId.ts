export class TeamId {
  private readonly value: string;
  private static readonly VALID_PATTERN = /^team-[1-8]$/;

  constructor(value: string) {
    this.value = this.validate(value);
  }

  private validate(value: string): string {
    if (!TeamId.VALID_PATTERN.test(value)) {
      throw new Error('TeamId must be in format "team-{1-8}"');
    }
    return value;
  }

  getValue(): string { 
    return this.value; 
  }

  getTeamNumber(): number { 
    return parseInt(this.value.split('-')[1]); 
  }

  equals(other: TeamId): boolean { 
    return this.value === other.value; 
  }

  toString(): string { 
    return this.value; 
  }

  static create(teamNumber: number): TeamId {
    if (teamNumber < 1 || teamNumber > 8) {
      throw new Error('Team number must be between 1 and 8');
    }
    return new TeamId(`team-${teamNumber}`);
  }
}