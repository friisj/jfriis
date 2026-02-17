/**
 * Dice Logic Utilities
 *
 * Pure functions for dice-related business logic extracted from gameStore.
 * This module contains:
 * - Dice array generation (handling doubles)
 * - Dice usage tracking
 * - Die consumption validation
 *
 * All functions are pure (no side effects) and return values or partial state updates.
 */

/**
 * Result of processing a dice roll
 */
export interface DiceRollResult {
  dice: number[];
  usedDice: boolean[];
  isDoubles: boolean;
}

/**
 * Result of finding a die to use for a move
 */
export interface DieSearchResult {
  dieIndex: number;
  found: boolean;
}

export class DiceLogic {
  /**
   * Processes a dice roll result into game state format
   *
   * Rules:
   * - Doubles: Create 4 dice (all same value)
   * - Non-doubles: Create 2 dice
   *
   * @param diceResult The raw dice roll [die1, die2]
   * @returns Processed dice array and usage tracking
   */
  static processDiceRoll(diceResult: [number, number]): DiceRollResult {
    const isDoubles = diceResult[0] === diceResult[1];

    if (isDoubles) {
      return {
        dice: [diceResult[0], diceResult[0], diceResult[0], diceResult[0]],
        usedDice: [false, false, false, false],
        isDoubles: true
      };
    }

    return {
      dice: [diceResult[0], diceResult[1]],
      usedDice: [false, false],
      isDoubles: false
    };
  }

  /**
   * Finds the index of a die that matches the move distance and hasn't been used
   *
   * @param dice Current dice array
   * @param usedDice Current usage tracking
   * @param moveDistance Distance of the move to find a die for
   * @returns Index of the die, or -1 if not found
   */
  static findAvailableDie(
    dice: number[],
    usedDice: boolean[],
    moveDistance: number
  ): DieSearchResult {
    const dieIndex = dice.findIndex((die, index) =>
      die === moveDistance && !usedDice[index]
    );

    return {
      dieIndex,
      found: dieIndex !== -1
    };
  }

  /**
   * Marks a die as used
   *
   * @param usedDice Current usage tracking
   * @param dieIndex Index of die to mark as used
   * @returns New usedDice array with die marked as used
   */
  static markDieAsUsed(usedDice: boolean[], dieIndex: number): boolean[] {
    const newUsedDice = [...usedDice];
    newUsedDice[dieIndex] = true;
    return newUsedDice;
  }

  /**
   * Checks if all dice have been used
   *
   * @param usedDice Current usage tracking
   * @returns True if all dice are used
   */
  static areAllDiceUsed(usedDice: boolean[]): boolean {
    return usedDice.every(used => used);
  }

  /**
   * Checks if any die is still available
   *
   * @param usedDice Current usage tracking
   * @returns True if at least one die is still available
   */
  static hasAvailableDice(usedDice: boolean[]): boolean {
    return usedDice.some(used => !used);
  }

  /**
   * Counts how many dice are still available
   *
   * @param usedDice Current usage tracking
   * @returns Number of unused dice
   */
  static countAvailableDice(usedDice: boolean[]): number {
    return usedDice.filter(used => !used).length;
  }

  /**
   * Gets the values of unused dice
   *
   * @param dice Current dice array
   * @param usedDice Current usage tracking
   * @returns Array of unused die values
   */
  static getAvailableDiceValues(dice: number[], usedDice: boolean[]): number[] {
    return dice.filter((_, index) => !usedDice[index]);
  }

  /**
   * Resets dice state for a new turn
   *
   * @returns Empty dice state
   */
  static resetDice(): { dice: null; usedDice: boolean[] } {
    return {
      dice: null,
      usedDice: [false, false]
    };
  }
}
