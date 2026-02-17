import { Player, BoardPosition, DoublingCubeState, MatchState } from '../game/types';
import { AIDifficulty, AIPersonality, AISettings } from '../ai/types';
import { GameRules } from '../game/rules';
import { logger } from '../utils/logger';
import {
  isPureRace,
  calculateRaceWinProbability as calculateAdvancedRaceWinProbability
} from './racing'; // Phase 2.5 Priority 4: Advanced racing formulas

/**
 * AI Doubling Cube Strategy
 *
 * Implements doubling decisions based on:
 * - Pip count advantage
 * - Position strength
 * - Match score
 * - Risk tolerance based on AI difficulty
 */

export interface DoublingEvaluation {
  shouldDouble: boolean;
  shouldAccept: boolean;
  winProbability: number;
  pipAdvantage: number;
  reason: string;
}

export class DoublingStrategy {
  /**
   * Evaluate whether AI should offer a double
   * Phase 2.5 Priority 3: Enhanced with personality and gammon awareness
   */
  static shouldOfferDouble(
    board: BoardPosition[],
    player: Player,
    doublingCube: DoublingCubeState,
    matchState?: MatchState,
    aiSettings?: AISettings // Phase 2.5: Full AI settings for personality
  ): boolean {
    const opponent = player === Player.WHITE ? Player.BLACK : Player.WHITE;

    // Calculate win probability
    const evaluation = this.evaluatePosition(board, player);
    const isContactPosition = this.isContactPosition(board, player, opponent);

    // Phase 2.5: Get personality-adjusted risk tolerance
    let riskTolerance: number;
    let gammonAwareness = 0;

    if (aiSettings) {
      riskTolerance = this.getRiskToleranceWithPersonality(aiSettings, isContactPosition);
      gammonAwareness = this.calculateGammonAwareness(board, player, opponent, aiSettings.personality);
    } else {
      // Fallback for backward compatibility
      riskTolerance = 0.5;
    }

    // Apply gammon awareness to win probability
    const adjustedWinProb = evaluation.winProbability + gammonAwareness;

    // Minimum win probability to double (adjusted by risk tolerance)
    const minDoublePoint = 0.65 - (riskTolerance * 0.1); // 0.55 to 0.65
    const maxDoublePoint = 0.85 + (riskTolerance * 0.05); // 0.85 to 0.90

    // Don't double if position isn't strong enough
    if (adjustedWinProb < minDoublePoint) {
      logger.debug(`AI won't double: win prob ${adjustedWinProb.toFixed(2)} < ${minDoublePoint.toFixed(2)}`);
      return false;
    }

    // Don't double if position is too strong (might lose gammon opportunities)
    // Phase 2.5: Aggressive personalities more willing to double even when strong
    const gammonThreshold = aiSettings?.personality === AIPersonality.AGGRESSIVE ? 0.92 : maxDoublePoint;
    if (adjustedWinProb > gammonThreshold && doublingCube.value === 1 && gammonAwareness < 0.05) {
      logger.debug(`AI won't double: position too strong (${adjustedWinProb.toFixed(2)}), save for gammon`);
      return false;
    }

    // Match play considerations
    if (matchState) {
      const myScore = matchState.scores[player];
      const oppScore = matchState.scores[opponent];
      const targetPoints = matchState.configuration.targetPoints;

      // Don't double if I'm close to winning (might win without risk)
      if (myScore >= targetPoints - 2 && evaluation.pipAdvantage > 20) {
        logger.debug(`AI won't double: close to match win with good position`);
        return false;
      }

      // Be more aggressive when trailing
      if (oppScore > myScore + 2) {
        logger.debug(`AI will double: trailing in match, need to be aggressive`);
        return adjustedWinProb > minDoublePoint - 0.1;
      }
    }

    logger.info(`AI offers double: win prob ${adjustedWinProb.toFixed(2)}, pip adv ${evaluation.pipAdvantage}, personality: ${aiSettings?.personality || 'none'}`);
    return true;
  }

