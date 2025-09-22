import { Team } from './Team';
import { Player, TeamSettings } from '../../shared/types/GameConfig';

describe('Team', () => {
  const mockTeamSettings: TeamSettings = {
    id: 1,
    name: 'チーム1',
    color: '#ff6b6b',
    assignedKeyboardId: 'keyboard-1'
  };

  const mockPlayers: Player[] = [
    {
      id: 'player-1',
      name: '太郎',
      createdAt: '2023-01-01T00:00:00.000Z'
    },
    {
      id: 'player-2',
      name: '花子',
      createdAt: '2023-01-01T00:00:00.000Z'
    },
    {
      id: 'player-3',
      name: '次郎',
      createdAt: '2023-01-01T00:00:00.000Z'
    }
  ];

  describe('constructor', () => {
    it('should create team with members', () => {
      const team = new Team(mockTeamSettings, [mockPlayers[0], mockPlayers[1]]);

      expect(team.id).toBe(1);
      expect(team.name).toBe('チーム1');
      expect(team.color).toBe('#ff6b6b');
      expect(team.assignedKeyboardId).toBe('keyboard-1');
      expect(team.memberCount).toBe(2);
      expect(team.currentTurnIndex).toBe(0);
    });

    it('should create team without members', () => {
      const team = new Team(mockTeamSettings);

      expect(team.memberCount).toBe(0);
      expect(team.currentTurnIndex).toBe(0);
      expect(team.getCurrentPlayer()).toBeNull();
    });

    it('should throw error for invalid team ID', () => {
      const invalidSettings = { ...mockTeamSettings, id: 0 };

      expect(() => new Team(invalidSettings)).toThrow('チームIDは正の数である必要があります');
    });

    it('should throw error for empty team name', () => {
      const invalidSettings = { ...mockTeamSettings, name: '' };

      expect(() => new Team(invalidSettings)).toThrow('チーム名は必須です');
    });
  });

  describe('getCurrentPlayer', () => {
    it('should return current player', () => {
      const team = new Team(mockTeamSettings, [mockPlayers[0], mockPlayers[1]]);
      const currentPlayer = team.getCurrentPlayer();

      expect(currentPlayer).toEqual(mockPlayers[0]);
    });

    it('should return null for team without members', () => {
      const team = new Team(mockTeamSettings);
      const currentPlayer = team.getCurrentPlayer();

      expect(currentPlayer).toBeNull();
    });
  });

  describe('nextTurn', () => {
    it('should advance to next player', () => {
      const team = new Team(mockTeamSettings, [mockPlayers[0], mockPlayers[1]]);
      const nextTurnTeam = team.nextTurn();

      expect(nextTurnTeam.currentTurnIndex).toBe(1);
      expect(nextTurnTeam.getCurrentPlayer()).toEqual(mockPlayers[1]);
    });

    it('should wrap around to first player', () => {
      const team = new Team(mockTeamSettings, [mockPlayers[0], mockPlayers[1]]);
      const nextTurnTeam = team.nextTurn().nextTurn(); // 2回進める

      expect(nextTurnTeam.currentTurnIndex).toBe(0);
      expect(nextTurnTeam.getCurrentPlayer()).toEqual(mockPlayers[0]);
    });

    it('should not change for team without members', () => {
      const team = new Team(mockTeamSettings);
      const nextTurnTeam = team.nextTurn();

      expect(nextTurnTeam.currentTurnIndex).toBe(0);
      expect(nextTurnTeam.getCurrentPlayer()).toBeNull();
    });
  });

  describe('addMember', () => {
    it('should add new member', () => {
      const team = new Team(mockTeamSettings, [mockPlayers[0]]);
      const updatedTeam = team.addMember(mockPlayers[1]);

      expect(updatedTeam.memberCount).toBe(2);
      expect(updatedTeam.hasMember(mockPlayers[1].id)).toBe(true);
    });

    it('should throw error when adding duplicate member', () => {
      const team = new Team(mockTeamSettings, [mockPlayers[0]]);

      expect(() => team.addMember(mockPlayers[0]))
        .toThrow('プレイヤー "太郎" は既にチームに参加しています');
    });
  });

  describe('removeMember', () => {
    it('should remove member', () => {
      const team = new Team(mockTeamSettings, [mockPlayers[0], mockPlayers[1]]);
      const updatedTeam = team.removeMember(mockPlayers[1].id);

      expect(updatedTeam.memberCount).toBe(1);
      expect(updatedTeam.hasMember(mockPlayers[1].id)).toBe(false);
      expect(updatedTeam.hasMember(mockPlayers[0].id)).toBe(true);
    });

    it('should adjust current turn index when removing current player', () => {
      const team = new Team(mockTeamSettings, [mockPlayers[0], mockPlayers[1], mockPlayers[2]]);
      const nextTurnTeam = team.nextTurn(); // current index = 1 (player-2)
      const updatedTeam = nextTurnTeam.removeMember(mockPlayers[1].id);

      expect(updatedTeam.memberCount).toBe(2);
      expect(updatedTeam.currentTurnIndex).toBe(0);
      expect(updatedTeam.getCurrentPlayer()).toEqual(mockPlayers[0]);
    });

    it('should throw error when removing non-existent member', () => {
      const team = new Team(mockTeamSettings, [mockPlayers[0]]);

      expect(() => team.removeMember('non-existent'))
        .toThrow('プレイヤーID "non-existent" はチームに参加していません');
    });
  });

  describe('reorderMembers', () => {
    it('should reorder members correctly', () => {
      const team = new Team(mockTeamSettings, [mockPlayers[0], mockPlayers[1], mockPlayers[2]]);
      const newOrder = [mockPlayers[2].id, mockPlayers[0].id, mockPlayers[1].id];
      const reorderedTeam = team.reorderMembers(newOrder);

      const members = reorderedTeam.members;
      expect(members[0].player).toEqual(mockPlayers[2]);
      expect(members[1].player).toEqual(mockPlayers[0]);
      expect(members[2].player).toEqual(mockPlayers[1]);
    });

    it('should throw error for invalid member list', () => {
      const team = new Team(mockTeamSettings, [mockPlayers[0], mockPlayers[1]]);
      const invalidOrder = [mockPlayers[0].id, 'non-existent'];

      expect(() => team.reorderMembers(invalidOrder))
        .toThrow('新しいターン順に含まれるメンバーIDが現在のメンバーと一致しません');
    });
  });

  describe('updateName', () => {
    it('should update team name', () => {
      const team = new Team(mockTeamSettings, [mockPlayers[0]]);
      const updatedTeam = team.updateName('新しいチーム名');

      expect(updatedTeam.name).toBe('新しいチーム名');
    });

    it('should throw error for empty name', () => {
      const team = new Team(mockTeamSettings, [mockPlayers[0]]);

      expect(() => team.updateName(''))
        .toThrow('チーム名は必須です');
    });
  });

  describe('isReadyForGame', () => {
    it('should return ready when team has members and keyboard', () => {
      const team = new Team(mockTeamSettings, [mockPlayers[0]]);
      const result = team.isReadyForGame();

      expect(result.ready).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should return not ready when team has no members', () => {
      const team = new Team(mockTeamSettings);
      const result = team.isReadyForGame();

      expect(result.ready).toBe(false);
      expect(result.issues).toContain('チームにメンバーが割り当てられていません');
    });

    it('should return not ready when team has no keyboard', () => {
      const settingsWithoutKeyboard = { ...mockTeamSettings, assignedKeyboardId: undefined };
      const team = new Team(settingsWithoutKeyboard, [mockPlayers[0]]);
      const result = team.isReadyForGame();

      expect(result.ready).toBe(false);
      expect(result.issues).toContain('チームにキーボードが割り当てられていません');
    });
  });

  describe('hasMember', () => {
    it('should return true for existing member', () => {
      const team = new Team(mockTeamSettings, [mockPlayers[0]]);

      expect(team.hasMember(mockPlayers[0].id)).toBe(true);
    });

    it('should return false for non-existing member', () => {
      const team = new Team(mockTeamSettings, [mockPlayers[0]]);

      expect(team.hasMember('non-existent')).toBe(false);
    });
  });

  describe('toPlainObject', () => {
    it('should return plain object representation', () => {
      const team = new Team(mockTeamSettings, [mockPlayers[0], mockPlayers[1]]);
      const plainObject = team.toPlainObject();

      expect(plainObject).toEqual({
        id: 1,
        name: 'チーム1',
        color: '#ff6b6b',
        assignedKeyboardId: 'keyboard-1',
        members: expect.arrayContaining([
          expect.objectContaining({
            player: mockPlayers[0],
            turnOrder: 0,
            joinedAt: expect.any(String)
          }),
          expect.objectContaining({
            player: mockPlayers[1],
            turnOrder: 1,
            joinedAt: expect.any(String)
          })
        ]),
        currentTurnIndex: 0
      });
    });
  });
});