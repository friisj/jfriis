import {
  Player,
  GameValue,
  MatchConfiguration,
  MatchState,
  GameResult,
  DoublingCubeState,
  BoardPosition,
  OFF_POSITION,
  BAR_POSITION,
  PlayerConfig
} from './types';
import { GameRules } from './rules';
import { logger } from '../utils/logger';
import { produce } from 'immer';

/**
 * MatchManager - Handles all match scoring logic
 *
 * Features:
 * - Match creation and progression
 * - Game value calculation (single/gammon/backgammon)
 * - Crawford rule implementation
 * - Jacoby rule implementation
 * - Automatic doubles
 * - Doubling cube management
 */
export class MatchManager {
  /**
   * Create a new match
   */
  static createMatch(
    configuration: MatchConfiguration,
    _players: { [Player.WHITE]: PlayerConfig; [Player.BLACK]: PlayerConfig }
  ): MatchState {
    const matchId = `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      matchId,
      configuration,
      scores: {
        [Player.WHITE]: 0,
        [Player.BLACK]: 0
      },
      gamesPlayed: 0,
      currentGameNumber: 1,
      matchWinner: null,
      isCrawfordGame: false,
      crawfordGamePlayed: false,
      isPostCrawford: false,
      gameHistory: [],
      automaticDoublesThisGame: 0
    };
  }

  /**
   * Initialize doubling cube for a new game
   */
  static initializeDoublingCube(
    configuration: MatchConfiguration,
    isCrawfordGame: boolean,
    automaticDoubles: number
  ): DoublingCubeState {
    // Start with cube value based on automatic doubles
    const initialValue = Math.pow(2, automaticDoubles);

    return {
      value: initialValue,
      owner: null,              // Centered - both players can double
      lastDoubler: null,
      canDouble: !isCrawfordGame && configuration.doublingCubeEnabled
    };
  }

  /**
   * Calculate the game value (single/gammon/backgammon)
   */
  static calculateGameValue(board: BoardPosition[], winner: Player): GameValue {
    const loser = winner === Player.WHITE ? Player.BLACK : Player.WHITE;

    // Get all loser's checkers
    const loserCheckers = GameRules.getPlayerCheckers(board, loser);

    // Count checkers that are borne off
    const loserCheckersOff = loserCheckers.filter(c => c.position === OFF_POSITION).length;

    // If loser has borne off any checkers, it's a single game
    if (loserCheckersOff > 0) {
      logger.debug(`Game value: SINGLE - Loser (${loser}) bore off ${loserCheckersOff} checkers`);
      return GameValue.SINGLE;
    }

    // Loser hasn't borne off any checkers - at least a gammon
    // Check for backgammon: loser has checkers in winner's home board or on the bar
    const winnerHomeBoard = winner === Player.WHITE
      ? [18, 19, 20, 21, 22, 23]
      : [0, 1, 2, 3, 4, 5];

    const loserHasCheckersInWinnerHome = loserCheckers.some(c =>
      winnerHomeBoard.includes(c.position) || c.position === BAR_POSITION
    );

    if (loserHasCheckersInWinnerHome) {
      logger.debug(`Game value: BACKGAMMON - Loser (${loser}) has checkers in winner's home or on bar`);
      return GameValue.BACKGAMMON;
    }