  /**
   * Evaluate whether AI should accept a double
   * Phase 2.5 Priority 3: Enhanced with personality and gammon awareness
   */
  static shouldAcceptDouble(
    board: BoardPosition[],
    player: Player,
    doublingCube: DoublingCubeState,
    matchState?: MatchState,
    aiSettings?: AISettings // Phase 2.5: Full AI settings for personality
  ): boolean {
    const opponent = player === Player.WHITE ? Player.BLACK : Player.WHITE;

    const evaluation = this.evaluatePosition(board, player);
    const isContactPosition = this.isContactPosition(board, player, opponent);

    // Phase 2.5: Get personality-adjusted risk tolerance
    let riskTolerance: number;
    let gammonAwareness = 0;

    if (aiSettings) {
      riskTolerance = this.getRiskToleranceWithPersonality(aiSettings, isContactPosition);
      gammonAwareness = this.calculateGammonAwareness(board, player, opponent, aiSettings.personality);
    } else {
      // Fallback for backward compatibility
      riskTolerance = 0.5;
    }

    // Apply gammon awareness to win probability
    const adjustedWinProb = evaluation.winProbability + gammonAwareness;

    // Minimum win probability to accept (take point)
    // Phase 2.5: Adjusted by personality
    const minAcceptPoint = 0.22 + (riskTolerance * 0.03); // 0.22 to 0.25

    // Always decline if position is hopeless
    if (adjustedWinProb < minAcceptPoint) {
      logger.info(`AI declines double: win prob ${adjustedWinProb.toFixed(2)} < ${minAcceptPoint.toFixed(2)}, personality: ${aiSettings?.personality || 'none'}`);
      return false;
    }

    // Phase 2.5: Defensive personalities more worried about gammon losses
    if (aiSettings?.personality === AIPersonality.DEFENSIVE && gammonAwareness < -0.05) {
      logger.debug(`AI (defensive) declines double: significant gammon threat (${gammonAwareness.toFixed(2)})`);
      return adjustedWinProb > 0.28; // Higher threshold when gammon threatened
    }

    // Match play considerations
    if (matchState) {
      const myScore = matchState.scores[player];
      const oppScore = matchState.scores[opponent];
      const targetPoints = matchState.configuration.targetPoints;
      const newValue = doublingCube.value * 2;

      // If accepting would end the match if I lose, be more careful
      if (oppScore + newValue >= targetPoints) {
        logger.debug('AI evaluating double: accepting could end match');
        // Need stronger position to accept
        return adjustedWinProb > 0.30;
      }

      // If I'm close to winning, might accept even slightly bad doubles
      if (myScore >= targetPoints - 3) {
        logger.debug('AI accepts double: close to match win');
        return adjustedWinProb > 0.20;
      }
    }

    logger.info(`AI accepts double: win prob ${adjustedWinProb.toFixed(2)}, personality: ${aiSettings?.personality || 'none'}`);
    return true;
  }

  /**
   * Evaluate position strength and win probability
   */
  private static evaluatePosition(
    board: BoardPosition[],
    player: Player
  ): DoublingEvaluation {
    const opponent = player === Player.WHITE ? Player.BLACK : Player.WHITE;

    // Calculate pip counts
    const myPips = GameRules.calculatePipCount(board, player);
    const oppPips = GameRules.calculatePipCount(board, opponent);
    const pipAdvantage = oppPips - myPips;

    // Detect position type (contact vs. race)
    const isContactPosition = this.isContactPosition(board, player, opponent);

    let winProbability: number;

    if (isContactPosition) {
      // CONTACT POSITION: Use positional evaluation with pip count
      winProbability = this.calculateContactWinProbability(board, player, opponent, pipAdvantage);
    } else {
      // RACING POSITION: Use racing formula (Phase 2.5 Priority 4: now includes board parameter)
      winProbability = this.calculateRaceWinProbability(board, player, opponent, myPips, oppPips, pipAdvantage);
    }

    // Check if opponent is in my home board (backgammon risk)
    const myHomeBoard = player === Player.WHITE ? [18, 19, 20, 21, 22, 23] : [0, 1, 2, 3, 4, 5];
    const oppInMyHome = GameRules.getPlayerCheckers(board, opponent)
      .filter(c => myHomeBoard.includes(c.position) || c.position === 24).length;

    if (oppInMyHome > 0 && !isContactPosition) {
      winProbability += 0.05 * oppInMyHome; // Bonus for potential gammon/backgammon
    }

    // Clamp probability between 0.01 and 0.99
    winProbability = Math.max(0.01, Math.min(0.99, winProbability));

    const positionType = isContactPosition ? 'Contact' : 'Race';
    return {
      shouldDouble: false, // Determined by caller
      shouldAccept: false, // Determined by caller
      winProbability,
      pipAdvantage,
      reason: `${positionType} - Pip adv: ${pipAdvantage}, Win prob: ${(winProbability * 100).toFixed(1)}%`
    };
  }

