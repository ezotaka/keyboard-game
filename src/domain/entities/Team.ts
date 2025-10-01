import { Player as IPlayer, TeamMember, TeamWithMembers, TeamSettings } from '../../shared/types/GameConfig';

/**
 * チームドメインエンティティ
 * Phase 1.4: メンバー割り当てとターン順管理を担当
 */
export class Team {
  private readonly teamData: TeamWithMembers;

  constructor(teamSettings: TeamSettings, members: IPlayer[] = []) {
    this.teamData = {
      ...teamSettings,
      members: this.assignMembers(members),
      currentTurnIndex: 0
    };

    this.validateTeam();
  }

  // Getters
  get id(): number { return this.teamData.id; }
  get name(): string { return this.teamData.name; }
  get color(): string { return this.teamData.color; }
  get assignedKeyboardId(): string | undefined { return this.teamData.assignedKeyboardId; }
  get members(): readonly TeamMember[] { return [...this.teamData.members]; }
  get currentTurnIndex(): number { return this.teamData.currentTurnIndex; }
  get memberCount(): number { return this.teamData.members.length; }

  /**
   * 現在のターンのプレイヤーを取得
   */
  getCurrentPlayer(): IPlayer | null {
    if (this.teamData.members.length === 0) return null;
    return this.teamData.members[this.teamData.currentTurnIndex]?.player || null;
  }

  /**
   * 次のプレイヤーのターンに進む
   */
  nextTurn(): Team {
    if (this.teamData.members.length === 0) return this;

    const nextIndex = (this.teamData.currentTurnIndex + 1) % this.teamData.members.length;

    return new Team(
      {
        id: this.teamData.id,
        name: this.teamData.name,
        color: this.teamData.color,
        assignedKeyboardId: this.teamData.assignedKeyboardId
      },
      this.teamData.members.map(m => m.player)
    ).updateCurrentTurn(nextIndex);
  }

  /**
   * メンバーを追加
   */
  addMember(player: IPlayer): Team {
    if (this.hasMember(player.id)) {
      throw new Error(`プレイヤー "${player.name}" は既にチームに参加しています`);
    }

    const newMembers = [...this.teamData.members.map(m => m.player), player];

    return new Team(
      {
        id: this.teamData.id,
        name: this.teamData.name,
        color: this.teamData.color,
        assignedKeyboardId: this.teamData.assignedKeyboardId
      },
      newMembers
    );
  }

  /**
   * メンバーを削除
   */
  removeMember(playerId: string): Team {
    const memberExists = this.hasMember(playerId);
    if (!memberExists) {
      throw new Error(`プレイヤーID "${playerId}" はチームに参加していません`);
    }

    const newMembers = this.teamData.members
      .filter(m => m.player.id !== playerId)
      .map(m => m.player);

    // 削除されたメンバーのインデックスがcurrentTurnIndexより小さい場合、調整が必要
    const removedIndex = this.teamData.members.findIndex(m => m.player.id === playerId);
    let newCurrentTurnIndex = this.teamData.currentTurnIndex;

    if (removedIndex <= this.teamData.currentTurnIndex && newMembers.length > 0) {
      newCurrentTurnIndex = Math.max(0, this.teamData.currentTurnIndex - 1);
      newCurrentTurnIndex = newCurrentTurnIndex % newMembers.length;
    } else if (newMembers.length === 0) {
      newCurrentTurnIndex = 0;
    }

    return new Team(
      {
        id: this.teamData.id,
        name: this.teamData.name,
        color: this.teamData.color,
        assignedKeyboardId: this.teamData.assignedKeyboardId
      },
      newMembers
    ).updateCurrentTurn(newCurrentTurnIndex);
  }

