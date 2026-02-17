import { BoardPosition, Player, Move } from '../game/types';
import { GameRules } from '../game/rules';
import { PositionEvaluation, AIPersonality } from './types';
import { copyBoard } from '../utils/deepCopy';

/**
 * Personality-based evaluation weights
 * Each personality has different strategic priorities
 */
interface PersonalityWeights {
  pipCount: number;
  blockade: number;
  safety: number;
  hitting: number;
  bearing: number;
  escape: number;
  anchors: number;
  timing: number;  // New: spare checkers and holding game timing
}

/**
 * Enhanced personality weights for distinctive play styles (Phase 2.2 Priority 3-4)
 * Multipliers increased for more dramatic strategic differences
 * Phase 2.2 Priority 4: Added timing factor
 */
const PERSONALITY_WEIGHTS: Record<AIPersonality, PersonalityWeights> = {
  [AIPersonality.BALANCED]: {
    pipCount: 1.0,      // Baseline pip management
    blockade: 0.5,      // Moderate blockade building
    safety: 0.3,        // Normal safety concern
    hitting: 0.4,       // Baseline hitting priority
    bearing: 1.5,       // Standard bearing priority
    escape: 2.0,        // Normal escape urgency
    anchors: 0.6,       // Moderate anchor value
    timing: 0.5         // Moderate timing concern
  },
  [AIPersonality.AGGRESSIVE]: {
    pipCount: 0.7,      // Much less concerned with pip count - take risks
    blockade: 1.2,      // Build primes aggressively to trap opponent (2.4x normal)
    safety: 0.05,       // Almost no safety concern - leave blots freely (6x less)
    hitting: 2.0,       // Extremely high hitting priority (5x normal) - attack relentlessly
    bearing: 1.5,       // Same bearing priority
    escape: 1.6,        // Lower escape urgency - willing to stay back and fight
    anchors: 0.2,       // Minimal defensive anchors - focus on offense
    timing: 0.3         // Low timing concern - attack now, worry later
  },
  [AIPersonality.DEFENSIVE]: {
    pipCount: 1.3,      // Very pip-conscious - careful racing
    blockade: 0.3,      // Much less offensive blocking
    safety: 1.5,        // Extremely high safety concern (5x normal) - avoid all blots
    hitting: 0.1,       // Avoid risky hits almost entirely (4x less)
    bearing: 1.7,       // Higher bearing priority - get home safely
    escape: 2.4,        // Very high escape urgency - get out of trouble quickly
    anchors: 1.4,       // Highly value defensive anchors (2.3x normal) - hold positions
    timing: 0.8         // High timing concern - maintain defensive structure
  },
  [AIPersonality.TACTICAL]: {
    pipCount: 1.0,      // Balanced pip management
    blockade: 1.5,      // Master of priming games (3x normal) - build long primes
    safety: 0.5,        // Moderate risk-taking - calculated blots
    hitting: 0.7,       // Selective hitting when strategically sound (1.75x normal)
    bearing: 1.5,       // Same bearing priority
    escape: 2.0,        // Normal escape urgency
    anchors: 1.2,       // High anchor value (2x normal) - strategic defensive positions
    timing: 1.0         // Very high timing concern - master of holding games (2x normal)
  }
};