  /**
   * Detect if position is contact (pieces can still hit) or pure race
   */
  private static isContactPosition(board: BoardPosition[], player: Player, opponent: Player): boolean {
    const playerCheckers = GameRules.getPlayerCheckers(board, player);
    const opponentCheckers = GameRules.getPlayerCheckers(board, opponent);

    // Find the furthest back checker for each player
    const playerFurthestBack = player === Player.WHITE
      ? Math.min(...playerCheckers.filter(c => c.position !== 25).map(c => c.position))
      : Math.max(...playerCheckers.filter(c => c.position !== 25).map(c => c.position));

    const opponentFurthestBack = opponent === Player.WHITE
      ? Math.min(...opponentCheckers.filter(c => c.position !== 25).map(c => c.position))
      : Math.max(...opponentCheckers.filter(c => c.position !== 25).map(c => c.position));

    // Contact position if pieces can still pass each other
    if (player === Player.WHITE) {
      return playerFurthestBack < opponentFurthestBack;
    } else {
      return playerFurthestBack > opponentFurthestBack;
    }
  }

  /**
   * Calculate win probability for contact positions
   * Uses pip count plus positional factors
   */
  private static calculateContactWinProbability(
    board: BoardPosition[],
    player: Player,
    opponent: Player,
    pipAdvantage: number
  ): number {
    // Base probability on pip advantage (contact positions less predictable than races)
    let winProbability = 0.50 + (pipAdvantage * 0.008); // Reduced from 0.01

    // Count borne off checkers
    const myCheckersOff = GameRules.getPlayerCheckers(board, player)
      .filter(c => c.position === 25).length;
    const oppCheckersOff = GameRules.getPlayerCheckers(board, opponent)
      .filter(c => c.position === 25).length;

    winProbability += (myCheckersOff - oppCheckersOff) * 0.025;

    // Check for blots (vulnerable checkers)
    const myBlots = this.countBlots(board, player);
    const oppBlots = this.countBlots(board, opponent);
    winProbability -= myBlots * 0.02;
    winProbability += oppBlots * 0.02;

    return winProbability;
  }

  /**
   * Calculate win probability for racing positions
   * Phase 2.5 Priority 4: Now uses advanced racing formulas (Keith Count, wastage) for pure races
   * Falls back to Ward's Count for non-pure races
   */
  private static calculateRaceWinProbability(
    board: BoardPosition[],
    player: Player,
    opponent: Player,
    myPips: number,
    oppPips: number,
    pipAdvantage: number
  ): number {
    // Phase 2.5 Priority 4: Use advanced racing formulas for pure races
    const isPure = isPureRace(board, player, opponent);

    if (isPure) {
      // Pure race - use Keith Count with wastage adjustment
      const raceEval = calculateAdvancedRaceWinProbability(board, player, opponent);
      logger.debug(`Advanced race formula: WP=${(raceEval.winProbability * 100).toFixed(1)}%, Keith Count=${raceEval.effectivePipCount.toFixed(1)}, Wastage=${raceEval.wastage.toFixed(1)}`);
      return raceEval.winProbability;
    }

    // Not a pure race yet - use simpler Ward's Count approximation
    const effectivePips = (myPips + oppPips) / 2;
    const K = 0.5; // Scaling factor

    let winProbability = 0.50 + (pipAdvantage / effectivePips) * K;

    // Adjust for very close races (variance matters more)
    if (Math.abs(pipAdvantage) < 3) {
      winProbability = 0.50 + (pipAdvantage * 0.005);
    }

    return winProbability;
  }

  /**
   * Count blots (single checkers) for a player
   */
  private static countBlots(board: BoardPosition[], player: Player): number {
    return board.filter(pos =>
      pos.checkers.length === 1 && pos.checkers[0].player === player
    ).length;
  }

  /**
   * Get AI's risk tolerance based on difficulty level
   * Higher difficulties are more aggressive with the doubling cube
   */
  static getRiskToleranceForAI(difficulty: AIDifficulty): number {
    // Map AI difficulty to risk tolerance (0 = conservative, 1 = aggressive)
    switch (difficulty) {
      case AIDifficulty.BEGINNER:
        return 0.3; // Very conservative - avoids doubling
      case AIDifficulty.EASY:
        return 0.4; // Conservative - doubles only with clear advantage
      case AIDifficulty.MEDIUM:
        return 0.5; // Balanced - standard doubling strategy
      case AIDifficulty.HARD:
        return 0.6; // Slightly aggressive - pushes edges
      case AIDifficulty.EXPERT:
        return 0.7; // Aggressive - uses cube as weapon
      default:
        return 0.5; // Fallback to balanced
    }
  }

