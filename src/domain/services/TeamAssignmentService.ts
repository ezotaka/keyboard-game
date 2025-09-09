import { Team } from '../entities/Team';
import { Player } from '../entities/Player';
import { Keyboard } from '../entities/Keyboard';
import { TeamId } from '../value-objects/TeamId';
import { PlayerId } from '../value-objects/PlayerId';

export interface KeyboardAssignment {
  team: Team;
  keyboard: Keyboard;
  player: Player;
}

export class TeamAssignmentService {
  /**
   * Assigns available keyboards to teams
   */
  assignKeyboardsToTeams(keyboards: Keyboard[], teams: Team[]): Map<string, Keyboard[]> {
    const connectedKeyboards = keyboards.filter(kb => kb.isConnected());
    
    if (connectedKeyboards.length < teams.length) {
      throw new Error('Not enough keyboards for all teams');
    }

    const assignments = new Map<string, Keyboard[]>();
    
    teams.forEach((team, index) => {
      if (index < connectedKeyboards.length) {
        assignments.set(team.getId().getValue(), [connectedKeyboards[index]]);
      }
    });

    return assignments;
  }

  /**
   * Balances players across the specified number of teams
   */
  balanceTeams(players: Player[], teamCount: number): Team[] {
    if (teamCount < 2) {
      throw new Error('Must have at least 2 teams');
    }

    if (teamCount > 8) {
      throw new Error('Cannot have more than 8 teams');
    }

    if (players.length === 0) {
      throw new Error('Cannot create teams with no players');
    }

    // Create player groups for each team
    const playerGroups: Player[][] = Array.from({ length: teamCount }, () => []);
    
    // Distribute players evenly across teams
    players.forEach((player, index) => {
      const targetTeamIndex = index % teamCount;
      const targetTeamId = TeamId.create(targetTeamIndex + 1);
      
      // Create a new player with the correct team ID
      const reassignedPlayer = new Player({
        id: player.getId(),
        teamId: targetTeamId,
        keyboardId: player.getKeyboardId(),
        name: player.getName()
      });

      playerGroups[targetTeamIndex].push(reassignedPlayer);
    });

    // Create teams with their assigned players
    const teams: Team[] = [];
    playerGroups.forEach((playersGroup, index) => {
      if (playersGroup.length > 0) {
        const teamId = TeamId.create(index + 1);
        const team = new Team({
          id: teamId,
          name: `Team ${index + 1}`,
          players: playersGroup
        });
        teams.push(team);
      }
    });

    return teams;
  }

  /**
   * Validates that teams are ready for a game
   */
  validateTeamsForGame(teams: Team[]): boolean {
    if (teams.length < 2) {
      return false;
    }

    return teams.every(team => 
      team.isActive() && 
      team.getActivePlayerCount() > 0
    );
  }

  /**
   * Assigns a keyboard to a specific player and team
   */
  assignKeyboardToPlayer(keyboard: Keyboard, player: Player, team: Team): KeyboardAssignment {
    if (!keyboard.isConnected()) {
      throw new Error('Cannot assign disconnected keyboard');
    }

    if (!team.hasPlayer(player.getId())) {
      throw new Error('Player does not belong to the specified team');
    }

    return {
      team,
      keyboard,
      player
    };
  }

  /**
   * Handles keyboard disconnection and returns affected teams
   */
  handleKeyboardDisconnection(keyboard: Keyboard, teams: Team[]): Team[] {
    const affectedTeams: Team[] = [];

    teams.forEach(team => {
      const hasAffectedPlayer = team.getPlayers().some(player => 
        player.getKeyboardId().equals(keyboard.getId())
      );

      if (hasAffectedPlayer) {
        affectedTeams.push(team);
      }
    });

    return affectedTeams;
  }

  /**
   * Finds teams that need keyboard reassignment
   */
  findTeamsNeedingKeyboards(teams: Team[], keyboards: Keyboard[]): Team[] {
    const connectedKeyboardIds = new Set(
      keyboards.filter(kb => kb.isConnected()).map(kb => kb.getId().getValue())
    );

    return teams.filter(team => {
      return team.getActivePlayers().some(player => 
        !connectedKeyboardIds.has(player.getKeyboardId().getValue())
      );
    });
  }

  /**
   * Gets available keyboards (connected and not assigned)
   */
  getAvailableKeyboards(keyboards: Keyboard[], teams: Team[]): Keyboard[] {
    const assignedKeyboardIds = new Set<string>();
    
    teams.forEach(team => {
      team.getActivePlayers().forEach(player => {
        assignedKeyboardIds.add(player.getKeyboardId().getValue());
      });
    });

    return keyboards.filter(keyboard => 
      keyboard.isConnected() && 
      !assignedKeyboardIds.has(keyboard.getId().getValue())
    );
  }

  /**
   * Calculates optimal team distribution for given player count
   */
  calculateOptimalTeamCount(playerCount: number): number {
    if (playerCount < 2) {
      throw new Error('Need at least 2 players for a game');
    }

    if (playerCount <= 4) {
      return 2;
    }

    if (playerCount <= 6) {
      return 3;
    }

    if (playerCount <= 8) {
      return 4;
    }

    // For more than 8 players, distribute evenly but cap at 8 teams
    return Math.min(8, Math.ceil(playerCount / 2));
  }
}