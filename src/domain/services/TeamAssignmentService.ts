import { Player as IPlayer } from '../../shared/types/GameConfig';
import { Team } from '../entities/Team';
import { TeamSettings } from '../../shared/types/GameConfig';
import { seededShuffle } from '../../shared/utils/seeded-random';

/**
 * チーム割り当て戦略の種類
 */
export type TeamAssignmentStrategy =
  | 'sequential' // 順番通り
  | 'random'     // ランダム
  | 'manual';    // 手動指定

/**
 * 手動割り当ての指定
 */
export interface ManualAssignment {
  teamId: number;
  playerIds: string[];
}

/**
 * チーム割り当て結果
 */
export interface TeamAssignmentResult {
  teams: Team[];
  unassignedPlayers: IPlayer[];
}

/**
 * チーム割り当てオプション
 */
export interface TeamAssignmentOptions {
  strategy: TeamAssignmentStrategy;
  seed?: string; // ランダム戦略用のシード値
  manualAssignments?: ManualAssignment[]; // 手動戦略用の割り当て指定
  balanceTeams?: boolean; // チームのメンバー数を可能な限り均等にするか
}

/**
 * チーム割り当てドメインサービス
 * Phase 1.4: プレイヤーをチームに割り当てる戦略を実装
 */
export class TeamAssignmentService {
  /**
   * プレイヤーをチームに割り当て
   */
  assignPlayersToTeams(
    players: IPlayer[],
    teamSettings: TeamSettings[],
    options: TeamAssignmentOptions
  ): TeamAssignmentResult {
    this.validateInputs(players, teamSettings, options);

    switch (options.strategy) {
      case 'sequential':
        return this.assignSequentially(players, teamSettings, options.balanceTeams ?? true);

      case 'random':
        return this.assignRandomly(players, teamSettings, options.seed, options.balanceTeams ?? true);

      case 'manual':
        if (!options.manualAssignments) {
          throw new Error('手動割り当てには manualAssignments が必要です');
        }
        return this.assignManually(players, teamSettings, options.manualAssignments);

      default:
        throw new Error(`未サポートの割り当て戦略: ${options.strategy}`);
    }
  }

  /**
   * チーム間でプレイヤーを移動
   */
  movePlayerBetweenTeams(
    teams: Team[],
    playerId: string,
    fromTeamId: number,
    toTeamId: number
  ): Team[] {
    const fromTeamIndex = teams.findIndex(t => t.id === fromTeamId);
    const toTeamIndex = teams.findIndex(t => t.id === toTeamId);

    if (fromTeamIndex === -1) {
      throw new Error(`移動元チーム (ID: ${fromTeamId}) が見つかりません`);
    }

    if (toTeamIndex === -1) {
      throw new Error(`移動先チーム (ID: ${toTeamId}) が見つかりません`);
    }

    const fromTeam = teams[fromTeamIndex];
    const toTeam = teams[toTeamIndex];

    if (!fromTeam.hasMember(playerId)) {
      throw new Error(`プレイヤー (ID: ${playerId}) は移動元チームに存在しません`);
    }

    if (toTeam.hasMember(playerId)) {
      throw new Error(`プレイヤー (ID: ${playerId}) は既に移動先チームに存在します`);
    }

    const player = fromTeam.members.find(m => m.player.id === playerId)?.player;
    if (!player) {
      throw new Error(`プレイヤー (ID: ${playerId}) の情報が取得できません`);
    }

    const updatedFromTeam = fromTeam.removeMember(playerId);
    const updatedToTeam = toTeam.addMember(player);

    const updatedTeams = [...teams];
    updatedTeams[fromTeamIndex] = updatedFromTeam;
    updatedTeams[toTeamIndex] = updatedToTeam;

    return updatedTeams;
  }

  /**
   * チーム割り当ての妥当性をチェック
   */
  validateTeamAssignments(teams: Team[]): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // 全プレイヤーのID重複チェック
    const allPlayerIds: string[] = [];
    teams.forEach(team => {
      team.members.forEach(member => {
        if (allPlayerIds.includes(member.player.id)) {
          issues.push(`プレイヤー "${member.player.name}" (ID: ${member.player.id}) が複数のチームに割り当てられています`);
        } else {
          allPlayerIds.push(member.player.id);
        }
      });
    });

    // 空のチームをチェック
    const emptyTeams = teams.filter(team => team.memberCount === 0);
    if (emptyTeams.length > 0) {
      issues.push(`${emptyTeams.length}個のチームにメンバーが割り当てられていません`);
    }

    // チーム間のメンバー数バランスをチェック（警告レベル）
    const memberCounts = teams.map(team => team.memberCount);
    const maxMembers = Math.max(...memberCounts);
    const minMembers = Math.min(...memberCounts);