export class PositionEvaluator {
  /**
   * Evaluates a board position from the perspective of the given player
   * Higher scores are better for the player
   * @param personality Optional personality to adjust evaluation weights
   */
  static evaluatePosition(
    board: BoardPosition[],
    player: Player,
    personality: AIPersonality = AIPersonality.BALANCED
  ): PositionEvaluation {
    const opponent = player === Player.WHITE ? Player.BLACK : Player.WHITE;

    const playerPips = GameRules.calculatePipCount(board, player);
    const opponentPips = GameRules.calculatePipCount(board, opponent);

    // Pip count advantage (opponent pips - player pips, so higher is better)
    const pipAdvantage = opponentPips - playerPips;

    // Blockade strength (controlling consecutive points)
    const blockadeScore = this.evaluateBlockade(board, player);

    // Safety (checkers on safe positions)
    const safetyScore = this.evaluateSafety(board, player);

    // Hitting opportunities
    const hittingScore = this.evaluateHitting(board, player);

    // Bearing off progress
    const bearingScore = this.evaluateBearing(board, player);

    // Escape urgency (penalty for being trapped in opponent's home board)
    const escapeScore = this.evaluateEscapeUrgency(board, player, opponent);

    // Anchor evaluation (defensive points in opponent's home board)
    const anchorScore = this.evaluateAnchors(board, player, opponent);

    // Timing evaluation (spare checkers and holding game timing) - Phase 2.2 Priority 4
    const timingScore = this.evaluateTiming(board, player, opponent);

    const factors = {
      pipCount: pipAdvantage,
      blockade: blockadeScore,
      safety: safetyScore,
      hitting: hittingScore,
      bearing: bearingScore,
      anchors: anchorScore,
      timing: timingScore
    };

    // Get personality-specific weights
    const weights = PERSONALITY_WEIGHTS[personality];

    // Weighted combination of factors using personality weights
    const score =
      pipAdvantage * weights.pipCount +
      blockadeScore * weights.blockade +
      safetyScore * weights.safety +
      hittingScore * weights.hitting +
      bearingScore * weights.bearing +
      escapeScore * weights.escape +
      anchorScore * weights.anchors +
      timingScore * weights.timing;

    return { score, factors };
  }
  
  private static evaluateBlockade(board: BoardPosition[], player: Player): number {
    let blockadeScore = 0;
    const playerPositions = board
      .filter(pos => pos.checkers.length >= 2 && pos.checkers[0].player === player)
      .map(pos => pos.pointIndex)
      .sort((a, b) => a - b);

    // Find consecutive point sequences
    let consecutiveCount = 1;
    let maxConsecutive = 1;

    for (let i = 0; i < playerPositions.length - 1; i++) {
      if (playerPositions[i + 1] === playerPositions[i] + 1) {
        consecutiveCount++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
        blockadeScore += 2; // Base value for consecutive points
      } else {
        consecutiveCount = 1;
      }
    }

    // PRIME DETECTION: Award substantial bonuses for strong blockades
    if (maxConsecutive >= 6) {
      // 6-PRIME (full prime) - extremely powerful, can trap opponent completely
      blockadeScore += 20;
    } else if (maxConsecutive === 5) {
      // 5-prime - very strong, close to full prime
      blockadeScore += 12;
    } else if (maxConsecutive === 4) {
      // 4-prime - solid blockade
      blockadeScore += 6;
    }

    return blockadeScore;
  }
  
  private static evaluateSafety(board: BoardPosition[], player: Player): number {
    let safetyScore = 0;
    
    board.forEach(position => {
      const playerCheckers = position.checkers.filter(c => c.player === player);
      if (playerCheckers.length === 1) {
        // Single checkers are vulnerable, penalize based on distance from home
        const distance = player === Player.WHITE ? 
          Math.max(0, 23 - position.pointIndex) : 
          position.pointIndex;
        safetyScore -= distance * 0.1;
      } else if (playerCheckers.length >= 2) {
        // Multiple checkers are safe
        safetyScore += 1;
      }
    });
    
    return safetyScore;
  }
  
  private static evaluateHitting(board: BoardPosition[], player: Player): number {
    let hittingScore = 0;
    const opponent = player === Player.WHITE ? Player.BLACK : Player.WHITE;
    
    // Find opponent blots (single checkers)
    board.forEach(position => {
      const opponentCheckers = position.checkers.filter(c => c.player === opponent);
      if (opponentCheckers.length === 1) {
        // Check if we can hit this blot
        const canHit = this.canHitFromDistance(board, player, position.pointIndex);
        if (canHit) {
          hittingScore += 2; // Hitting opportunities are valuable
        }
      }
    });
    
    return hittingScore;
  }
  
