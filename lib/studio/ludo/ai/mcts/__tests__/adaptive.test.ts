/**
 * Adaptive MCTS System Tests
 *
 * Validates that the adaptive system correctly calculates rollout counts
 * based on position complexity and time budgets.
 */

import { AdaptiveMCTSEvaluator } from '../adaptive';
import { AIDifficulty } from '@/lib/studio/ludo/ai/types';
import type { PositionComplexity } from '@/lib/studio/ludo/ai/speed';

// Helper function to create complexity objects
const createComplexity = (overrides: Partial<PositionComplexity> = {}): PositionComplexity => ({
  isForcedMove: false,
  isOpeningMove: false,
  isContactPosition: false,
  isBearOffWithContact: false,
  isCubeDecision: false,
  isMatchCritical: false,
  moveCount: 5,
  ...overrides
});

describe('AdaptiveMCTSEvaluator', () => {
  let evaluator: AdaptiveMCTSEvaluator;

  beforeEach(() => {
    evaluator = new AdaptiveMCTSEvaluator();
  });

  describe('Rollout Count Calculation', () => {
    it('should return 0 rollouts for forced moves', () => {
      const complexity = createComplexity({ isForcedMove: true });
      const rollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, complexity, 1000);

      expect(rollouts).toBe(0);
    });

    it('should return 0 rollouts for opening moves', () => {
      const complexity = createComplexity({ isOpeningMove: true });
      const rollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, complexity, 1000);

      expect(rollouts).toBe(0);
    });

    it('should return 0 rollouts when only one move available', () => {
      const complexity = createComplexity({ moveCount: 1 });
      const rollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, complexity, 1000);

      expect(rollouts).toBe(0);
    });

    it('should calculate appropriate rollouts for routine moves', () => {
      const complexity = createComplexity();
      const rollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, complexity, 700);

      expect(rollouts).toBeGreaterThan(0);
      expect(rollouts).toBeLessThanOrEqual(500); // Max for routine
    });

    it('should increase rollouts for contact positions', () => {
      const routineComplexity = createComplexity();
      const contactComplexity = createComplexity({ isContactPosition: true });

      const routineRollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, routineComplexity, 1200);
      const contactRollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, contactComplexity, 1200);

      expect(contactRollouts).toBeGreaterThan(routineRollouts);
      expect(contactRollouts).toBeLessThanOrEqual(1000); // Max for contact
    });

    it('should increase rollouts for bearoff with contact', () => {
      const routineComplexity = createComplexity();
      const bearoffComplexity = createComplexity({ isBearOffWithContact: true });

      const routineRollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, routineComplexity, 1500);
      const bearoffRollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, bearoffComplexity, 1500);

      expect(bearoffRollouts).toBeGreaterThan(routineRollouts);
      expect(bearoffRollouts).toBeLessThanOrEqual(1500); // Max for bearoff+contact
    });

    it('should maximize rollouts for cube decisions', () => {
      const routineComplexity = createComplexity();
      const cubeComplexity = createComplexity({ isCubeDecision: true });

      const routineRollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, routineComplexity, 2000);
      const cubeRollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, cubeComplexity, 2000);

      expect(cubeRollouts).toBeGreaterThan(routineRollouts);
      expect(cubeRollouts).toBeLessThanOrEqual(2000); // Max for cube
    });

    it('should respect time budget constraints', () => {
      const complexity = createComplexity();

      // With very short time budget, should limit rollouts
      const shortBudgetRollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, complexity, 50);

      // Should not exceed what's physically possible in 50ms
      expect(shortBudgetRollouts).toBeLessThan(500);
    });

    it('should scale differently for Hard vs Expert difficulty', () => {
      const complexity = createComplexity({ isContactPosition: true });

      const hardRollouts = evaluator.calculateRolloutCount(AIDifficulty.HARD, complexity, 1500);
      const expertRollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, complexity, 1500);

      // Expert should generally use more rollouts for same position
      expect(expertRollouts).toBeGreaterThan(hardRollouts);
    });
  });

  describe('Performance Tracking', () => {
    it('should initialize with optimal performance assumption', () => {
      const performance = evaluator.getCurrentPerformance();
      expect(performance).toBe(10000); // Initial assumption
    });

    it('should update performance based on measurements', () => {
      evaluator.updatePerformance(8000);
      expect(evaluator.getCurrentPerformance()).toBe(8000);

      evaluator.updatePerformance(12000);
      // Should be average of 8000 and 12000
      expect(evaluator.getCurrentPerformance()).toBe(10000);
    });

    it('should calculate rolling average over samples', () => {
      const samples = [8000, 9000, 10000, 11000, 12000];

      samples.forEach(sample => evaluator.updatePerformance(sample));

      const avgPerformance = evaluator.getCurrentPerformance();
      const expectedAvg = samples.reduce((a, b) => a + b, 0) / samples.length;

      expect(avgPerformance).toBe(expectedAvg);
    });

    it('should enable MCTS when performance meets threshold', () => {
      evaluator.updatePerformance(10000);
      expect(evaluator.shouldEnableMCTS()).toBe(true);
    });

    it('should disable MCTS when performance below threshold', () => {
      evaluator.updatePerformance(3000);
      expect(evaluator.shouldEnableMCTS()).toBe(false);
    });

    it('should reset performance history', () => {
      evaluator.updatePerformance(5000);
      evaluator.updatePerformance(6000);

      evaluator.resetPerformance();

      // Should return to initial optimal assumption
      expect(evaluator.getCurrentPerformance()).toBe(10000);
    });
  });

  describe('MCTS Config Creation', () => {
    it('should create valid MCTS config', () => {
      const config = evaluator.createMCTSConfig(500, 1000);

      expect(config.simulationCount).toBe(500);
      expect(config.timeLimit).toBe(1000);
      expect(config.rolloutPolicy).toBe('heuristic');
      expect(config.explorationConstant).toBeCloseTo(Math.sqrt(2), 2);
    });

    it('should use heuristic policy by default', () => {
      const config = evaluator.createMCTSConfig(100, 500);

      expect(config.rolloutPolicy).toBe('heuristic');
    });

    it('should use standard UCB1 exploration constant', () => {
      const config = evaluator.createMCTSConfig(100, 500);

      // √2 ≈ 1.414
      expect(config.explorationConstant).toBeGreaterThan(1.4);
      expect(config.explorationConstant).toBeLessThan(1.5);
    });
  });

  describe('Configuration Management', () => {
    it('should return current configuration', () => {
      const config = evaluator.getConfig();

      expect(config.maxRolloutsByType).toBeDefined();
      expect(config.baseRolloutsByDifficulty).toBeDefined();
      expect(config.performance).toBeDefined();
      expect(config.timeBudget).toBeDefined();
    });

    it('should allow configuration updates', () => {
      const originalConfig = evaluator.getConfig();

      evaluator.updateConfig({
        baseRolloutsByDifficulty: {
          hard: 150,
          expert: 400
        }
      });

      const updatedConfig = evaluator.getConfig();

      expect(updatedConfig.baseRolloutsByDifficulty.hard).toBe(150);
      expect(updatedConfig.baseRolloutsByDifficulty.expert).toBe(400);
      // Other config should remain unchanged
      expect(updatedConfig.maxRolloutsByType).toEqual(originalConfig.maxRolloutsByType);
    });
  });

  describe('Time Budget Integration', () => {
    it('should allocate 80% of time budget to MCTS', () => {
      const complexity = createComplexity();
      const timeBudget = 1000;

      const rollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, complexity, timeBudget);

      // With 10,000 games/sec (0.1ms per game), 80% of 1000ms = 800ms = 8000 rollouts max
      // But will be capped by position type max (500 for routine)
      expect(rollouts).toBeLessThanOrEqual(500);
    });

    it('should never exceed time budget even with high rollout targets', () => {
      const complexity = createComplexity({ isCubeDecision: true });

      // Very short time budget
      const rollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, complexity, 100);

      // With 10,000 games/sec, 80% of 100ms = 80ms = 800 rollouts max
      expect(rollouts).toBeLessThanOrEqual(800);
    });
  });

  describe('Phase 2.9 Integration', () => {
    it('should preserve fast paths for forced moves', () => {
      const forcedComplexity = createComplexity({ isForcedMove: true });

      // Even with long time budget, forced moves should skip MCTS
      const rollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, forcedComplexity, 2000);

      expect(rollouts).toBe(0);
    });

    it('should preserve fast paths for opening moves', () => {
      const openingComplexity = createComplexity({ isOpeningMove: true });

      // Opening moves should use opening book, not MCTS
      const rollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, openingComplexity, 2000);

      expect(rollouts).toBe(0);
    });

    it('should scale appropriately for Expert AI routine moves (300-1000ms budget)', () => {
      const routineComplexity = createComplexity();

      // Expert AI routine move: 300-1000ms
      const minRollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, routineComplexity, 300);
      const maxRollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, routineComplexity, 1000);

      // Should get some rollouts but not exceed routine max
      expect(minRollouts).toBeGreaterThan(0);
      expect(minRollouts).toBeLessThanOrEqual(500);
      expect(maxRollouts).toBeGreaterThanOrEqual(minRollouts);
      expect(maxRollouts).toBeLessThanOrEqual(500);
    });

    it('should scale appropriately for Expert AI complex positions', () => {
      const complexComplexity = createComplexity({ isContactPosition: true });

      // Expert AI contact position: longer budget
      const rollouts = evaluator.calculateRolloutCount(AIDifficulty.EXPERT, complexComplexity, 1800);

      // Should use more rollouts for complex positions
      // Contact positions get 1.3x multiplier on base (300 * 1.3 = 390)
      expect(rollouts).toBeGreaterThanOrEqual(390); // Contact scaled rollouts
      expect(rollouts).toBeLessThanOrEqual(1000); // Max for contact
    });
  });
});
