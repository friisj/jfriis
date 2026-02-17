import { BoardPosition, Player, Move, BAR_POSITION, OFF_POSITION } from '../types';

/**
 * Creates a test board with specified checker positions
 * Usage: createTestBoard({ white: { 0: 2, 5: 3 }, black: { 23: 2, 18: 5 } })
 */
export function createTestBoard(setup: {
  white?: Record<number, number>;
  black?: Record<number, number>;
}): BoardPosition[] {
  // Initialize empty board (26 positions: 0-23 points, 24 bar, 25 off)
  const board: BoardPosition[] = Array.from({ length: 26 }, (_, index) => ({
    pointIndex: index,
    checkers: []
  }));

  let whiteCheckerId = 0;
  let blackCheckerId = 0;

  // Place white checkers
  if (setup.white) {
    Object.entries(setup.white).forEach(([position, count]) => {
      const pos = parseInt(position);
      const boardPosition = board[pos];
      
      for (let i = 0; i < count; i++) {
        boardPosition.checkers.push({
          id: `white-${whiteCheckerId++}`,
          player: Player.WHITE,
          position: pos
        });
      }
    });
  }

  // Place black checkers
  if (setup.black) {
    Object.entries(setup.black).forEach(([position, count]) => {
      const pos = parseInt(position);
      const boardPosition = board[pos];
      
      for (let i = 0; i < count; i++) {
        boardPosition.checkers.push({
          id: `black-${blackCheckerId++}`,
          player: Player.BLACK,
          position: pos
        });
      }
    });
  }

  return board;
}

/**
 * Creates a move object for testing
 */
export function createMove(checkerId: string, from: number, to: number, distance: number): Move {
  return { checkerId, from, to, distance };
}

/**
 * Gets a checker ID from a specific position and player for testing
 */
export function getCheckerId(board: BoardPosition[], position: number, player: Player, index = 0): string {
  const boardPosition = board.find(pos => pos.pointIndex === position);
  const checker = boardPosition?.checkers.filter(c => c.player === player)[index];
  return checker?.id || '';
}

/**
 * Simulates a complete game scenario for integration testing
 */
export interface GameScenario {
  description: string;
  initialBoard: { white?: Record<number, number>; black?: Record<number, number> };
  moves: Array<{
    player: Player;
    dice: number[];
    expectedMoves: number; // Number of moves that should be available
    move?: { from: number; to: number; distance: number }; // Specific move to test
  }>;
  expectedWinner?: Player;
  expectedFinalState?: {
    whiteOff: number;
    blackOff: number;
  };
}

/**
 * Pre-defined test scenarios for common game situations
 */