  private static canHitFromDistance(board: BoardPosition[], player: Player, targetPoint: number): boolean {
    // Simplified check - look for checkers that could potentially hit with standard dice (1-6)
    for (let distance = 1; distance <= 6; distance++) {
      const sourcePoint = player === Player.WHITE ? 
        targetPoint - distance : 
        targetPoint + distance;
        
      if (sourcePoint < 0 || sourcePoint >= 24) continue;
      
      const sourcePosition = board.find(pos => pos.pointIndex === sourcePoint);
      if (sourcePosition && sourcePosition.checkers.some(c => c.player === player)) {
        return true;
      }
    }
    return false;
  }
  
  private static evaluateBearing(board: BoardPosition[], player: Player): number {
    const homeBoard = player === Player.WHITE ? [18, 19, 20, 21, 22, 23] : [0, 1, 2, 3, 4, 5];
    const playerCheckers = GameRules.getPlayerCheckers(board, player);

    // Count checkers in home board
    const checkersInHome = playerCheckers.filter(c =>
      homeBoard.includes(c.position)
    ).length;

    // Count checkers already borne off
    const checkersOff = playerCheckers.filter(c => c.position === 25).length;

    // Increased from 2 to 5 to prioritize bear-off more strongly
    return checkersInHome * 0.5 + checkersOff * 5;
  }

