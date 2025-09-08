import { Word, WordDifficulty } from './Word';

describe('Word', () => {
  describe('constructor validation', () => {
    it('should create Word with valid hiragana text', () => {
      const word = new Word({
        text: 'ねこ',
        difficulty: WordDifficulty.EASY
      });
      
      expect(word.getText()).toBe('ねこ');
      expect(word.getDifficulty()).toBe(WordDifficulty.EASY);
      expect(word.getCategory()).toBe('general');
      expect(word.getCharacterCount()).toBe(2);
    });

    it('should create Word with custom category', () => {
      const word = new Word({
        text: 'いぬ',
        difficulty: WordDifficulty.EASY,
        category: 'animal'
      });
      
      expect(word.getCategory()).toBe('animal');
    });

    it('should throw error for empty text', () => {
      expect(() => new Word({
        text: '',
        difficulty: WordDifficulty.EASY
      })).toThrow('Word text cannot be empty');
    });

    it('should throw error for whitespace-only text', () => {
      expect(() => new Word({
        text: '   ',
        difficulty: WordDifficulty.EASY
      })).toThrow('Word text cannot be empty');
    });

    it('should throw error for non-hiragana characters', () => {
      expect(() => new Word({
        text: 'cat',
        difficulty: WordDifficulty.EASY
      })).toThrow('Word must contain only hiragana characters');

      expect(() => new Word({
        text: 'ねこabc',
        difficulty: WordDifficulty.EASY
      })).toThrow('Word must contain only hiragana characters');

      expect(() => new Word({
        text: 'ねこ123',
        difficulty: WordDifficulty.EASY
      })).toThrow('Word must contain only hiragana characters');
    });

    it('should throw error for text exceeding max length', () => {
      const longText = 'あ'.repeat(21);
      expect(() => new Word({
        text: longText,
        difficulty: WordDifficulty.HARD
      })).toThrow('Word cannot exceed 20 characters');
    });

    it('should trim whitespace from text', () => {
      const word = new Word({
        text: '  ねこ  ',
        difficulty: WordDifficulty.EASY
      });
      
      expect(word.getText()).toBe('ねこ');
    });
  });

  describe('difficulty validation', () => {
    describe('EASY difficulty (1-3 characters)', () => {
      it('should accept valid length for EASY', () => {
        const validWords = ['あ', 'ねこ', 'みかん'];
        
        validWords.forEach(text => {
          const word = new Word({
            text,
            difficulty: WordDifficulty.EASY
          });
          expect(word.getText()).toBe(text);
        });
      });

      it('should reject invalid length for EASY', () => {
        expect(() => new Word({
          text: 'ねこさん',
          difficulty: WordDifficulty.EASY
        })).toThrow('Word length 4 doesn\'t match difficulty easy');
      });
    });

    describe('MEDIUM difficulty (4-6 characters)', () => {
      it('should accept valid length for MEDIUM', () => {
        const validWords = ['ねこさん', 'りんごの', 'おはようさん'];
        
        validWords.forEach(text => {
          const word = new Word({
            text,
            difficulty: WordDifficulty.MEDIUM
          });
          expect(word.getText()).toBe(text);
        });
      });

      it('should reject invalid length for MEDIUM', () => {
        expect(() => new Word({
          text: 'ねこ',
          difficulty: WordDifficulty.MEDIUM
        })).toThrow('Word length 2 doesn\'t match difficulty medium');

        expect(() => new Word({
          text: 'おはようございます',
          difficulty: WordDifficulty.MEDIUM
        })).toThrow('Word length 9 doesn\'t match difficulty medium');
      });
    });

    describe('HARD difficulty (7-20 characters)', () => {
      it('should accept valid length for HARD', () => {
        const validWords = ['おはようございます', 'ありがとうございました'];
        
        validWords.forEach(text => {
          const word = new Word({
            text,
            difficulty: WordDifficulty.HARD
          });
          expect(word.getText()).toBe(text);
        });
      });

      it('should reject invalid length for HARD', () => {
        expect(() => new Word({
          text: 'ねこさん',
          difficulty: WordDifficulty.HARD
        })).toThrow('Word length 4 doesn\'t match difficulty hard');
      });
    });
  });

  describe('calculateBaseScore', () => {
    it('should calculate base score for EASY words', () => {
      const word = new Word({
        text: 'ねこ',
        difficulty: WordDifficulty.EASY
      });
      
      expect(word.calculateBaseScore()).toBe(20); // 10 * 2 characters
    });

    it('should calculate base score for MEDIUM words', () => {
      const word = new Word({
        text: 'ねこさん',
        difficulty: WordDifficulty.MEDIUM
      });
      
      expect(word.calculateBaseScore()).toBe(80); // 20 * 4 characters
    });

    it('should calculate base score for HARD words', () => {
      const word = new Word({
        text: 'おはようございます',
        difficulty: WordDifficulty.HARD
      });
      
      expect(word.calculateBaseScore()).toBe(270); // 30 * 9 characters
    });
  });

  describe('equals', () => {
    it('should return true for words with same text and difficulty', () => {
      const word1 = new Word({
        text: 'ねこ',
        difficulty: WordDifficulty.EASY
      });
      
      const word2 = new Word({
        text: 'ねこ',
        difficulty: WordDifficulty.EASY,
        category: 'animal'
      });
      
      expect(word1.equals(word2)).toBe(true);
    });

    it('should return false for words with different text', () => {
      const word1 = new Word({
        text: 'ねこ',
        difficulty: WordDifficulty.EASY
      });
      
      const word2 = new Word({
        text: 'いぬ',
        difficulty: WordDifficulty.EASY
      });
      
      expect(word1.equals(word2)).toBe(false);
    });

    it('should return false for words with different difficulty', () => {
      const word1 = new Word({
        text: 'ねこさん',
        difficulty: WordDifficulty.MEDIUM
      });
      
      const word2 = new Word({
        text: 'おはようございます',
        difficulty: WordDifficulty.HARD
      });
      
      expect(word1.equals(word2)).toBe(false);
    });
  });

  describe('WordDifficulty enum', () => {
    it('should have all required difficulty levels', () => {
      expect(WordDifficulty.EASY).toBe('easy');
      expect(WordDifficulty.MEDIUM).toBe('medium');
      expect(WordDifficulty.HARD).toBe('hard');
    });
  });
});