import { Player as IPlayer } from '../../shared/types/GameConfig';
import { generateId } from '../../shared/utils/seeded-random';

/**
 * プレイヤードメインエンティティ
 * Phase 1.4: プレイヤー情報の管理を担当
 */
export class Player {
  private readonly playerData: IPlayer;

  constructor(name: string, id?: string) {
    this.playerData = {
      id: id || generateId(),
      name: name.trim(),
      createdAt: new Date().toISOString()
    };

    this.validatePlayer();
  }

  // Getters
  get id(): string { return this.playerData.id; }
  get name(): string { return this.playerData.name; }
  get createdAt(): string { return this.playerData.createdAt; }

  /**
   * プレイヤー名を更新
   */
  updateName(name: string): Player {
    if (!name.trim()) {
      throw new Error('プレイヤー名は必須です');
    }

    const player = Object.create(Player.prototype);
    player.playerData = {
      ...this.playerData,
      name: name.trim()
    };
    return player;
  }

  /**
   * プレーンオブジェクトとして取得
   */
  toPlainObject(): IPlayer {
    return { ...this.playerData };
  }

  /**
   * プレイヤーの妥当性検証（内部用）
   */
  private validatePlayer(): void {
    if (!this.playerData.id.trim()) {
      throw new Error('プレイヤーIDは必須です');
    }

    if (!this.playerData.name.trim()) {
      throw new Error('プレイヤー名は必須です');
    }

    if (this.playerData.name.length > 20) {
      throw new Error('プレイヤー名は20文字以内で入力してください');
    }
  }

  /**
   * 静的ファクトリーメソッド: プレーンオブジェクトから作成
   */
  static fromPlainObject(data: IPlayer): Player {
    const player = Object.create(Player.prototype);
    player.playerData = { ...data };
    player.validatePlayer();
    return player;
  }

  /**
   * 静的ファクトリーメソッド: 複数のプレイヤーを一括作成
   */
  static createMultiple(names: string[]): Player[] {
    return names.map(name => new Player(name));
  }
}