    if (maxMembers - minMembers > 1) {
      issues.push(`チーム間のメンバー数に不均衡があります (最大: ${maxMembers}, 最小: ${minMembers})`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * 順番にプレイヤーを割り当て（内部用）
   */
  private assignSequentially(
    players: IPlayer[],
    teamSettings: TeamSettings[],
    balanceTeams: boolean
  ): TeamAssignmentResult {
    const teams = teamSettings.map(settings => new Team(settings));

    if (balanceTeams) {
      // ラウンドロビン方式で均等に割り当て
      players.forEach((player, index) => {
        const teamIndex = index % teams.length;
        teams[teamIndex] = teams[teamIndex].addMember(player);
      });

      return {
        teams,
        unassignedPlayers: []
      };
    } else {
      // 最初のチームから順番に埋めていく
      const playersPerTeam = Math.ceil(players.length / teams.length);
      let playerIndex = 0;

      for (let teamIndex = 0; teamIndex < teams.length && playerIndex < players.length; teamIndex++) {
        for (let i = 0; i < playersPerTeam && playerIndex < players.length; i++) {
          teams[teamIndex] = teams[teamIndex].addMember(players[playerIndex]);
          playerIndex++;
        }
      }

      return {
        teams,
        unassignedPlayers: players.slice(playerIndex)
      };
    }
  }

  /**
   * ランダムにプレイヤーを割り当て（内部用）
   */
  private assignRandomly(
    players: IPlayer[],
    teamSettings: TeamSettings[],
    seed?: string,
    balanceTeams?: boolean
  ): TeamAssignmentResult {
    const shuffledPlayers = seededShuffle([...players], seed);
    return this.assignSequentially(shuffledPlayers, teamSettings, balanceTeams ?? true);
  }

  /**
   * 手動でプレイヤーを割り当て（内部用）
   */
  private assignManually(
    players: IPlayer[],
    teamSettings: TeamSettings[],
    manualAssignments: ManualAssignment[]
  ): TeamAssignmentResult {
    const teams = teamSettings.map(settings => new Team(settings));
    const assignedPlayerIds = new Set<string>();

    // 手動割り当てを適用
    manualAssignments.forEach(assignment => {
      const teamIndex = teams.findIndex(t => t.id === assignment.teamId);
      if (teamIndex === -1) {
        throw new Error(`チーム ID ${assignment.teamId} が見つかりません`);
      }

      assignment.playerIds.forEach(playerId => {
        if (assignedPlayerIds.has(playerId)) {
          throw new Error(`プレイヤー ID ${playerId} が複数のチームに割り当てられています`);
        }

        const player = players.find(p => p.id === playerId);
        if (!player) {
          throw new Error(`プレイヤー ID ${playerId} が見つかりません`);
        }

        teams[teamIndex] = teams[teamIndex].addMember(player);
        assignedPlayerIds.add(playerId);
      });
    });

    // 未割り当てのプレイヤーを特定
    const unassignedPlayers = players.filter(player => !assignedPlayerIds.has(player.id));

    return {
      teams,
      unassignedPlayers
    };
  }

  /**
   * 入力値の妥当性検証（内部用）
   */
  private validateInputs(
    players: IPlayer[],
    teamSettings: TeamSettings[],
    options: TeamAssignmentOptions
  ): void {
    if (players.length === 0) {
      throw new Error('プレイヤーが指定されていません');
    }

    if (teamSettings.length === 0) {
      throw new Error('チーム設定が指定されていません');
    }

    if (teamSettings.length < 2) {
      throw new Error('最低2つのチームが必要です');
    }

    // プレイヤーID重複チェック
    const playerIds = players.map(p => p.id);
    const uniquePlayerIds = new Set(playerIds);
    if (playerIds.length !== uniquePlayerIds.size) {
      throw new Error('プレイヤーIDに重複があります');
    }

    // チームID重複チェック
    const teamIds = teamSettings.map(t => t.id);
    const uniqueTeamIds = new Set(teamIds);
    if (teamIds.length !== uniqueTeamIds.size) {
      throw new Error('チームIDに重複があります');
    }

    // 手動割り当ての妥当性チェック
    if (options.strategy === 'manual' && options.manualAssignments) {
      options.manualAssignments.forEach(assignment => {
        if (!teamIds.includes(assignment.teamId)) {
          throw new Error(`手動割り当てで指定されたチーム ID ${assignment.teamId} が存在しません`);
        }

        assignment.playerIds.forEach(playerId => {
          if (!playerIds.includes(playerId)) {
            throw new Error(`手動割り当てで指定されたプレイヤー ID ${playerId} が存在しません`);
          }
        });
      });
    }
  }
}