export class Score {
  private readonly value: number;

  constructor(value: number) {
    this.value = this.validate(value);
  }

  private validate(value: number): number {
    if (value < 0) {
      throw new Error('Score cannot be negative');
    }
    if (!Number.isInteger(value)) {
      throw new Error('Score must be an integer');
    }
    return value;
  }

  getValue(): number { 
    return this.value; 
  }

  add(points: number): Score { 
    return new Score(this.value + points); 
  }

  equals(other: Score): boolean { 
    return this.value === other.value; 
  }

  toString(): string { 
    return this.value.toString(); 
  }

  static zero(): Score { 
    return new Score(0); 
  }

  static create(value: number): Score { 
    return new Score(value); 
  }
}