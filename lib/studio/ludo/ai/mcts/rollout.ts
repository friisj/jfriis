/**
 * Fast Rollout Engine for MCTS
 *
 * Lightweight game simulation optimized for speed (10,000+ games/sec target)
 * No UI, no logging, no validation - pure game logic
 */

import { BoardPosition, Player, Checker } from '@/lib/studio/ludo/game/types';
import { logger } from '@/lib/studio/ludo/utils/logger';

/**
 * Rollout policy: how to select moves during simulation
 */
export type RolloutPolicy = 'random' | 'heuristic';

/**
 * Result of a single game simulation
 */
export interface RolloutResult {
  winner: Player;
  gameValue: number;  // 1 = single, 2 = gammon, 3 = backgammon
  moveCount: number;
}

/**
 * Minimal board state for fast simulation
 * Uses arrays instead of objects for performance
 */
interface FastBoard {
  // Points 0-23: checker positions
  // Point index: number of checkers (positive = white, negative = black)
  points: number[];

  // Bar: checkers on bar
  whiteBar: number;
  blackBar: number;

  // Off: checkers borne off
  whiteOff: number;
  blackOff: number;
}

/**
 * Fast dice roller (no validation)
 */
function rollDice(): [number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ];
}

/**
 * Calculate pip count quickly
 */
function calculatePipCount(board: FastBoard, player: Player): number {
  let pips = 0;

  if (player === Player.WHITE) {
    // White moves from 0 → 23
    for (let i = 0; i < 24; i++) {
      if (board.points[i] > 0) {
        pips += board.points[i] * (24 - i);
      }
    }
    pips += board.whiteBar * 25; // Bar = 25 pips
  } else {
    // Black moves from 23 → 0
    for (let i = 0; i < 24; i++) {
      if (board.points[i] < 0) {
        pips += Math.abs(board.points[i]) * (i + 1);
      }
    }
    pips += board.blackBar * 25;
  }

  return pips;
}

/**
 * Convert full board to fast board representation
 */
function toFastBoard(board: BoardPosition[]): FastBoard {
  const fast: FastBoard = {
    points: new Array(24).fill(0),
    whiteBar: 0,
    blackBar: 0,
    whiteOff: 0,
    blackOff: 0
  };

  for (const position of board) {
    if (position.pointIndex === 24) {
      // Bar
      for (const checker of position.checkers) {
        if (checker.player === Player.WHITE) fast.whiteBar++;
        else fast.blackBar++;
      }
    } else if (position.pointIndex === 25) {
      // Off
      for (const checker of position.checkers) {
        if (checker.player === Player.WHITE) fast.whiteOff++;
        else fast.blackOff++;
      }
    } else if (position.pointIndex >= 0 && position.pointIndex < 24) {
      // Regular points
      const whiteCount = position.checkers.filter(c => c.player === Player.WHITE).length;
      const blackCount = position.checkers.filter(c => c.player === Player.BLACK).length;

      if (whiteCount > 0) fast.points[position.pointIndex] = whiteCount;
      else if (blackCount > 0) fast.points[position.pointIndex] = -blackCount;
    }
  }

  return fast;
}

/**
 * Clone fast board (cheap copy)
 */
function cloneFastBoard(board: FastBoard): FastBoard {
  return {
    points: [...board.points],
    whiteBar: board.whiteBar,
    blackBar: board.blackBar,
    whiteOff: board.whiteOff,
    blackOff: board.blackOff
  };
}

/**
 * Check if player has won
 */
function checkWinner(board: FastBoard): Player | null {
  if (board.whiteOff === 15) return Player.WHITE;
  if (board.blackOff === 15) return Player.BLACK;
  return null;
}

/**
 * Calculate game value (single/gammon/backgammon)
 */
function calculateGameValue(board: FastBoard, winner: Player): number {
  const loser = winner === Player.WHITE ? Player.BLACK : Player.WHITE;

  // Count loser's borne off checkers
  const loserOff = loser === Player.WHITE ? board.whiteOff : board.blackOff;

  if (loserOff === 0) {
    // Loser hasn't borne off any checkers

    // Check if loser has checkers in winner's home board
    const loserInWinnerHome = loser === Player.WHITE
      ? board.points.slice(18, 24).some(p => p > 0) || board.whiteBar > 0
      : board.points.slice(0, 6).some(p => p < 0) || board.blackBar > 0;

    if (loserInWinnerHome) {
      return 3; // Backgammon
    }

    return 2; // Gammon
  }

  return 1; // Single game
}

/**
 * Generate all legal moves for a dice roll
 */
