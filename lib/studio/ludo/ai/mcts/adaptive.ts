/**
 * Adaptive MCTS System
 *
 * Dynamically adjusts rollout count based on:
 * - Position complexity (from Phase 2.9 speed system)
 * - Available time budget
 * - Device performance
 *
 * Preserves Phase 2.9 UX by running MCTS within existing thinking time budgets
 */

import { AIDifficulty } from '../types';
import { PositionComplexity } from '../speed';
import { MCTSConfig } from './core';
import { logger } from '@/lib/studio/ludo/utils/logger';

/**
 * Dynamic MCTS configuration based on position and performance
 */
export interface AdaptiveMCTSConfig {
  /** Maximum rollouts by position type */
  maxRolloutsByType: {
    forcedMove: number;
    openingMove: number;
    routineMove: number;
    contactMove: number;
    bearoffWithContact: number;
    cubeDecision: number;
  };

  /** Base rollout counts by difficulty */
  baseRolloutsByDifficulty: {
    hard: number;
    expert: number;
  };

  /** Performance thresholds */
  performance: {
    targetGamesPerSecond: number;     // 10,000 target
    minimumGamesPerSecond: number;    // 5,000 minimum to enable
    measurementSampleSize: number;    // Samples for rolling average
  };

  /** Time budget allocation */
  timeBudget: {
    mctsPercent: number;              // 80% for MCTS
    rulesPercent: number;             // 20% for rules + overhead
  };
}

/**
 * Default adaptive configuration
 */
export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveMCTSConfig = {
  maxRolloutsByType: {
    forcedMove: 0,           // Skip MCTS entirely
    openingMove: 0,          // Use opening book instead
    routineMove: 500,        // Quick evaluation
    contactMove: 1000,       // Full evaluation
    bearoffWithContact: 1500, // Complex endgame
    cubeDecision: 2000       // Maximum analysis
  },

  baseRolloutsByDifficulty: {
    hard: 80,     // Conservative base
    expert: 300   // Higher base
  },

  performance: {
    targetGamesPerSecond: 10000,
    minimumGamesPerSecond: 5000,
    measurementSampleSize: 100
  },

  timeBudget: {
    mctsPercent: 0.8,
    rulesPercent: 0.2
  }
};

/**
 * Adaptive MCTS Evaluator
 * Calculates optimal rollout count based on context
 */
export class AdaptiveMCTSEvaluator {
  private config: AdaptiveMCTSConfig;
  private performanceHistory: number[] = [];
  private currentPerformance = 10000; // Assume good performance initially

  constructor(config: Partial<AdaptiveMCTSConfig> = {}) {
    this.config = { ...DEFAULT_ADAPTIVE_CONFIG, ...config };
  }

  /**
   * Calculate appropriate rollout count for a position
   * Returns 0 if MCTS should be skipped for this position
   */
  calculateRolloutCount(
    difficulty: AIDifficulty,
    complexity: PositionComplexity,
    timeBudgetMs: number
  ): number {
    // Skip MCTS for positions where it adds no value
    if (this.shouldSkipMCTS(complexity)) {
      return 0;
    }

    // Calculate time available for MCTS
    const mctsTimeMs = timeBudgetMs * this.config.timeBudget.mctsPercent;

    // Calculate maximum rollouts that fit in time budget
    const msPerRollout = 1000 / this.currentPerformance; // e.g., 0.1ms at 10k games/sec
    const maxRolloutsInBudget = Math.floor(mctsTimeMs / msPerRollout);

    // Calculate position-based target rollouts
    let targetRollouts = this.getBaseRollouts(difficulty);

    // Scale based on position complexity
    const complexityMultiplier = this.getComplexityMultiplier(complexity);
    targetRollouts = Math.floor(targetRollouts * complexityMultiplier);

    // Get maximum allowed for this position type
    const maxByType = this.getMaxRolloutsByType(complexity);

    // Return minimum of: target, time budget limit, and position type max
    const actualRollouts = Math.min(targetRollouts, maxRolloutsInBudget, maxByType);

    logger.debug(
      `Adaptive MCTS: difficulty=${difficulty}, complexity=${this.getComplexityType(complexity)}, ` +
      `time=${timeBudgetMs}ms, mctsTime=${mctsTimeMs.toFixed(0)}ms, ` +
      `target=${targetRollouts}, budget=${maxRolloutsInBudget}, max=${maxByType}, ` +
      `actual=${actualRollouts}`
    );

    return Math.max(0, actualRollouts);
  }

  /**
   * Determine if MCTS should be skipped for this position
   */
  private shouldSkipMCTS(complexity: PositionComplexity): boolean {
    // Skip forced moves - no decision to make
    if (complexity.isForcedMove) {
      logger.debug('Skipping MCTS: forced move');
      return true;
    }

    // Skip opening moves - opening book is better
    if (complexity.isOpeningMove) {
      logger.debug('Skipping MCTS: opening move (use book)');
      return true;
    }

    // Skip if only one legal move
    if (complexity.moveCount === 1) {
      logger.debug('Skipping MCTS: only one move available');
      return true;
    }

    return false;
  }

