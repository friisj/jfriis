// @ts-nocheck
/**
 * Game Flow Logic Utilities
 *
 * Pure functions for game flow and phase transition logic extracted from gameStore.
 * This module contains validation and state transformation logic for:
 * - Game phase transitions
 * - Flow state management (SETTINGS → PLAYING → INTERMISSION → MATCH_END)
 * - Next game validation
 *
 * All functions are pure (no side effects) and return partial state updates
 * that the gameStore can apply via set().
 */

import {
  GameState,
  Player,
  GamePhase,
  GameFlowState,
  MatchState
} from '../types';
import { logger } from '../../utils/logger';

/**
 * Validation result for starting next game
 */
interface NextGameValidation {
  canStart: boolean;
  reason?: string;
}

/**
 * Result of determining next flow state
 */
interface FlowStateResult {
  gameFlowState: GameFlowState;
  gamePhase: GamePhase;
}

export class GameFlowLogic {
  /**
   * Determines if intermission screen should be shown
   *
   * Intermission is shown when:
   * - Match is in progress (not complete)
   * - Current game is finished
   * - Match has not been won
   *
   * @param gameState Current game state
   * @returns True if intermission should be shown
   */
  static shouldShowIntermission(gameState: GameState): boolean {
    return (
      gameState.matchState !== undefined &&
      gameState.matchState.matchWinner === undefined &&
      gameState.gamePhase === 'finished'
    );
  }

  /**
   * Determines if match end screen should be shown
   *
   * Match end is shown when:
   * - Match is in progress
   * - Match has a winner
   *
   * @param gameState Current game state
   * @returns True if match end should be shown
   */
  static shouldShowMatchEnd(gameState: GameState): boolean {
    return (
      gameState.matchState !== undefined &&
      gameState.matchState.matchWinner !== undefined
    );
  }

  /**
   * Determines the next flow state after a game ends
   *
   * @param matchState Current match state
   * @param gamePhase Current game phase
   * @returns Next flow state and phase
   */
  static determineEndGameFlowState(
    matchState: MatchState | undefined,
    gamePhase: GamePhase
  ): FlowStateResult {
    if (!matchState) {
      // Single game - just finish
      return {
        gameFlowState: GameFlowState.PLAYING,
        gamePhase: 'finished'
      };
    }

    if (matchState.matchWinner) {
      // Match complete
      return {
        gameFlowState: GameFlowState.MATCH_END,
        gamePhase: 'finished'
      };
    }

    // Match continues - show intermission
    return {
      gameFlowState: GameFlowState.INTERMISSION,
      gamePhase: 'finished'
    };
  }

  /**
   * Validates if a new game can be started
   *
   * @param matchState Current match state
   * @returns Validation result with reason if invalid
   */
  static canStartNextGame(matchState: MatchState | undefined): NextGameValidation {
    if (!matchState) {
      return {
        canStart: false,
        reason: 'No match in progress'
      };
    }

    if (matchState.matchWinner) {
      return {
        canStart: false,
        reason: 'Match already complete'
      };
    }

    return { canStart: true };
  }

  /**
   * Validates if game ending is allowed
   *
   * @param gameState Current game state
   * @returns Validation result with reason if invalid
   */
  static canEndGame(gameState: GameState): NextGameValidation {
    if (!gameState.matchState) {
      return {
        canStart: false,
        reason: 'No match in progress'
      };
    }

    if (!gameState.winner) {
      return {
        canStart: false,
        reason: 'No winner determined'
      };
    }

    // Prevent double-ending
    if (
      gameState.gameFlowState === GameFlowState.INTERMISSION ||
      gameState.gameFlowState === GameFlowState.MATCH_END
    ) {
      return {
        canStart: false,
        reason: 'Game already ended'
      };
    }

    return { canStart: true };
  }

  /**
   * Determines the appropriate game phase after dice roll
   *
   * @param availableMoves Number of available moves
   * @returns Appropriate game phase
   */
  static determinePhaseAfterRoll(availableMoves: number): GamePhase {
    return availableMoves > 0 ? 'moving' : 'no_moves';
  }

  /**
   * Checks if a flow state transition is valid
   *
   * @param from Current flow state
   * @param to Target flow state
   * @returns True if transition is valid
   */
  static isValidFlowTransition(from: GameFlowState, to: GameFlowState): boolean {
    const validTransitions: Record<GameFlowState, GameFlowState[]> = {
      [GameFlowState.SETTINGS]: [GameFlowState.PLAYING],
      [GameFlowState.PLAYING]: [
        GameFlowState.INTERMISSION,
        GameFlowState.MATCH_END,
        GameFlowState.SETTINGS
      ],
      [GameFlowState.INTERMISSION]: [
        GameFlowState.PLAYING,
        GameFlowState.SETTINGS
      ],
      [GameFlowState.MATCH_END]: [GameFlowState.SETTINGS]
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  /**
   * Gets a human-readable description of a flow state
   *
   * @param flowState Flow state to describe
   * @returns Human-readable description
   */
  static getFlowStateDescription(flowState: GameFlowState): string {
    const descriptions: Record<GameFlowState, string> = {
      [GameFlowState.SETTINGS]: 'Configuring match settings',
      [GameFlowState.PLAYING]: 'Playing game',
      [GameFlowState.INTERMISSION]: 'Between games',
      [GameFlowState.MATCH_END]: 'Match complete'
    };

    return descriptions[flowState] ?? 'Unknown state';
  }
}