  /**
   * Evaluate anchor positions - defensive points held in opponent's home board
   * Anchors are strategically important for holding games and preventing opponent primes
   * Phase 2.5 Priority 1: Enhanced with deep anchor penalties, bar-point handling, improved timing
   */
  private static evaluateAnchors(board: BoardPosition[], player: Player, opponent: Player): number {
    let anchorScore = 0;

    // Define opponent's home board (where player's anchors can be)
    const opponentHomeBoard = opponent === Player.WHITE
      ? [18, 19, 20, 21, 22, 23]  // White's home (for Black anchors)
      : [0, 1, 2, 3, 4, 5];        // Black's home (for White anchors)

    // Advanced anchor points (opponent's 4-point and 5-point)
    // These are the most valuable defensive positions
    const advancedAnchors = opponent === Player.WHITE
      ? [20, 21] // White's 4-pt and 5-pt (correct for Black anchors)
      : [3, 4];   // Black's 4-pt and 5-pt (CORRECTED for White anchors)

    // Bar-point anchors (opponent's bar point - 7-point) - Phase 2.5 Priority 1
    // Critical defensive position, stronger than other mid anchors
    const barPointAnchors = opponent === Player.WHITE
      ? [17] // White's bar point (7-point, which is index 17)
      : [6];  // Black's bar point (7-point, which is index 6)

    // Mid anchors (opponent's 3-point and 6-point)
    const midAnchors = opponent === Player.WHITE
      ? [19, 22] // White's 3-pt and 6-pt (correct for Black anchors)
      : [2, 5];   // Black's 3-pt and 6-pt (CORRECTED for White anchors)

    // Deep anchors (opponent's 1-point and 2-point) - Phase 2.5 Priority 1
    // Value depends on game state - can be liability when opponent bearing off
    const deepAnchors = opponent === Player.WHITE
      ? [18, 23] // White's 1-pt (23) and 2-pt (18) for Black anchors
      : [0, 1];   // Black's 1-pt (0) and 2-pt (1) for White anchors

    // Check opponent's bearing off progress for deep anchor evaluation
    const opponentCheckers = GameRules.getPlayerCheckers(board, opponent);
    const opponentCheckersOff = opponentCheckers.filter(c => c.position === 25).length;
    const opponentBearingOff = opponentCheckersOff > 0;

    // Track anchors found
    let anchorCount = 0;
    let hasAdvancedAnchor = false;
    let hasBarPointAnchor = false;

    // Check each point in opponent's home board for anchors
    opponentHomeBoard.forEach(pointIndex => {
      const position = board.find(pos => pos.pointIndex === pointIndex);
      if (!position) return;

      const playerCheckersOnPoint = position.checkers.filter(c => c.player === player);

      // An anchor is a point with 2 or more checkers
      if (playerCheckersOnPoint.length >= 2) {
        anchorCount++;

        if (advancedAnchors.includes(pointIndex)) {
          // Advanced anchors (4-point, 5-point) are most valuable
          anchorScore += 8.0;
          hasAdvancedAnchor = true;
        } else if (barPointAnchors.includes(pointIndex)) {
          // Bar-point anchors - Phase 2.5: Special handling
          // Very strong defensive position, blocks opponent's outer board
          anchorScore += 7.0;
          hasBarPointAnchor = true;
        } else if (midAnchors.includes(pointIndex)) {
          // Mid anchors (3-point, 6-point) are moderately valuable
          anchorScore += 5.0;
        } else if (deepAnchors.includes(pointIndex)) {
          // Deep anchors - Phase 2.5: Context-dependent value
          if (opponentBearingOff) {
            // When opponent is bearing off, deep anchors become liabilities
            // Hard to escape from, and opponent can clear them easily
            anchorScore += 1.0; // Much lower value
          } else {
            // Early/mid game, deep anchors still have value
            anchorScore += 3.0;
          }
        } else {
          // Fallback for any other positions
          anchorScore += 3.0;
        }
      }
    });

    // Bonus for multiple anchors (backgame positions) - Phase 2.5: Enhanced
    if (anchorCount >= 2) {
      // Base backgame bonus
      let backgameBonus = 4.0;

      // Extra bonus if one is an advanced anchor
      if (hasAdvancedAnchor) {
        backgameBonus += 3.0;
      }

      // Extra bonus for bar-point anchor in backgame (blocks outer board)
      if (hasBarPointAnchor) {
        backgameBonus += 2.0;
      }

      // Phase 2.5: Backgame timing adjustments
      // Backgame value depends on timing - need spare checkers to wait

      // Count spare checkers on mid-board points (not in home, not trapped)
      let spareCheckersForBackgame = 0;
      board.forEach(pos => {
        // Mid-board positions (roughly points 6-18)
        if (pos.pointIndex >= 6 && pos.pointIndex <= 18 && pos.pointIndex !== 24) {
          const playerCheckersHere = pos.checkers.filter(c => c.player === player);
          if (playerCheckersHere.length === 2 || playerCheckersHere.length === 3) {
            spareCheckersForBackgame++;
          }
        }
      });

      // Adjust backgame bonus based on timing
      if (spareCheckersForBackgame >= 3) {
        // Good timing for backgame - plenty of spare checkers
        backgameBonus += 4.0;
      } else if (spareCheckersForBackgame >= 1) {
        // Adequate timing
        backgameBonus += 2.0;
      } else {
        // Poor timing - no spare checkers, backgame will collapse
        backgameBonus -= 3.0;
      }

      anchorScore += backgameBonus;
    }

    // Timing consideration: Adjust anchor value based on game state
    // Phase 2.5: Enhanced timing with opponent's bearing progress
    const playerPips = GameRules.calculatePipCount(board, player);
    const opponentPips = GameRules.calculatePipCount(board, opponent);
    const pipAdvantage = opponentPips - playerPips;

    let timingMultiplier = 1.0;

    // Check opponent's home board status for more accurate timing
    // (Use same opponentHomeBoard definition from above)
    const opponentInHome = opponentCheckers.filter(c =>
      opponentHomeBoard.includes(c.position)
    ).length;

    if (pipAdvantage > 50 && opponentInHome > 12) {
      // Far ahead AND opponent nearly ready to bear off - anchors minimal value
      timingMultiplier = 0.3;
    } else if (pipAdvantage > 40) {
      // Far ahead in race - should be racing, not holding
      timingMultiplier = 0.5;
    } else if (pipAdvantage < -40 && anchorCount >= 2) {
      // Far behind with backgame - anchors critical
      timingMultiplier = 1.5;
    } else if (pipAdvantage < -30) {
      // Behind in race - anchors valuable for holding game
      timingMultiplier = 1.3;
    } else if (opponentCheckersOff > 5 && anchorCount < 2) {
      // Opponent bearing off and we don't have backgame - anchors less valuable
      timingMultiplier = 0.7;
    }

    return anchorScore * timingMultiplier;
  }

