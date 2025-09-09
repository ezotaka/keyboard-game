import { WordManagementService } from './WordManagementService';
import { Word, WordDifficulty } from '../entities/Word';

describe('WordManagementService', () => {
  let service: WordManagementService;
  let words: Word[];

  beforeEach(() => {
    service = new WordManagementService();
    
    words = [
      new Word({ text: 'ねこ', difficulty: WordDifficulty.EASY, category: 'animals' }), // 2文字 = EASY
      new Word({ text: 'いぬ', difficulty: WordDifficulty.EASY, category: 'animals' }), // 2文字 = EASY
      new Word({ text: 'さくら', difficulty: WordDifficulty.EASY, category: 'nature' }), // 3文字 = EASY
      new Word({ text: 'ひこうき', difficulty: WordDifficulty.MEDIUM, category: 'transport' }), // 4文字 = MEDIUM
      new Word({ text: 'とうきょう', difficulty: WordDifficulty.MEDIUM, category: 'places' }), // 5文字 = MEDIUM
      new Word({ text: 'ぞう', difficulty: WordDifficulty.EASY, category: 'animals' }), // 2文字 = EASY
      new Word({ text: 'すいぞくかん', difficulty: WordDifficulty.MEDIUM, category: 'places' }), // 6文字 = MEDIUM
      new Word({ text: 'でんしゃのうんてんしゅ', difficulty: WordDifficulty.HARD, category: 'transport' }), // 11文字 = HARD
      new Word({ text: 'うさぎ', difficulty: WordDifficulty.EASY, category: 'animals' }), // 3文字 = EASY
      new Word({ text: 'おおさか', difficulty: WordDifficulty.MEDIUM, category: 'places' }), // 4文字 = MEDIUM
      new Word({ text: 'じどうしゃのうんてん', difficulty: WordDifficulty.HARD, category: 'transport' }), // 10文字 = HARD
    ];
  });

  describe('Word Selection', () => {
    it('should select random word from collection', () => {
      const selectedWord = service.selectRandomWord(words);
      expect(words).toContain(selectedWord);
    });

    it('should throw error if no words available', () => {
      expect(() => {
        service.selectRandomWord([]);
      }).toThrow('No words available for selection');
    });

    it('should select word by difficulty', () => {
      const easyWord = service.selectWordByDifficulty(words, WordDifficulty.EASY);
      expect(easyWord.getDifficulty()).toBe(WordDifficulty.EASY);
    });

    it('should throw error if no words match difficulty', () => {
      const hardWords = words.filter(w => w.getDifficulty() === WordDifficulty.HARD);
      expect(() => {
        service.selectWordByDifficulty(hardWords, WordDifficulty.EASY);
      }).toThrow('No words available for difficulty: easy');
    });

    it('should select word by category', () => {
      const animalWord = service.selectWordByCategory(words, 'animals');
      expect(animalWord.getCategory()).toBe('animals');
    });

    it('should throw error if no words match category', () => {
      expect(() => {
        service.selectWordByCategory(words, 'food');
      }).toThrow('No words available for category: food');
    });
  });

  describe('Word Filtering', () => {
    it('should filter words by difficulty', () => {
      const easyWords = service.filterByDifficulty(words, WordDifficulty.EASY);
      expect(easyWords).toHaveLength(5); // ねこ, いぬ, さくら, ぞう, うさぎ
      expect(easyWords.every(w => w.getDifficulty() === WordDifficulty.EASY)).toBe(true);
    });

    it('should filter words by category', () => {
      const animalWords = service.filterByCategory(words, 'animals');
      expect(animalWords).toHaveLength(4); // ねこ, いぬ, ぞう, うさぎ
      expect(animalWords.every(w => w.getCategory() === 'animals')).toBe(true);
    });

    it('should filter words by character count range', () => {
      const shortWords = service.filterByCharacterCount(words, 1, 3);
      expect(shortWords).toHaveLength(5); // ねこ, いぬ, さくら, ぞう, うさぎ
      expect(shortWords.every(w => w.getCharacterCount() >= 1 && w.getCharacterCount() <= 3)).toBe(true);
    });

    it('should get available categories', () => {
      const categories = service.getAvailableCategories(words);
      expect(categories).toContain('animals');
      expect(categories).toContain('nature');
      expect(categories).toContain('transport');
      expect(categories).toContain('places');
      expect(categories).toHaveLength(4);
    });

    it('should get available difficulties', () => {
      const difficulties = service.getAvailableDifficulties(words);
      expect(difficulties).toContain(WordDifficulty.EASY);
      expect(difficulties).toContain(WordDifficulty.MEDIUM);
      expect(difficulties).toContain(WordDifficulty.HARD);
      expect(difficulties).toHaveLength(3);
    });
  });

  describe('Word Progression', () => {
    it('should generate progressive word sequence', () => {
      const sequence = service.generateProgressiveSequence(words, 3);
      expect(sequence).toHaveLength(3);
      
      // Should start with easier words
      expect(sequence[0].getDifficulty()).toBe(WordDifficulty.EASY);
      
      // Should progress in difficulty
      const difficulties = sequence.map(w => w.getDifficulty());
      expect(difficulties.indexOf(WordDifficulty.HARD)).toBeGreaterThan(
        difficulties.indexOf(WordDifficulty.EASY)
      );
    });

    it('should generate adaptive sequence based on performance', () => {
      const highPerformance = { correctCount: 8, totalCount: 10, averageTime: 2000 };
      const sequence = service.generateAdaptiveSequence(words, 3, highPerformance);
      
      expect(sequence).toHaveLength(3);
      
      // Should include more challenging words for high performance
      const hardWords = sequence.filter(w => w.getDifficulty() === WordDifficulty.HARD);
      expect(hardWords.length).toBeGreaterThan(0);
    });

    it('should generate easier sequence for low performance', () => {
      const lowPerformance = { correctCount: 3, totalCount: 10, averageTime: 8000 };
      const sequence = service.generateAdaptiveSequence(words, 3, lowPerformance);
      
      expect(sequence).toHaveLength(3);
      
      // Should include more easy words for low performance
      const easyWords = sequence.filter(w => w.getDifficulty() === WordDifficulty.EASY);
      expect(easyWords.length).toBeGreaterThan(0);
    });
  });

  describe('Word Validation', () => {
    it('should validate word collection completeness', () => {
      const isComplete = service.validateWordCollection(words);
      expect(isComplete.isValid).toBe(true);
      expect(isComplete.issues).toHaveLength(0);
    });

    it('should detect missing difficulties', () => {
      const limitedWords = words.filter(w => w.getDifficulty() !== WordDifficulty.HARD);
      const validation = service.validateWordCollection(limitedWords);
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Missing words for difficulty: hard');
    });

    it('should detect insufficient words per category', () => {
      const limitedWords = [words[0]]; // Only one word
      const validation = service.validateWordCollection(limitedWords);
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('Insufficient words'))).toBe(true);
    });

    it('should check word uniqueness', () => {
      const duplicateWords = [...words, words[0]]; // Add duplicate
      const validation = service.validateWordCollection(duplicateWords);
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('Duplicate word'))).toBe(true);
    });
  });

  describe('Word Statistics', () => {
    it('should calculate difficulty distribution', () => {
      const distribution = service.calculateDifficultyDistribution(words);
      
      expect(distribution.get(WordDifficulty.EASY)).toBe(5);
      expect(distribution.get(WordDifficulty.MEDIUM)).toBe(4);
      expect(distribution.get(WordDifficulty.HARD)).toBe(2);
    });

    it('should calculate category distribution', () => {
      const distribution = service.calculateCategoryDistribution(words);
      
      expect(distribution.get('animals')).toBe(4);
      expect(distribution.get('nature')).toBe(1);
      expect(distribution.get('transport')).toBe(3);
      expect(distribution.get('places')).toBe(3);
    });

    it('should calculate average character count by difficulty', () => {
      const averages = service.calculateAverageCharacterCountByDifficulty(words);
      
      expect(averages.get(WordDifficulty.EASY)).toBe(2.4); // (2+2+3+2+3)/5
      expect(averages.get(WordDifficulty.MEDIUM)).toBe(4.75); // (4+5+6+4)/4
      expect(averages.get(WordDifficulty.HARD)).toBe(10.5); // (11+10)/2
    });
  });
});