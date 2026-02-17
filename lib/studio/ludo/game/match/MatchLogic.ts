// @ts-nocheck
/**
 * Match Logic Utilities
 *
 * Pure functions for match-related business logic extracted from gameStore.
 * This module contains validation and state transformation logic for:
 * - Doubling cube mechanics
 * - Resignation handling
 * - Match scoring integration
 *
 * All functions are TRULY PURE - no side effects, no logging, no mutations.
 * Functions return Result<T, E> for operations that can fail.
 */

import {
  GameState,
  Player,
  GamePhase,
  GameValue,
  DoublingCubeState,
  GameType,
  GameFlowState
} from '../types';
import { GameRules } from '../rules';
import { Result, ok, err, MatchErrors } from './MatchErrors';

/**
 * Validation result for doubling cube operations
 */
interface DoubleValidation {
  canDouble: boolean;
  reason?: string;
}

/**
 * Result of processing a double offer
 */
interface DoubleOfferResult {
  pendingDouble: {
    offeredBy: Player;
    timestamp: number;
  };
}

/**
 * Result of accepting a double
 */
interface DoubleAcceptanceResult {
  doublingCube: DoublingCubeState;
  pendingDouble: undefined;
}

/**
 * Result of declining a double (resignation)
 */
interface DoubleDeclineResult {
  winner: Player;
  gamePhase: GamePhase;
  pendingDouble: undefined;
}

/**
 * Result of canceling a double offer
 */
interface DoubleCancelResult {
  pendingDouble: undefined;
}

/**
 * Result of resigning a game
 */
interface ResignationResult {
  winner: Player;
  gamePhase: GamePhase;
  matchState?: any; // Updated match state if in match play
  gameFlowState?: GameFlowState;
}

/**
 * Validated resignation value
 */
interface ValidatedResignation {
  finalValue: GameValue;
  reason?: string;
}

export class MatchLogic {
  /**
   * Validates if a player can offer a double
   *
   * @param gameState Current game state
   * @returns Validation result with reason if invalid
   */
  static canOfferDouble(gameState: GameState): DoubleValidation {
    // Check if doubling cube exists and can be doubled
    if (!gameState.doublingCube || !gameState.doublingCube.canDouble) {
      return {
        canDouble: false,
        reason: 'Doubling not allowed'
      };
    }

    // Check if cube is owned by current player or centered
    if (
      gameState.doublingCube.owner &&
      gameState.doublingCube.owner !== gameState.currentPlayer
    ) {
      return {
        canDouble: false,
        reason: 'Opponent owns the cube'
      };
    }

    // Check game phase - can only double before rolling
    if (gameState.gamePhase !== 'rolling') {
      return {
        canDouble: false,
        reason: 'Must be before rolling dice'
      };
    }

    return { canDouble: true };
  }

  /**
   * Creates a double offer
   *
   * @param currentPlayer Player offering the double
   * @returns Partial state update with pending double
   */
  static createDoubleOffer(currentPlayer: Player): DoubleOfferResult {
    return {
      pendingDouble: {
        offeredBy: currentPlayer,
        timestamp: Date.now()
      }
    };
  }

  /**
   * Processes acceptance of a double offer
   *
   * Pure function - no side effects. Returns error as value if validation fails.
   *
   * @param gameState Current game state
   * @returns Result containing state update or error
   */
  static acceptDouble(gameState: GameState): Result<DoubleAcceptanceResult> {
    // Validation: pending double must exist
    if (!gameState.pendingDouble) {
      return err(MatchErrors.noPendingDouble());
    }

    // Validation: doubling cube must exist
    if (!gameState.doublingCube) {
      return err(MatchErrors.noDoublingCube());
    }

    const newValue = gameState.doublingCube.value * 2;
    const offeredBy = gameState.pendingDouble.offeredBy;

    return ok({
      doublingCube: {
        ...gameState.doublingCube,
        value: newValue,
        owner: gameState.currentPlayer, // Opponent now owns the cube
        lastDoubler: offeredBy,
        canDouble: true // Can be doubled back later
      },
      pendingDouble: undefined
    });
  }

  /**
   * Processes declination of a double offer (resignation)
   *
   * Pure function - no side effects. Returns error as value if validation fails.
   *
   * @param gameState Current game state
   * @returns Result containing state update or error
   */
  static declineDouble(gameState: GameState): Result<DoubleDeclineResult> {
    // Validation: pending double must exist
    if (!gameState.pendingDouble) {
      return err(MatchErrors.noPendingDouble());
    }

    // Validation: doubling cube must exist
    if (!gameState.doublingCube) {
      return err(MatchErrors.noDoublingCube());
    }

    const offeredBy = gameState.pendingDouble.offeredBy;

    return ok({
      winner: offeredBy,
      gamePhase: 'finished' as GamePhase,
      pendingDouble: undefined
    });
  }

  /**
   * Validates if a player can cancel their double offer
   *
   * @param gameState Current game state
   * @returns True if can cancel
   */
  static canCancelDouble(gameState: GameState): boolean {
    if (!gameState.pendingDouble) {
      return false;
    }

    // Only the player who offered can cancel
    return gameState.pendingDouble.offeredBy === gameState.currentPlayer;
  }

  /**
   * Cancels a double offer
   *
   * @returns Partial state update clearing pending double
   */
  static cancelDouble(): DoubleCancelResult {
    return {
      pendingDouble: undefined
    };
  }

  /**
   * Validates a resignation value based on board position
   *
   * Rules:
   * - Gammon: Requires opponent to have borne off at least one checker
   * - Backgammon: Requires gammon conditions + resigner on bar or in opponent's home
   *
   * @param gameState Current game state
   * @param resignValue Proposed resignation value
   * @param resigner Player resigning
   * @param winner Player who will win
   * @returns Validated resignation value with reason if downgraded
   */
  static validateResignation(
    gameState: GameState,
    resignValue: GameValue,
    resigner: Player,
    winner: Player
  ): ValidatedResignation {
    const opponentBorneOff = GameRules.hasPlayerBorneOffAny(gameState.board, winner);
    const resignerOnBar = GameRules.hasCheckersOnBar(gameState.board, resigner);
    const resignerInOpponentHome = GameRules.hasCheckersInOpponentHome(gameState.board, resigner);

    let finalValue = resignValue;
    let reason: string | undefined;

    // Validate gammon resign
    if (resignValue === GameValue.GAMMON && !opponentBorneOff) {
      finalValue = GameValue.SINGLE;
      reason = "Opponent hasn't borne off - downgraded to single";
    }

    // Validate backgammon resign
    if (resignValue === GameValue.BACKGAMMON) {
      if (!opponentBorneOff || !(resignerOnBar || resignerInOpponentHome)) {
        finalValue = opponentBorneOff ? GameValue.GAMMON : GameValue.SINGLE;
        reason = `Invalid backgammon resign - downgraded to ${
          finalValue === GameValue.GAMMON ? 'gammon' : 'single'
        }`;
      }
    }

    return { finalValue, reason };
  }

  /**
   * Gets the opponent of a given player
   *
   * @param player Current player
   * @returns Opponent player
   */
  static getOpponent(player: Player): Player {
    return player === Player.WHITE ? Player.BLACK : Player.WHITE;
  }

  /**
   * Calculates the total points for a resignation in match play
   *
   * @param resignValue Game value (single/gammon/backgammon)
   * @param cubeValue Current doubling cube value
   * @returns Total points awarded
   */
  static calculateResignationPoints(resignValue: GameValue, cubeValue: number): number {
    return resignValue * cubeValue;
  }
}