export const TEST_SCENARIOS: Record<string, GameScenario> = {
  bearOffScenario: {
    description: "Player can bear off when all checkers are in home board",
    initialBoard: {
      white: { 20: 2, 21: 3, 22: 2, 23: 1 }, // All in home board
      black: { 0: 1, 1: 1 } // Not ready for bear-off
    },
    moves: [
      {
        player: Player.WHITE,
        dice: [4, 3],
        expectedMoves: 7, // Valid moves: 2×(p20+d4=OFF) + 2×(p20+d3=p23) + 3×(p21+d3=OFF)
        move: { from: 20, to: OFF_POSITION, distance: 4 }
      }
    ]
  },

  cannotBearOffScenario: {
    description: "Player cannot bear off when checkers outside home board",
    initialBoard: {
      white: { 20: 2, 21: 3, 15: 1 }, // One checker outside home board
      black: { 0: 1, 1: 1 }
    },
    moves: [
      {
        player: Player.WHITE,
        dice: [4, 3],
        expectedMoves: 4, // Can move normally but not bear off
      }
    ]
  },

  mandatoryBarEntry: {
    description: "Must enter from bar before making other moves",
    initialBoard: {
      white: { [BAR_POSITION]: 1, 10: 2 }, // One checker on bar
      black: { 22: 1, 21: 1 }
    },
    moves: [
      {
        player: Player.WHITE,
        dice: [2, 4],
        expectedMoves: 2, // Two bar entry moves (one for each die)
      }
    ]
  },

  hittingScenario: {
    description: "Hitting opponent checker sends it to bar",
    initialBoard: {
      white: { 2: 1 },
      black: { 5: 1 } // Single black checker vulnerable to hit
    },
    moves: [
      {
        player: Player.WHITE,
        dice: [3, 2],
        expectedMoves: 2,
        move: { from: 2, to: 5, distance: 3 } // Should hit black checker
      }
    ]
  },

  doublesScenario: {
    description: "Doubles provide 4 moves instead of 2",
    initialBoard: {
      white: { 0: 4 },
      black: { 23: 2 }
    },
    moves: [
      {
        player: Player.WHITE,
        dice: [6, 6, 6, 6], // Doubles should be represented as 4 dice
        expectedMoves: 16, // 4 checkers x 4 dice = many possible combinations
      }
    ]
  },

  endGameScenario: {
    description: "Complete bear-off to win game",
    initialBoard: {
      white: { [OFF_POSITION]: 15 }, // All checkers already off
      black: { [OFF_POSITION]: 15 } // Black also has all checkers off for a completed game
    },
    moves: [
      {
        player: Player.WHITE,
        dice: [1, 2],
        expectedMoves: 0, // No moves available - game already won
      }
    ],
    expectedWinner: Player.WHITE
  },

  highDieBearOffScenario: {
    description: "High die rolls should allow bear-off from furthest available point",
    initialBoard: {
      white: { 20: 2, 18: 1 }, // Checkers on points 20 and 18
      black: { 0: 1, 1: 1 }
    },
    moves: [
      {
        player: Player.WHITE,
        dice: [6, 5],
        expectedMoves: 2, // Only point 18 (furthest) can bear off with die 6; no move with die 5
      }
    ]
  },

  blackHighDieBearOffScenario: {
    description: "Black player high die rolls should allow bear-off from highest available point",
    initialBoard: {
      white: { 23: 1, 22: 1 },
      black: { 3: 2, 1: 1 } // Black checkers on points 3 and 1
    },
    moves: [
      {
        player: Player.BLACK,
        dice: [6, 5],
        expectedMoves: 4, // 2 checkers on point 3 can bear off with dice 6,5; 1 checker on point 1 can bear off with dice 6,5
      }
    ]
  }
};

/**
 * Helper to validate board state consistency
 */
export function validateBoardConsistency(board: BoardPosition[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check total checker count
  let whiteCount = 0;
  let blackCount = 0;

  board.forEach(position => {
    position.checkers.forEach(checker => {
      if (checker.player === Player.WHITE) whiteCount++;
      if (checker.player === Player.BLACK) blackCount++;
      
      // Check position consistency
      if (checker.position !== position.pointIndex) {
        errors.push(`Checker ${checker.id} position mismatch: stored at ${position.pointIndex}, checker says ${checker.position}`);
      }
    });
  });

  if (whiteCount > 15) errors.push(`Too many white checkers: ${whiteCount}`);
  if (blackCount > 15) errors.push(`Too many black checkers: ${blackCount}`);

  // Check for multiple players on same point (except BAR_POSITION and OFF_POSITION)
  // Note: Both players can have checkers on the bar simultaneously when hit
  board.forEach(position => {
    if (position.checkers.length > 1 && position.pointIndex !== OFF_POSITION && position.pointIndex !== BAR_POSITION) {
      const players = new Set(position.checkers.map(c => c.player));
      if (players.size > 1) {
        errors.push(`Multiple players on point ${position.pointIndex}: ${Array.from(players).join(', ')}`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create a mock Zustand store for testing
 */
export function createMockGameStore(initialState: Record<string, any> = {}): any {
  const defaults = {
    board: [],
    currentPlayer: Player.WHITE,
    dice: null as number[] | null,
    availableMoves: [] as Move[],
    gamePhase: 'setup' as 'setup' | 'rolling' | 'moving' | 'forced_move' | 'no_moves' | 'ai_thinking' | 'finished',
    winner: null as Player | null,
    usedDice: [false, false],
    selectedChecker: null as string | null,
    playMode: undefined as any,
    players: {} as any,
    aiPlayer: null as any,
    autoPlay: false,
    rollDice: jest.fn(),
    moveChecker: jest.fn(),
    switchTurn: jest.fn(),
    resetGame: jest.fn(),
    executeAIMove: jest.fn(),
  };

  return {
    ...defaults,
    ...initialState,
  };
}