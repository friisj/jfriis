// @ts-nocheck
/**
 * MCTS Core Tests
 *
 * Validates that the MCTS algorithm correctly selects moves
 * using UCB1 and tree search.
 */

import { MCTSEvaluator } from '../core';
import { Player } from '@/lib/studio/ludo/game/types';
import type { Move } from '@/lib/studio/ludo/game/types';

describe('MCTSEvaluator', () => {
  let evaluator: MCTSEvaluator;

  beforeEach(() => {
    evaluator = new MCTSEvaluator();
  });

  describe('Move Selection', () => {
    it('should return the only available move when there is one', async () => {
      const mockBoard = createMockBoard();
      const mockMoves: Move[] = [
        { checkerId: 'white-1', from: 5, to: 10, distance: 5 }
      ];

      const selectedMove = await evaluator.selectMove(mockBoard, Player.WHITE, mockMoves, {
        simulationCount: 100,
        timeLimit: 1000
      });

      expect(selectedMove).toEqual(mockMoves[0]);
    });

    it('should throw error when no moves available', async () => {
      const mockBoard = createMockBoard();
      const mockMoves: Move[] = [];

      await expect(
        evaluator.selectMove(mockBoard, Player.WHITE, mockMoves, {
          simulationCount: 100,
          timeLimit: 1000
        })
      ).rejects.toThrow('No available moves');
    });

    it('should select a move when multiple options exist', async () => {
      const mockBoard = createMockBoard();
      const mockMoves: Move[] = [
        { checkerId: 'white-1', from: 5, to: 10, distance: 5 },
        { checkerId: 'white-2', from: 12, to: 15, distance: 3 },
        { checkerId: 'white-3', from: 18, to: 22, distance: 4 }
      ];

      const selectedMove = await evaluator.selectMove(mockBoard, Player.WHITE, mockMoves, {
        simulationCount: 50,
        timeLimit: 1000
      });

      // Should return one of the available moves
      expect(mockMoves).toContainEqual(selectedMove);
    });

    it('should respect simulation count limit', async () => {
      const mockBoard = createMockBoard();
      const mockMoves: Move[] = [
        { checkerId: 'white-1', from: 5, to: 10, distance: 5 },
        { checkerId: 'white-2', from: 12, to: 15, distance: 3 }
      ];

      evaluator.resetStats();

      await evaluator.selectMove(mockBoard, Player.WHITE, mockMoves, {
        simulationCount: 25,
        timeLimit: 10000
      });

      const stats = evaluator.getStats();
      expect(stats.simulationsRun).toBeLessThanOrEqual(25);
    });

    it('should respect time limit', async () => {
      const mockBoard = createMockBoard();
      const mockMoves: Move[] = [
        { checkerId: 'white-1', from: 5, to: 10, distance: 5 },
        { checkerId: 'white-2', from: 12, to: 15, distance: 3 }
      ];

      const startTime = performance.now();

      await evaluator.selectMove(mockBoard, Player.WHITE, mockMoves, {
        simulationCount: 10000, // High count
        timeLimit: 100 // Short time
      });

      const elapsed = performance.now() - startTime;

      // Should complete within reasonable bounds of time limit
      expect(elapsed).toBeLessThan(200); // Allow some overhead
    });

    it('should create tree nodes during search', async () => {
      const mockBoard = createMockBoard();
      const mockMoves: Move[] = [
        { checkerId: 'white-1', from: 5, to: 10, distance: 5 },
        { checkerId: 'white-2', from: 12, to: 15, distance: 3 }
      ];

      evaluator.resetStats();

      await evaluator.selectMove(mockBoard, Player.WHITE, mockMoves, {
        simulationCount: 50,
        timeLimit: 2000
      });

      const stats = evaluator.getStats();
      expect(stats.nodesCreated).toBeGreaterThan(0);
    });
  });

  describe('Move Evaluation', () => {
    it('should evaluate all moves and return scores', async () => {
      const mockBoard = createMockBoard();
      const mockMoves: Move[] = [
        { checkerId: 'white-1', from: 5, to: 10, distance: 5 },
        { checkerId: 'white-2', from: 12, to: 15, distance: 3 },
        { checkerId: 'white-3', from: 18, to: 22, distance: 4 }
      ];

      const evaluations = await evaluator.evaluateMoves(mockBoard, Player.WHITE, mockMoves, {
        simulationCount: 30,
        timeLimit: 2000
      });

      expect(evaluations).toHaveLength(mockMoves.length);

      // Each evaluation should have move, score, and visits
      evaluations.forEach(evaluation => {
        expect(evaluation.move).toBeDefined();
        expect(evaluation.score).toBeGreaterThanOrEqual(0);
        expect(evaluation.score).toBeLessThanOrEqual(1);
        expect(evaluation.visits).toBeGreaterThan(0);
      });

      // Should be sorted by score (descending)
      for (let i = 0; i < evaluations.length - 1; i++) {
        expect(evaluations[i].score).toBeGreaterThanOrEqual(evaluations[i + 1].score);
      }
    });

    it('should return empty array when no moves available', async () => {
      const mockBoard = createMockBoard();
      const mockMoves: Move[] = [];

      const evaluations = await evaluator.evaluateMoves(mockBoard, Player.WHITE, mockMoves, {
        simulationCount: 50,
        timeLimit: 1000
      });

      expect(evaluations).toHaveLength(0);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track nodes created', async () => {
      const mockBoard = createMockBoard();
      const mockMoves: Move[] = [
        { checkerId: 'white-1', from: 5, to: 10, distance: 5 },
        { checkerId: 'white-2', from: 12, to: 15, distance: 3 }
      ];

      evaluator.resetStats();

      await evaluator.selectMove(mockBoard, Player.WHITE, mockMoves, {
        simulationCount: 20,
        timeLimit: 2000
      });

      const stats = evaluator.getStats();
      expect(stats.nodesCreated).toBeGreaterThan(0);
    });

    it('should track simulations run', async () => {
      const mockBoard = createMockBoard();
      const mockMoves: Move[] = [
        { checkerId: 'white-1', from: 5, to: 10, distance: 5 },
        { checkerId: 'white-2', from: 12, to: 15, distance: 3 }
      ];

      evaluator.resetStats();

      await evaluator.selectMove(mockBoard, Player.WHITE, mockMoves, {
        simulationCount: 30,
        timeLimit: 2000
      });

      const stats = evaluator.getStats();
      expect(stats.simulationsRun).toBeGreaterThan(0);
      expect(stats.simulationsRun).toBeLessThanOrEqual(30);
    });

    it('should reset stats correctly', async () => {
      const mockBoard = createMockBoard();
      const mockMoves: Move[] = [
        { checkerId: 'white-1', from: 5, to: 10, distance: 5 }
      ];

      await evaluator.selectMove(mockBoard, Player.WHITE, mockMoves, {
        simulationCount: 10,
        timeLimit: 1000
      });

      evaluator.resetStats();

      const stats = evaluator.getStats();
      expect(stats.nodesCreated).toBe(0);
      expect(stats.simulationsRun).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should use default config when not specified', async () => {
      const mockBoard = createMockBoard();
      const mockMoves: Move[] = [
        { checkerId: 'white-1', from: 5, to: 10, distance: 5 }
      ];

      // Should not throw with default config
      const move = await evaluator.selectMove(mockBoard, Player.WHITE, mockMoves);
      expect(move).toBeDefined();
    });

    it('should accept partial config overrides', async () => {
      const mockBoard = createMockBoard();
      const mockMoves: Move[] = [
        { checkerId: 'white-1', from: 5, to: 10, distance: 5 }
      ];

      // Override just simulation count
      const move = await evaluator.selectMove(mockBoard, Player.WHITE, mockMoves, {
        simulationCount: 5
      });

      expect(move).toBeDefined();
    });

    it('should handle very low simulation counts', async () => {
      const mockBoard = createMockBoard();
      const mockMoves: Move[] = [
        { checkerId: 'white-1', from: 5, to: 10, distance: 5 },
        { checkerId: 'white-2', from: 12, to: 15, distance: 3 }
      ];

      // Very minimal search
      const move = await evaluator.selectMove(mockBoard, Player.WHITE, mockMoves, {
        simulationCount: 1,
        timeLimit: 1000
      });

      expect(move).toBeDefined();
      expect(mockMoves).toContainEqual(move);
    });
  });

  describe('Performance Characteristics', () => {
    it('should complete quickly with low simulation count', async () => {
      const mockBoard = createMockBoard();
      const mockMoves: Move[] = [
        { checkerId: 'white-1', from: 5, to: 10, distance: 5 },
        { checkerId: 'white-2', from: 12, to: 15, distance: 3 }
      ];

      const startTime = performance.now();

      await evaluator.selectMove(mockBoard, Player.WHITE, mockMoves, {
        simulationCount: 10,
        timeLimit: 5000
      });

      const elapsed = performance.now() - startTime;

      // Should be very fast with only 10 simulations
      expect(elapsed).toBeLessThan(1000);
    });

    it('should scale reasonably with increased simulations', async () => {
      const mockBoard = createMockBoard();
      const mockMoves: Move[] = [
        { checkerId: 'white-1', from: 5, to: 10, distance: 5 },
        { checkerId: 'white-2', from: 12, to: 15, distance: 3 }
      ];

      const start1 = performance.now();
      await evaluator.selectMove(mockBoard, Player.WHITE, mockMoves, {
        simulationCount: 50,
        timeLimit: 5000
      });
      const time1 = performance.now() - start1;

      const start2 = performance.now();
      await evaluator.selectMove(mockBoard, Player.WHITE, mockMoves, {
        simulationCount: 100,
        timeLimit: 5000
      });
      const time2 = performance.now() - start2;

      // More simulations should take more time (but not necessarily double)
      expect(time2).toBeGreaterThan(time1 * 0.5);
    }, 15000);
  });
});

// Helper function to create a minimal mock board for testing
function createMockBoard() {
  const board = [];

  // Create points 0-25 (0-23 regular points, 24 bar, 25 off)
  for (let i = 0; i <= 25; i++) {
    board.push({
      pointIndex: i,
      checkers: []
    });
  }

  // Add some checkers to make it a valid position
  // White starting position (simplified)
  for (let i = 0; i < 2; i++) {
    board[0].checkers.push({
      id: `white-${i}`,
      player: Player.WHITE,
      position: 0
    });
  }

  for (let i = 2; i < 7; i++) {
    board[11].checkers.push({
      id: `white-${i}`,
      player: Player.WHITE,
      position: 11
    });
  }

  // Black starting position (simplified)
  for (let i = 0; i < 2; i++) {
    board[23].checkers.push({
      id: `black-${i}`,
      player: Player.BLACK,
      position: 23
    });
  }

  for (let i = 2; i < 7; i++) {
    board[12].checkers.push({
      id: `black-${i}`,
      player: Player.BLACK,
      position: 12
    });
  }

  return board;
}