  /**
   * Get base rollout count for difficulty level
   */
  private getBaseRollouts(difficulty: AIDifficulty): number {
    switch (difficulty) {
      case AIDifficulty.HARD:
        return this.config.baseRolloutsByDifficulty.hard;
      case AIDifficulty.EXPERT:
        return this.config.baseRolloutsByDifficulty.expert;
      default:
        return 0; // Beginner/Easy/Medium don't use MCTS
    }
  }

  /**
   * Get complexity multiplier for scaling rollouts
   */
  private getComplexityMultiplier(complexity: PositionComplexity): number {
    let multiplier = 1.0;

    // Cube decisions need most analysis
    if (complexity.isCubeDecision) {
      multiplier *= 2.0;
    }
    // Bearoff with contact is complex
    else if (complexity.isBearOffWithContact) {
      multiplier *= 1.5;
    }
    // Contact positions need more analysis
    else if (complexity.isContactPosition) {
      multiplier *= 1.3;
    }
    // Routine moves use base multiplier
    else {
      multiplier *= 1.0;
    }

    return multiplier;
  }

  /**
   * Get maximum rollouts allowed for position type
   */
  private getMaxRolloutsByType(complexity: PositionComplexity): number {
    if (complexity.isForcedMove) {
      return this.config.maxRolloutsByType.forcedMove;
    }

    if (complexity.isOpeningMove) {
      return this.config.maxRolloutsByType.openingMove;
    }

    if (complexity.isCubeDecision) {
      return this.config.maxRolloutsByType.cubeDecision;
    }

    if (complexity.isBearOffWithContact) {
      return this.config.maxRolloutsByType.bearoffWithContact;
    }

    if (complexity.isContactPosition) {
      return this.config.maxRolloutsByType.contactMove;
    }

    // Routine move
    return this.config.maxRolloutsByType.routineMove;
  }

  /**
   * Get human-readable complexity type for logging
   */
  private getComplexityType(complexity: PositionComplexity): string {
    if (complexity.isForcedMove) return 'forced';
    if (complexity.isOpeningMove) return 'opening';
    if (complexity.isCubeDecision) return 'cube';
    if (complexity.isBearOffWithContact) return 'bearoff+contact';
    if (complexity.isContactPosition) return 'contact';
    return 'routine';
  }

  /**
   * Create MCTS config for this evaluation
   */
  createMCTSConfig(
    rolloutCount: number,
    timeLimit: number
  ): Partial<MCTSConfig> {
    return {
      simulationCount: rolloutCount,
      timeLimit: Math.floor(timeLimit),
      rolloutPolicy: 'heuristic', // Use heuristic for better quality
      explorationConstant: Math.sqrt(2) // Standard UCB1 constant
    };
  }

  /**
   * Update performance measurement
   * Call after each rollout to track actual performance
   */
  updatePerformance(gamesPerSecond: number): void {
    this.performanceHistory.push(gamesPerSecond);

    // Keep only recent samples
    const maxSamples = this.config.performance.measurementSampleSize;
    if (this.performanceHistory.length > maxSamples) {
      this.performanceHistory.shift();
    }

    // Calculate rolling average
    const sum = this.performanceHistory.reduce((a, b) => a + b, 0);
    this.currentPerformance = sum / this.performanceHistory.length;

    logger.debug(
      `MCTS Performance: ${gamesPerSecond.toFixed(0)} games/sec ` +
      `(avg: ${this.currentPerformance.toFixed(0)} over ${this.performanceHistory.length} samples)`
    );
  }

  /**
   * Check if MCTS should be enabled based on performance
   */
  shouldEnableMCTS(): boolean {
    const meetsMinimum = this.currentPerformance >= this.config.performance.minimumGamesPerSecond;

    if (!meetsMinimum) {
      logger.warn(
        `MCTS disabled: performance ${this.currentPerformance.toFixed(0)} < ` +
        `${this.config.performance.minimumGamesPerSecond} required`
      );
    }

    return meetsMinimum;
  }

  /**
   * Get current performance (games per second)
   */
  getCurrentPerformance(): number {
    return this.currentPerformance;
  }

  /**
   * Get configuration
   */
  getConfig(): AdaptiveMCTSConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AdaptiveMCTSConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Reset performance history
   */
  resetPerformance(): void {
    this.performanceHistory = [];
    this.currentPerformance = this.config.performance.targetGamesPerSecond;
  }
}

/**
 * Global adaptive MCTS evaluator instance
 * Shared across all AI instances to track performance
 */
export const adaptiveMCTS = new AdaptiveMCTSEvaluator();