  /**
   * Evaluate timing - spare checkers and holding game positions (Phase 2.2 Priority 4)
   * Good timing means having flexibility to wait for shots or maintain position
   */
  private static evaluateTiming(board: BoardPosition[], player: Player, opponent: Player): number {
    let timingScore = 0;
    const opponentHomeBoard = opponent === Player.WHITE
      ? [18, 19, 20, 21, 22, 23]
      : [0, 1, 2, 3, 4, 5];

    // Count anchors player has
    let anchorCount = 0;
    opponentHomeBoard.forEach(pointIndex => {
      const position = board.find(pos => pos.pointIndex === pointIndex);
      if (!position) return;
      const playerCheckersOnPoint = position.checkers.filter(c => c.player === player);
      if (playerCheckersOnPoint.length >= 2) {
        anchorCount++;
      }
    });

    // Evaluate checker distribution for timing
    let spareCheckerCount = 0;
    let wastagePoints = 0;

    board.forEach(position => {
      const playerCheckersHere = position.checkers.filter(c => c.player === player);
      const count = playerCheckersHere.length;

      // Skip bar and off positions
      if (position.pointIndex === 24 || position.pointIndex === 25) return;

      if (count === 3) {
        // 3 checkers = good spare timing
        spareCheckerCount++;
        timingScore += 2.0;
      } else if (count === 4) {
        // 4 checkers = still usable but less efficient
        spareCheckerCount++;
        timingScore += 1.0;
      } else if (count >= 5) {
        // 5+ checkers = wastage (can't use all dice efficiently)
        wastagePoints++;
        timingScore -= 2.0;
      }
    });

    // Anchor timing bonus: If you have anchors, spare checkers are more valuable
    if (anchorCount >= 1) {
      // With anchors, you want spare checkers to maintain timing
      timingScore += spareCheckerCount * 1.5;

      // Penalty for no spare checkers with anchors (bad timing)
      if (spareCheckerCount === 0) {
        timingScore -= 4.0;
      }
    }

    // Multiple anchor timing consideration
    if (anchorCount >= 2) {
      // Backgame/holding game - need excellent timing
      timingScore += spareCheckerCount * 2.0;

      // More severe penalty for no spares in backgame
      if (spareCheckerCount === 0) {
        timingScore -= 6.0;
      }
    }

    // Wastage penalty increases with number of wastage points
    if (wastagePoints >= 2) {
      timingScore -= wastagePoints * 1.5;
    }

    return timingScore;
  }