function generateMoves(
  board: FastBoard,
  player: Player,
  dice: [number, number]
): Array<{ from: number; to: number }> {
  const moves: Array<{ from: number; to: number }> = [];
  const [die1, die2] = dice;
  const isDoubles = die1 === die2;
  const direction = player === Player.WHITE ? 1 : -1;

  // Simplified move generation for speed
  // Just generate all physically possible moves
  // Real validation happens in full game engine

  const dice_to_use = isDoubles ? [die1, die1, die1, die1] : [die1, die2];

  // Check bar first
  const onBar = player === Player.WHITE ? board.whiteBar : board.blackBar;
  if (onBar > 0) {
    // Must enter from bar
    const entryPoint = player === Player.WHITE ? die1 - 1 : 24 - die1;

    if (entryPoint >= 0 && entryPoint < 24) {
      const point = board.points[entryPoint];
      const canEnter = player === Player.WHITE ? point >= -1 : point <= 1;

      if (canEnter) {
        moves.push({ from: 24, to: entryPoint }); // Bar represented as 24
      }
    }

    // If can't enter, no other moves possible
    if (moves.length === 0) return [];
  }

  // Generate moves from regular points
  for (let point = 0; point < 24; point++) {
    const checkers = board.points[point];
    const hasChecker = player === Player.WHITE ? checkers > 0 : checkers < 0;

    if (!hasChecker) continue;

    // Try each die
    for (const die of dice_to_use) {
      const targetPoint = player === Player.WHITE ? point + die : point - die;

      // Bearing off
      if ((player === Player.WHITE && targetPoint >= 24) ||
          (player === Player.BLACK && targetPoint < 0)) {
        // Check if all checkers are in home board
        const inHome = player === Player.WHITE
          ? board.points.slice(0, 18).every(p => p <= 0) && board.whiteBar === 0
          : board.points.slice(6, 24).every(p => p >= 0) && board.blackBar === 0;

        if (inHome) {
          moves.push({ from: point, to: 25 }); // Off represented as 25
        }
        continue;
      }

      if (targetPoint >= 0 && targetPoint < 24) {
        const target = board.points[targetPoint];
        const canMove = player === Player.WHITE ? target >= -1 : target <= 1;

        if (canMove) {
          moves.push({ from: point, to: targetPoint });
        }
      }
    }
  }

  return moves;
}

/**
 * Apply a move to the board
 */
function applyMove(
  board: FastBoard,
  move: { from: number; to: number },
  player: Player
): FastBoard {
  const newBoard = cloneFastBoard(board);

  // Remove from source
  if (move.from === 24) {
    // From bar
    if (player === Player.WHITE) newBoard.whiteBar--;
    else newBoard.blackBar--;
  } else if (move.from >= 0 && move.from < 24) {
    if (player === Player.WHITE) newBoard.points[move.from]--;
    else newBoard.points[move.from]++;
  }

  // Add to destination
  if (move.to === 25) {
    // Bear off
    if (player === Player.WHITE) newBoard.whiteOff++;
    else newBoard.blackOff++;
  } else if (move.to >= 0 && move.to < 24) {
    const target = newBoard.points[move.to];

    // Check for hit
    if ((player === Player.WHITE && target === -1) ||
        (player === Player.BLACK && target === 1)) {
      // Hit opponent's blot
      if (player === Player.WHITE) {
        newBoard.blackBar++;
        newBoard.points[move.to] = 1; // Replace with our checker
      } else {
        newBoard.whiteBar++;
        newBoard.points[move.to] = -1;
      }
    } else {
      // Normal move
      if (player === Player.WHITE) newBoard.points[move.to]++;
      else newBoard.points[move.to]--;
    }
  }

  return newBoard;
}

/**
 * Fast Rollout Engine
 * Simulates complete games at high speed for MCTS
 */
export class FastRolloutEngine {
  private gamesSimulated = 0;

