import { TeamAssignmentService } from './TeamAssignmentService';
import { Team } from '../entities/Team';
import { Player } from '../entities/Player';
import { TeamId } from '../value-objects/TeamId';
import { PlayerId } from '../value-objects/PlayerId';
import { KeyboardId } from '../value-objects/KeyboardId';
import { Keyboard } from '../entities/Keyboard';
import { KeyboardConnectionState } from '../../shared/types/keyboard.types';

describe('TeamAssignmentService', () => {
  let service: TeamAssignmentService;
  let keyboards: Keyboard[];
  let teams: Team[];

  beforeEach(() => {
    service = new TeamAssignmentService();
    
    // Setup keyboards
    keyboards = [
      new Keyboard({
        id: new KeyboardId('keyboard-1'),
        devicePath: '/dev/input/event1',
        vendorId: 1234,
        productId: 5678,
        manufacturer: 'Test',
        product: 'Test Keyboard 1',
        connectionState: KeyboardConnectionState.CONNECTED
      }),
      new Keyboard({
        id: new KeyboardId('keyboard-2'),
        devicePath: '/dev/input/event2',
        vendorId: 1234,
        productId: 5679,
        manufacturer: 'Test',
        product: 'Test Keyboard 2',
        connectionState: KeyboardConnectionState.CONNECTED
      }),
      new Keyboard({
        id: new KeyboardId('keyboard-3'),
        devicePath: '/dev/input/event3',
        vendorId: 1234,
        productId: 5680,
        manufacturer: 'Test',
        product: 'Test Keyboard 3',
        connectionState: KeyboardConnectionState.CONNECTED
      })
    ];

    // Setup teams with players
    const team1Player = new Player({
      id: new PlayerId('player-1'),
      teamId: TeamId.create(1),
      keyboardId: new KeyboardId('keyboard-1'),
      name: 'Player 1'
    });

    const team2Player = new Player({
      id: new PlayerId('player-2'),
      teamId: TeamId.create(2),
      keyboardId: new KeyboardId('keyboard-2'),
      name: 'Player 2'
    });

    teams = [
      new Team({
        id: TeamId.create(1),
        name: 'Team Alpha',
        players: [team1Player]
      }),
      new Team({
        id: TeamId.create(2),
        name: 'Team Beta',
        players: [team2Player]
      })
    ];
  });

  describe('Keyboard Assignment', () => {
    it('should assign available keyboards to teams', () => {
      const assignments = service.assignKeyboardsToTeams(keyboards, teams);
      
      expect(assignments.size).toBe(2);
      expect(assignments.has('team-1')).toBe(true);
      expect(assignments.has('team-2')).toBe(true);
      
      const team1Keyboards = assignments.get('team-1')!;
      const team2Keyboards = assignments.get('team-2')!;
      
      expect(team1Keyboards).toHaveLength(1);
      expect(team2Keyboards).toHaveLength(1);
    });

    it('should handle more keyboards than teams', () => {
      const assignments = service.assignKeyboardsToTeams(keyboards, [teams[0]]);
      
      expect(assignments.size).toBe(1);
      const teamKeyboards = assignments.get('team-1')!;
      expect(teamKeyboards).toHaveLength(1);
    });

    it('should throw error if more teams than keyboards', () => {
      const extraTeam = new Team({
        id: TeamId.create(3),
        name: 'Team Gamma',
        players: [new Player({
          id: new PlayerId('player-3'),
          teamId: TeamId.create(3),
          keyboardId: new KeyboardId('keyboard-3'),
          name: 'Player 3'
        })]
      });

      const allTeams = [...teams, extraTeam];
      const limitedKeyboards = keyboards.slice(0, 2);

      expect(() => {
        service.assignKeyboardsToTeams(limitedKeyboards, allTeams);
      }).toThrow('Not enough keyboards for all teams');
    });

    it('should only assign connected keyboards', () => {
      keyboards[1].updateConnectionState(KeyboardConnectionState.DISCONNECTED);
      
      const assignments = service.assignKeyboardsToTeams(keyboards, teams);
      
      const allAssignedKeyboards = Array.from(assignments.values()).flat();
      expect(allAssignedKeyboards.every(k => k.isConnected())).toBe(true);
    });
  });

  describe('Team Balancing', () => {
    it('should balance players across teams', () => {
      const players = [
        new Player({
          id: new PlayerId('player-1'),
          teamId: TeamId.create(1),
          keyboardId: new KeyboardId('keyboard-1'),
          name: 'Player 1'
        }),
        new Player({
          id: new PlayerId('player-2'),
          teamId: TeamId.create(1),
          keyboardId: new KeyboardId('keyboard-2'),
          name: 'Player 2'
        }),
        new Player({
          id: new PlayerId('player-3'),
          teamId: TeamId.create(2),
          keyboardId: new KeyboardId('keyboard-3'),
          name: 'Player 3'
        })
      ];

      const balancedTeams = service.balanceTeams(players, 2);
      
      expect(balancedTeams).toHaveLength(2);
      
      const totalPlayers = balancedTeams.reduce((sum, team) => sum + team.getPlayerCount(), 0);
      expect(totalPlayers).toBe(3);
      
      // Check that teams are balanced (difference should be at most 1)
      const playerCounts = balancedTeams.map(team => team.getPlayerCount());
      const maxCount = Math.max(...playerCounts);
      const minCount = Math.min(...playerCounts);
      expect(maxCount - minCount).toBeLessThanOrEqual(1);
    });

    it('should create teams with unique IDs', () => {
      const players = [
        new Player({
          id: new PlayerId('player-1'),
          teamId: TeamId.create(1),
          keyboardId: new KeyboardId('keyboard-1'),
          name: 'Player 1'
        }),
        new Player({
          id: new PlayerId('player-2'),
          teamId: TeamId.create(1),
          keyboardId: new KeyboardId('keyboard-2'),
          name: 'Player 2'
        })
      ];

      const teams = service.balanceTeams(players, 2);
      
      const teamIds = teams.map(team => team.getId().getValue());
      const uniqueIds = new Set(teamIds);
      expect(uniqueIds.size).toBe(teamIds.length);
    });
  });

  describe('Team Validation', () => {
    it('should validate teams are ready for game', () => {
      const isReady = service.validateTeamsForGame(teams);
      expect(isReady).toBe(true);
    });

    it('should return false if team has no active players', () => {
      teams[0].getPlayers()[0].deactivate();
      const isReady = service.validateTeamsForGame(teams);
      expect(isReady).toBe(false);
    });

    it('should return false if team is inactive', () => {
      teams[0].deactivate();
      const isReady = service.validateTeamsForGame(teams);
      expect(isReady).toBe(false);
    });

    it('should return false if less than 2 teams', () => {
      const isReady = service.validateTeamsForGame([teams[0]]);
      expect(isReady).toBe(false);
    });
  });

  describe('Dynamic Team Management', () => {
    it('should reassign keyboard when player joins', () => {
      const newKeyboard = new Keyboard({
        id: new KeyboardId('keyboard-4'),
        devicePath: '/dev/input/event4',
        vendorId: 1234,
        productId: 5681,
        manufacturer: 'Test',
        product: 'Test Keyboard 4',
        connectionState: KeyboardConnectionState.CONNECTED
      });

      const newPlayer = new Player({
        id: new PlayerId('player-4'),
        teamId: TeamId.create(1),
        keyboardId: newKeyboard.getId(),
        name: 'Player 4'
      });

      // Add the player to the team first
      teams[0].addPlayer(newPlayer);
      
      const assignment = service.assignKeyboardToPlayer(newKeyboard, newPlayer, teams[0]);
      
      expect(assignment.player).toEqual(newPlayer);
      expect(assignment.keyboard).toEqual(newKeyboard);
      expect(assignment.team).toEqual(teams[0]);
    });

    it('should handle keyboard disconnection', () => {
      const disconnectedKeyboard = keyboards[0];
      const affectedTeams = service.handleKeyboardDisconnection(disconnectedKeyboard, teams);
      
      expect(affectedTeams).toHaveLength(1);
      expect(affectedTeams[0].getId().getValue()).toBe('team-1');
    });
  });
});