import { Team } from './Team';
import { TeamId } from '../value-objects/TeamId';
import { Score } from '../value-objects/Score';
import { Player } from './Player';
import { PlayerId } from '../value-objects/PlayerId';
import { KeyboardId } from '../value-objects/KeyboardId';

describe('Team Entity', () => {
  const teamId = TeamId.create(1);
  const mockPlayer = new Player({
    id: new PlayerId('player-1'),
    teamId: teamId,
    keyboardId: new KeyboardId('keyboard-1'),
    name: 'Test Player'
  });

  describe('Team Creation', () => {
    it('should create a new team with valid properties', () => {
      const team = new Team({
        id: teamId,
        name: 'Team Alpha',
        players: [mockPlayer]
      });

      expect(team.getId()).toEqual(teamId);
      expect(team.getName()).toBe('Team Alpha');
      expect(team.getPlayers()).toEqual([mockPlayer]);
      expect(team.getScore().getValue()).toBe(0);
      expect(team.isActive()).toBe(true);
    });

    it('should create team with default name if not provided', () => {
      const team = new Team({
        id: teamId,
        players: [mockPlayer]
      });

      expect(team.getName()).toBe('Team 1');
    });

    it('should throw error if no players provided', () => {
      expect(() => {
        new Team({
          id: teamId,
          players: []
        });
      }).toThrow('Team must have at least one player');
    });

    it('should throw error if player belongs to different team', () => {
      const wrongPlayer = new Player({
        id: new PlayerId('player-2'),
        teamId: TeamId.create(2), // Different team
        keyboardId: new KeyboardId('keyboard-2'),
        name: 'Wrong Player'
      });

      expect(() => {
        new Team({
          id: teamId,
          players: [wrongPlayer]
        });
      }).toThrow('All players must belong to this team');
    });
  });

  describe('Player Management', () => {
    let team: Team;

    beforeEach(() => {
      team = new Team({
        id: teamId,
        name: 'Test Team',
        players: [mockPlayer]
      });
    });

    it('should add a new player', () => {
      const newPlayer = new Player({
        id: new PlayerId('player-2'),
        teamId: teamId,
        keyboardId: new KeyboardId('keyboard-2'),
        name: 'New Player'
      });

      team.addPlayer(newPlayer);
      expect(team.getPlayers()).toHaveLength(2);
      expect(team.hasPlayer(newPlayer.getId())).toBe(true);
    });

    it('should not add player from different team', () => {
      const wrongPlayer = new Player({
        id: new PlayerId('player-3'),
        teamId: TeamId.create(2),
        keyboardId: new KeyboardId('keyboard-3'),
        name: 'Wrong Player'
      });

      expect(() => {
        team.addPlayer(wrongPlayer);
      }).toThrow('Player must belong to this team');
    });

    it('should remove a player', () => {
      // Add a second player first so we can remove one
      const secondPlayer = new Player({
        id: new PlayerId('player-2'),
        teamId: teamId,
        keyboardId: new KeyboardId('keyboard-2'),
        name: 'Second Player'
      });
      team.addPlayer(secondPlayer);
      
      // Now remove the first player
      team.removePlayer(mockPlayer.getId());
      expect(team.getPlayers()).toHaveLength(1);
      expect(team.hasPlayer(mockPlayer.getId())).toBe(false);
      expect(team.hasPlayer(secondPlayer.getId())).toBe(true);
    });

    it('should throw error when removing last player', () => {
      expect(() => {
        team.removePlayer(mockPlayer.getId());
      }).toThrow('Cannot remove the last player from team');
    });

    it('should get player by ID', () => {
      const foundPlayer = team.getPlayer(mockPlayer.getId());
      expect(foundPlayer).toEqual(mockPlayer);
    });

    it('should return undefined for non-existent player', () => {
      const nonExistentId = new PlayerId('non-existent');
      const foundPlayer = team.getPlayer(nonExistentId);
      expect(foundPlayer).toBeUndefined();
    });
  });

  describe('Score Management', () => {
    let team: Team;

    beforeEach(() => {
      team = new Team({
        id: teamId,
        name: 'Test Team',
        players: [mockPlayer]
      });
    });

    it('should add score to team', () => {
      team.addScore(Score.create(50));
      expect(team.getScore().getValue()).toBe(50);
    });

    it('should accumulate scores', () => {
      team.addScore(Score.create(30));
      team.addScore(Score.create(20));
      expect(team.getScore().getValue()).toBe(50);
    });

    it('should reset score', () => {
      team.addScore(Score.create(100));
      team.resetScore();
      expect(team.getScore().getValue()).toBe(0);
    });
  });

  describe('Team State Management', () => {
    let team: Team;

    beforeEach(() => {
      team = new Team({
        id: teamId,
        name: 'Test Team',
        players: [mockPlayer]
      });
    });

    it('should activate team', () => {
      team.deactivate();
      team.activate();
      expect(team.isActive()).toBe(true);
    });

    it('should deactivate team', () => {
      team.deactivate();
      expect(team.isActive()).toBe(false);
    });

    it('should update team name', () => {
      team.updateName('New Team Name');
      expect(team.getName()).toBe('New Team Name');
    });

    it('should throw error for empty team name', () => {
      expect(() => {
        team.updateName('');
      }).toThrow('Team name cannot be empty');
    });
  });

  describe('Team Statistics', () => {
    let team: Team;
    let player1: Player;
    let player2: Player;

    beforeEach(() => {
      player1 = new Player({
        id: new PlayerId('player-1'),
        teamId: teamId,
        keyboardId: new KeyboardId('keyboard-1'),
        name: 'Player 1'
      });
      
      player2 = new Player({
        id: new PlayerId('player-2'),
        teamId: teamId,
        keyboardId: new KeyboardId('keyboard-2'),
        name: 'Player 2'
      });

      team = new Team({
        id: teamId,
        name: 'Test Team',
        players: [player1, player2]
      });
    });

    it('should get active player count', () => {
      expect(team.getActivePlayerCount()).toBe(2);
      
      player1.deactivate();
      expect(team.getActivePlayerCount()).toBe(1);
    });

    it('should get total player count', () => {
      expect(team.getPlayerCount()).toBe(2);
    });
  });
});