  /**
   * Simulate a single game from given position to completion
   * Returns winner and game value
   */
  simulateGame(
    initialBoard: BoardPosition[],
    startingPlayer: Player,
    policy: RolloutPolicy = 'random'
  ): RolloutResult {
    let board = toFastBoard(initialBoard);
    let currentPlayer = startingPlayer;
    let moveCount = 0;
    const MAX_MOVES = 500; // Prevent infinite loops

    while (moveCount < MAX_MOVES) {
      // Check for winner
      const winner = checkWinner(board);
      if (winner) {
        const gameValue = calculateGameValue(board, winner);
        this.gamesSimulated++;

        return { winner, gameValue, moveCount };
      }

      // Roll dice
      const dice = rollDice();

      // Generate moves
      const moves = generateMoves(board, currentPlayer, dice);

      if (moves.length === 0) {
        // No legal moves, skip turn
        currentPlayer = currentPlayer === Player.WHITE ? Player.BLACK : Player.WHITE;
        moveCount++;
        continue;
      }

      // Select move based on policy
      const selectedMove = policy === 'random'
        ? moves[Math.floor(Math.random() * moves.length)]
        : this.selectHeuristicMove(moves, board, currentPlayer);

      // Apply move
      board = applyMove(board, selectedMove, currentPlayer);

      // Switch player
      currentPlayer = currentPlayer === Player.WHITE ? Player.BLACK : Player.WHITE;
      moveCount++;
    }

    // Timeout - determine winner by pip count
    const whitePips = calculatePipCount(board, Player.WHITE);
    const blackPips = calculatePipCount(board, Player.BLACK);

    const winner = whitePips < blackPips ? Player.WHITE : Player.BLACK;
    this.gamesSimulated++;

    return { winner, gameValue: 1, moveCount: MAX_MOVES };
  }

  /**
   * Heuristic move selection (slightly better than random)
   * Prefers: hitting, bearing off, moving forward
   */
  private selectHeuristicMove(
    moves: Array<{ from: number; to: number }>,
    board: FastBoard,
    player: Player
  ): { from: number; to: number } {
    // Prioritize bearing off
    const bearOffMoves = moves.filter(m => m.to === 25);
    if (bearOffMoves.length > 0) {
      return bearOffMoves[Math.floor(Math.random() * bearOffMoves.length)];
    }

    // Prioritize hitting
    const hittingMoves = moves.filter(m => {
      if (m.to < 0 || m.to >= 24) return false;
      const target = board.points[m.to];
      return (player === Player.WHITE && target === -1) ||
             (player === Player.BLACK && target === 1);
    });

    if (hittingMoves.length > 0) {
      return hittingMoves[Math.floor(Math.random() * hittingMoves.length)];
    }

    // Otherwise random
    return moves[Math.floor(Math.random() * moves.length)];
  }

  /**
   * Get total games simulated (for performance tracking)
   */
  getGamesSimulated(): number {
    return this.gamesSimulated;
  }

  /**
   * Reset counter
   */
  resetCounter(): void {
    this.gamesSimulated = 0;
  }

  /**
   * Run performance benchmark
   * Returns games per second
   */
  async benchmark(durationMs: number = 1000): Promise<number> {
    // Create a simple starting position
    const startPosition = this.createBenchmarkPosition();

    this.resetCounter();
    const startTime = performance.now();
    const endTime = startTime + durationMs;

    while (performance.now() < endTime) {
      this.simulateGame(startPosition, Player.WHITE, 'random');
    }

    const elapsed = performance.now() - startTime;
    const gamesPerSecond = Math.round((this.gamesSimulated / elapsed) * 1000);

    logger.info(`FastRolloutEngine benchmark: ${gamesPerSecond} games/sec`);

    return gamesPerSecond;
  }

  /**
   * Create a benchmark position (standard starting position)
   */
  private createBenchmarkPosition(): BoardPosition[] {
    // Simplified starting position for benchmarking
    const positions: BoardPosition[] = [];

    // Create empty board structure
    for (let i = 0; i <= 25; i++) {
      positions.push({
        pointIndex: i,
        checkers: []
      });
    }

    // Standard backgammon starting position
    // White: 2 on 23, 5 on 12, 3 on 7, 5 on 5
    // Black: 2 on 0, 5 on 11, 3 on 16, 5 on 18

    const createChecker = (player: Player, id: number, position: number): Checker => ({
      id: `${player}-${id}`,
      player,
      position
    });

    // White checkers
    for (let i = 0; i < 2; i++) positions[23].checkers.push(createChecker(Player.WHITE, i, 23));
    for (let i = 2; i < 7; i++) positions[12].checkers.push(createChecker(Player.WHITE, i, 12));
    for (let i = 7; i < 10; i++) positions[7].checkers.push(createChecker(Player.WHITE, i, 7));
    for (let i = 10; i < 15; i++) positions[5].checkers.push(createChecker(Player.WHITE, i, 5));

    // Black checkers
    for (let i = 0; i < 2; i++) positions[0].checkers.push(createChecker(Player.BLACK, i, 0));
    for (let i = 2; i < 7; i++) positions[11].checkers.push(createChecker(Player.BLACK, i, 11));
    for (let i = 7; i < 10; i++) positions[16].checkers.push(createChecker(Player.BLACK, i, 16));
    for (let i = 10; i < 15; i++) positions[18].checkers.push(createChecker(Player.BLACK, i, 18));

    return positions;
  }
}