  /**
   * Phase 2.5 Priority 3: Get personality-adjusted risk tolerance
   * Combines difficulty and personality for nuanced cube decisions
   * @param aiSettings AI configuration including difficulty and personality
   * @param isContactPosition Whether position has contact (affects tactical personality)
   * @returns Risk tolerance factor (0 = very conservative, 1 = very aggressive)
   */
  static getRiskToleranceWithPersonality(
    aiSettings: AISettings,
    isContactPosition: boolean = true
  ): number {
    // Start with base difficulty risk tolerance
    const baseRisk = this.getRiskToleranceForAI(aiSettings.difficulty);

    // Apply personality modifiers
    let personalityModifier = 0;

    switch (aiSettings.personality) {
      case AIPersonality.AGGRESSIVE:
        // Always more willing to double and accept
        personalityModifier = 0.15;
        break;

      case AIPersonality.DEFENSIVE:
        // More conservative with cube, drops more often
        personalityModifier = -0.15;
        break;

      case AIPersonality.TACTICAL:
        // Aggressive in contact positions, conservative in races
        personalityModifier = isContactPosition ? 0.10 : -0.10;
        break;

      case AIPersonality.BALANCED:
      default:
        // No modifier - uses standard thresholds
        personalityModifier = 0;
        break;
    }

    // Clamp to valid range [0.2, 0.9]
    return Math.max(0.2, Math.min(0.9, baseRisk + personalityModifier));
  }

  /**
   * Phase 2.5 Priority 3: Calculate gammon value awareness
   * Adjusts cube decisions based on gammon potential
   * @param board Current board position
   * @param player Player to evaluate
   * @param opponent Opponent player
   * @param personality AI personality affecting gammon awareness
   * @returns Gammon awareness factor (-0.1 to 0.1 adjustment to win probability)
   */
  static calculateGammonAwareness(
    board: BoardPosition[],
    player: Player,
    opponent: Player,
    personality: AIPersonality
  ): number {
    // Count borne off checkers
    const myCheckersOff = GameRules.getPlayerCheckers(board, player)
      .filter(c => c.position === 25).length;
    const oppCheckersOff = GameRules.getPlayerCheckers(board, opponent)
      .filter(c => c.position === 25).length;

    // Find opponent's checkers (excluding bar and borne off)
    const oppCheckers = GameRules.getPlayerCheckers(board, opponent)
      .filter(c => c.position !== 25 && c.position !== 24);

    if (oppCheckers.length === 0) return 0;

    // Opponent's home board range
    const oppHomeBoard = opponent === Player.WHITE ? [18, 19, 20, 21, 22, 23] : [0, 1, 2, 3, 4, 5];
    const oppInHomeBoard = oppCheckers.filter(c => oppHomeBoard.includes(c.position)).length;

    let gammonValue = 0;

    // I'm ahead and opponent hasn't borne off any checkers - potential gammon
    if (myCheckersOff > 0 && oppCheckersOff === 0) {
      // Opponent has checkers outside home board - good gammon chance
      if (oppInHomeBoard < oppCheckers.length) {
        gammonValue = 0.08; // Significant gammon potential
      } else {
        gammonValue = 0.03; // Moderate gammon potential
      }
    }

    // Opponent ahead, I might get gammoned - be defensive
    if (oppCheckersOff > 5 && myCheckersOff === 0) {
      gammonValue = -0.08; // Gammon threat - more conservative
    }

    // Personality adjustments to gammon awareness
    switch (personality) {
      case AIPersonality.AGGRESSIVE:
        // Aggressive personalities push gammons harder
        if (gammonValue > 0) gammonValue *= 1.3;
        if (gammonValue < 0) gammonValue *= 0.7; // Less worried about being gammoned
        break;

      case AIPersonality.DEFENSIVE:
        // Defensive personalities worry more about being gammoned
        if (gammonValue > 0) gammonValue *= 0.7; // Less greedy for gammons
        if (gammonValue < 0) gammonValue *= 1.3; // More worried about getting gammoned
        break;

      case AIPersonality.TACTICAL:
        // Tactical personalities accurately assess gammon situations
        // (no adjustment - uses base calculation)
        break;

      case AIPersonality.BALANCED:
      default:
        // Standard gammon awareness (no adjustment)
        break;
    }

    // Clamp to reasonable range
    return Math.max(-0.1, Math.min(0.1, gammonValue));
  }
}
