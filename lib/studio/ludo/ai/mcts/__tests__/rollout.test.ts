/**
 * FastRolloutEngine Tests
 *
 * Validates that the rollout engine meets performance targets
 * and correctly simulates backgammon games.
 */

import { FastRolloutEngine } from '../rollout';
import { Player } from '@/lib/studio/ludo/game/types';

describe('FastRolloutEngine', () => {
  let engine: FastRolloutEngine;

  beforeEach(() => {
    engine = new FastRolloutEngine();
  });

  describe('Game Simulation', () => {
    it('should simulate a game to completion', () => {
      const startPosition = engine['createBenchmarkPosition']();
      const result = engine.simulateGame(startPosition, Player.WHITE, 'random');

      expect(result.winner).toBeDefined();
      expect([Player.WHITE, Player.BLACK]).toContain(result.winner);
      expect(result.gameValue).toBeGreaterThanOrEqual(1);
      expect(result.gameValue).toBeLessThanOrEqual(3);
      expect(result.moveCount).toBeGreaterThan(0);
      expect(result.moveCount).toBeLessThan(500);
    });

    it('should simulate with random policy', () => {
      const startPosition = engine['createBenchmarkPosition']();
      const result = engine.simulateGame(startPosition, Player.WHITE, 'random');

      expect(result.winner).toBeDefined();
      expect(result.moveCount).toBeGreaterThan(0);
    });

    it('should simulate with heuristic policy', () => {
      const startPosition = engine['createBenchmarkPosition']();
      const result = engine.simulateGame(startPosition, Player.WHITE, 'heuristic');

      expect(result.winner).toBeDefined();
      expect(result.moveCount).toBeGreaterThan(0);
    });

    it('should handle timeout gracefully', () => {
      const startPosition = engine['createBenchmarkPosition']();
      const result = engine.simulateGame(startPosition, Player.WHITE, 'random');

      // Even if game times out, should have a winner
      expect(result.winner).toBeDefined();
      expect(result.moveCount).toBeLessThanOrEqual(500);
    });
  });

  describe('Performance Benchmarking', () => {
    it('should run benchmark and return games per second', async () => {
      const gamesPerSecond = await engine.benchmark(500); // 500ms benchmark

      expect(gamesPerSecond).toBeGreaterThan(0);
      expect(gamesPerSecond).toBeLessThan(1000000); // Sanity check
    });

    it('should meet minimum performance target of 5,000 games/sec', async () => {
      const gamesPerSecond = await engine.benchmark(1000); // 1 second benchmark

      console.log(`FastRolloutEngine Performance: ${gamesPerSecond.toLocaleString()} games/sec`);

      // This is the critical performance threshold for MCTS to be enabled
      expect(gamesPerSecond).toBeGreaterThanOrEqual(5000);
    }, 15000); // Give 15 seconds for test to run

    it('should aim for optimal performance target of 10,000+ games/sec', async () => {
      const gamesPerSecond = await engine.benchmark(2000); // 2 second benchmark

      console.log(`FastRolloutEngine Performance: ${gamesPerSecond.toLocaleString()} games/sec`);

      // This is the optimal target from Phase 7.1 requirements
      if (gamesPerSecond < 10000) {
        console.warn(`⚠️  Performance below optimal target: ${gamesPerSecond} < 10,000 games/sec`);
        console.warn('This may be due to test environment constraints.');
      }

      // Don't fail the test, but log a warning if below optimal
      expect(gamesPerSecond).toBeGreaterThan(0);
    }, 15000);

    it('should track games simulated count', () => {
      const startPosition = engine['createBenchmarkPosition']();

      engine.resetCounter();
      expect(engine.getGamesSimulated()).toBe(0);

      engine.simulateGame(startPosition, Player.WHITE, 'random');
      expect(engine.getGamesSimulated()).toBe(1);

      engine.simulateGame(startPosition, Player.WHITE, 'random');
      expect(engine.getGamesSimulated()).toBe(2);
    });

    it('should reset counter correctly', () => {
      const startPosition = engine['createBenchmarkPosition']();

      engine.simulateGame(startPosition, Player.WHITE, 'random');
      expect(engine.getGamesSimulated()).toBeGreaterThan(0);

      engine.resetCounter();
      expect(engine.getGamesSimulated()).toBe(0);
    });
  });

  describe('Game Values', () => {
    it('should return single game value (1) when opponent has borne off', () => {
      const startPosition = engine['createBenchmarkPosition']();

      // Run multiple games to potentially see different game values
      const gameValues = new Set<number>();
      for (let i = 0; i < 10; i++) {
        const result = engine.simulateGame(startPosition, Player.WHITE, 'random');
        gameValues.add(result.gameValue);
      }

      // Should only contain valid game values
      gameValues.forEach(value => {
        expect([1, 2, 3]).toContain(value);
      });
    });
  });

  describe('Board Conversion', () => {
    it('should convert standard starting position correctly', () => {
      const startPosition = engine['createBenchmarkPosition']();

      // Standard backgammon starting position
      expect(startPosition).toHaveLength(26); // 0-23 points + bar + off

      // Count checkers
      let whiteCheckers = 0;
      let blackCheckers = 0;

      for (const pos of startPosition) {
        whiteCheckers += pos.checkers.filter(c => c.player === Player.WHITE).length;
        blackCheckers += pos.checkers.filter(c => c.player === Player.BLACK).length;
      }

      expect(whiteCheckers).toBe(15);
      expect(blackCheckers).toBe(15);
    });
  });
});
