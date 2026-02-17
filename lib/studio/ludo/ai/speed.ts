/**
 * AI Speed Variation System
 *
 * Implements difficulty-based and position-based thinking time variation
 * to create authentic competitive feel and teaching through tempo.
 *
 * Key insight: Beginner plays erratically fast (doesn't recognize complexity),
 * Intermediate is SLOWEST (sees complexity, lacks pattern recognition),
 * Expert is fast on routine moves but slows dramatically for critical decisions.
 */

import { AIDifficulty } from './types';
import { BoardPosition, Player, Move } from '../game/types';
import { logger } from '../utils/logger';

/**
 * Position complexity factors that affect AI thinking time
 */
export interface PositionComplexity {
  /** Is this a cube decision moment? */
  isCubeDecision: boolean;
  /** Are there opposing checkers in contact range (4+ checkers interaction)? */
  isContactPosition: boolean;
  /** Are we bearing off with contact still on the board? */
  isBearOffWithContact: boolean;
  /** Is this a match-critical situation (close to match point)? */
  isMatchCritical: boolean;
  /** Is this a forced move (only one legal option)? */
  isForcedMove: boolean;
  /** Is this an opening move (first turn)? */
  isOpeningMove: boolean;
  /** Total number of legal moves available */
  moveCount: number;
}

/**
 * Base speed ranges (in seconds) for each difficulty level
 * Applied to routine moves without special complexity
 */
const BASE_SPEEDS: Record<AIDifficulty, { min: number; max: number }> = {
  [AIDifficulty.BEGINNER]: { min: 1.5, max: 3.0 },     // Erratic, random pauses
  [AIDifficulty.EASY]: { min: 2.0, max: 4.0 },         // Methodical, SLOWEST overall
  [AIDifficulty.MEDIUM]: { min: 1.0, max: 2.5 },       // Developing pattern recognition
  [AIDifficulty.HARD]: { min: 0.5, max: 1.5 },         // Good pattern recognition
  [AIDifficulty.EXPERT]: { min: 0.3, max: 1.0 },       // Instant pattern recognition
};

/**
 * Position complexity multipliers applied to base time
 * These stack multiplicatively for complex positions
 */
const COMPLEXITY_MULTIPLIERS = {
  CUBE_DECISION: 2.5,          // Most critical decision type
  CONTACT_POSITION: 1.5,       // Tactical complexity
  BEAROFF_WITH_CONTACT: 1.8,   // Timing-sensitive endgame
  MATCH_CRITICAL: 2.0,         // Tournament pressure (Expert only)
  FORCED_MOVE: 0.3,            // Obvious play
  OPENING_MOVE: 0.5,           // Book moves (Expert only)
};

/**
 * Random variation factors to add naturalness
 * Beginner has high variation (erratic), others more consistent
 */
const RANDOM_FACTORS: Record<AIDifficulty, { min: number; max: number }> = {
  [AIDifficulty.BEGINNER]: { min: 0.7, max: 1.3 },   // High variation
  [AIDifficulty.EASY]: { min: 0.9, max: 1.1 },       // Low variation
  [AIDifficulty.MEDIUM]: { min: 0.9, max: 1.1 },     // Low variation
  [AIDifficulty.HARD]: { min: 0.95, max: 1.05 },     // Very low variation
  [AIDifficulty.EXPERT]: { min: 0.95, max: 1.05 },   // Very low variation
};

/**
 * Detect position complexity based on board state and game context
 */
export function analyzePositionComplexity(
  board: BoardPosition[],
  currentPlayer: Player,
  availableMoves: Move[],
  turnNumber: number,
  isCubeDecision: boolean,
  isMatchCritical: boolean
): PositionComplexity {
  // Forced move detection
  const isForcedMove = availableMoves.length === 1;

  // Opening move detection (first turn)
  const isOpeningMove = turnNumber === 1;

  // Contact position detection - check if any opposing checkers are in contact range
  // Contact means checkers within 6 points of each other (max dice roll)
  const isContactPosition = detectContactPosition(board, currentPlayer);

  // Bear-off with contact detection
  const isBearingOff = availableMoves.some(m => m.to === 25); // OFF_POSITION = 25
  const isBearOffWithContact = isBearingOff && isContactPosition;

  return {
    isCubeDecision,
    isContactPosition,
    isBearOffWithContact,
    isMatchCritical,
    isForcedMove,
    isOpeningMove,
    moveCount: availableMoves.length
  };
}

/**
 * Detect if opposing checkers are in contact range
 * Contact means opponent has checkers that can potentially hit our checkers
 */
