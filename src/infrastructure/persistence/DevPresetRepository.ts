import { GameConfig } from '../../domain/entities/GameConfig.js';
import devPresets from '../../config/dev-presets.json';

/**
 * 開発用プリセット設定リポジトリ
 */
export class DevPresetRepository {
  /**
   * 利用可能なプリセット一覧を取得
   */
  getAvailablePresets(): Array<{ key: string; name: string; description: string }> {
    return Object.entries(devPresets.presets).map(([key, preset]) => ({
      key,
      name: preset.name,
      description: preset.description
    }));
  }

  /**
   * プリセット設定を取得
   */
  getPresetConfig(presetKey: string): GameConfig | null {
    const preset = devPresets.presets[presetKey as keyof typeof devPresets.presets];
    if (!preset) {
      console.warn(`プリセット設定が見つかりません: ${presetKey}`);
      return null;
    }

    try {
      // プリセットデータをGameConfigの形式に変換
      const configData = {
        name: preset.name,
        teamCount: preset.teamCount,
        difficulty: preset.difficulty as 'easy' | 'normal' | 'hard',
        gameDurationSeconds: preset.gameDurationSeconds,
        wordCategory: preset.wordCategory as 'animals' | 'foods' | 'colors' | 'nature' | 'family' | 'school' | 'mixed',
        players: preset.players.map((name, index) => ({
          id: `preset-player-${index}`,
          name,
          teamId: '',
          keyboardId: null
        })),
        teams: Array.from({ length: preset.teamCount }, (_, index) => ({
          id: `preset-team-${index + 1}`,
          name: `チーム${index + 1}`,
          color: this.getTeamColor(index),
          memberIds: []
        })),
        teamAssignmentStrategy: preset.teamAssignmentStrategy as 'sequential' | 'random' | 'manual',
        turnOrderStrategy: preset.turnOrderStrategy as 'sequential' | 'random' | 'alphabetical' | 'manual',
        soundSettings: {
          masterVolume: preset.soundSettings.masterVolume,
          soundEffectsEnabled: preset.soundSettings.soundEffectsEnabled,
          typingSoundEnabled: preset.soundSettings.typingSoundEnabled,
          backgroundMusicEnabled: preset.soundSettings.backgroundMusicEnabled
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return new GameConfig(configData);
    } catch (error) {
      console.error(`プリセット設定の読み込みに失敗しました: ${presetKey}`, error);
      return null;
    }
  }

  /**
   * デフォルトプリセット設定を取得
   */
  getDefaultPresetConfig(): GameConfig {
    const defaultPresetKey = devPresets.defaultPreset;
    const config = this.getPresetConfig(defaultPresetKey);

    if (!config) {
      console.warn('デフォルトプリセットの読み込みに失敗しました。標準設定を返します。');
      return new GameConfig();
    }

    return config;
  }

  /**
   * 開発環境かどうかを判定
   */
  isDevEnvironment(): boolean {
    // Node.js環境での判定
    if (typeof process !== 'undefined') {
      return process.env.NODE_ENV === 'development' ||
             process.env.NODE_ENV === undefined ||
             process.argv.includes('--dev');
    }

    // ブラウザ環境での判定（開発サーバーのポート等で判定）
    if (typeof window !== 'undefined') {
      return window.location.hostname === 'localhost' ||
             window.location.hostname === '127.0.0.1' ||
             window.location.port !== '';
    }

    return false;
  }

  /**
   * チームの色を取得
   */
  private getTeamColor(index: number): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
    ];
    return colors[index % colors.length];
  }

  /**
   * プリセット設定が存在するかチェック
   */
  hasPreset(presetKey: string): boolean {
    return presetKey in devPresets.presets;
  }

  /**
   * すべてのプリセット設定をGameConfigとして取得
   */
  getAllPresetConfigs(): Array<{ key: string; config: GameConfig }> {
    return Object.keys(devPresets.presets)
      .map(key => {
        const config = this.getPresetConfig(key);
        return config ? { key, config } : null;
      })
      .filter((item): item is { key: string; config: GameConfig } => item !== null);
  }
}