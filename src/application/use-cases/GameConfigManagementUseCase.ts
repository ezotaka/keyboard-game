import { GameConfigRepository } from '../../domain/repositories/GameConfigRepository.js';
import { GameConfig } from '../../domain/entities/GameConfig.js';
import { SavedGameConfig } from '../../shared/types/GameConfig.js';

/**
 * ゲーム設定管理ユースケース
 * Phase 5: 設定・管理機能
 */
export class GameConfigManagementUseCase {
  constructor(private readonly repository: GameConfigRepository) {}

  /**
   * 新しい設定を保存
   */
  async saveConfig(config: GameConfig, setAsDefault = false): Promise<SavedGameConfig> {
    if (!config.isValid()) {
      throw new Error('無効な設定です');
    }

    const savedConfig = await this.repository.save(config);

    // デフォルト設定として保存する場合
    if (setAsDefault) {
      await this.repository.saveDefaultConfig(config);
    }

    return savedConfig;
  }

  /**
   * 設定を取得
   */
  async getConfig(id: string): Promise<SavedGameConfig | null> {
    return this.repository.findById(id);
  }

  /**
   * すべての設定を取得
   */
  async getAllConfigs(): Promise<SavedGameConfig[]> {
    const configs = await this.repository.findAll();
    
    // 作成日時の新しい順にソート
    return configs.sort((a, b) => 
      new Date(b.config.createdAt).getTime() - new Date(a.config.createdAt).getTime()
    );
  }

  /**
   * 設定を更新
   */
  async updateConfig(id: string, config: GameConfig): Promise<SavedGameConfig> {
    if (!config.isValid()) {
      throw new Error('無効な設定です');
    }

    return this.repository.update(id, config);
  }

  /**
   * 設定を削除
   */
  async deleteConfig(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  /**
   * お気に入り設定を取得
   */
  async getFavoriteConfigs(): Promise<SavedGameConfig[]> {
    return this.repository.findFavorites();
  }

  /**
   * お気に入り状態を切り替え
   */
  async toggleFavorite(id: string): Promise<SavedGameConfig> {
    const config = await this.repository.findById(id);
    if (!config) {
      throw new Error('設定が見つかりません');
    }

    return this.repository.updateFavoriteStatus(id, !config.isFavorite);
  }

  /**
   * 設定を複製
   */
  async duplicateConfig(id: string, newName?: string): Promise<SavedGameConfig> {
    const originalConfig = await this.repository.findById(id);
    if (!originalConfig) {
      throw new Error('設定が見つかりません');
    }

    const duplicatedGameConfig = new GameConfig({
      ...originalConfig.config,
      name: newName || `${originalConfig.config.name} のコピー`,
      createdAt: new Date().toISOString()
    });

    return this.repository.save(duplicatedGameConfig);
  }

  /**
   * 設定を検索
   */
  async searchConfigs(searchTerm: string): Promise<SavedGameConfig[]> {
    return this.repository.findByNameContaining(searchTerm);
  }

  /**
   * デフォルト設定を取得
   */
  async getDefaultConfig(): Promise<GameConfig> {
    return this.repository.getDefaultConfig();
  }

  /**
   * 最近使用した設定を取得
   */
  async getRecentlyUsedConfigs(limit = 5): Promise<SavedGameConfig[]> {
    return this.repository.findRecentlyUsed(limit);
  }

  /**
   * よく使う設定を取得
   */
  async getMostUsedConfigs(limit = 5): Promise<SavedGameConfig[]> {
    return this.repository.findMostUsed(limit);
  }

  /**
   * 設定を使用してゲームを開始（使用統計を更新）
   */
  async useConfigForGame(id: string): Promise<SavedGameConfig> {
    const config = await this.repository.findById(id);
    if (!config) {
      throw new Error('設定が見つかりません');
    }

    // 使用統計を更新
    return this.repository.incrementUsageCount(id);
  }

  /**
   * 設定の実行準備状態をチェック
   */
  async validateConfigForGame(id: string): Promise<{ valid: boolean; issues: string[] }> {
    const savedConfig = await this.repository.findById(id);
    if (!savedConfig) {
      return { valid: false, issues: ['設定が見つかりません'] };
    }

    const gameConfig = new GameConfig(savedConfig.config);
    const validation = gameConfig.isReadyForGame();
    
    return {
      valid: validation.ready,
      issues: validation.issues
    };
  }

  /**
   * 設定のエクスポート
   */
  async exportConfig(id: string): Promise<string> {
    const config = await this.repository.findById(id);
    if (!config) {
      throw new Error('設定が見つかりません');
    }

    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      config: config.config
    }, null, 2);
  }

  /**
   * 設定のインポート
   */
  async importConfig(importData: string): Promise<SavedGameConfig> {
    try {
      const data = JSON.parse(importData);
      
      if (!data.config) {
        throw new Error('無効なインポートデータです');
      }

      const gameConfig = new GameConfig({
        ...data.config,
        name: `${data.config.name} (インポート)`,
        createdAt: new Date().toISOString()
      });

      return this.repository.save(gameConfig);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('インポートデータの形式が正しくありません');
      }
      throw error;
    }
  }

  /**
   * 設定の統計情報を取得
   */
  async getConfigStats(): Promise<{
    totalConfigs: number;
    favoriteConfigs: number;
    mostUsedConfig: SavedGameConfig | null;
    recentlyCreatedCount: number;
  }> {
    const configs = await this.repository.findAll();
    const favorites = configs.filter(c => c.isFavorite);
    const mostUsed = configs.reduce((prev, current) => 
      prev.usageCount > current.usageCount ? prev : current, 
      configs[0] || null
    );

    // 過去7日間に作成された設定数
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentlyCreated = configs.filter(c => 
      new Date(c.config.createdAt) > weekAgo
    );

    return {
      totalConfigs: configs.length,
      favoriteConfigs: favorites.length,
      mostUsedConfig: mostUsed,
      recentlyCreatedCount: recentlyCreated.length
    };
  }
}