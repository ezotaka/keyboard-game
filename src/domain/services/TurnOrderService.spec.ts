import { TurnOrderService } from './TurnOrderService';
import { Team } from '../entities/Team';
import { Player } from '../entities/Player';
import { TeamSettings } from '../../shared/types/GameConfig';

describe('TurnOrderService', () => {
  let service: TurnOrderService;

  const mockPlayers: Player[] = [
    new Player('太郎', 'player-1'),
    new Player('花子', 'player-2'),
    new Player('次郎', 'player-3'),
    new Player('美香', 'player-4')
  ];

  const mockTeamSettings: TeamSettings = {
    id: 1,
    name: 'テストチーム',
    color: '#ff6b6b',
    assignedKeyboardId: 'keyboard-1'
  };

  let teamWithMembers: Team;

  beforeEach(() => {
    service = new TurnOrderService();
    teamWithMembers = new Team(mockTeamSettings, mockPlayers);
  });

  describe('decideTurnOrder', () => {
    describe('sequential strategy', () => {
      it('should maintain original order', () => {
        const result = service.decideTurnOrder(teamWithMembers, {
          strategy: 'sequential'
        });

        expect(result.newOrder).toEqual(['player-1', 'player-2', 'player-3', 'player-4']);
        expect(result.team.getCurrentPlayer()?.id).toBe('player-1');
        expect(result.team.memberCount).toBe(4);
      });
    });

    describe('random strategy', () => {
      it('should randomize order with seed consistency', () => {
        const result1 = service.decideTurnOrder(teamWithMembers, {
          strategy: 'random',
          seed: 'test-seed'
        });

        const result2 = service.decideTurnOrder(teamWithMembers, {
          strategy: 'random',
          seed: 'test-seed'
        });

        expect(result1.newOrder).toEqual(result2.newOrder);
        expect(result1.team.memberCount).toBe(4);
        expect(result2.team.memberCount).toBe(4);
      });

      it('should produce different results with different seeds', () => {
        const result1 = service.decideTurnOrder(teamWithMembers, {
          strategy: 'random',
          seed: 'seed-1'
        });

        const result2 = service.decideTurnOrder(teamWithMembers, {
          strategy: 'random',
          seed: 'seed-2'
        });

        // 同じプレイヤーが含まれているかチェック
        const ids1 = new Set(result1.newOrder);
        const ids2 = new Set(result2.newOrder);
        expect(ids1).toEqual(ids2);
        expect(ids1.size).toBe(4);
      });
    });

    describe('alphabetical strategy', () => {
      it('should order players alphabetically in Japanese', () => {
        const result = service.decideTurnOrder(teamWithMembers, {
          strategy: 'alphabetical'
        });

        // 日本語のアルファベット順: 次郎(じろう) < 太郎(たろう) < 花子(はなこ) < 美香(みか)
        const expectedOrder = result.newOrder;
        expect(expectedOrder).toHaveLength(4);

        const playerNames = expectedOrder.map(id => {
          const player = mockPlayers.find(p => p.id === id);
          return player?.name;
        });

        // ソートされているかチェック
        const sortedNames = [...playerNames].sort((a, b) =>
          (a || '').localeCompare(b || '', 'ja')
        );
        expect(playerNames).toEqual(sortedNames);
      });
    });

    describe('manual strategy', () => {
      it('should order players manually', () => {
        const customOrder = ['player-3', 'player-1', 'player-4', 'player-2'];

        const result = service.decideTurnOrder(teamWithMembers, {
          strategy: 'manual',
          customOrder
        });

        expect(result.newOrder).toEqual(customOrder);
        expect(result.team.getCurrentPlayer()?.id).toBe('player-3');
      });

      it('should throw error for manual strategy without customOrder', () => {
        expect(() => service.decideTurnOrder(teamWithMembers, {
          strategy: 'manual'
        })).toThrow('手動指定にはcustomOrderが必要です');
      });

      it('should throw error for invalid customOrder', () => {
        const invalidOrder = ['player-1', 'player-2', 'non-existent'];

        expect(() => service.decideTurnOrder(teamWithMembers, {
          strategy: 'manual',
          customOrder: invalidOrder
        })).toThrow('カスタム順序のプレイヤー数が一致しません');
      });

      it('should throw error for incomplete customOrder', () => {
        const incompleteOrder = ['player-1', 'player-2']; // missing player-3 and player-4

        expect(() => service.decideTurnOrder(teamWithMembers, {
          strategy: 'manual',
          customOrder: incompleteOrder
        })).toThrow('カスタム順序のプレイヤー数が一致しません');
      });
    });

    it('should throw error for empty team', () => {
      const emptyTeam = new Team(mockTeamSettings);

      expect(() => service.decideTurnOrder(emptyTeam, {
        strategy: 'sequential'
      })).toThrow('メンバーがいないチームのターン順は決定できません');
    });

    it('should throw error for invalid strategy', () => {
      expect(() => service.decideTurnOrder(teamWithMembers, {
        strategy: 'invalid' as any
      })).toThrow('未サポートのターン順戦略: invalid');
    });
  });

  describe('decideTurnOrderForMultipleTeams', () => {
    it('should decide turn order for multiple teams', () => {
      const team1 = new Team({ ...mockTeamSettings, id: 1 }, [mockPlayers[0], mockPlayers[1]]);
      const team2 = new Team({ ...mockTeamSettings, id: 2 }, [mockPlayers[2], mockPlayers[3]]);

      const results = service.decideTurnOrderForMultipleTeams([team1, team2], {
        strategy: 'sequential'
      });

      expect(results).toHaveLength(2);
      expect(results[0].team.id).toBe(1);
      expect(results[1].team.id).toBe(2);
      expect(results[0].newOrder).toEqual(['player-1', 'player-2']);
      expect(results[1].newOrder).toEqual(['player-3', 'player-4']);
    });
  });

  describe('advanceToNextPlayer', () => {
    it('should advance to next player', () => {
      const nextTeam = service.advanceToNextPlayer(teamWithMembers);

      expect(nextTeam.currentTurnIndex).toBe(1);
      expect(nextTeam.getCurrentPlayer()?.id).toBe('player-2');
    });

    it('should wrap around to first player', () => {
      let currentTeam = teamWithMembers;

      // 全プレイヤーを回る
      for (let i = 0; i < 4; i++) {
        currentTeam = service.advanceToNextPlayer(currentTeam);
      }

      expect(currentTeam.currentTurnIndex).toBe(0);
      expect(currentTeam.getCurrentPlayer()?.id).toBe('player-1');
    });
  });

  describe('setCurrentPlayer', () => {
    it('should set current player correctly', () => {
      const updatedTeam = service.setCurrentPlayer(teamWithMembers, 'player-3');

      expect(updatedTeam.getCurrentPlayer()?.id).toBe('player-3');
      expect(updatedTeam.currentTurnIndex).toBe(2);
    });

    it('should throw error for non-existent player', () => {
      expect(() => service.setCurrentPlayer(teamWithMembers, 'non-existent'))
        .toThrow('プレイヤー (ID: non-existent) はチームに参加していません');
    });
  });

  describe('validateTurnOrder', () => {
    it('should validate correct turn order', () => {
      const validation = service.validateTurnOrder(teamWithMembers);

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect invalid team without members', () => {
      const emptyTeam = new Team(mockTeamSettings);
      const validation = service.validateTurnOrder(emptyTeam);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('チームにメンバーがいません');
    });
  });

  describe('getTurnOrderStatistics', () => {
    it('should return correct statistics', () => {
      const stats = service.getTurnOrderStatistics(teamWithMembers);

      expect(stats).toEqual({
        totalMembers: 4,
        currentPlayerName: '太郎',
        currentTurnIndex: 0,
        nextPlayerName: '花子',
        previousPlayerName: '美香' // 循環するので最後のプレイヤー
      });
    });

    it('should return null values for empty team', () => {
      const emptyTeam = new Team(mockTeamSettings);
      const stats = service.getTurnOrderStatistics(emptyTeam);

      expect(stats).toEqual({
        totalMembers: 0,
        currentPlayerName: null,
        currentTurnIndex: 0,
        nextPlayerName: null,
        previousPlayerName: null
      });
    });

    it('should handle turn advancement correctly in statistics', () => {
      const nextTurnTeam = teamWithMembers.nextTurn();
      const stats = service.getTurnOrderStatistics(nextTurnTeam);

      expect(stats).toEqual({
        totalMembers: 4,
        currentPlayerName: '花子',
        currentTurnIndex: 1,
        nextPlayerName: '次郎',
        previousPlayerName: '太郎'
      });
    });
  });
});