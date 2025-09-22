import { Team } from '../entities/Team';
import { Player as IPlayer } from '../../shared/types/GameConfig';
import { seededShuffle } from '../../shared/utils/seeded-random';

/**
 * ターン順決定戦略の種類
 */
export type TurnOrderStrategy =
  | 'sequential'  // プレイヤーが追加された順番
  | 'random'      // ランダムな順番
  | 'alphabetical'// 名前のアルファベット順（あいうえお順）
  | 'manual';     // 手動指定

/**
 * ターン順決定オプション
 */
export interface TurnOrderOptions {
  strategy: TurnOrderStrategy;
  seed?: string; // ランダム戦略用のシード値
  customOrder?: string[]; // 手動戦略用のプレイヤーID順序
}

/**
 * チーム内ターン順決定結果
 */
export interface TurnOrderResult {
  team: Team;
  previousOrder: string[]; // 変更前のプレイヤーID順序
  newOrder: string[];      // 変更後のプレイヤーID順序
}

/**
 * ターン順決定ドメインサービス
 * Phase 1.4: チーム内のプレイヤーのターン順を決定・管理する
 */
export class TurnOrderService {
  /**
   * チームのターン順を決定
   */
  decideTurnOrder(team: Team, options: TurnOrderOptions): TurnOrderResult {
    if (team.memberCount === 0) {
      throw new Error('メンバーがいないチームのターン順は決定できません');
    }

    const currentPlayers = team.members.map(member => member.player);
    const previousOrder = currentPlayers.map(player => player.id);

    let newOrder: string[];

    switch (options.strategy) {
      case 'sequential':
        newOrder = this.orderSequentially(currentPlayers);
        break;

      case 'random':
        newOrder = this.orderRandomly(currentPlayers, options.seed);
        break;

      case 'alphabetical':
        newOrder = this.orderAlphabetically(currentPlayers);
        break;

      case 'manual':
        if (!options.customOrder) {
          throw new Error('手動指定にはcustomOrderが必要です');
        }
        newOrder = this.orderManually(currentPlayers, options.customOrder);
        break;

      default:
        throw new Error(`未サポートのターン順戦略: ${options.strategy}`);
    }

    const reorderedTeam = team.reorderMembers(newOrder);

    return {
      team: reorderedTeam,
      previousOrder,
      newOrder
    };
  }

  /**
   * 複数チームのターン順を一括決定
   */
  decideTurnOrderForMultipleTeams(
    teams: Team[],
    options: TurnOrderOptions
  ): TurnOrderResult[] {
    return teams.map(team => this.decideTurnOrder(team, options));
  }

  /**
   * チーム内の現在のプレイヤーを次のプレイヤーに変更
   */
  advanceToNextPlayer(team: Team): Team {
    return team.nextTurn();
  }

  /**
   * チーム内の特定のプレイヤーを現在のターンに設定
   */
  setCurrentPlayer(team: Team, playerId: string): Team {
    if (!team.hasMember(playerId)) {
      throw new Error(`プレイヤー (ID: ${playerId}) はチームに参加していません`);
    }

    const members = team.members;
    const targetIndex = members.findIndex(member => member.player.id === playerId);

    if (targetIndex === -1) {
      throw new Error(`プレイヤー (ID: ${playerId}) が見つかりません`);
    }

    // 現在のターンインデックスを更新して新しいTeamを作成
    const currentPlayers = members.map(member => member.player);
    const reorderedTeam = new Team({
      id: team.id,
      name: team.name,
      color: team.color,
      assignedKeyboardId: team.assignedKeyboardId
    }, currentPlayers);

    // targetIndexに設定するためにnextTurnを適切な回数呼ぶ
    let result = reorderedTeam;
    for (let i = 0; i < targetIndex; i++) {
      result = result.nextTurn();
    }

    return result;
  }

  /**
   * ターン順の妥当性を検証
   */
  validateTurnOrder(team: Team): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (team.memberCount === 0) {
      issues.push('チームにメンバーがいません');
      return { valid: false, issues };
    }

    if (team.currentTurnIndex < 0 || team.currentTurnIndex >= team.memberCount) {
      issues.push(`現在のターンインデックス (${team.currentTurnIndex}) が無効です`);
    }

    // ターン順の連続性チェック
    const turnOrders = team.members.map(member => member.turnOrder);
    turnOrders.sort((a, b) => a - b);

    for (let i = 0; i < turnOrders.length; i++) {
      if (turnOrders[i] !== i) {
        issues.push('ターン順が連続していません');
        break;
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * ターン順統計を取得
   */
  getTurnOrderStatistics(team: Team): {
    totalMembers: number;
    currentPlayerName: string | null;
    currentTurnIndex: number;
    nextPlayerName: string | null;
    previousPlayerName: string | null;
  } {
    if (team.memberCount === 0) {
      return {
        totalMembers: 0,
        currentPlayerName: null,
        currentTurnIndex: 0,
        nextPlayerName: null,
        previousPlayerName: null
      };
    }

    const currentPlayer = team.getCurrentPlayer();
    const nextIndex = (team.currentTurnIndex + 1) % team.memberCount;
    const prevIndex = (team.currentTurnIndex - 1 + team.memberCount) % team.memberCount;

    return {
      totalMembers: team.memberCount,
      currentPlayerName: currentPlayer?.name || null,
      currentTurnIndex: team.currentTurnIndex,
      nextPlayerName: team.members[nextIndex]?.player.name || null,
      previousPlayerName: team.members[prevIndex]?.player.name || null
    };
  }

  /**
   * 順番通りにプレイヤーを並び替え（内部用）
   */
  private orderSequentially(players: IPlayer[]): string[] {
    return players.map(player => player.id);
  }

  /**
   * ランダムにプレイヤーを並び替え（内部用）
   */
  private orderRandomly(players: IPlayer[], seed?: string): string[] {
    const shuffledPlayers = seededShuffle([...players], seed);
    return shuffledPlayers.map(player => player.id);
  }

  /**
   * アルファベット順（あいうえお順）にプレイヤーを並び替え（内部用）
   */
  private orderAlphabetically(players: IPlayer[]): string[] {
    const sortedPlayers = [...players].sort((a, b) =>
      a.name.localeCompare(b.name, 'ja')
    );
    return sortedPlayers.map(player => player.id);
  }

  /**
   * 手動でプレイヤーを並び替え（内部用）
   */
  private orderManually(players: IPlayer[], customOrder: string[]): string[] {
    // カスタム順序の妥当性チェック
    const playerIds = players.map(p => p.id);
    const customOrderSet = new Set(customOrder);
    const playerIdSet = new Set(playerIds);

    if (customOrderSet.size !== playerIdSet.size) {
      throw new Error('カスタム順序のプレイヤー数が一致しません');
    }

    for (const playerId of customOrder) {
      if (!playerIdSet.has(playerId)) {
        throw new Error(`カスタム順序に存在しないプレイヤーID: ${playerId}`);
      }
    }

    for (const playerId of playerIds) {
      if (!customOrderSet.has(playerId)) {
        throw new Error(`カスタム順序に含まれていないプレイヤーID: ${playerId}`);
      }
    }

    return [...customOrder];
  }
}