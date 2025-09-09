import { Word, WordDifficulty } from '../entities/Word';
import { Player } from '../entities/Player';
import { Team } from '../entities/Team';
import { PlayerId } from '../value-objects/PlayerId';
import { TeamId } from '../value-objects/TeamId';

export interface InputResult {
  isCorrect: boolean;
  isComplete: boolean;
  progress: number;
  currentInput: string;
  remainingText: string;
  errors?: number;
  typingSpeedCPM?: number;
  completionTime?: number;
  points?: number;
  invalidInput?: boolean;
}

export interface PlayerProgress {
  playerId: PlayerId;
  progress: number;
  isCorrect: boolean;
  isComplete: boolean;
  currentInput: string;
  startTime: number;
  completionTime?: number;
  errors: number;
}

export interface WinnerResult {
  playerId: PlayerId;
  completionTime: number;
  isWinner: boolean;
  isComplete: boolean;
}

export interface TeamResult {
  completedPlayers: number;
  totalPlayers: number;
  isTeamComplete: boolean;
}

export interface TeamWinnerResult {
  teamId: TeamId;
  completionTime: number;
  completedPlayers: number;
}

export interface PlayerStatistics {
  accuracy: number;
  errorCount: number;
  correctCharacters: number;
  wordsPerMinute: number;
  currentInput: string;
}

export class InputJudgmentService {
  private playerProgress: Map<string, Map<string, PlayerProgress>> = new Map();
  private progressCallbacks: Array<(result: PlayerProgress) => void> = [];
  private completionCallbacks: Array<(result: WinnerResult) => void> = [];

  /**
   * Processes input for a specific player and word
   */
  processInput(input: string, targetWord: Word, player: Player): InputResult {
    const wordKey = targetWord.getText();
    const playerKey = player.getId().getValue();
    
    if (!this.playerProgress.has(wordKey)) {
      this.playerProgress.set(wordKey, new Map());
    }
    
    const wordProgress = this.playerProgress.get(wordKey)!;
    let progress = wordProgress.get(playerKey);
    
    if (!progress) {
      progress = {
        playerId: player.getId(),
        progress: 0,
        isCorrect: true,
        isComplete: false,
        currentInput: '',
        startTime: Date.now(),
        errors: 0
      };
      wordProgress.set(playerKey, progress);
    }

    // Handle backspace
    if (input === '\b') {
      if (progress.currentInput.length > 0) {
        progress.currentInput = progress.currentInput.slice(0, -1);
        progress.progress = progress.currentInput.length / targetWord.getCharacterCount();
      }
      return this.createInputResult(progress, targetWord);
    }

    // Validate input
    if (!input || input.trim().length === 0) {
      return this.createInvalidInputResult(progress, targetWord);
    }

    // Check if input is hiragana
    const hiraganaPattern = /^[\u3042-\u3093]+$/;
    if (!hiraganaPattern.test(input)) {
      return this.createInvalidInputResult(progress, targetWord);
    }

    // Check if input would exceed target length
    if (progress.currentInput.length >= targetWord.getCharacterCount()) {
      return this.createInputResult(progress, targetWord);
    }

    // Process the input
    const targetText = targetWord.getText();
    const expectedChar = targetText[progress.currentInput.length];
    
    if (input === expectedChar) {
      progress.currentInput += input;
      progress.progress = progress.currentInput.length / targetWord.getCharacterCount();
      progress.isCorrect = true;
      
      if (progress.currentInput === targetText) {
        progress.isComplete = true;
        progress.completionTime = Date.now() - progress.startTime;
        
        // Notify completion
        this.notifyCompletion({
          playerId: player.getId(),
          completionTime: progress.completionTime,
          isWinner: this.isFirstToComplete(wordKey, playerKey),
          isComplete: true
        });
      }
    } else {
      progress.errors++;
      progress.isCorrect = false;
    }

    const result = this.createInputResult(progress, targetWord);
    
    // Notify progress update
    this.notifyProgress(progress);
    
    return result;
  }

  /**
   * Gets current rankings for all players
   */
  getCurrentRankings(targetWord: Word): PlayerProgress[] {
    const wordKey = targetWord.getText();
    const wordProgress = this.playerProgress.get(wordKey);
    
    if (!wordProgress) {
      return [];
    }
    
    return Array.from(wordProgress.values())
      .sort((a, b) => {
        if (a.isComplete && b.isComplete) {
          return a.completionTime! - b.completionTime!;
        }
        if (a.isComplete) return -1;
        if (b.isComplete) return 1;
        return b.progress - a.progress;
      });
  }

  /**
   * Gets the winner for a specific word
   */
  getWinner(targetWord: Word): WinnerResult | null {
    const rankings = this.getCurrentRankings(targetWord);
    const winner = rankings.find(p => p.isComplete);
    
    if (!winner) {
      return null;
    }
    
    return {
      playerId: winner.playerId,
      completionTime: winner.completionTime!,
      isWinner: true,
      isComplete: true
    };
  }

  /**
   * Gets team result for a specific word
   */
  getTeamResult(targetWord: Word, team: Team): TeamResult {
    const wordKey = targetWord.getText();
    const wordProgress = this.playerProgress.get(wordKey);
    
    const teamPlayers = team.getPlayers();
    let completedPlayers = 0;
    
    if (wordProgress) {
      teamPlayers.forEach(player => {
        const progress = wordProgress.get(player.getId().getValue());
        if (progress && progress.isComplete) {
          completedPlayers++;
        }
      });
    }
    
    return {
      completedPlayers,
      totalPlayers: teamPlayers.length,
      isTeamComplete: completedPlayers === teamPlayers.length
    };
  }

