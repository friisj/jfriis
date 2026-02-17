import {
  calculateKeithCount,
  calculateWastage,
  calculateCrossovers,
  calculateRaceWinProbability,
  calculateRaceEquity,
  isPureRace,
  getRacingStrategy
} from '../racing';
import { Player } from '../../game/types';
import { createTestBoard } from '../../game/__tests__/testUtils';

/**
 * Tests for Advanced Racing Formulas - Phase 2.5 Priority 4
 * Covers Keith Count, wastage, Thorp's formula, and race evaluation
 */

describe('Racing Evaluation - Phase 2.5', () => {
  describe('Keith Count and Wastage', () => {
    it('should calculate Keith Count with wastage for stacked checkers', () => {
      const board = createTestBoard({
        white: { 18: 6, 19: 4, 20: 3, 21: 2 }, // Stacked distribution in home
        black: { 0: 5, 1: 5, 2: 5 }
      });

      const keithCount = calculateKeithCount(board, Player.WHITE);
      const wastage = calculateWastage(board, Player.WHITE);

      // Wastage should be > 0 due to 6-checker stack
      expect(wastage).toBeGreaterThan(0);

      // Keith Count = pip count + wastage
      expect(keithCount).toBeGreaterThan(wastage);
    });

    it('should calculate minimal wastage for even distribution', () => {
      const board = createTestBoard({
        white: { 18: 3, 19: 3, 20: 3, 21: 3, 22: 3 }, // Even distribution
        black: { 0: 5, 1: 5, 2: 5 }
      });

      const wastage = calculateWastage(board, Player.WHITE);

      // Even distribution should have low wastage
      expect(wastage).toBeLessThan(1.0);
    });

    it('should not calculate wastage when not in bearing off stage', () => {
      const board = createTestBoard({
        white: { 10: 5, 11: 5, 12: 5 }, // Not in home board
        black: { 0: 5, 1: 5, 2: 5 }
      });

      const wastage = calculateWastage(board, Player.WHITE);

      // No wastage when not bearing off
      expect(wastage).toBe(0);
    });
  });

  describe('Crossovers Calculation', () => {
    it('should calculate expected crossovers for bearing off position', () => {
      const board = createTestBoard({
        white: { 20: 5, 21: 5, 22: 5 },
        black: { 3: 5, 2: 5, 1: 5 }
      });

      const crossovers = calculateCrossovers(board, Player.WHITE);

      // Should be reasonable number of rolls needed
      expect(crossovers).toBeGreaterThan(0);
      expect(crossovers).toBeLessThan(10); // Shouldn't be too many for this position
    });
  });

  describe('Race Win Probability - Thorp\'s Formula', () => {
    it('should calculate win probability favoring player ahead in race', () => {
      const board = createTestBoard({
        white: { 22: 5, 23: 5, [25]: 5 }, // White ahead (~25 pips)
        black: { 3: 5, 2: 5, 1: 5 } // Black behind (~45 pips)
      });

      const raceEval = calculateRaceWinProbability(board, Player.WHITE, Player.BLACK);

      // White should be favored
      expect(raceEval.winProbability).toBeGreaterThan(0.50);
      expect(raceEval.pipCount).toBeLessThan(100);
      expect(raceEval.crossovers).toBeGreaterThan(0);
    });

    it('should calculate ~50% probability for even race', () => {
      const board = createTestBoard({
        white: { 20: 5, 21: 5, 22: 5 },
        black: { 3: 5, 2: 5, 1: 5 }
      });

      const raceEval = calculateRaceWinProbability(board, Player.WHITE, Player.BLACK);

      // Should be close to even
      expect(raceEval.winProbability).toBeGreaterThan(0.40);
      expect(raceEval.winProbability).toBeLessThan(0.60);
    });

    it('should clamp probabilities to valid range', () => {
      const board = createTestBoard({
        white: { [25]: 14, 23: 1 }, // White almost won
        black: { 0: 5, 1: 5, 2: 5 } // Black far behind
      });

      const raceEval = calculateRaceWinProbability(board, Player.WHITE, Player.BLACK);

      // Should be high probability but clamped below 1.0
      expect(raceEval.winProbability).toBeGreaterThan(0.70);
      expect(raceEval.winProbability).toBeLessThan(1.0);
    });
  });

  describe('Race Equity', () => {
    it('should calculate positive equity when winning race', () => {
      const board = createTestBoard({
        white: { 22: 5, 23: 5, [25]: 5 },
        black: { 3: 5, 2: 5, 1: 5 }
      });

      const equity = calculateRaceEquity(board, Player.WHITE, Player.BLACK);

      // Positive equity when ahead
      expect(equity).toBeGreaterThan(0);
    });

    it('should scale equity with cube value', () => {
      const board = createTestBoard({
        white: { 22: 5, 23: 5, [25]: 5 },
        black: { 3: 5, 2: 5, 1: 5 }
      });

      const equity1 = calculateRaceEquity(board, Player.WHITE, Player.BLACK, 1);
      const equity2 = calculateRaceEquity(board, Player.WHITE, Player.BLACK, 2);

      // Double cube should double equity
      expect(equity2).toBeCloseTo(equity1 * 2, 1);
    });
  });

  describe('Pure Race Detection', () => {
    it('should detect pure race when checkers have passed', () => {
      const board = createTestBoard({
        white: { 20: 5, 21: 5, 22: 5 }, // White ahead
        black: { 3: 5, 2: 5, 1: 5 } // Black behind
      });

      const isPure = isPureRace(board, Player.WHITE, Player.BLACK);

      // This is a pure race - no contact possible
      expect(isPure).toBe(true);
    });

    it('should detect contact position when checkers can hit', () => {
      const board = createTestBoard({
        white: { 5: 2, 13: 5, 18: 8 },
        black: { 18: 2, 12: 5, 5: 8 }
      });

      const isPure = isPureRace(board, Player.WHITE, Player.BLACK);

      // This is contact - checkers overlapping
      expect(isPure).toBe(false);
    });
  });

  describe('Racing Strategy Recommendations', () => {
    it('should recommend strategy for pure race', () => {
      const board = createTestBoard({
        white: { 20: 5, 21: 5, 22: 5 },
        black: { 3: 5, 2: 5, 1: 5 }
      });

      const strategy = getRacingStrategy(board, Player.WHITE, Player.BLACK);

      expect(strategy.type).toBe('pure_race');
      expect(strategy.recommendation).toBeDefined();
      expect(strategy.winProbability).toBeDefined();
      expect(strategy.crossoverDifference).toBeDefined();
    });

    it('should recommend positional evaluation for contact', () => {
      const board = createTestBoard({
        white: { 5: 2, 13: 5, 18: 8 },
        black: { 18: 2, 12: 5, 5: 8 }
      });

      const strategy = getRacingStrategy(board, Player.WHITE, Player.BLACK);

      expect(strategy.type).toBe('contact');
      expect(strategy.recommendation).toContain('positional evaluation');
    });

    it('should provide different recommendations based on win probability', () => {
      // Strong favorite
      const strongBoard = createTestBoard({
        white: { [25]: 12, 22: 3 },
        black: { 0: 5, 1: 5, 2: 5 }
      });

      // Close race
      const closeBoard = createTestBoard({
        white: { 20: 5, 21: 5, 22: 5 },
        black: { 3: 5, 2: 5, 1: 5 }
      });

      const strongStrategy = getRacingStrategy(strongBoard, Player.WHITE, Player.BLACK);
      const closeStrategy = getRacingStrategy(closeBoard, Player.WHITE, Player.BLACK);

      // Recommendations should differ
      expect(strongStrategy.recommendation).not.toBe(closeStrategy.recommendation);
      expect(strongStrategy.winProbability).toBeGreaterThan(closeStrategy.winProbability!);
    });
  });
});
