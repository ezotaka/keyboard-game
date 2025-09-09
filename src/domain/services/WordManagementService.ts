import { Word, WordDifficulty } from '../entities/Word';

export interface PlayerPerformance {
  correctCount: number;
  totalCount: number;
  averageTime: number;
}

export interface WordCollectionValidation {
  isValid: boolean;
  issues: string[];
}

export class WordManagementService {
  /**
   * Selects a random word from the collection
   */
  selectRandomWord(words: Word[]): Word {
    if (words.length === 0) {
      throw new Error('No words available for selection');
    }
    
    const randomIndex = Math.floor(Math.random() * words.length);
    return words[randomIndex];
  }

  /**
   * Selects a random word with the specified difficulty
   */
  selectWordByDifficulty(words: Word[], difficulty: WordDifficulty): Word {
    const filteredWords = this.filterByDifficulty(words, difficulty);
    
    if (filteredWords.length === 0) {
      throw new Error(`No words available for difficulty: ${difficulty}`);
    }
    
    return this.selectRandomWord(filteredWords);
  }

  /**
   * Selects a random word from the specified category
   */
  selectWordByCategory(words: Word[], category: string): Word {
    const filteredWords = this.filterByCategory(words, category);
    
    if (filteredWords.length === 0) {
      throw new Error(`No words available for category: ${category}`);
    }
    
    return this.selectRandomWord(filteredWords);
  }

  /**
   * Filters words by difficulty level
   */
  filterByDifficulty(words: Word[], difficulty: WordDifficulty): Word[] {
    return words.filter(word => word.getDifficulty() === difficulty);
  }

  /**
   * Filters words by category
   */
  filterByCategory(words: Word[], category: string): Word[] {
    return words.filter(word => word.getCategory() === category);
  }

  /**
   * Filters words by character count range
   */
  filterByCharacterCount(words: Word[], minLength: number, maxLength: number): Word[] {
    return words.filter(word => {
      const count = word.getCharacterCount();
      return count >= minLength && count <= maxLength;
    });
  }

  /**
   * Gets all available categories from the word collection
   */
  getAvailableCategories(words: Word[]): string[] {
    const categories = new Set<string>();
    words.forEach(word => categories.add(word.getCategory()));
    return Array.from(categories).sort();
  }

  /**
   * Gets all available difficulty levels from the word collection
   */
  getAvailableDifficulties(words: Word[]): WordDifficulty[] {
    const difficulties = new Set<WordDifficulty>();
    words.forEach(word => difficulties.add(word.getDifficulty()));
    return Array.from(difficulties);
  }

  /**
   * Generates a progressive sequence starting with easier words
   */
  generateProgressiveSequence(words: Word[], count: number): Word[] {
    if (count <= 0) {
      return [];
    }

    const sequence: Word[] = [];
    const usedWords = new Set<string>();
    
    // Define progression pattern: start easy, gradually increase difficulty
    const difficultyProgression = this.calculateDifficultyProgression(count);
    
    for (const targetDifficulty of difficultyProgression) {
      const availableWords = words.filter(word => 
        word.getDifficulty() === targetDifficulty && 
        !usedWords.has(word.getText())
      );
      
      if (availableWords.length > 0) {
        const selectedWord = this.selectRandomWord(availableWords);
        sequence.push(selectedWord);
        usedWords.add(selectedWord.getText());
      } else {
        // Fallback: select any unused word
        const fallbackWords = words.filter(word => !usedWords.has(word.getText()));
        if (fallbackWords.length > 0) {
          const selectedWord = this.selectRandomWord(fallbackWords);
          sequence.push(selectedWord);
          usedWords.add(selectedWord.getText());
        }
      }
    }
    
    return sequence;
  }

  /**
   * Generates an adaptive sequence based on player performance
   */
  generateAdaptiveSequence(words: Word[], count: number, performance: PlayerPerformance): Word[] {
    if (count <= 0) {
      return [];
    }

    const accuracyRate = performance.correctCount / performance.totalCount;
    const isHighPerformer = accuracyRate >= 0.7 && performance.averageTime <= 3000;
    const isLowPerformer = accuracyRate <= 0.4 || performance.averageTime >= 6000;
    
    let targetDifficulties: WordDifficulty[];
    
    if (isHighPerformer) {
      // Challenge high performers with harder words
      targetDifficulties = [WordDifficulty.MEDIUM, WordDifficulty.HARD, WordDifficulty.HARD];
    } else if (isLowPerformer) {
      // Help low performers with easier words
      targetDifficulties = [WordDifficulty.EASY, WordDifficulty.EASY, WordDifficulty.MEDIUM];
    } else {
      // Balanced progression for average performers
      targetDifficulties = [WordDifficulty.EASY, WordDifficulty.MEDIUM, WordDifficulty.HARD];
    }
    
    // Extend or truncate to match desired count
    while (targetDifficulties.length < count) {
      targetDifficulties.push(targetDifficulties[targetDifficulties.length - 1]);
    }
    targetDifficulties = targetDifficulties.slice(0, count);
    
    const sequence: Word[] = [];
    const usedWords = new Set<string>();
    
    for (const targetDifficulty of targetDifficulties) {
      const availableWords = words.filter(word => 
        word.getDifficulty() === targetDifficulty && 
        !usedWords.has(word.getText())
      );
      
      if (availableWords.length > 0) {
        const selectedWord = this.selectRandomWord(availableWords);
        sequence.push(selectedWord);
        usedWords.add(selectedWord.getText());
      } else {
        // Fallback: select any unused word
        const fallbackWords = words.filter(word => !usedWords.has(word.getText()));
        if (fallbackWords.length > 0) {
          const selectedWord = this.selectRandomWord(fallbackWords);
          sequence.push(selectedWord);
          usedWords.add(selectedWord.getText());
        }
      }
    }
    
    return sequence;
  }