  /**
   * メンバーのターン順を変更
   */
  reorderMembers(newOrder: string[]): Team {
    // 現在のメンバーIDとnewOrderの整合性チェック
    const currentMemberIds = new Set(this.teamData.members.map(m => m.player.id));
    const newOrderIds = new Set(newOrder);

    if (currentMemberIds.size !== newOrderIds.size ||
        ![...currentMemberIds].every(id => newOrderIds.has(id))) {
      throw new Error('新しいターン順に含まれるメンバーIDが現在のメンバーと一致しません');
    }

    const reorderedPlayers = newOrder.map(playerId => {
      const member = this.teamData.members.find(m => m.player.id === playerId);
      if (!member) {
        throw new Error(`プレイヤーID "${playerId}" が見つかりません`);
      }
      return member.player;
    });

    return new Team(
      {
        id: this.teamData.id,
        name: this.teamData.name,
        color: this.teamData.color,
        assignedKeyboardId: this.teamData.assignedKeyboardId
      },
      reorderedPlayers
    );
  }

  /**
   * チーム名を更新
   */
  updateName(name: string): Team {
    if (!name.trim()) {
      throw new Error('チーム名は必須です');
    }

    return new Team(
      {
        id: this.teamData.id,
        name: name.trim(),
        color: this.teamData.color,
        assignedKeyboardId: this.teamData.assignedKeyboardId
      },
      this.teamData.members.map(m => m.player)
    ).updateCurrentTurn(this.teamData.currentTurnIndex);
  }

  /**
   * チームが準備完了かチェック
   */
  isReadyForGame(): { ready: boolean; issues: string[] } {
    const issues: string[] = [];

    if (this.teamData.members.length === 0) {
      issues.push('チームにメンバーが割り当てられていません');
    }

    if (!this.teamData.assignedKeyboardId) {
      issues.push('チームにキーボードが割り当てられていません');
    }

    return {
      ready: issues.length === 0,
      issues
    };
  }

  /**
   * プレーンオブジェクトとして取得
   */
  toPlainObject(): TeamWithMembers {
    return { ...this.teamData };
  }

  /**
   * 指定されたプレイヤーがメンバーかチェック
   */
  hasMember(playerId: string): boolean {
    return this.teamData.members.some(m => m.player.id === playerId);
  }

  /**
   * メンバーを割り当てる（内部用）
   */
  private assignMembers(players: IPlayer[]): TeamMember[] {
    const now = new Date().toISOString();

    return players.map((player, index) => ({
      player,
      turnOrder: index,
      joinedAt: now
    }));
  }

  /**
   * 現在のターンインデックスを更新（内部用）
   */
  private updateCurrentTurn(turnIndex: number): Team {
    const team = Object.create(Team.prototype);
    team.teamData = {
      ...this.teamData,
      currentTurnIndex: turnIndex
    };
    return team;
  }

  /**
   * チームの妥当性検証（内部用）
   */
  private validateTeam(): void {
    if (this.teamData.id <= 0) {
      throw new Error('チームIDは正の数である必要があります');
    }

    if (!this.teamData.name.trim()) {
      throw new Error('チーム名は必須です');
    }

    if (this.teamData.currentTurnIndex < 0) {
      throw new Error('現在のターンインデックスは0以上である必要があります');
    }

    if (this.teamData.members.length > 0 &&
        this.teamData.currentTurnIndex >= this.teamData.members.length) {
      throw new Error('現在のターンインデックスがメンバー数を超えています');
    }

    // ターン順の重複チェック
    const turnOrders = this.teamData.members.map(m => m.turnOrder);
    const uniqueTurnOrders = new Set(turnOrders);
    if (turnOrders.length !== uniqueTurnOrders.size) {
      throw new Error('ターン順に重複があります');
    }

    // プレイヤーIDの重複チェック
    const playerIds = this.teamData.members.map(m => m.player.id);
    const uniquePlayerIds = new Set(playerIds);
    if (playerIds.length !== uniquePlayerIds.size) {
      throw new Error('同じプレイヤーが複数回チームに参加しています');
    }
  }
}