function detectContactPosition(board: BoardPosition[], currentPlayer: Player): boolean {
  const opponent = currentPlayer === Player.WHITE ? Player.BLACK : Player.WHITE;

  // Count checkers for each player on regular points (0-23)
  let playerCheckersInContact = 0;
  let opponentCheckersInContact = 0;

  for (let i = 0; i < 24; i++) {
    const point = board[i];
    if (!point) continue;

    const playerCheckers = point.checkers.filter(c => c.player === currentPlayer);
    const opponentCheckers = point.checkers.filter(c => c.player === opponent);

    if (playerCheckers.length > 0) {
      // Check if opponent can reach this point (within 6 points)
      const canOpponentReach = checkIfOpponentCanReach(board, opponent, i);
      if (canOpponentReach) {
        playerCheckersInContact += playerCheckers.length;
      }
    }

    if (opponentCheckers.length > 0) {
      opponentCheckersInContact += opponentCheckers.length;
    }
  }

  // Contact if both players have 4+ checkers in potential contact range
  return playerCheckersInContact >= 4 && opponentCheckersInContact >= 4;
}

/**
 * Check if opponent has checkers that could potentially reach target point
 */
function checkIfOpponentCanReach(
  board: BoardPosition[],
  opponent: Player,
  targetPoint: number
): boolean {
  // Simplified check: look for opponent checkers within 6 points
  const direction = opponent === Player.WHITE ? 1 : -1;
  const startRange = Math.max(0, targetPoint - (6 * direction));
  const endRange = Math.min(23, targetPoint + (6 * direction));

  for (let i = Math.min(startRange, endRange); i <= Math.max(startRange, endRange); i++) {
    const point = board[i];
    if (point && point.checkers.some(c => c.player === opponent)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate AI thinking time in seconds based on difficulty and position complexity
 */
export function calculateAIThinkingTime(
  difficulty: AIDifficulty,
  complexity: PositionComplexity
): number {
  // Start with base speed for difficulty level
  const baseSpeed = BASE_SPEEDS[difficulty];
  const baseTime = baseSpeed.min + Math.random() * (baseSpeed.max - baseSpeed.min);

  // Apply complexity multipliers
  let multiplier = 1.0;

  if (complexity.isCubeDecision) {
    multiplier *= COMPLEXITY_MULTIPLIERS.CUBE_DECISION;
  }

  // Forced moves are quick for all levels
  if (complexity.isForcedMove) {
    multiplier *= COMPLEXITY_MULTIPLIERS.FORCED_MOVE;
  }

  // Opening moves are instant for Expert only
  if (complexity.isOpeningMove && difficulty === AIDifficulty.EXPERT) {
    multiplier *= COMPLEXITY_MULTIPLIERS.OPENING_MOVE;
  }

  // Contact complexity for intermediate and above
  if (complexity.isContactPosition && difficulty !== AIDifficulty.BEGINNER) {
    multiplier *= COMPLEXITY_MULTIPLIERS.CONTACT_POSITION;
  }

  // Bear-off with contact for advanced and above
  if (complexity.isBearOffWithContact &&
      (difficulty === AIDifficulty.MEDIUM || difficulty === AIDifficulty.HARD || difficulty === AIDifficulty.EXPERT)) {
    multiplier *= COMPLEXITY_MULTIPLIERS.BEAROFF_WITH_CONTACT;
  }

  // Match-critical situations for Expert only
  if (complexity.isMatchCritical && difficulty === AIDifficulty.EXPERT) {
    multiplier *= COMPLEXITY_MULTIPLIERS.MATCH_CRITICAL;
  }

  // Apply random variation for naturalness
  const randomFactor = RANDOM_FACTORS[difficulty];
  const randomness = randomFactor.min + Math.random() * (randomFactor.max - randomFactor.min);

  // Calculate final time
  const calculatedTime = baseTime * multiplier * randomness;

  // Clamp to reasonable bounds (0.2s min, 10s max)
  const clampedTime = Math.max(0.2, Math.min(10.0, calculatedTime));

  // Convert to milliseconds and log
  const milliseconds = Math.round(clampedTime * 1000);

  logger.debug(
    `⏱️  AI Speed: ${difficulty} | Base: ${baseTime.toFixed(2)}s | ` +
    `Mult: ${multiplier.toFixed(2)}x | Random: ${randomness.toFixed(2)} | ` +
    `Final: ${clampedTime.toFixed(2)}s (${milliseconds}ms)` +
    (complexity.isCubeDecision ? ' [CUBE]' : '') +
    (complexity.isForcedMove ? ' [FORCED]' : '') +
    (complexity.isOpeningMove ? ' [OPENING]' : '') +
    (complexity.isContactPosition ? ' [CONTACT]' : '') +
    (complexity.isBearOffWithContact ? ' [BEAROFF+CONTACT]' : '') +
    (complexity.isMatchCritical ? ' [MATCH CRITICAL]' : '')
  );

  return milliseconds;
}

/**
 * Get a simple delay for non-move situations (fixed delays)
 * Used for turn switching, cube responses, etc.
 */
export function getStandardAIDelay(difficulty: AIDifficulty): number {
  // Use midpoint of base speed range for standard delays
  const baseSpeed = BASE_SPEEDS[difficulty];
  const avgTime = (baseSpeed.min + baseSpeed.max) / 2;
  return Math.round(avgTime * 1000);
}