  /**
   * Validates word collection for completeness and quality
   */
  validateWordCollection(words: Word[]): WordCollectionValidation {
    const issues: string[] = [];
    
    // Check minimum word count
    if (words.length < 10) {
      issues.push('Word collection should have at least 10 words');
    }
    
    // Check difficulty distribution
    const difficulties = this.getAvailableDifficulties(words);
    const allDifficulties = [WordDifficulty.EASY, WordDifficulty.MEDIUM, WordDifficulty.HARD];
    
    for (const difficulty of allDifficulties) {
      if (!difficulties.includes(difficulty)) {
        issues.push(`Missing words for difficulty: ${difficulty}`);
      } else {
        const count = this.filterByDifficulty(words, difficulty).length;
        if (count < 2) {
          issues.push(`Insufficient words for difficulty ${difficulty}: need at least 2, got ${count}`);
        }
      }
    }
    
    // Check for duplicates
    const texts = new Set<string>();
    for (const word of words) {
      if (texts.has(word.getText())) {
        issues.push(`Duplicate word found: ${word.getText()}`);
      }
      texts.add(word.getText());
    }
    
    // Check category distribution
    const categories = this.getAvailableCategories(words);
    if (categories.length < 3) {
      issues.push('Word collection should have at least 3 different categories');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Calculates difficulty distribution statistics
   */
  calculateDifficultyDistribution(words: Word[]): Map<WordDifficulty, number> {
    const distribution = new Map<WordDifficulty, number>();
    
    // Initialize all difficulties with 0
    Object.values(WordDifficulty).forEach(difficulty => {
      distribution.set(difficulty, 0);
    });
    
    // Count words for each difficulty
    words.forEach(word => {
      const current = distribution.get(word.getDifficulty()) || 0;
      distribution.set(word.getDifficulty(), current + 1);
    });
    
    return distribution;
  }

  /**
   * Calculates category distribution statistics
   */
  calculateCategoryDistribution(words: Word[]): Map<string, number> {
    const distribution = new Map<string, number>();
    
    words.forEach(word => {
      const category = word.getCategory();
      const current = distribution.get(category) || 0;
      distribution.set(category, current + 1);
    });
    
    return distribution;
  }

  /**
   * Calculates average character count by difficulty
   */
  calculateAverageCharacterCountByDifficulty(words: Word[]): Map<WordDifficulty, number> {
    const averages = new Map<WordDifficulty, number>();
    const counts = new Map<WordDifficulty, { total: number; count: number }>();
    
    // Initialize counters
    Object.values(WordDifficulty).forEach(difficulty => {
      counts.set(difficulty, { total: 0, count: 0 });
    });
    
    // Accumulate counts
    words.forEach(word => {
      const difficulty = word.getDifficulty();
      const current = counts.get(difficulty)!;
      current.total += word.getCharacterCount();
      current.count += 1;
    });
    
    // Calculate averages
    counts.forEach((value, difficulty) => {
      if (value.count > 0) {
        averages.set(difficulty, value.total / value.count);
      }
    });
    
    return averages;
  }

  /**
   * Calculates difficulty progression pattern for a given count
   */
  private calculateDifficultyProgression(count: number): WordDifficulty[] {
    const progression: WordDifficulty[] = [];
    
    if (count === 1) {
      return [WordDifficulty.EASY];
    }
    
    if (count === 2) {
      return [WordDifficulty.EASY, WordDifficulty.MEDIUM];
    }
    
    if (count === 3) {
      return [WordDifficulty.EASY, WordDifficulty.MEDIUM, WordDifficulty.HARD];
    }
    
    // For 4 or more words, create a balanced progression
    const easyCount = Math.floor(count * 0.4);
    const mediumCount = Math.floor(count * 0.4);
    const hardCount = count - easyCount - mediumCount;
    
    // Add easy words first
    for (let i = 0; i < easyCount; i++) {
      progression.push(WordDifficulty.EASY);
    }
    
    // Add medium words
    for (let i = 0; i < mediumCount; i++) {
      progression.push(WordDifficulty.MEDIUM);
    }
    
    // Add hard words
    for (let i = 0; i < hardCount; i++) {
      progression.push(WordDifficulty.HARD);
    }
    
    return progression;
  }
}