    logger.debug(`Game value: GAMMON - Loser (${loser}) bore off 0 checkers`);
    return GameValue.GAMMON;
  }

  /**
   * Calculate points awarded for a game
   */
  static calculatePointsAwarded(
    gameValue: GameValue,
    cubeValue: number,
    configuration: MatchConfiguration
  ): number {
    // Jacoby rule: If cube was never turned, gammons/backgammons only count as 1
    if (configuration.useJacobyRule && cubeValue === 1 && gameValue > GameValue.SINGLE) {
      logger.debug(`Jacoby rule applied: ${gameValue}x game reduced to 1 point (cube not turned)`);
      return 1;
    }

    const points = gameValue * cubeValue;
    logger.debug(`Points awarded: ${gameValue} × ${cubeValue} = ${points}`);
    return points;
  }

  /**
   * Award points to the winner and update match state
   *
   * @returns Object containing updated match state and game result
   */
  static awardPoints(
    matchState: MatchState,
    winner: Player,
    gameValue: GameValue,
    cubeValue: number,
    moveCount: number
  ): { matchState: MatchState; gameResult: GameResult } {
    const pointsAwarded = this.calculatePointsAwarded(
      gameValue,
      cubeValue,
      matchState.configuration
    );

    // Create game result
    const gameResult: GameResult = {
      gameNumber: matchState.currentGameNumber,
      winner,
      gameValue,
      cubeValue,
      pointsAwarded,
      finalScore: {
        [Player.WHITE]: matchState.scores[Player.WHITE] + (winner === Player.WHITE ? pointsAwarded : 0),
        [Player.BLACK]: matchState.scores[Player.BLACK] + (winner === Player.BLACK ? pointsAwarded : 0)
      },
      moveCount,
      timestamp: Date.now()
    };

    // Create new match state immutably
    const newMatchState = produce(matchState, draft => {
      draft.scores[winner] += pointsAwarded;
      draft.gameHistory.push(gameResult);
      draft.gamesPlayed++;
    });

    logger.info(`Game ${matchState.currentGameNumber} complete: ${winner} wins ${pointsAwarded} points`);
    logger.info(`Match score: White ${newMatchState.scores[Player.WHITE]} - Black ${newMatchState.scores[Player.BLACK]}`);

    return { matchState: newMatchState, gameResult };
  }

  /**
   * Check if match is over
   */
  static checkMatchWinner(matchState: MatchState): Player | null {
    const targetPoints = matchState.configuration.targetPoints;

    if (matchState.scores[Player.WHITE] >= targetPoints) {
      logger.info(`Match complete: White wins ${matchState.scores[Player.WHITE]}-${matchState.scores[Player.BLACK]}`);
      return Player.WHITE;
    }

    if (matchState.scores[Player.BLACK] >= targetPoints) {
      logger.info(`Match complete: Black wins ${matchState.scores[Player.BLACK]}-${matchState.scores[Player.WHITE]}`);
      return Player.BLACK;
    }

    return null;
  }

  /**
   * Start the next game in the match
   *
   * @returns Updated match state with next game number and Crawford state
   */
  static startNextGame(matchState: MatchState): MatchState {
    const newMatchState = produce(matchState, draft => {
      draft.currentGameNumber++;
      draft.automaticDoublesThisGame = 0;

      // Update Crawford state
      this.updateCrawfordStateMutable(draft);
    });

    logger.info(`Starting game ${newMatchState.currentGameNumber}${newMatchState.isCrawfordGame ? ' (CRAWFORD)' : newMatchState.isPostCrawford ? ' (POST-CRAWFORD)' : ''}`);

    return newMatchState;
  }

  /**
   * Update Crawford rule state (mutable - for use within Immer produce)
   *
   * @private
   */
  private static updateCrawfordStateMutable(matchState: MatchState): void {
    if (!matchState.configuration.useCrawfordRule) {
      matchState.isCrawfordGame = false;
      matchState.isPostCrawford = false;
      return;
    }

    // If we just finished Crawford game, exit it first (before checking entry condition)
    if (matchState.isCrawfordGame) {
      matchState.isCrawfordGame = false;
      matchState.crawfordGamePlayed = true;
      matchState.isPostCrawford = true;
      logger.info('Crawford game complete, entering post-Crawford');
      return;
    }

    const targetPoints = matchState.configuration.targetPoints;
    const whiteScore = matchState.scores[Player.WHITE];
    const blackScore = matchState.scores[Player.BLACK];

    // Check if we should enter Crawford game
    if (!matchState.crawfordGamePlayed) {
      // One player is 1 away from winning
      const whiteOneAway = whiteScore === targetPoints - 1 && blackScore < targetPoints - 1;
      const blackOneAway = blackScore === targetPoints - 1 && whiteScore < targetPoints - 1;

      if (whiteOneAway || blackOneAway) {
        matchState.isCrawfordGame = true;
        logger.info(`Crawford game: ${whiteOneAway ? 'White' : 'Black'} is 1 point away`);
        return;
      }
    }

    // Continue post-Crawford if applicable
    if (matchState.crawfordGamePlayed) {
      matchState.isPostCrawford = true;
    }
  }

  /**
   * Check if automatic doubles should occur (both players roll same on opening)
   */
  static checkAutomaticDoubles(
    dice1: [number, number],
    dice2: [number, number],
    configuration: MatchConfiguration
  ): boolean {
    if (!configuration.automaticDoubles) return false;

    const sum1 = dice1[0] + dice1[1];
    const sum2 = dice2[0] + dice2[1];

    return sum1 === sum2;
  }

  /**
   * Apply automatic double to the cube
   *
   * @returns Object containing updated doubling cube and match state, or null if cannot apply
   */
  static applyAutomaticDouble(
    doublingCube: DoublingCubeState,
    matchState: MatchState
  ): { doublingCube: DoublingCubeState; matchState: MatchState } | null {
    const newValue = doublingCube.value * 2;

    if (newValue > matchState.configuration.maxDoubles) {
      logger.warn(`Cannot apply automatic double: would exceed max (${matchState.configuration.maxDoubles})`);
      return null;
    }

    const newDoublingCube = produce(doublingCube, draft => {
      draft.value = newValue;
    });

    const newMatchState = produce(matchState, draft => {
      draft.automaticDoublesThisGame++;
    });

    logger.info(`Automatic double! Cube value now: ${newDoublingCube.value}`);

    return { doublingCube: newDoublingCube, matchState: newMatchState };
  }

  /**
   * Get match status summary
   */
  static getMatchStatus(matchState: MatchState): {
    leadingPlayer: Player | null;
    pointsDifference: number;
    gamesRemaining: string;
    isCrawford: boolean;
    isPostCrawford: boolean;
  } {
    const whiteScore = matchState.scores[Player.WHITE];
    const blackScore = matchState.scores[Player.BLACK];
    const diff = Math.abs(whiteScore - blackScore);

    let leadingPlayer: Player | null = null;
    if (whiteScore > blackScore) leadingPlayer = Player.WHITE;
    if (blackScore > whiteScore) leadingPlayer = Player.BLACK;

    const targetPoints = matchState.configuration.targetPoints;
    const whiteNeeds = targetPoints - whiteScore;
    const blackNeeds = targetPoints - blackScore;
    const minGamesRemaining = Math.min(whiteNeeds, blackNeeds);

    return {
      leadingPlayer,
      pointsDifference: diff,
      gamesRemaining: minGamesRemaining === 1 ? 'Match point' : `~${minGamesRemaining} games`,
      isCrawford: matchState.isCrawfordGame,
      isPostCrawford: matchState.isPostCrawford
    };
  }
}
