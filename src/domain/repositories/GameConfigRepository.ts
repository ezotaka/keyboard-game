import { SavedGameConfig } from '../../shared/types/GameConfig.js';
import { GameConfig } from '../entities/GameConfig.js';

/**
 * ゲーム設定リポジトリインターフェース
 * Phase 5: 設定・管理機能
 */
export interface GameConfigRepository {
  /**
   * 設定を保存
   */
  save(config: GameConfig): Promise<SavedGameConfig>;

  /**
   * 設定を取得（ID指定）
   */
  findById(id: string): Promise<SavedGameConfig | null>;

  /**
   * すべての設定を取得
   */
  findAll(): Promise<SavedGameConfig[]>;

  /**
   * 設定を更新
   */
  update(id: string, config: GameConfig): Promise<SavedGameConfig>;

  /**
   * 設定を削除
   */
  delete(id: string): Promise<void>;

  /**
   * お気に入り設定を取得
   */
  findFavorites(): Promise<SavedGameConfig[]>;

  /**
   * お気に入り状態を変更
   */
  updateFavoriteStatus(id: string, isFavorite: boolean): Promise<SavedGameConfig>;

  /**
   * 使用回数を増加
   */
  incrementUsageCount(id: string): Promise<SavedGameConfig>;

  /**
   * 最後の使用日時を更新
   */
  updateLastUsedAt(id: string): Promise<SavedGameConfig>;

  /**
   * 設定を検索（名前で部分一致）
   */
  findByNameContaining(searchTerm: string): Promise<SavedGameConfig[]>;

  /**
   * デフォルト設定を取得
   */
  getDefaultConfig(): Promise<GameConfig>;

  /**
   * 最近使用した設定を取得
   */
  findRecentlyUsed(limit?: number): Promise<SavedGameConfig[]>;

  /**
   * よく使われる設定を取得
   */
  findMostUsed(limit?: number): Promise<SavedGameConfig[]>;
}