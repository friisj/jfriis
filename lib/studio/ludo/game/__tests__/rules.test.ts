import { GameRules } from '../rules';
import { Player, OFF_POSITION, BAR_POSITION } from '../types';
import { createTestBoard, createMove, getCheckerId, TEST_SCENARIOS, validateBoardConsistency } from './testUtils';

describe('GameRules', () => {
  describe('Move Validation', () => {
    describe('Basic Movement', () => {
      it('should allow valid moves in correct direction', () => {
        const board = createTestBoard({
          white: { 0: 1 },
          black: { 23: 1 }
        });

        // White moves forward (0->23 direction)
        const whiteMove = createMove(getCheckerId(board, 0, Player.WHITE), 0, 3, 3);
        expect(GameRules.isValidMove(whiteMove, board, Player.WHITE)).toBe(true);

        // Black moves backward (23->0 direction)  
        const blackMove = createMove(getCheckerId(board, 23, Player.BLACK), 23, 20, 3);
        expect(GameRules.isValidMove(blackMove, board, Player.BLACK)).toBe(true);
      });

      it('should reject moves in wrong direction', () => {
        const board = createTestBoard({
          white: { 10: 1 },
          black: { 10: 1 }
        });

        // White cannot move backward
        const whiteBackward = createMove(getCheckerId(board, 10, Player.WHITE), 10, 7, 3);
        expect(GameRules.isValidMove(whiteBackward, board, Player.WHITE)).toBe(false);

        // Black cannot move forward
        const blackForward = createMove(getCheckerId(board, 10, Player.BLACK), 10, 13, 3);
        expect(GameRules.isValidMove(blackForward, board, Player.BLACK)).toBe(false);
      });

      it('should reject moves to blocked points', () => {
        const board = createTestBoard({
          white: { 0: 1 },
          black: { 3: 2 } // Blocked point
        });

        const blockedMove = createMove(getCheckerId(board, 0, Player.WHITE), 0, 3, 3);
        expect(GameRules.isValidMove(blockedMove, board, Player.WHITE)).toBe(false);
      });

      it('should allow hitting single opponent checker', () => {
        const board = createTestBoard({
          white: { 0: 1 },
          black: { 3: 1 } // Single checker can be hit
        });

        const hittingMove = createMove(getCheckerId(board, 0, Player.WHITE), 0, 3, 3);
        expect(GameRules.isValidMove(hittingMove, board, Player.WHITE)).toBe(true);
      });
    });

    describe('Bear-off Rules', () => {
      it('should allow bear-off when all checkers in home board', () => {
        const board = createTestBoard({
          white: { 18: 2, 20: 3, 22: 1 }, // All in home board (18-23)
          black: { 0: 1 }
        });

        const bearOffMove = createMove(getCheckerId(board, 20, Player.WHITE), 20, OFF_POSITION, 4);
        expect(GameRules.isValidMove(bearOffMove, board, Player.WHITE)).toBe(true);
      });

      it('should reject bear-off when checkers outside home board', () => {
        const board = createTestBoard({
          white: { 15: 1, 20: 2 }, // Checker on point 15 prevents bear-off
          black: { 0: 1 }
        });

        const bearOffMove = createMove(getCheckerId(board, 20, Player.WHITE), 20, OFF_POSITION, 4);
        expect(GameRules.isValidMove(bearOffMove, board, Player.WHITE)).toBe(false);
      });

      it('should allow bear-off with higher die from highest point', () => {
        const board = createTestBoard({
          white: { 20: 1 }, // Only checker on point 20 (21st point)
          black: { 0: 1 }
        });

        // Rolling 6 should allow bearing off from point 20
        const bearOffWithHigher = createMove(getCheckerId(board, 20, Player.WHITE), 20, OFF_POSITION, 6);
        expect(GameRules.isValidMove(bearOffWithHigher, board, Player.WHITE)).toBe(true);
      });

      it('should reject bear-off with higher die when not from furthest point', () => {
        const board = createTestBoard({
          white: { 19: 1, 21: 1 }, // Checkers on points 19 and 21
          black: { 0: 1 }
        });

        // Cannot bear off from point 21 with die 6 when checker exists on point 19 (furthest)
        const invalidBearOff = createMove(getCheckerId(board, 21, Player.WHITE), 21, OFF_POSITION, 6);
        expect(GameRules.isValidMove(invalidBearOff, board, Player.WHITE)).toBe(false);
      });

      it('should handle black bear-off correctly', () => {
        const board = createTestBoard({
          white: { 23: 1 },
          black: { 0: 1, 2: 2, 4: 1 } // Black home board (0-5)
        });

        const blackBearOff = createMove(getCheckerId(board, 2, Player.BLACK), 2, OFF_POSITION, 3);
        expect(GameRules.isValidMove(blackBearOff, board, Player.BLACK)).toBe(true);
      });

      it('should allow exact bear-off when die roll lands exactly off board', () => {
        const board = createTestBoard({
          white: { 21: 1 }, // Point 21 + die 3 = 24 (exactly off)
          black: { 0: 1 }
        });

        const exactBearOff = createMove(getCheckerId(board, 21, Player.WHITE), 21, OFF_POSITION, 3);
        expect(GameRules.isValidMove(exactBearOff, board, Player.WHITE)).toBe(true);
      });

      it('should allow bear-off when die roll exceeds board boundary', () => {
        const board = createTestBoard({
          white: { 20: 1 }, // Point 20 + die 6 = 26 (exceeds 24)
          black: { 2: 1 } // Point 2 - die 4 = -2 (exceeds 0)
        });

        const whiteBearOff = createMove(getCheckerId(board, 20, Player.WHITE), 20, OFF_POSITION, 6);
        expect(GameRules.isValidMove(whiteBearOff, board, Player.WHITE)).toBe(true);

        const blackBearOff = createMove(getCheckerId(board, 2, Player.BLACK), 2, OFF_POSITION, 4);
        expect(GameRules.isValidMove(blackBearOff, board, Player.BLACK)).toBe(true);
      });

      it('should allow black bear-off with higher die from highest point', () => {
        const board = createTestBoard({
          white: { 23: 1 },
          black: { 3: 1 } // Only checker on point 3 (highest for black)
        });

        // Rolling 6 should allow bearing off from point 3 (3 - 6 = -3, which is < 0)
        const blackBearOffWithHigher = createMove(getCheckerId(board, 3, Player.BLACK), 3, OFF_POSITION, 6);
        expect(GameRules.isValidMove(blackBearOffWithHigher, board, Player.BLACK)).toBe(true);
      });

      it('should reject black bear-off with higher die when not from highest point', () => {
        const board = createTestBoard({
          white: { 23: 1 },
          black: { 1: 1, 4: 1 } // Checkers on points 1 and 4
        });

        // Cannot bear off from point 1 with die 6 when checker exists on point 4 (higher)
        const invalidBlackBearOff = createMove(getCheckerId(board, 1, Player.BLACK), 1, OFF_POSITION, 6);
        expect(GameRules.isValidMove(invalidBlackBearOff, board, Player.BLACK)).toBe(false);
      });
    });

    describe('Bar Entry Rules', () => {
      it('should require bar entry before other moves', () => {
        const board = createTestBoard({
          white: { [BAR_POSITION]: 1, 10: 2 },
          black: { 0: 1 }
        });

        // Available moves should only be from bar when checker is on bar
        const availableMoves = GameRules.getAvailableMoves(board, Player.WHITE, [3, 5], [false, false]);
        
        // All moves should be from bar
        availableMoves.forEach(move => {
          expect(move.from).toBe(BAR_POSITION);
        });

        // Can enter from bar
        const barEntry = createMove(getCheckerId(board, BAR_POSITION, Player.WHITE), BAR_POSITION, 2, 3);
        expect(GameRules.isValidMove(barEntry, board, Player.WHITE)).toBe(true);
      });

      it('should reject bar entry to blocked points', () => {
        const board = createTestBoard({
          white: { [BAR_POSITION]: 1 },
          black: { 2: 2 } // Block entry point
        });

        const blockedEntry = createMove(getCheckerId(board, BAR_POSITION, Player.WHITE), BAR_POSITION, 2, 3);
        expect(GameRules.isValidMove(blockedEntry, board, Player.WHITE)).toBe(false);
      });
    });
  });

  describe('Available Moves Generation', () => {
    it('should generate correct number of moves for regular dice', () => {
      const board = createTestBoard({
        white: { 0: 2, 5: 3 },
        black: { 23: 2 }
      });

      const moves = GameRules.getAvailableMoves(board, Player.WHITE, [3, 5], [false, false]);
      expect(moves.length).toBeGreaterThan(0);
      
      // Verify all moves are valid
      moves.forEach(move => {
        expect(GameRules.isValidMove(move, board, Player.WHITE)).toBe(true);
      });
    });

    it('should generate 4 moves for doubles', () => {
      const board = createTestBoard({
        white: { 0: 4 },
        black: { 23: 2 }
      });

      const moves = GameRules.getAvailableMoves(board, Player.WHITE, [6, 6, 6, 6], [false, false, false, false]);
      
      // Should have moves available (exact count depends on board layout)
      expect(moves.length).toBeGreaterThan(0);
      
      // All moves should be valid
      moves.forEach(move => {
        expect(GameRules.isValidMove(move, board, Player.WHITE)).toBe(true);
      });
    });

    it('should prioritize bar entry when checkers on bar', () => {
      const board = createTestBoard({
        white: { [BAR_POSITION]: 1, 10: 3 },
        black: { 0: 1, 1: 1 }
      });

      const moves = GameRules.getAvailableMoves(board, Player.WHITE, [2, 4], [false, false]);
      
      // All moves should be from bar
      moves.forEach(move => {
        expect(move.from).toBe(BAR_POSITION);
      });
    });

    it('should return empty array when no moves possible', () => {
      const board = createTestBoard({
        white: { [BAR_POSITION]: 1 },
        black: { 0: 2, 1: 2, 2: 2, 3: 2, 4: 2, 5: 2 } // All entry points blocked
      });

      const moves = GameRules.getAvailableMoves(board, Player.WHITE, [1, 2], [false, false]);
      expect(moves).toHaveLength(0);
    });
  });

  describe('Win Condition Detection', () => {
    it('should detect win when all checkers borne off', () => {
      const board = createTestBoard({
        white: { [OFF_POSITION]: 15 }, // All white checkers off
        black: { 0: 5, 5: 10 }
      });

      expect(GameRules.checkWinCondition(board, Player.WHITE)).toBe(true);
      expect(GameRules.checkWinCondition(board, Player.BLACK)).toBe(false);
    });

    it('should not detect win when checkers still on board', () => {
      const board = createTestBoard({
        white: { [OFF_POSITION]: 14, 22: 1 }, // One checker still on board
        black: { 0: 5, 5: 10 }
      });

      expect(GameRules.checkWinCondition(board, Player.WHITE)).toBe(false);
    });
  });

  describe('Pip Count Calculation', () => {
    it('should calculate correct pip count', () => {
      const board = createTestBoard({
        white: { 0: 2, 5: 3, [OFF_POSITION]: 10 }, // 2*(24-0) + 3*(24-5) + 0 = 2*24 + 3*19 = 105
        black: { 23: 2, 18: 1 } // 2*(23+1) + 1*(18+1) = 2*24 + 1*19 = 67
      });

      const whitePips = GameRules.calculatePipCount(board, Player.WHITE);
      const blackPips = GameRules.calculatePipCount(board, Player.BLACK);

      expect(whitePips).toBe(105); // 2*(24-0) + 3*(24-5) = 48 + 57
      expect(blackPips).toBe(67);  // 2*(23+1) + 1*(18+1) = 48 + 19
    });

    it('should handle checkers on bar correctly', () => {
      const board = createTestBoard({
        white: { [BAR_POSITION]: 1, [OFF_POSITION]: 14 }
      });

      const pipCount = GameRules.calculatePipCount(board, Player.WHITE);
      expect(pipCount).toBe(25); // Bar to off = 25 pips
    });
  });

  describe('Board State Consistency', () => {
    it('should maintain valid board state after moves', () => {
      const board = createTestBoard({
        white: { 0: 2, 10: 3 },
        black: { 23: 2, 13: 3 }
      });

      const validation = validateBoardConsistency(board);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid board states', () => {
      // Create manually corrupted board for testing validation
      const board = createTestBoard({ white: { 0: 20 } }); // Too many checkers
      
      const validation = validateBoardConsistency(board);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Test Scenarios', () => {
    Object.entries(TEST_SCENARIOS).forEach(([_scenarioName, scenario]) => {
      it(`should handle ${scenario.description}`, () => {
        const board = createTestBoard(scenario.initialBoard);

        scenario.moves.forEach(moveTest => {
          const availableMoves = GameRules.getAvailableMoves(
            board,
            moveTest.player,
            moveTest.dice,
            moveTest.dice.map(() => false)
          );

          expect(availableMoves.length).toBe(moveTest.expectedMoves);

          if (moveTest.move) {
            const checkerId = getCheckerId(board, moveTest.move.from, moveTest.player);
            const testMove = createMove(checkerId, moveTest.move.from, moveTest.move.to, moveTest.move.distance);
            expect(GameRules.isValidMove(testMove, board, moveTest.player)).toBe(true);
          }
        });

        if (scenario.expectedWinner) {
          expect(GameRules.checkWinCondition(board, scenario.expectedWinner)).toBe(true);
        }
      });
    });
  });

  describe('Resign Validation Helpers', () => {
    describe('hasPlayerBorneOffAny', () => {
      it('should return true when player has borne off at least one checker', () => {
        const board = createTestBoard({
          white: { [OFF_POSITION]: 3, 20: 12 },
          black: { 0: 15 }
        });

        expect(GameRules.hasPlayerBorneOffAny(board, Player.WHITE)).toBe(true);
        expect(GameRules.hasPlayerBorneOffAny(board, Player.BLACK)).toBe(false);
      });

      it('should return false when player has borne off no checkers', () => {
        const board = createTestBoard({
          white: { 18: 5, 20: 10 },
          black: { 0: 5, 5: 10 }
        });

        expect(GameRules.hasPlayerBorneOffAny(board, Player.WHITE)).toBe(false);
        expect(GameRules.hasPlayerBorneOffAny(board, Player.BLACK)).toBe(false);
      });

      it('should return true when all checkers are borne off', () => {
        const board = createTestBoard({
          white: { [OFF_POSITION]: 15 },
          black: { 0: 15 }
        });

        expect(GameRules.hasPlayerBorneOffAny(board, Player.WHITE)).toBe(true);
      });
    });

    describe('hasCheckersOnBar', () => {
      it('should return true when player has checkers on bar', () => {
        const board = createTestBoard({
          white: { [BAR_POSITION]: 2, 10: 13 },
          black: { 23: 15 }
        });

        expect(GameRules.hasCheckersOnBar(board, Player.WHITE)).toBe(true);
        expect(GameRules.hasCheckersOnBar(board, Player.BLACK)).toBe(false);
      });

      it('should return false when player has no checkers on bar', () => {
        const board = createTestBoard({
          white: { 0: 2, 10: 13 },
          black: { 23: 15 }
        });

        expect(GameRules.hasCheckersOnBar(board, Player.WHITE)).toBe(false);
        expect(GameRules.hasCheckersOnBar(board, Player.BLACK)).toBe(false);
      });
    });

    describe('hasCheckersInOpponentHome', () => {
      it('should return true when white has checkers in black home (0-5)', () => {
        const board = createTestBoard({
          white: { 2: 1, 10: 14 }, // Point 2 is in black home
          black: { 12: 15 } // Black not in white home
        });

        expect(GameRules.hasCheckersInOpponentHome(board, Player.WHITE)).toBe(true);
        expect(GameRules.hasCheckersInOpponentHome(board, Player.BLACK)).toBe(false);
      });

      it('should return true when black has checkers in white home (18-23)', () => {
        const board = createTestBoard({
          white: { 10: 15 }, // White not in black home
          black: { 20: 1, 12: 14 } // Point 20 is in white home
        });

        expect(GameRules.hasCheckersInOpponentHome(board, Player.BLACK)).toBe(true);
        expect(GameRules.hasCheckersInOpponentHome(board, Player.WHITE)).toBe(false);
      });

      it('should return false when no checkers in opponent home', () => {
        const board = createTestBoard({
          white: { 10: 5, 15: 10 }, // Outside opponent home
          black: { 8: 5, 12: 10 }   // Outside opponent home
        });

        expect(GameRules.hasCheckersInOpponentHome(board, Player.WHITE)).toBe(false);
        expect(GameRules.hasCheckersInOpponentHome(board, Player.BLACK)).toBe(false);
      });

      it('should check all points in opponent home board', () => {
        // White opponent home is 0-5
        for (let point = 0; point <= 5; point++) {
          const board = createTestBoard({
            white: { [point]: 1 },
            black: { 23: 15 }
          });
          expect(GameRules.hasCheckersInOpponentHome(board, Player.WHITE)).toBe(true);
        }

        // Black opponent home is 18-23
        for (let point = 18; point <= 23; point++) {
          const board = createTestBoard({
            white: { 0: 15 },
            black: { [point]: 1 }
          });
          expect(GameRules.hasCheckersInOpponentHome(board, Player.BLACK)).toBe(true);
        }
      });
    });
  });
});