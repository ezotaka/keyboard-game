import { InputJudgmentService } from './InputJudgmentService';
import { Word, WordDifficulty } from '../entities/Word';
import { Player } from '../entities/Player';
import { Team } from '../entities/Team';
import { TeamId } from '../value-objects/TeamId';
import { PlayerId } from '../value-objects/PlayerId';
import { KeyboardId } from '../value-objects/KeyboardId';

describe('InputJudgmentService', () => {
  let service: InputJudgmentService;
  let targetWord: Word;
  let players: Player[];
  let teams: Team[];

  beforeEach(() => {
    service = new InputJudgmentService();
    
    targetWord = new Word({
      text: 'ねこ',
      difficulty: WordDifficulty.EASY,
      category: 'animals'
    });

    players = [
      new Player({
        id: new PlayerId('player-1'),
        teamId: TeamId.create(1),
        keyboardId: new KeyboardId('keyboard-1'),
        name: 'Player 1'
      }),
      new Player({
        id: new PlayerId('player-2'),
        teamId: TeamId.create(2),
        keyboardId: new KeyboardId('keyboard-2'),
        name: 'Player 2'
      })
    ];

    teams = [
      new Team({
        id: TeamId.create(1),
        name: 'Team Alpha',
        players: [players[0]]
      }),
      new Team({
        id: TeamId.create(2),
        name: 'Team Beta',
        players: [players[1]]
      })
    ];
  });

  describe('Input Processing', () => {
    it('should process valid character input', () => {
      const result = service.processInput('ね', targetWord, players[0]);
      
      expect(result.isCorrect).toBe(true);
      expect(result.isComplete).toBe(false);
      expect(result.progress).toBe(0.5); // 1 out of 2 characters
      expect(result.currentInput).toBe('ね');
      expect(result.remainingText).toBe('こ');
    });

    it('should process complete word input', () => {
      service.processInput('ね', targetWord, players[0]);
      const result = service.processInput('こ', targetWord, players[0]);
      
      expect(result.isCorrect).toBe(true);
      expect(result.isComplete).toBe(true);
      expect(result.progress).toBe(1.0);
      expect(result.currentInput).toBe('ねこ');
      expect(result.remainingText).toBe('');
    });

    it('should handle incorrect character input', () => {
      const result = service.processInput('い', targetWord, players[0]);
      
      expect(result.isCorrect).toBe(false);
      expect(result.isComplete).toBe(false);
      expect(result.progress).toBe(0);
      expect(result.currentInput).toBe('');
      expect(result.remainingText).toBe('ねこ');
      expect(result.errors).toBe(1);
    });

    it('should handle backspace', () => {
      service.processInput('ね', targetWord, players[0]);
      const result = service.processInput('\b', targetWord, players[0]);
      
      expect(result.currentInput).toBe('');
      expect(result.progress).toBe(0);
      expect(result.remainingText).toBe('ねこ');
    });

    it('should track typing speed', () => {
      const mockStartTime = 1000;
      const mockEndTime = 4000; // 3 seconds later
      let callCount = 0;
      
      jest.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        return callCount === 1 ? mockStartTime : mockEndTime;
      });
      
      service.processInput('ね', targetWord, players[0]);
      const result = service.processInput('こ', targetWord, players[0]);
      
      expect(result.typingSpeedCPM).toBeGreaterThan(0);
      expect(result.completionTime).toBeGreaterThan(0);
      
      jest.restoreAllMocks();
    });
  });

  describe('Competition Management', () => {
    it('should track multiple players progress', () => {
      const result1 = service.processInput('ね', targetWord, players[0]);
      const result2 = service.processInput('ね', targetWord, players[1]);
      
      expect(result1.isCorrect).toBe(true);
      expect(result2.isCorrect).toBe(true);
      
      const rankings = service.getCurrentRankings(targetWord);
      expect(rankings).toHaveLength(2);
      expect(rankings[0].progress).toBe(0.5);
      expect(rankings[1].progress).toBe(0.5);
    });

    it('should determine winner correctly', () => {
      service.processInput('ね', targetWord, players[0]);
      service.processInput('こ', targetWord, players[0]);
      
      service.processInput('ね', targetWord, players[1]);
      
      const winner = service.getWinner(targetWord);
      expect(winner?.playerId).toEqual(players[0].getId());
      expect(winner?.isComplete).toBe(true);
    });

    it('should handle simultaneous completion', () => {
      // Simulate simultaneous input (same timestamp)
      const mockTimestamp = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
      
      service.processInput('ね', targetWord, players[0]);
      service.processInput('こ', targetWord, players[0]);
      
      service.processInput('ね', targetWord, players[1]);
      service.processInput('こ', targetWord, players[1]);
      
      const winner = service.getWinner(targetWord);
      expect(winner?.playerId).toEqual(players[0].getId()); // First to complete wins
      
      jest.restoreAllMocks();
    });
  });

  describe('Team Competition', () => {
    it('should track team progress', () => {
      service.processInput('ね', targetWord, players[0]);
      service.processInput('こ', targetWord, players[0]);
      
      const teamResult = service.getTeamResult(targetWord, teams[0]);
      expect(teamResult.completedPlayers).toBe(1);
      expect(teamResult.totalPlayers).toBe(1);
      expect(teamResult.isTeamComplete).toBe(true);
    });

    it('should determine winning team', () => {
      service.processInput('ね', targetWord, players[0]);
      service.processInput('こ', targetWord, players[0]);
      
      const winningTeam = service.getWinningTeam(targetWord, teams);
      expect(winningTeam?.teamId).toEqual(TeamId.create(1));
    });

    it('should handle team with multiple players', () => {
      const team1Player2 = new Player({
        id: new PlayerId('player-3'),
        teamId: TeamId.create(1),
        keyboardId: new KeyboardId('keyboard-3'),
        name: 'Player 3'
      });
      
      teams[0].addPlayer(team1Player2);
      
      service.processInput('ね', targetWord, players[0]);
      service.processInput('こ', targetWord, players[0]);
      
      const teamResult = service.getTeamResult(targetWord, teams[0]);
      expect(teamResult.completedPlayers).toBe(1);
      expect(teamResult.totalPlayers).toBe(2);
      expect(teamResult.isTeamComplete).toBe(false);
    });
  });

  describe('Game Statistics', () => {
    it('should calculate accuracy', () => {
      service.processInput('ね', targetWord, players[0]);
      service.processInput('い', targetWord, players[0]); // Wrong
      service.processInput('こ', targetWord, players[0]);
      
      const stats = service.getPlayerStatistics(targetWord, players[0]);
      expect(stats.accuracy).toBe(2/3); // 2 correct out of 3 inputs
      expect(stats.errorCount).toBe(1);
      expect(stats.correctCharacters).toBe(2);
    });

    it('should calculate words per minute', () => {
      const mockStartTime = 1000;
      const mockEndTime = 61000; // 1 minute later
      let callCount = 0;
      
      jest.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        return callCount === 1 ? mockStartTime : mockEndTime;
      });
      
      service.processInput('ね', targetWord, players[0]);
      service.processInput('こ', targetWord, players[0]);
      
      const stats = service.getPlayerStatistics(targetWord, players[0]);
      expect(stats.wordsPerMinute).toBe(1); // 1 word in 1 minute
      
      jest.restoreAllMocks();
    });

    it('should provide difficulty-based scoring', () => {
      const hardWord = new Word({
        text: 'むずかしいことば',
        difficulty: WordDifficulty.HARD,
        category: 'test'
      });
      
      service.processInput('む', hardWord, players[0]);
      const result = service.processInput('ず', hardWord, players[0]);
      
      expect(result.points).toBeGreaterThan(0);
      // Hard words should give more points
    });
  });

  describe('Input Validation', () => {
    it('should reject non-hiragana input', () => {
      const result = service.processInput('a', targetWord, players[0]);
      
      expect(result.isCorrect).toBe(false);
      expect(result.invalidInput).toBe(true);
    });

    it('should handle empty input', () => {
      const result = service.processInput('', targetWord, players[0]);
      
      expect(result.isCorrect).toBe(false);
      expect(result.invalidInput).toBe(true);
    });

    it('should limit input length', () => {
      const longWord = new Word({
        text: 'あいうえお',
        difficulty: WordDifficulty.MEDIUM,
        category: 'test'
      });
      
      // Try to input more than target length
      service.processInput('あいうえおか', longWord, players[0]);
      const stats = service.getPlayerStatistics(longWord, players[0]);
      
      expect(stats.currentInput.length).toBeLessThanOrEqual(longWord.getCharacterCount());
    });
  });

  describe('Real-time Features', () => {
    it('should provide live progress updates', () => {
      const callback = jest.fn();
      service.onProgressUpdate(callback);
      
      service.processInput('ね', targetWord, players[0]);
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: players[0].getId(),
          progress: 0.5,
          isCorrect: true
        })
      );
    });

    it('should emit completion events', () => {
      const callback = jest.fn();
      service.onCompletion(callback);
      
      service.processInput('ね', targetWord, players[0]);
      service.processInput('こ', targetWord, players[0]);
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: players[0].getId(),
          completionTime: expect.any(Number),
          isWinner: true
        })
      );
    });
  });
});