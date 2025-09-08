export enum WordDifficulty {
  EASY = 'easy',     // 3-6歳: ひらがな1-3文字
  MEDIUM = 'medium', // 4-6歳: ひらがな4-6文字
  HARD = 'hard'      // 5-6歳: ひらがな7文字以上
}

export interface WordConstructorProps {
  text: string;
  difficulty: WordDifficulty;
  category?: string;
}

export class Word {
  private readonly text: string;
  private readonly difficulty: WordDifficulty;
  private readonly category: string;
  private readonly characterCount: number;

  constructor(props: WordConstructorProps) {
    this.text = this.validateText(props.text);
    this.difficulty = props.difficulty;
    this.category = props.category || 'general';
    this.characterCount = this.text.length;
    this.validateDifficultyMatch();
  }

  private validateText(text: string): string {
    if (!text || text.trim().length === 0) {
      throw new Error('Word text cannot be empty');
    }
    
    const trimmed = text.trim();
    const hiraganaPattern = /^[あ-ん]+$/;
    
    if (!hiraganaPattern.test(trimmed)) {
      throw new Error('Word must contain only hiragana characters');
    }
    
    if (trimmed.length > 20) {
      throw new Error('Word cannot exceed 20 characters');
    }
    
    return trimmed;
  }

  private validateDifficultyMatch(): void {
    const difficultyRanges: Record<WordDifficulty, { min: number; max: number }> = {
      [WordDifficulty.EASY]: { min: 1, max: 3 },
      [WordDifficulty.MEDIUM]: { min: 4, max: 6 },
      [WordDifficulty.HARD]: { min: 7, max: 20 }
    };
    
    const range = difficultyRanges[this.difficulty];
    if (this.characterCount < range.min || this.characterCount > range.max) {
      throw new Error(`Word length ${this.characterCount} doesn't match difficulty ${this.difficulty}`);
    }
  }

  getText(): string { return this.text; }
  getDifficulty(): WordDifficulty { return this.difficulty; }
  getCategory(): string { return this.category; }
  getCharacterCount(): number { return this.characterCount; }

  calculateBaseScore(): number {
    const basePoints: Record<WordDifficulty, number> = {
      [WordDifficulty.EASY]: 10,
      [WordDifficulty.MEDIUM]: 20,
      [WordDifficulty.HARD]: 30
    };
    return basePoints[this.difficulty] * this.characterCount;
  }

  equals(other: Word): boolean {
    return this.text === other.text && this.difficulty === other.difficulty;
  }
}