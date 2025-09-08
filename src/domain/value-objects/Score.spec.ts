import { Score } from './Score';

describe('Score', () => {
  describe('constructor validation', () => {
    it('should create Score with valid positive value', () => {
      const score = new Score(100);
      expect(score.getValue()).toBe(100);
    });

    it('should create Score with zero value', () => {
      const score = new Score(0);
      expect(score.getValue()).toBe(0);
    });

    it('should throw error for negative value', () => {
      expect(() => new Score(-1)).toThrow('Score cannot be negative');
      expect(() => new Score(-100)).toThrow('Score cannot be negative');
    });

    it('should throw error for non-integer value', () => {
      expect(() => new Score(10.5)).toThrow('Score must be an integer');
      expect(() => new Score(3.14)).toThrow('Score must be an integer');
    });
  });

  describe('add method', () => {
    it('should add positive points to score', () => {
      const score = new Score(100);
      const newScore = score.add(50);
      
      expect(newScore.getValue()).toBe(150);
      expect(score.getValue()).toBe(100); // Original score unchanged
    });

    it('should handle adding zero points', () => {
      const score = new Score(100);
      const newScore = score.add(0);
      
      expect(newScore.getValue()).toBe(100);
    });

    it('should handle adding negative points (subtraction)', () => {
      const score = new Score(100);
      const newScore = score.add(-30);
      
      expect(newScore.getValue()).toBe(70);
    });

    it('should throw error if result becomes negative', () => {
      const score = new Score(50);
      expect(() => score.add(-100)).toThrow('Score cannot be negative');
    });
  });

  describe('equals method', () => {
    it('should return true for same score values', () => {
      const score1 = new Score(100);
      const score2 = new Score(100);
      expect(score1.equals(score2)).toBe(true);
    });

    it('should return false for different score values', () => {
      const score1 = new Score(100);
      const score2 = new Score(200);
      expect(score1.equals(score2)).toBe(false);
    });
  });

  describe('toString method', () => {
    it('should return string representation of score', () => {
      const score = new Score(100);
      expect(score.toString()).toBe('100');
    });
  });

  describe('static factory methods', () => {
    describe('zero', () => {
      it('should create score with zero value', () => {
        const score = Score.zero();
        expect(score.getValue()).toBe(0);
      });
    });

    describe('create', () => {
      it('should create score with specified value', () => {
        const score = Score.create(250);
        expect(score.getValue()).toBe(250);
      });

      it('should throw error for negative value', () => {
        expect(() => Score.create(-10)).toThrow('Score cannot be negative');
      });
    });
  });
});