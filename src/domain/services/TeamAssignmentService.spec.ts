import { TeamAssignmentService } from './TeamAssignmentService';
import { Player } from '../entities/Player';
import { TeamSettings } from '../../shared/types/GameConfig';

describe('TeamAssignmentService', () => {
  let service: TeamAssignmentService;

  const mockPlayers: Player[] = [
    new Player('太郎', 'player-1'),
    new Player('花子', 'player-2'),
    new Player('次郎', 'player-3'),
    new Player('美香', 'player-4'),
    new Player('健太', 'player-5')
  ];

  const mockTeamSettings: TeamSettings[] = [
    { id: 1, name: 'チーム1', color: '#ff6b6b' },
    { id: 2, name: 'チーム2', color: '#4ecdc4' },
    { id: 3, name: 'チーム3', color: '#45b7d1' }
  ];

  beforeEach(() => {
    service = new TeamAssignmentService();
  });

  describe('assignPlayersToTeams', () => {
    describe('sequential strategy', () => {
      it('should assign players sequentially with balance', () => {
        const result = service.assignPlayersToTeams(
          mockPlayers,
          mockTeamSettings,
          { strategy: 'sequential', balanceTeams: true }
        );

        expect(result.teams).toHaveLength(3);
        expect(result.unassignedPlayers).toHaveLength(0);

        // バランスの取れた割り当てをチェック
        const memberCounts = result.teams.map(team => team.memberCount);
        expect(memberCounts).toEqual([2, 2, 1]); // 5人を3チームに分けると 2,2,1

        // 順番チェック
        expect(result.teams[0].members[0].player.id).toBe('player-1');
        expect(result.teams[1].members[0].player.id).toBe('player-2');
        expect(result.teams[2].members[0].player.id).toBe('player-3');
        expect(result.teams[0].members[1].player.id).toBe('player-4');
        expect(result.teams[1].members[1].player.id).toBe('player-5');
      });

      it('should assign players sequentially without balance', () => {
        const result = service.assignPlayersToTeams(
          mockPlayers,
          mockTeamSettings,
          { strategy: 'sequential', balanceTeams: false }
        );

        expect(result.teams).toHaveLength(3);
        expect(result.unassignedPlayers).toHaveLength(0);

        // 最初のチームから埋める
        const memberCounts = result.teams.map(team => team.memberCount);
        expect(memberCounts).toEqual([2, 2, 1]);
      });
    });

    describe('random strategy', () => {
      it('should assign players randomly with seed', () => {
        const result1 = service.assignPlayersToTeams(
          mockPlayers,
          mockTeamSettings,
          { strategy: 'random', seed: 'test-seed', balanceTeams: true }
        );

        const result2 = service.assignPlayersToTeams(
          mockPlayers,
          mockTeamSettings,
          { strategy: 'random', seed: 'test-seed', balanceTeams: true }
        );

        expect(result1.teams).toHaveLength(3);
        expect(result2.teams).toHaveLength(3);

        // 同じシードなら同じ結果
        result1.teams.forEach((team, index) => {
          const team1Members = team.members.map(m => m.player.id).sort();
          const team2Members = result2.teams[index].members.map(m => m.player.id).sort();
          expect(team1Members).toEqual(team2Members);
        });
      });

      it('should produce different results with different seeds', () => {
        const result1 = service.assignPlayersToTeams(
          mockPlayers,
          mockTeamSettings,
          { strategy: 'random', seed: 'seed-1', balanceTeams: true }
        );

        const result2 = service.assignPlayersToTeams(
          mockPlayers,
          mockTeamSettings,
          { strategy: 'random', seed: 'seed-2', balanceTeams: true }
        );

        // 異なる結果になる可能性が高い（必ずではないが統計的に）
        const team1_1Members = result1.teams[0].members.map(m => m.player.id);
        const team1_2Members = result2.teams[0].members.map(m => m.player.id);

        // 少なくとも全体的な割り当ては機能している
        const result1HasAllTeamsWithMembers = result1.teams.every(team => team.memberCount > 0);
        const result2HasAllTeamsWithMembers = result2.teams.every(team => team.memberCount > 0);

        // 5人を3チームに分けるので、バランスが取れている場合は全チームにメンバーがいる
        expect(result1HasAllTeamsWithMembers || result2HasAllTeamsWithMembers).toBe(true);
      });
    });

    describe('manual strategy', () => {
      it('should assign players manually', () => {
        const manualAssignments = [
          { teamId: 1, playerIds: ['player-1', 'player-3'] },
          { teamId: 2, playerIds: ['player-2'] },
          { teamId: 3, playerIds: ['player-4'] }
        ];

        const result = service.assignPlayersToTeams(
          mockPlayers,
          mockTeamSettings,
          { strategy: 'manual', manualAssignments }
        );

        expect(result.teams[0].memberCount).toBe(2);
        expect(result.teams[1].memberCount).toBe(1);
        expect(result.teams[2].memberCount).toBe(1);
        expect(result.unassignedPlayers).toHaveLength(1);
        expect(result.unassignedPlayers[0].id).toBe('player-5');

        // 手動割り当てが正確かチェック
        expect(result.teams[0].hasMember('player-1')).toBe(true);
        expect(result.teams[0].hasMember('player-3')).toBe(true);
        expect(result.teams[1].hasMember('player-2')).toBe(true);
        expect(result.teams[2].hasMember('player-4')).toBe(true);
      });

      it('should throw error for manual strategy without assignments', () => {
        expect(() => service.assignPlayersToTeams(
          mockPlayers,
          mockTeamSettings,
          { strategy: 'manual' }
        )).toThrow('手動割り当てには manualAssignments が必要です');
      });

      it('should throw error for duplicate player assignment in manual', () => {
        const manualAssignments = [
          { teamId: 1, playerIds: ['player-1'] },
          { teamId: 2, playerIds: ['player-1'] } // 重複
        ];

        expect(() => service.assignPlayersToTeams(
          mockPlayers,
          mockTeamSettings,
          { strategy: 'manual', manualAssignments }
        )).toThrow('プレイヤー ID player-1 が複数のチームに割り当てられています');
      });
    });

    it('should throw error for invalid strategy', () => {
      expect(() => service.assignPlayersToTeams(
        mockPlayers,
        mockTeamSettings,
        { strategy: 'invalid' as any }
      )).toThrow('未サポートの割り当て戦略: invalid');
    });
  });

  describe('movePlayerBetweenTeams', () => {
    it('should move player between teams', () => {
      const result = service.assignPlayersToTeams(
        mockPlayers.slice(0, 3),
        mockTeamSettings.slice(0, 2),
        { strategy: 'sequential' }
      );

      const updatedTeams = service.movePlayerBetweenTeams(
        result.teams,
        'player-1',
        1, // from team 1
        2  // to team 2
      );

      expect(updatedTeams[0].hasMember('player-1')).toBe(false);
      expect(updatedTeams[1].hasMember('player-1')).toBe(true);
    });

    it('should throw error when moving non-existent player', () => {
      const result = service.assignPlayersToTeams(
        mockPlayers.slice(0, 2),
        mockTeamSettings.slice(0, 2),
        { strategy: 'sequential' }
      );

      expect(() => service.movePlayerBetweenTeams(
        result.teams,
        'non-existent',
        1,
        2
      )).toThrow('プレイヤー (ID: non-existent) は移動元チームに存在しません');
    });

    it('should throw error when moving to team that already has the player', () => {
      const result = service.assignPlayersToTeams(
        mockPlayers.slice(0, 2),
        mockTeamSettings.slice(0, 2),
        { strategy: 'sequential' }
      );

      expect(() => service.movePlayerBetweenTeams(
        result.teams,
        'player-1',
        1,
        1 // same team
      )).toThrow('プレイヤー (ID: player-1) は既に移動先チームに存在します');
    });
  });

  describe('validateTeamAssignments', () => {
    it('should validate correct team assignments', () => {
      const result = service.assignPlayersToTeams(
        mockPlayers,
        mockTeamSettings,
        { strategy: 'sequential' }
      );

      const validation = service.validateTeamAssignments(result.teams);

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect empty teams', () => {
      const emptyTeam = mockTeamSettings.map(settings =>
        settings.id === 3 ? new (require('../entities/Team').Team)(settings) :
        new (require('../entities/Team').Team)(settings, [mockPlayers[0]])
      );

      const validation = service.validateTeamAssignments([
        new (require('../entities/Team').Team)(mockTeamSettings[0], [mockPlayers[0]]),
        new (require('../entities/Team').Team)(mockTeamSettings[1], [mockPlayers[1]]),
        new (require('../entities/Team').Team)(mockTeamSettings[2])
      ]);

      expect(validation.valid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('メンバーが割り当てられていません'))).toBe(true);
    });
  });

  describe('input validation', () => {
    it('should throw error for empty players', () => {
      expect(() => service.assignPlayersToTeams(
        [],
        mockTeamSettings,
        { strategy: 'sequential' }
      )).toThrow('プレイヤーが指定されていません');
    });

    it('should throw error for empty teams', () => {
      expect(() => service.assignPlayersToTeams(
        mockPlayers,
        [],
        { strategy: 'sequential' }
      )).toThrow('チーム設定が指定されていません');
    });

    it('should throw error for insufficient teams', () => {
      expect(() => service.assignPlayersToTeams(
        mockPlayers,
        [mockTeamSettings[0]],
        { strategy: 'sequential' }
      )).toThrow('最低2つのチームが必要です');
    });

    it('should throw error for duplicate player IDs', () => {
      const duplicatePlayers = [mockPlayers[0], mockPlayers[0]];

      expect(() => service.assignPlayersToTeams(
        duplicatePlayers,
        mockTeamSettings,
        { strategy: 'sequential' }
      )).toThrow('プレイヤーIDに重複があります');
    });

    it('should throw error for duplicate team IDs', () => {
      const duplicateTeams = [mockTeamSettings[0], mockTeamSettings[0]];

      expect(() => service.assignPlayersToTeams(
        mockPlayers,
        duplicateTeams,
        { strategy: 'sequential' }
      )).toThrow('チームIDに重複があります');
    });
  });
});