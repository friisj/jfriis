import { BoardPosition, Player } from '../game/types';
import { GameRules } from '../game/rules';

/**
 * Advanced Racing Formulas for Backgammon
 * Phase 2.5 Priority 4: Sophisticated pip count evaluation for racing positions
 *
 * Implements:
 * - Keith Count (effective pip count accounting for wastage)
 * - Ward's Count (racing win probability)
 * - Thorp Count (adjustments for distribution)
 * - Race equity estimation
 */

export interface RacingEvaluation {
  pipCount: number;              // Raw pip count
  effectivePipCount: number;     // Adjusted for wastage and distribution
  wastage: number;               // Checker distribution inefficiency
  crossovers: number;            // Expected dice rolls to bear off
  winProbability: number;        // Estimated win probability in race
}

/**
 * Calculate Keith Count (effective pip count with wastage adjustment)
 * Keith Count adjusts for inefficient checker distribution
 *
 * Wastage occurs when:
 * - Multiple checkers stacked on same point (can't use all dice efficiently)
 * - Uneven distribution across home board
 * - Gaps in distribution
 */
export function calculateKeithCount(
  board: BoardPosition[],
  player: Player
): number {
  const rawPips = GameRules.calculatePipCount(board, player);
  const wastage = calculateWastage(board, player);

  // Keith Count = Raw Pips + Wastage
  // Wastage typically ranges from 0 to 10 pips
  return rawPips + wastage;
}

/**
 * Calculate wastage (distribution inefficiency)
 * Wastage formula accounts for:
 * 1. Stacked checkers (5+ on single point = high wastage)
 * 2. Gaps in home board (empty points reduce efficiency)
 * 3. Checkers outside home board (harder to bear off)
 */
export function calculateWastage(
  board: BoardPosition[],
  player: Player
): number {
  const homeBoard = player === Player.WHITE
    ? [18, 19, 20, 21, 22, 23]
    : [0, 1, 2, 3, 4, 5];

  const playerCheckers = GameRules.getPlayerCheckers(board, player);
  const checkersInHome = playerCheckers.filter(c => homeBoard.includes(c.position));
  const checkersOff = playerCheckers.filter(c => c.position === 25);

  // If not in bearing off stage, wastage doesn't apply
  if (checkersInHome.length + checkersOff.length < 15) {
    return 0;
  }

  let wastage = 0;

  // Count checkers on each home board point
  const distribution: number[] = new Array(6).fill(0);
  homeBoard.forEach((pointIndex, idx) => {
    const pos = board.find(p => p.pointIndex === pointIndex);
    if (pos) {
      const count = pos.checkers.filter(c => c.player === player).length;
      distribution[idx] = count;
    }
  });

  // Wastage from stacked checkers
  distribution.forEach(count => {
    if (count >= 5) {
      // 5+ checkers on one point = severe wastage
      wastage += (count - 4) * 0.5; // 0.5 pip per extra checker
    } else if (count === 4) {
      // 4 checkers = moderate wastage
      wastage += 0.3;
    } else if (count === 3) {
      // 3 checkers = slight wastage
      wastage += 0.1;
    }
  });

  // Wastage from gaps (empty points in home board)
  const emptyPoints = distribution.filter(count => count === 0).length;
  if (emptyPoints >= 3) {
    // Large gaps increase wastage
    wastage += emptyPoints * 0.4;
  } else if (emptyPoints >= 1) {
    wastage += emptyPoints * 0.2;
  }

  // Wastage from uneven distribution
  const maxStack = Math.max(...distribution);
  const minStack = Math.min(...distribution.filter(c => c > 0) || [0]);
  if (maxStack - minStack >= 3) {
    // Very uneven distribution
    wastage += 1.0;
  }

  return wastage;
}

/**
 * Calculate expected crossovers (dice rolls needed to bear off)
 * More accurate than simple pip count for racing situations
 *
 * Average dice roll is 8.167 pips per roll
 * But crossovers account for inefficiency in bearing off
 */
export function calculateCrossovers(
  board: BoardPosition[],
  player: Player
): number {
  const keithCount = calculateKeithCount(board, player);

  // Average roll is 8.167 pips (accounting for doubles)
  // But bearing off is less efficient, so use 7.5 effective pips per roll
  const effectivePipsPerRoll = 7.5;

  return keithCount / effectivePipsPerRoll;
}

/**
 * Calculate racing win probability using Thorp's formula
 * More accurate than Ward's Count for close races
 *
 * Thorp formula:
 * WP = 50% + (OpponentCrossovers - MyCrossovers) * K
 * Where K depends on position (typically 6-7% per crossover)
 */
