/**
 * Opening Roll Logic Utilities
 *
 * Pure functions for opening roll mechanics extracted from gameStore.
 * This module contains:
 * - Opening roll resolution (determining first player)
 * - Tie handling (re-roll logic)
 * - Automatic doubles on opening roll ties
 * - Initial dice setup from opening rolls
 *
 * All functions are pure (no side effects) and return values or partial state updates.
 */

import { Player, DoublingCubeState, MatchConfiguration } from '../types';

/**
 * Result of determining opening roll winner
 */
export interface OpeningRollWinner {
  winner: Player;
  dice: [number, number]; // Winner's roll first
}

/**
 * Result of checking for opening roll tie
 */
export interface OpeningRollTieCheck {
  isTie: boolean;
  shouldApplyAutomaticDouble: boolean;
  canApplyAutomaticDouble: boolean; // False if would exceed max
}

/**
 * Result of applying automatic double
 */
export interface AutomaticDoubleResult {
  doublingCube: DoublingCubeState;
  applied: boolean;
}

export class OpeningRollLogic {
  /**
   * Determines the winner of an opening roll
   *
   * @param whiteRoll White player's die value
   * @param blackRoll Black player's die value
   * @returns Winner and dice array (winner's die first)
   */
  static determineWinner(
    whiteRoll: number,
    blackRoll: number
  ): OpeningRollWinner {
    const winner = whiteRoll > blackRoll ? Player.WHITE : Player.BLACK;
    const dice: [number, number] = winner === Player.WHITE
      ? [whiteRoll, blackRoll]
      : [blackRoll, whiteRoll];

    return { winner, dice };
  }

  /**
   * Checks if opening rolls are tied and if automatic double should apply
   *
   * @param whiteRoll White player's die value
   * @param blackRoll Black player's die value
   * @param configuration Match configuration
   * @param currentCubeValue Current doubling cube value
   * @returns Tie status and automatic double applicability
   */
  static checkForTie(
    whiteRoll: number,
    blackRoll: number,
    configuration: MatchConfiguration | undefined,
    currentCubeValue: number
  ): OpeningRollTieCheck {
    const isTie = whiteRoll === blackRoll;

    if (!isTie) {
      return {
        isTie: false,
        shouldApplyAutomaticDouble: false,
        canApplyAutomaticDouble: false
      };
    }

    const shouldApplyAutomaticDouble =
      configuration?.automaticDoubles === true;

    if (!shouldApplyAutomaticDouble) {
      return {
        isTie: true,
        shouldApplyAutomaticDouble: false,
        canApplyAutomaticDouble: false
      };
    }

    const newCubeValue = currentCubeValue * 2;
    const maxDoubles = configuration?.maxDoubles || 64;
    const canApplyAutomaticDouble = newCubeValue <= maxDoubles;

    return {
      isTie: true,
      shouldApplyAutomaticDouble: true,
      canApplyAutomaticDouble
    };
  }

  /**
   * Applies an automatic double to the cube
   *
   * @param doublingCube Current doubling cube state
   * @returns New doubling cube state with doubled value
   */
  static applyAutomaticDouble(
    doublingCube: DoublingCubeState
  ): AutomaticDoubleResult {
    return {
      doublingCube: {
        ...doublingCube,
        value: doublingCube.value * 2
      },
      applied: true
    };
  }

  /**
   * Creates initial opening roll state
   *
   * @returns Opening roll state with no rolls yet
   */
  static createInitialOpeningRoll() {
    return {
      whiteRoll: null,
      blackRoll: null,
      resolved: false,
      rerollCount: 0
    };
  }

  /**
   * Creates re-roll state after a tie
   *
   * @param currentRerollCount Current number of re-rolls
   * @returns Opening roll state reset for re-rolling
   */
  static createRerollState(currentRerollCount: number) {
    return {
      whiteRoll: null,
      blackRoll: null,
      resolved: false,
      rerollCount: currentRerollCount + 1
    };
  }

  /**
   * Updates opening roll state with a player's roll
   *
   * @param currentOpeningRoll Current opening roll state
   * @param player Player who rolled
   * @param dieValue Die value rolled
   * @returns Updated opening roll state
   */
  static recordPlayerRoll(
    currentOpeningRoll: { whiteRoll: number | null; blackRoll: number | null; resolved: boolean; rerollCount: number },
    player: Player,
    dieValue: number
  ) {
    if (player === Player.WHITE) {
      return {
        ...currentOpeningRoll,
        whiteRoll: dieValue
      };
    } else {
      return {
        ...currentOpeningRoll,
        blackRoll: dieValue
      };
    }
  }

  /**
   * Marks opening roll as resolved
   *
   * @param currentOpeningRoll Current opening roll state
   * @returns Opening roll state marked as resolved
   */
  static markResolved(
    currentOpeningRoll: { whiteRoll: number | null; blackRoll: number | null; resolved: boolean; rerollCount: number }
  ) {
    return {
      ...currentOpeningRoll,
      resolved: true
    };
  }

  /**
   * Checks if both players have rolled
   *
   * @param openingRoll Current opening roll state
   * @returns True if both players have rolled
   */
  static areBothRollsComplete(
    openingRoll: { whiteRoll: number | null; blackRoll: number | null } | null
  ): boolean {
    return (
      openingRoll !== null &&
      openingRoll.whiteRoll !== null &&
      openingRoll.blackRoll !== null
    );
  }
}