  private static evaluateEscapeUrgency(board: BoardPosition[], player: Player, opponent: Player): number {
    const playerCheckers = GameRules.getPlayerCheckers(board, player);
    const opponentCheckers = GameRules.getPlayerCheckers(board, opponent);

    // Define opponent's home board (where player's checkers are trapped)
    const opponentHomeBoard = opponent === Player.WHITE ? [18, 19, 20, 21, 22, 23] : [0, 1, 2, 3, 4, 5];

    // Count player's checkers trapped in opponent's home board
    const trappedCheckers = playerCheckers.filter(c =>
      opponentHomeBoard.includes(c.position) && c.position !== 25
    ).length;

    if (trappedCheckers === 0) return 0; // No penalty if no trapped checkers

    // Check how close opponent is to bearing off
    const opponentCheckersOff = opponentCheckers.filter(c => c.position === 25).length;
    const opponentInHomeBoard = opponentCheckers.filter(c =>
      (opponent === Player.WHITE ? [18, 19, 20, 21, 22, 23] : [0, 1, 2, 3, 4, 5]).includes(c.position)
    ).length;

    // Calculate escape urgency multiplier based on opponent's progress
    let urgencyMultiplier = 1.0;
    if (opponentCheckersOff > 8) {
      // Opponent more than half way done - CRITICAL
      urgencyMultiplier = 4.0;
    } else if (opponentCheckersOff > 4) {
      // Opponent making progress - HIGH urgency
      urgencyMultiplier = 2.5;
    } else if (opponentInHomeBoard > 10) {
      // Opponent ready to bear off - MODERATE urgency
      urgencyMultiplier = 1.5;
    }

    // Heavy penalty for each trapped checker, scaled by urgency
    // Negative score because being trapped is bad
    return -(trappedCheckers * 3.0 * urgencyMultiplier);
  }

  /**
   * Evaluates a specific move by comparing positions before and after
   * @param personality Optional personality to adjust evaluation weights
   */
  static evaluateMove(
    board: BoardPosition[],
    move: Move,
    player: Player,
    personality: AIPersonality = AIPersonality.BALANCED
  ): number {
    const opponent = player === Player.WHITE ? Player.BLACK : Player.WHITE;

    // Create a copy of the board and apply the move
    const newBoard = this.applyMoveToBoard(board, move);

    const beforeEval = this.evaluatePosition(board, player, personality);
    const afterEval = this.evaluatePosition(newBoard, player, personality);

    let moveScore = afterEval.score - beforeEval.score;

    // ESCAPE MOVE BONUS: Specifically reward moves that escape opponent's home board
    const opponentHomeBoard = opponent === Player.WHITE ? [18, 19, 20, 21, 22, 23] : [0, 1, 2, 3, 4, 5];
    const isEscapeMove = opponentHomeBoard.includes(move.from) && !opponentHomeBoard.includes(move.to);

    if (isEscapeMove) {
      // Check opponent's bear-off progress to determine urgency
      const opponentCheckers = GameRules.getPlayerCheckers(board, opponent);
      const opponentCheckersOff = opponentCheckers.filter(c => c.position === 25).length;

      let escapeBonus = 5.0; // Base escape bonus

      if (opponentCheckersOff > 8) {
        // Opponent more than half done - CRITICAL escape
        escapeBonus = 15.0;
      } else if (opponentCheckersOff > 4) {
        // Opponent making progress - HIGH priority escape
        escapeBonus = 10.0;
      } else if (opponentCheckersOff > 0) {
        // Opponent starting to bear off - MODERATE priority
        escapeBonus = 7.0;
      }

      moveScore += escapeBonus;
    }

    return moveScore;
  }
  
  private static applyMoveToBoard(board: BoardPosition[], move: Move): BoardPosition[] {
    const newBoard = copyBoard(board);

    const fromPosition = newBoard.find(pos => pos.pointIndex === move.from);
    const toPosition = newBoard.find(pos => pos.pointIndex === move.to);
    
    if (!fromPosition || !toPosition) return newBoard;
    
    // Move checker
    const checkerIndex = fromPosition.checkers.findIndex(c => c.id === move.checkerId);
    if (checkerIndex === -1) return newBoard;
    
    const checker = fromPosition.checkers.splice(checkerIndex, 1)[0];
    checker.position = move.to;
    
    // Handle hitting (simplified)
    if (toPosition.checkers.length === 1 && toPosition.checkers[0].player !== checker.player) {
      const hitChecker = toPosition.checkers.pop()!;
      hitChecker.position = 24; // Move to bar
      const barPosition = newBoard.find(pos => pos.pointIndex === 24);
      if (barPosition) {
        barPosition.checkers.push(hitChecker);
      }
    }
    
    toPosition.checkers.push(checker);
    
    return newBoard;
  }
}