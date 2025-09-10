import { 
  GameConfig as IGameConfig, 
  TeamSettings, 
  KeyboardAssignment,
  DifficultyLevel,
  WordCategory,
  SoundSettings
} from '../../shared/types/GameConfig.js';

/**
 * ゲーム設定ドメインエンティティ
 * Phase 5: 設定・管理機能
 */
export class GameConfig {
  private readonly config: IGameConfig;

  constructor(config: Partial<IGameConfig> = {}) {
    this.config = {
      teamCount: config.teamCount ?? 2,
      difficulty: config.difficulty ?? 'easy',
      gameDuration: config.gameDuration ?? 60,
      wordCategory: config.wordCategory ?? 'mixed',
      teamSettings: config.teamSettings ?? this.createDefaultTeamSettings(config.teamCount ?? 2),
      keyboardAssignments: config.keyboardAssignments ?? [],
      soundSettings: config.soundSettings ?? this.createDefaultSoundSettings(),
      createdAt: config.createdAt ?? new Date().toISOString(),
      name: config.name ?? this.generateDefaultName()
    };

    this.validateConfig();
  }

  // Getters
  get teamCount(): number { return this.config.teamCount; }
  get difficulty(): DifficultyLevel { return this.config.difficulty; }
  get gameDuration(): number { return this.config.gameDuration; }
  get wordCategory(): WordCategory { return this.config.wordCategory; }
  get teamSettings(): TeamSettings[] { return [...this.config.teamSettings]; }
  get keyboardAssignments(): KeyboardAssignment[] { return [...this.config.keyboardAssignments]; }
  get soundSettings(): SoundSettings { return { ...this.config.soundSettings }; }
  get createdAt(): string { return this.config.createdAt; }
  get name(): string { return this.config.name; }

  /**
   * チーム数を変更
   */
  updateTeamCount(teamCount: number): GameConfig {
    if (teamCount < 2 || teamCount > 8) {
      throw new Error('チーム数は2-8の範囲で設定してください');
    }

    const newTeamSettings = this.adjustTeamSettings(teamCount);
    
    return new GameConfig({
      ...this.config,
      teamCount,
      teamSettings: newTeamSettings
    });
  }

  /**
   * 難易度を変更
   */
  updateDifficulty(difficulty: DifficultyLevel): GameConfig {
    return new GameConfig({
      ...this.config,
      difficulty
    });
  }

  /**
   * ゲーム時間を変更
   */
  updateGameDuration(duration: number): GameConfig {
    if (duration < 30 || duration > 300) {
      throw new Error('ゲーム時間は30-300秒の範囲で設定してください');
    }

    return new GameConfig({
      ...this.config,
      gameDuration: duration
    });
  }

  /**
   * お題カテゴリを変更
   */
  updateWordCategory(category: WordCategory): GameConfig {
    return new GameConfig({
      ...this.config,
      wordCategory: category
    });
  }

  /**
   * チーム名を変更
   */
  updateTeamName(teamId: number, name: string): GameConfig {
    const teamSettings = this.config.teamSettings.map(team => 
      team.id === teamId ? { ...team, name } : team
    );

    return new GameConfig({
      ...this.config,
      teamSettings
    });
  }

  /**
   * キーボード割り当てを更新
   */
  updateKeyboardAssignments(assignments: KeyboardAssignment[]): GameConfig {
    // チームへの割り当ても更新
    const teamSettings = this.config.teamSettings.map(team => {
      const assignment = assignments.find(a => a.assignedTeamId === team.id);
      return {
        ...team,
        assignedKeyboardId: assignment?.keyboardId
      };
    });

    return new GameConfig({
      ...this.config,
      keyboardAssignments: assignments,
      teamSettings
    });
  }

  /**
   * 音響設定を更新
   */
  updateSoundSettings(soundSettings: Partial<SoundSettings>): GameConfig {
    return new GameConfig({
      ...this.config,
      soundSettings: { ...this.config.soundSettings, ...soundSettings }
    });
  }

