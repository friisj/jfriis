import { getOpeningMove, OPENING_BOOK } from '../opening-book';
import { Player, BoardPosition, INITIAL_SETUP } from '../../game/types';

/**
 * Validation tests for opening book coordinates
 * Ensures book moves match actual checker positions on the board
 */

describe('Opening Book Coordinate Validation', () => {
  // Helper to create initial board from setup
  function createInitialBoard(): BoardPosition[] {
    const board: BoardPosition[] = Array.from({ length: 26 }, (_, index) => ({
      pointIndex: index,
      checkers: []
    }));

    Object.entries(INITIAL_SETUP).forEach(([position, setup]) => {
      const pos = parseInt(position);
      for (let i = 0; i < setup.count; i++) {
        board[pos].checkers.push({
          id: `${setup.player}-${i}`,
          player: setup.player,
          position: pos
        });
      }
    });

    return board;
  }

  // Helper to check if a player has a checker at a position
  function hasCheckerAt(board: BoardPosition[], player: Player, pointIndex: number): boolean {
    const position = board.find(pos => pos.pointIndex === pointIndex);
    if (!position) return false;
    return position.checkers.some(c => c.player === player);
  }

  // Display board setup for debugging
  function displayBoardSetup(board: BoardPosition[], player: Player) {
    console.log(`\n=== Board Setup for ${player} ===`);
    console.log(`${player}'s checkers are at:`);
    board.forEach(pos => {
      const playerCheckers = pos.checkers.filter(c => c.player === player);
      if (playerCheckers.length > 0) {
        console.log(`  Point ${pos.pointIndex}: ${playerCheckers.length} checkers`);
      }
    });
  }
  // Suppress unused warning - used in commented out debug code
  void displayBoardSetup;

  describe('White opening moves', () => {
    let board: BoardPosition[];

    beforeEach(() => {
      board = createInitialBoard();
      displayBoardSetup(board, Player.WHITE);
    });

    it('should validate 3-1 (make 5-point)', () => {
      const opening = getOpeningMove([3, 1]);
      expect(opening).not.toBeNull();

      if (!opening) return;

      console.log('\n--- Testing 3-1 Opening ---');
      console.log('Book moves:', JSON.stringify(opening.moves, null, 2));

      // Check if WHITE has checkers at the 'from' positions
      opening.moves.forEach(move => {
        const hasChecker = hasCheckerAt(board, Player.WHITE, move.from);
        console.log(`WHITE has checker at point ${move.from}: ${hasChecker}`);
        expect(hasChecker).toBe(true);
      });
    });

    it('should validate 4-2 (make 4-point)', () => {
      const opening = getOpeningMove([4, 2]);
      expect(opening).not.toBeNull();

      if (!opening) return;

      console.log('\n--- Testing 4-2 Opening ---');
      console.log('Book moves:', JSON.stringify(opening.moves, null, 2));

      opening.moves.forEach(move => {
        const hasChecker = hasCheckerAt(board, Player.WHITE, move.from);
        console.log(`WHITE has checker at point ${move.from}: ${hasChecker}`);
        expect(hasChecker).toBe(true);
      });
    });

    it('should validate 6-1 (make bar point)', () => {
      const opening = getOpeningMove([6, 1]);
      expect(opening).not.toBeNull();

      if (!opening) return;

      console.log('\n--- Testing 6-1 Opening ---');
      console.log('Book moves:', JSON.stringify(opening.moves, null, 2));

      opening.moves.forEach(move => {
        const hasChecker = hasCheckerAt(board, Player.WHITE, move.from);
        console.log(`WHITE has checker at point ${move.from}: ${hasChecker}`);
        expect(hasChecker).toBe(true);
      });
    });
  });

  describe('All opening moves validation', () => {
    it('should validate all opening book entries for WHITE', () => {
      const board = createInitialBoard();
      const errors: string[] = [];

      Object.entries(OPENING_BOOK).forEach(([roll, opening]) => {
        opening.moves.forEach(move => {
          if (!hasCheckerAt(board, Player.WHITE, move.from)) {
            errors.push(`${roll}: WHITE has no checker at point ${move.from} (${move.description})`);
          }
        });
      });

      if (errors.length > 0) {
        console.log('\n=== OPENING BOOK ERRORS ===');
        errors.forEach(err => console.log(`  ❌ ${err}`));
        console.log(`\nTotal errors: ${errors.length} / ${Object.keys(OPENING_BOOK).length} openings`);
      }

      expect(errors).toEqual([]);
    });
  });
});
