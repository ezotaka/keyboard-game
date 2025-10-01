/**
 * ゲーム設定に関する型定義
 * Phase 5: 設定・管理機能用
 */

export interface GameConfig {
  /** チーム数 (2-8) */
  teamCount: number;
  
  /** 難易度レベル */
  difficulty: DifficultyLevel;
  
  /** ゲーム時間（秒） */
  gameDuration: number;
  
  /** お題カテゴリ */
  wordCategory: WordCategory;
  
  /** チーム設定 */
  teamSettings: TeamSettings[];
  
  /** キーボード割り当て設定 */
  keyboardAssignments: KeyboardAssignment[];
  
  /** 音響設定 */
  soundSettings: SoundSettings;
  
  /** 保存日時 */
  createdAt: string;
  
  /** 設定名 */
  name: string;
}

export interface TeamSettings {
  /** チームID */
  id: number;
  
  /** チーム名（カスタマイズ可能） */
  name: string;
  
  /** チームカラー */
  color: string;
  
  /** 割り当て済みキーボードID */
  assignedKeyboardId?: string;
}

/** プレイヤー情報 */
export interface Player {
  /** プレイヤーID */
  id: string;
  
  /** プレイヤー名 */
  name: string;
  
  /** 作成日時 */
  createdAt: string;
}

/** チーム内のメンバー情報 */
export interface TeamMember {
  /** プレイヤー情報 */
  player: Player;
  
  /** チーム内でのターン順（0から開始） */
  turnOrder: number;
  
  /** 参加日時 */
  joinedAt: string;
}

/** メンバー割り当て済みのチーム設定 */
export interface TeamWithMembers extends TeamSettings {
  /** チームメンバー（ターン順にソート済み） */
  members: TeamMember[];
  
  /** 現在のターンのプレイヤーインデックス */
  currentTurnIndex: number;
}

export interface KeyboardAssignment {
  /** キーボードID */
  keyboardId: string;
  
  /** キーボード名 */
  keyboardName: string;
  
  /** 割り当て先チームID */
  assignedTeamId?: number;
  
  /** 接続状態 */
  connected: boolean;
}

export interface SoundSettings {
  /** マスター音量 (0.0 - 1.0) */
  masterVolume: number;
  
  /** 効果音有効 */
  soundEffectsEnabled: boolean;
  
  /** タイピング音有効 */
  typingSoundEnabled: boolean;
  
  /** BGM有効 */
  backgroundMusicEnabled: boolean;
}

export type DifficultyLevel = 'easy' | 'normal' | 'hard';

export type WordCategory = 
  | 'animals'      // 動物
  | 'foods'        // 食べ物  
  | 'colors'       // 色
  | 'nature'       // 自然
  | 'family'       // 家族
  | 'school'       // 学校
  | 'mixed'        // ミックス
  | 'custom';      // カスタム

export interface GameResult {
  /** ゲーム実行日時 */
  playedAt: string;
  
  /** 使用した設定 */
  gameConfig: GameConfig;
  
  /** チーム結果 */
  teamResults: TeamResult[];
  
  /** ゲーム時間（実際の経過秒数） */
  actualGameDuration: number;
  
  /** 総入力単語数 */
  totalWordsTyped: number;
}

export interface TeamResult {
  /** チーム情報 */
  teamId: number;
  teamName: string;
  teamColor: string;
  
  /** スコア */
  score: number;
  
  /** タイピング統計 */
  wordsCompleted: number;
  totalCharacters: number;
  correctCharacters: number;
  typingSpeed: number; // WPM (Words Per Minute)
  
  /** 順位 */
  rank: number;
}

export interface SavedGameConfig {
  /** 設定ID */
  id: string;
  
  /** 設定内容 */
  config: GameConfig;
  
  /** お気に入り */
  isFavorite: boolean;
  
  /** 最後の使用日時 */
  lastUsedAt?: string;
  
  /** 使用回数 */
  usageCount: number;
}