  /**
   * Gets winning team
   */
  getWinningTeam(targetWord: Word, teams: Team[]): TeamWinnerResult | null {
    let winningTeam: TeamWinnerResult | null = null;
    let earliestCompletionTime = Infinity;
    
    for (const team of teams) {
      const result = this.getTeamResult(targetWord, team);
      
      if (result.isTeamComplete) {
        // Find the latest completion time among team members
        const teamCompletionTime = this.getTeamCompletionTime(targetWord, team);
        
        if (teamCompletionTime < earliestCompletionTime) {
          earliestCompletionTime = teamCompletionTime;
          winningTeam = {
            teamId: team.getId(),
            completionTime: teamCompletionTime,
            completedPlayers: result.completedPlayers
          };
        }
      }
    }
    
    return winningTeam;
  }

  /**
   * Gets player statistics
   */
  getPlayerStatistics(targetWord: Word, player: Player): PlayerStatistics {
    const wordKey = targetWord.getText();
    const playerKey = player.getId().getValue();
    const wordProgress = this.playerProgress.get(wordKey);
    const progress = wordProgress?.get(playerKey);
    
    if (!progress) {
      return {
        accuracy: 0,
        errorCount: 0,
        correctCharacters: 0,
        wordsPerMinute: 0,
        currentInput: ''
      };
    }
    
    const totalInputs = progress.currentInput.length + progress.errors;
    const accuracy = totalInputs > 0 ? progress.currentInput.length / totalInputs : 0;
    
    let wordsPerMinute = 0;
    if (progress.isComplete && progress.completionTime) {
      const minutes = progress.completionTime / 60000;
      wordsPerMinute = minutes > 0 ? (1 / minutes) : 0;
    }
    
    return {
      accuracy,
      errorCount: progress.errors,
      correctCharacters: progress.currentInput.length,
      wordsPerMinute,
      currentInput: progress.currentInput
    };
  }

  /**
   * Register progress update callback
   */
  onProgressUpdate(callback: (result: PlayerProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Register completion callback
   */
  onCompletion(callback: (result: WinnerResult) => void): void {
    this.completionCallbacks.push(callback);
  }

  /**
   * Clear all progress for a word
   */
  clearWordProgress(targetWord: Word): void {
    const wordKey = targetWord.getText();
    this.playerProgress.delete(wordKey);
  }

  /**
   * Clear all progress
   */
  clearAllProgress(): void {
    this.playerProgress.clear();
  }

  private createInputResult(progress: PlayerProgress, targetWord: Word): InputResult {
    const remainingText = targetWord.getText().substring(progress.currentInput.length);
    let typingSpeedCPM = 0;
    let points = 0;
    
    if (progress.completionTime) {
      const minutes = progress.completionTime / 60000;
      typingSpeedCPM = minutes > 0 ? (progress.currentInput.length / minutes) : 0;
      points = this.calculatePoints(targetWord, progress.completionTime);
    } else if (progress.currentInput.length > 0) {
      // Calculate current typing speed for incomplete words
      const elapsedTime = Date.now() - progress.startTime;
      const minutes = elapsedTime / 60000;
      typingSpeedCPM = minutes > 0 ? (progress.currentInput.length / minutes) : 0;
      // Calculate partial points for incomplete words
      points = Math.round(this.calculatePoints(targetWord, elapsedTime) * progress.progress);
    }
    
    return {
      isCorrect: progress.isCorrect,
      isComplete: progress.isComplete,
      progress: progress.progress,
      currentInput: progress.currentInput,
      remainingText,
      errors: progress.errors,
      typingSpeedCPM,
      completionTime: progress.completionTime,
      points
    };
  }

  private createInvalidInputResult(progress: PlayerProgress, targetWord: Word): InputResult {
    const remainingText = targetWord.getText().substring(progress.currentInput.length);
    
    return {
      isCorrect: false,
      isComplete: false,
      progress: progress.progress,
      currentInput: progress.currentInput,
      remainingText,
      errors: progress.errors,
      invalidInput: true
    };
  }

  private calculatePoints(targetWord: Word, completionTime: number): number {
    const basePoints = targetWord.calculateBaseScore();
    const timeBonus = Math.max(0, 10000 - completionTime) / 1000; // Bonus for speed
    return Math.round(basePoints + timeBonus);
  }

  private isFirstToComplete(wordKey: string, playerKey: string): boolean {
    const wordProgress = this.playerProgress.get(wordKey);
    if (!wordProgress) return true;
    
    for (const [key, progress] of wordProgress.entries()) {
      if (key !== playerKey && progress.isComplete) {
        return false;
      }
    }
    
    return true;
  }

  private getTeamCompletionTime(targetWord: Word, team: Team): number {
    const wordKey = targetWord.getText();
    const wordProgress = this.playerProgress.get(wordKey);
    
    if (!wordProgress) return Infinity;
    
    let maxCompletionTime = 0;
    
    for (const player of team.getPlayers()) {
      const progress = wordProgress.get(player.getId().getValue());
      if (progress && progress.isComplete && progress.completionTime) {
        maxCompletionTime = Math.max(maxCompletionTime, progress.completionTime);
      }
    }
    
    return maxCompletionTime;
  }

  private notifyProgress(progress: PlayerProgress): void {
    this.progressCallbacks.forEach(callback => callback(progress));
  }

  private notifyCompletion(result: WinnerResult): void {
    this.completionCallbacks.forEach(callback => callback(result));
  }
}