  /**
   * 設定名を変更
   */
  updateName(name: string): GameConfig {
    if (!name.trim()) {
      throw new Error('設定名は必須です');
    }

    return new GameConfig({
      ...this.config,
      name: name.trim()
    });
  }

  /**
   * 設定の妥当性をチェック
   */
  isValid(): boolean {
    try {
      this.validateConfig();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 設定をプレーン オブジェクトとして取得
   */
  toPlainObject(): IGameConfig {
    return { ...this.config };
  }

  /**
   * 設定のクローンを作成
   */
  clone(): GameConfig {
    return new GameConfig(this.config);
  }

  /**
   * 設定が完全に構成されているかチェック
   */
  isReadyForGame(): { ready: boolean; issues: string[] } {
    const issues: string[] = [];

    // キーボード割り当てチェック
    const assignedKeyboards = this.config.keyboardAssignments.filter(kb => kb.assignedTeamId);
    if (assignedKeyboards.length < this.config.teamCount) {
      issues.push(`${this.config.teamCount}チームに対してキーボードが${assignedKeyboards.length}台しか割り当てられていません`);
    }

    // 接続状態チェック
    const connectedKeyboards = assignedKeyboards.filter(kb => kb.connected);
    if (connectedKeyboards.length < this.config.teamCount) {
      issues.push(`${this.config.teamCount}チームに対して接続中のキーボードが${connectedKeyboards.length}台しかありません`);
    }

    return {
      ready: issues.length === 0,
      issues
    };
  }

  /**
   * デフォルトのチーム設定を作成
   */
  private createDefaultTeamSettings(teamCount: number): TeamSettings[] {
    const teamColors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
      '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'
    ];

    return Array.from({ length: teamCount }, (_, i) => ({
      id: i + 1,
      name: `チーム ${i + 1}`,
      color: teamColors[i],
      assignedKeyboardId: undefined
    }));
  }

  /**
   * デフォルトの音響設定を作成
   */
  private createDefaultSoundSettings(): SoundSettings {
    return {
      masterVolume: 0.7,
      soundEffectsEnabled: true,
      typingSoundEnabled: true,
      backgroundMusicEnabled: false
    };
  }

  /**
   * デフォルトの設定名を生成
   */
  private generateDefaultName(): string {
    const date = new Date();
    return `設定 ${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
  }

  /**
   * チーム数変更に伴うチーム設定の調整
   */
  private adjustTeamSettings(newTeamCount: number): TeamSettings[] {
    const currentSettings = this.config.teamSettings;
    const teamColors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
      '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'
    ];

    if (newTeamCount <= currentSettings.length) {
      // チーム数減少：不要なチームを削除
      return currentSettings.slice(0, newTeamCount);
    } else {
      // チーム数増加：新しいチームを追加
      const additionalTeams = Array.from(
        { length: newTeamCount - currentSettings.length }, 
        (_, i) => ({
          id: currentSettings.length + i + 1,
          name: `チーム ${currentSettings.length + i + 1}`,
          color: teamColors[currentSettings.length + i],
          assignedKeyboardId: undefined
        })
      );
      return [...currentSettings, ...additionalTeams];
    }
  }

  /**
   * 設定の妥当性を検証
   */
  private validateConfig(): void {
    if (this.config.teamCount < 2 || this.config.teamCount > 8) {
      throw new Error('チーム数は2-8の範囲で設定してください');
    }

    if (this.config.gameDuration < 30 || this.config.gameDuration > 300) {
      throw new Error('ゲーム時間は30-300秒の範囲で設定してください');
    }

    if (!this.config.name.trim()) {
      throw new Error('設定名は必須です');
    }

    if (this.config.teamSettings.length !== this.config.teamCount) {
      throw new Error('チーム設定の数がチーム数と一致しません');
    }

    // 音響設定の検証
    const sound = this.config.soundSettings;
    if (sound.masterVolume < 0 || sound.masterVolume > 1) {
      throw new Error('音量は0.0-1.0の範囲で設定してください');
    }
  }
}