import { GameConfigRepository } from '../../domain/repositories/GameConfigRepository.js';
import { SavedGameConfig } from '../../shared/types/GameConfig.js';
import { GameConfig } from '../../domain/entities/GameConfig.js';

/**
 * LocalStorage ベースの設定リポジトリ実装
 * Phase 5: 設定・管理機能
 */
export class LocalStorageGameConfigRepository implements GameConfigRepository {
  private readonly STORAGE_KEY = 'keyboard-game-configs';
  private readonly DEFAULT_CONFIG_KEY = 'keyboard-game-default-config';

  /**
   * 設定を保存
   */
  async save(config: GameConfig): Promise<SavedGameConfig> {
    const savedConfig: SavedGameConfig = {
      id: this.generateId(),
      config: config.toPlainObject(),
      isFavorite: false,
      usageCount: 0,
      lastUsedAt: undefined
    };

    const configs = await this.getAllConfigs();
    configs.push(savedConfig);
    this.saveAllConfigs(configs);

    return savedConfig;
  }

  /**
   * 設定を取得（ID指定）
   */
  async findById(id: string): Promise<SavedGameConfig | null> {
    const configs = await this.getAllConfigs();
    return configs.find(config => config.id === id) || null;
  }

  /**
   * すべての設定を取得
   */
  async findAll(): Promise<SavedGameConfig[]> {
    return this.getAllConfigs();
  }

  /**
   * 設定を更新
   */
  async update(id: string, config: GameConfig): Promise<SavedGameConfig> {
    const configs = await this.getAllConfigs();
    const index = configs.findIndex(c => c.id === id);

    if (index === -1) {
      throw new Error(`設定が見つかりません: ${id}`);
    }

    configs[index] = {
      ...configs[index],
      config: config.toPlainObject()
    };

    this.saveAllConfigs(configs);
    return configs[index];
  }

  /**
   * 設定を削除
   */
  async delete(id: string): Promise<void> {
    const configs = await this.getAllConfigs();
    const filteredConfigs = configs.filter(config => config.id !== id);
    
    if (filteredConfigs.length === configs.length) {
      throw new Error(`設定が見つかりません: ${id}`);
    }

    this.saveAllConfigs(filteredConfigs);
  }

  /**
   * お気に入り設定を取得
   */
  async findFavorites(): Promise<SavedGameConfig[]> {
    const configs = await this.getAllConfigs();
    return configs.filter(config => config.isFavorite);
  }

  /**
   * お気に入り状態を変更
   */
  async updateFavoriteStatus(id: string, isFavorite: boolean): Promise<SavedGameConfig> {
    const configs = await this.getAllConfigs();
    const index = configs.findIndex(c => c.id === id);

    if (index === -1) {
      throw new Error(`設定が見つかりません: ${id}`);
    }

    configs[index] = {
      ...configs[index],
      isFavorite
    };

    this.saveAllConfigs(configs);
    return configs[index];
  }

  /**
   * 使用回数を増加
   */
  async incrementUsageCount(id: string): Promise<SavedGameConfig> {
    const configs = await this.getAllConfigs();
    const index = configs.findIndex(c => c.id === id);

    if (index === -1) {
      throw new Error(`設定が見つかりません: ${id}`);
    }

    configs[index] = {
      ...configs[index],
      usageCount: configs[index].usageCount + 1,
      lastUsedAt: new Date().toISOString()
    };

    this.saveAllConfigs(configs);
    return configs[index];
  }

  /**
   * 最後の使用日時を更新
   */
  async updateLastUsedAt(id: string): Promise<SavedGameConfig> {
    const configs = await this.getAllConfigs();
    const index = configs.findIndex(c => c.id === id);

    if (index === -1) {
      throw new Error(`設定が見つかりません: ${id}`);
    }

    configs[index] = {
      ...configs[index],
      lastUsedAt: new Date().toISOString()
    };

    this.saveAllConfigs(configs);
    return configs[index];
  }

  /**
   * 設定を検索（名前で部分一致）
   */
  async findByNameContaining(searchTerm: string): Promise<SavedGameConfig[]> {
    const configs = await this.getAllConfigs();
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return configs.filter(config => 
      config.config.name.toLowerCase().includes(lowerSearchTerm)
    );
  }

  /**
   * デフォルト設定を取得
   */
  async getDefaultConfig(): Promise<GameConfig> {
    try {
      const defaultConfigData = localStorage.getItem(this.DEFAULT_CONFIG_KEY);
      if (defaultConfigData) {
        const parsedData = JSON.parse(defaultConfigData);
        return new GameConfig(parsedData);
      }
    } catch (error) {
      console.warn('デフォルト設定の読み込みに失敗しました:', error);
    }

    // デフォルト設定が存在しない場合、標準設定を返す
    return new GameConfig();
  }

  /**
   * 最近使用した設定を取得
   */
  async findRecentlyUsed(limit = 5): Promise<SavedGameConfig[]> {
    const configs = await this.getAllConfigs();
    
    return configs
      .filter(config => config.lastUsedAt)
      .sort((a, b) => {
        const dateA = new Date(a.lastUsedAt!).getTime();
        const dateB = new Date(b.lastUsedAt!).getTime();
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  /**
   * よく使われる設定を取得
   */
  async findMostUsed(limit = 5): Promise<SavedGameConfig[]> {
    const configs = await this.getAllConfigs();
    
    return configs
      .filter(config => config.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * デフォルト設定を保存
   */
  async saveDefaultConfig(config: GameConfig): Promise<void> {
    try {
      const configData = config.toPlainObject();
      localStorage.setItem(this.DEFAULT_CONFIG_KEY, JSON.stringify(configData));
    } catch (error) {
      console.error('デフォルト設定の保存に失敗しました:', error);
      throw new Error('デフォルト設定を保存できませんでした');
    }
  }

  /**
   * すべての設定をクリア（テスト用）
   */
  async clearAll(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.DEFAULT_CONFIG_KEY);
  }

  /**
   * LocalStorageからすべての設定を取得
   */
  private getAllConfigs(): SavedGameConfig[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('設定データの読み込みに失敗しました:', error);
      return [];
    }
  }

  /**
   * LocalStorageにすべての設定を保存
   */
  private saveAllConfigs(configs: SavedGameConfig[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
    } catch (error) {
      console.error('設定データの保存に失敗しました:', error);
      throw new Error('設定を保存できませんでした');
    }
  }

  /**
   * ユニークなIDを生成
   */
  private generateId(): string {
    return `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}