export function calculateRaceWinProbability(
  board: BoardPosition[],
  player: Player,
  opponent: Player
): RacingEvaluation {
  const myPips = GameRules.calculatePipCount(board, player);

  const myKeithCount = calculateKeithCount(board, player);
  // Note: opponent's Keith Count calculated inside crossovers calculation

  const myWastage = calculateWastage(board, player);
  const oppWastage = calculateWastage(board, opponent);

  const myCrossovers = calculateCrossovers(board, player);
  const oppCrossovers = calculateCrossovers(board, opponent);

  // Crossover difference
  const crossoverDiff = oppCrossovers - myCrossovers;

  // Thorp's K factor (percentage per crossover difference)
  // Varies based on race length:
  // - Short races (< 3 crossovers): K = 7% (more variance)
  // - Medium races (3-6 crossovers): K = 6.5%
  // - Long races (> 6 crossovers): K = 6% (less variance)
  let K: number;
  const avgCrossovers = (myCrossovers + oppCrossovers) / 2;

  if (avgCrossovers < 3) {
    K = 0.07; // Short race - high variance
  } else if (avgCrossovers < 6) {
    K = 0.065; // Medium race
  } else {
    K = 0.06; // Long race - lower variance
  }

  // Calculate win probability
  let winProbability = 0.50 + (crossoverDiff * K);

  // Adjustment for very close races (within 0.5 crossovers)
  if (Math.abs(crossoverDiff) < 0.5) {
    // Extremely close race - almost 50/50 with slight advantage
    winProbability = 0.50 + (crossoverDiff * 0.02);
  }

  // Adjustment for distribution quality
  // Better distribution (lower wastage) provides additional edge
  const wastageDiff = oppWastage - myWastage;
  winProbability += wastageDiff * 0.01; // 1% per pip of wastage difference

  // Clamp to valid probability range
  winProbability = Math.max(0.01, Math.min(0.99, winProbability));

  return {
    pipCount: myPips,
    effectivePipCount: myKeithCount,
    wastage: myWastage,
    crossovers: myCrossovers,
    winProbability
  };
}

/**
 * Calculate race equity (expected value in pure race)
 * Takes into account:
 * - Win probability
 * - Gammon probability (rare in races, but possible)
 * - Current cube value
 */
export function calculateRaceEquity(
  board: BoardPosition[],
  player: Player,
  opponent: Player,
  cubeValue: number = 1
): number {
  const raceEval = calculateRaceWinProbability(board, player, opponent);

  // Check for potential gammon (opponent has checkers to bear off)
  const oppCheckers = GameRules.getPlayerCheckers(board, opponent);
  const oppCheckersOff = oppCheckers.filter(c => c.position === 25).length;

  let gammonProbability = 0;

  if (raceEval.winProbability > 0.70 && oppCheckersOff < 3) {
    // Strong win probability and opponent barely started bearing off
    gammonProbability = (raceEval.winProbability - 0.70) * 0.2; // Up to 6% gammon chance
  }

  // Equity calculation
  // Win: +cubeValue points
  // Gammon: +2*cubeValue points
  // Loss: -cubeValue points

  const winEquity = raceEval.winProbability * cubeValue;
  const gammonEquity = gammonProbability * cubeValue; // Additional value from gammons
  const lossEquity = (1 - raceEval.winProbability) * (-cubeValue);

  return winEquity + gammonEquity + lossEquity;
}

/**
 * Determine if position is a pure race (no contact possible)
 * Used to decide whether to apply racing formulas
 */
export function isPureRace(
  board: BoardPosition[],
  player: Player,
  opponent: Player
): boolean {
  const playerCheckers = GameRules.getPlayerCheckers(board, player)
    .filter(c => c.position !== 25); // Exclude borne off
  const opponentCheckers = GameRules.getPlayerCheckers(board, opponent)
    .filter(c => c.position !== 25);

  if (playerCheckers.length === 0 || opponentCheckers.length === 0) {
    return true; // One player has borne off all checkers
  }

  // Find furthest back checker for each player
  const playerFurthestBack = player === Player.WHITE
    ? Math.min(...playerCheckers.map(c => c.position))
    : Math.max(...playerCheckers.map(c => c.position));

  const opponentFurthestBack = opponent === Player.WHITE
    ? Math.min(...opponentCheckers.map(c => c.position))
    : Math.max(...opponentCheckers.map(c => c.position));

  // Pure race if checkers have completely passed each other
  if (player === Player.WHITE) {
    // White moves 0->23, Black moves 23->0
    // Pure race if White's furthest back > Black's furthest back
    return playerFurthestBack > opponentFurthestBack;
  } else {
    // Black moves 23->0, White moves 0->23
    // Pure race if Black's furthest back < White's furthest back
    return playerFurthestBack < opponentFurthestBack;
  }
}

/**
 * Get recommended racing strategy based on position
 */
export interface RacingStrategy {
  type: 'pure_race' | 'contact';
  recommendation: string;
  winProbability?: number;
  crossoverDifference?: number;
}

export function getRacingStrategy(
  board: BoardPosition[],
  player: Player,
  opponent: Player
): RacingStrategy {
  const isPure = isPureRace(board, player, opponent);

  if (!isPure) {
    return {
      type: 'contact',
      recommendation: 'Not a pure race - use positional evaluation'
    };
  }

  const raceEval = calculateRaceWinProbability(board, player, opponent);
  const oppRaceEval = calculateRaceWinProbability(board, opponent, player);
  const crossoverDiff = oppRaceEval.crossovers - raceEval.crossovers;

  let recommendation: string;

  if (raceEval.winProbability > 0.75) {
    recommendation = 'Strong favorite - maintain lead, avoid errors';
  } else if (raceEval.winProbability > 0.60) {
    recommendation = 'Moderate favorite - bear off efficiently';
  } else if (raceEval.winProbability > 0.40) {
    recommendation = 'Close race - minimize wastage, optimal bearing off';
  } else if (raceEval.winProbability > 0.25) {
    recommendation = 'Underdog - need luck, maximize efficiency';
  } else {
    recommendation = 'Severe underdog - need opponent errors or lucky dice';
  }

  return {
    type: 'pure_race',
    recommendation,
    winProbability: raceEval.winProbability,
    crossoverDifference: crossoverDiff
  };
}
