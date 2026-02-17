/**
 * Movement Logic Utilities
 *
 * Pure functions for board movement and checker manipulation extracted from gameStore.
 * This module contains:
 * - Board update operations (move checker, handle captures)
 * - Checker position updates
 * - Hit detection and bar placement
 *
 * All functions are pure (no side effects) and operate on immutable data.
 */

import { BoardPosition, Player, Move, OFF_POSITION, BAR_POSITION, Checker } from '../types';

/**
 * Result of applying a move to the board
 */
export interface MoveApplicationResult {
  board: BoardPosition[];
  hitChecker: Checker | null; // Checker that was hit (if any)
}

/**
 * Result of checking for a hit
 */
export interface HitCheckResult {
  isHit: boolean;
  hitChecker: Checker | null;
}

export class MovementLogic {
  /**
   * Creates a deep copy of the board to avoid mutations
   *
   * @param board Current board state
   * @returns Deep copy of the board
   */
  static copyBoard(board: BoardPosition[]): BoardPosition[] {
    return board.map(position => ({
      pointIndex: position.pointIndex,
      checkers: position.checkers.map(checker => ({
        ...checker
      }))
    }));
  }

  /**
   * Checks if a move will result in hitting an opponent's blot
   *
   * Rules:
   * - Can only hit on regular points (not OFF_POSITION)
   * - Target point must have exactly 1 checker
   * - That checker must belong to opponent
   *
   * @param board Current board state
   * @param move Move being made
   * @param currentPlayer Player making the move
   * @returns Hit check result
   */
  static checkForHit(
    board: BoardPosition[],
    move: Move,
    currentPlayer: Player
  ): HitCheckResult {
    // Cannot hit when bearing off
    if (move.to === OFF_POSITION) {
      return { isHit: false, hitChecker: null };
    }

    const toPosition = board.find(pos => pos.pointIndex === move.to);

    if (!toPosition) {
      return { isHit: false, hitChecker: null };
    }

    // Check for blot (single opponent checker)
    const isBlot = toPosition.checkers.length === 1;
    const isOpponentChecker = toPosition.checkers.length > 0 &&
      toPosition.checkers[0].player !== currentPlayer;

    if (isBlot && isOpponentChecker) {
      return {
        isHit: true,
        hitChecker: toPosition.checkers[0]
      };
    }

    return { isHit: false, hitChecker: null };
  }

  /**
   * Applies a move to the board (immutably)
   *
   * This handles:
   * - Moving the checker from source to destination
   * - Hitting opponent blots (sending to bar)
   * - Bearing off
   *
   * @param board Current board state
   * @param move Move to apply
   * @param currentPlayer Player making the move
   * @returns New board state and hit checker (if any)
   */
  static applyMove(
    board: BoardPosition[],
    move: Move,
    currentPlayer: Player
  ): MoveApplicationResult {
    // Create immutable copy
    const newBoard = this.copyBoard(board);

    const fromPosition = newBoard.find(pos => pos.pointIndex === move.from);
    const toPosition = newBoard.find(pos => pos.pointIndex === move.to);

    if (!fromPosition || !toPosition) {
      // Invalid positions - return original board
      return { board, hitChecker: null };
    }

    // Find and remove the checker from source
    const checkerIndex = fromPosition.checkers.findIndex(c => c.id === move.checkerId);

    if (checkerIndex === -1) {
      // Checker not found - return original board
      return { board, hitChecker: null };
    }

    const checker = fromPosition.checkers.splice(checkerIndex, 1)[0];
    checker.position = move.to;

    let hitChecker: Checker | null = null;

    // Handle hitting
    if (move.to !== OFF_POSITION &&
        toPosition.checkers.length === 1 &&
        toPosition.checkers[0].player !== currentPlayer) {

      hitChecker = toPosition.checkers.pop()!;
      hitChecker.position = BAR_POSITION;

      const barPosition = newBoard.find(pos => pos.pointIndex === BAR_POSITION);
      if (barPosition) {
        barPosition.checkers.push(hitChecker);
      }
    }

    // Place checker at destination
    toPosition.checkers.push(checker);

    return { board: newBoard, hitChecker };
  }

  /**
   * Finds a checker on the board by ID
   *
   * @param board Current board state
   * @param checkerId ID of checker to find
   * @returns Checker if found, null otherwise
   */
  static findChecker(
    board: BoardPosition[],
    checkerId: string
  ): { checker: Checker; position: BoardPosition } | null {
    for (const position of board) {
      const checker = position.checkers.find(c => c.id === checkerId);
      if (checker) {
        return { checker, position };
      }
    }
    return null;
  }

  /**
   * Gets all checkers for a specific player
   *
   * @param board Current board state
   * @param player Player to get checkers for
   * @returns Array of checkers belonging to player
   */
  static getPlayerCheckers(
    board: BoardPosition[],
    player: Player
  ): Checker[] {
    const checkers: Checker[] = [];
    for (const position of board) {
      for (const checker of position.checkers) {
        if (checker.player === player) {
          checkers.push(checker);
        }
      }
    }
    return checkers;
  }

  /**
   * Checks if a player has any checkers on the bar
   *
   * @param board Current board state
   * @param player Player to check
   * @returns True if player has checkers on bar
   */
  static hasCheckersOnBar(
    board: BoardPosition[],
    player: Player
  ): boolean {
    const barPosition = board.find(pos => pos.pointIndex === BAR_POSITION);
    if (!barPosition) return false;

    return barPosition.checkers.some(c => c.player === player);
  }

  /**
   * Counts how many checkers a player has borne off
   *
   * @param board Current board state
   * @param player Player to check
   * @returns Number of checkers borne off
   */
  static countBorneOffCheckers(
    board: BoardPosition[],
    player: Player
  ): number {
    const offPosition = board.find(pos => pos.pointIndex === OFF_POSITION);
    if (!offPosition) return 0;

    return offPosition.checkers.filter(c => c.player === player).length;
  }
}
