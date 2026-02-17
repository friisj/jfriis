import { Player, Move } from '../game/types';

/**
 * Opening Book for Backgammon
 *
 * Contains standard opening moves for common dice rolls.
 * Based on expert play and established backgammon theory.
 */

export interface OpeningMove {
  dice: [number, number];
  moves: { from: number; to: number; description: string }[];
  strategy: string;
  alternatives?: { moves: { from: number; to: number; description: string }[]; strategy: string }[];
}

/**
 * Standard opening moves for each dice combination
 * Positions are in game coordinates (0-23, with 24=bar, 25=off)
 *
 * WHITE moves from low (0) to high (24)
 * WHITE starts with checkers at: 0, 11, 16, 18
 */
export const OPENING_BOOK: Record<string, OpeningMove> = {
  // Dancing dice (doubles cannot occur on opening roll)

  // EXCELLENT OPENERS
  '1-3': {
    dice: [1, 3],
    moves: [
      { from: 16, to: 19, description: '17-point to 20-point (make 20-point)' },
      { from: 18, to: 19, description: '19-point to 20-point (make 20-point)' }
    ],
    strategy: 'Make the 20-point (5-point in traditional) - strongest opening move'
  },

  '2-4': {
    dice: [2, 4],
    moves: [
      { from: 16, to: 20, description: '17-point to 21-point (make 21-point)' },
      { from: 18, to: 20, description: '19-point to 21-point (make 21-point)' }
    ],
    strategy: 'Make the 21-point (4-point in traditional) - second best opening move'
  },

  '1-6': {
    dice: [1, 6],
    moves: [
      { from: 11, to: 17, description: '12-point to 18-point (make bar point)' },
      { from: 16, to: 17, description: '17-point to 18-point (make bar point)' }
    ],
    strategy: 'Make the 18-point (7-point/bar point in traditional) - strong blocking point',
    alternatives: [
      {
        moves: [
          { from: 0, to: 6, description: 'Run from 1-point to 7-point' },
          { from: 11, to: 12, description: 'Bring builder from 12-point to 13-point' }
        ],
        strategy: 'Running game - escape one checker and slot'
      }
    ]
  },

  // GOOD BUILDERS
  '3-5': {
    dice: [3, 5],
    moves: [
      { from: 16, to: 21, description: '17-point to 22-point' },
      { from: 18, to: 21, description: '19-point to 22-point' }
    ],
    strategy: 'Make the 22-point (3-point in traditional) - builds home board'
  },

  '4-6': {
    dice: [4, 6],
    moves: [
      { from: 16, to: 22, description: '17-point to 23-point' },
      { from: 0, to: 4, description: 'Split from 1-point to 5-point' }
    ],
    strategy: 'Make the 23-point and split - balanced approach'
  },

  // RUNNING AND SPLITTING
  '5-6': {
    dice: [5, 6],
    moves: [
      { from: 0, to: 11, description: "Lover's leap - run from 1-point to 12-point" }
    ],
    strategy: "Lover's leap - escape back checker to midpoint safety"
  },

  '3-4': {
    dice: [3, 4],
    moves: [
      { from: 0, to: 4, description: 'Split from 1-point to 5-point' },
      { from: 0, to: 3, description: 'Split from 1-point to 4-point' }
    ],
    strategy: 'Double split - aggressive anchor-seeking'
  },

  // SLOTTING AND BUILDING
  '1-2': {
    dice: [1, 2],
    moves: [
      { from: 0, to: 1, description: 'Split from 1-point to 2-point' },
      { from: 11, to: 13, description: 'Bring builder from 12-point to 14-point' }
    ],
    strategy: 'Split and slot - balanced builder strategy',
    alternatives: [
      {
        moves: [
          { from: 11, to: 13, description: 'Bring builder from 12-point to 14-point' },
          { from: 18, to: 19, description: 'Move from 19-point to 20-point' }
        ],
        strategy: 'Safe play - bring builders, no splitting'
      }
    ]
  },

  '2-3': {
    dice: [2, 3],
    moves: [
      { from: 0, to: 3, description: 'Move from 1-point to 4-point' },
      { from: 11, to: 13, description: 'Bring builder from 12-point to 14-point' }
    ],
    strategy: 'Make anchor and build - solid positional play',
    alternatives: [
      {
        moves: [
          { from: 11, to: 13, description: 'Bring builder from 12-point to 14-point' },
          { from: 11, to: 14, description: 'Bring builder from 12-point to 15-point' }
        ],
        strategy: 'Double builder - aggressive home board building'
      }
    ]
  },

  '4-5': {
    dice: [4, 5],
    moves: [
      { from: 0, to: 5, description: 'Run from 1-point to 6-point' },
      { from: 0, to: 4, description: 'Run from 1-point to 5-point' }
    ],
    strategy: 'Double run - escape both back checkers'
  },

  '2-5': {
    dice: [2, 5],
    moves: [
      { from: 0, to: 5, description: 'Run from 1-point to 6-point' },
      { from: 11, to: 13, description: 'Bring builder from 12-point to 14-point' }
    ],
    strategy: 'Run one, build one - balanced'
  },

  '1-5': {
    dice: [1, 5],
    moves: [
      { from: 0, to: 5, description: 'Run from 1-point to 6-point' },
      { from: 11, to: 12, description: 'Bring builder from 12-point to 13-point' }
    ],
    strategy: 'Run and slot - creating options'
  },

  '1-4': {
    dice: [1, 4],
    moves: [
      { from: 0, to: 4, description: 'Split from 1-point to 5-point' },
      { from: 11, to: 12, description: 'Bring builder from 12-point to 13-point' }
    ],
    strategy: 'Split and slot - aggressive builder play'
  },

  '3-6': {
    dice: [3, 6],
    moves: [
      { from: 0, to: 6, description: 'Run from 1-point to 7-point' },
      { from: 0, to: 3, description: 'Run from 1-point to 4-point' }
    ],
    strategy: 'Double run - escape back checkers'
  },

  '2-6': {
    dice: [2, 6],
    moves: [
      { from: 0, to: 6, description: 'Run from 1-point to 7-point' },
      { from: 11, to: 13, description: 'Bring builder from 12-point to 14-point' }
    ],
    strategy: 'Run one, build one'
  }
};

/**
 * Check if we're in opening position (first move of game)
 */
export function isOpeningPosition(turnCount: number, moveCount: number): boolean {
  // Opening book applies to first move only (turn 0 or 1, move 0)
  return turnCount <= 1 && moveCount === 0;
}

/**
 * Get opening move from book for given dice
 */
export function getOpeningMove(dice: number[]): OpeningMove | null {
  // Normalize dice to smaller-larger order
  const sortedDice = [...dice].sort((a, b) => a - b);
  const key = `${sortedDice[0]}-${sortedDice[1]}`;

  return OPENING_BOOK[key] || null;
}

/**
 * Convert book move to actual Move objects with checker IDs
 * @param bookMove The opening book move
 * @param player The player making the move
 * @param getCheckerId Function to get checker ID at a position
 */
export function convertBookMoveToActual(
  bookMove: OpeningMove,
  player: Player,
  getCheckerId: (position: number) => string | null
): Move[] | null {
  const moves: Move[] = [];

  for (const moveDesc of bookMove.moves) {
    const checkerId = getCheckerId(moveDesc.from);
    if (!checkerId) {
      // If we can't find a checker at the expected position, book doesn't apply
      return null;
    }

    moves.push({
      checkerId,
      from: moveDesc.from,
      to: moveDesc.to,
      distance: Math.abs(moveDesc.to - moveDesc.from)
    });
  }

  return moves;
}

/**
 * Get random variation of opening move (for variety)
 * Returns the standard move with small probability of alternative
 */
export function getOpeningMoveWithVariation(
  dice: number[],
  variationRate: number = 0.1 // 10% chance of not using book
): OpeningMove | null {
  if (Math.random() < variationRate) {
    return null; // Use normal evaluation instead
  }

  return getOpeningMove(dice);
}

/**
 * Get opening move with possibility of using alternative
 * Phase 2.5 Priority 2: Provides access to alternative sound moves
 * @param dice The dice roll
 * @param useAlternative If true and alternatives exist, randomly select from them
 * @returns Opening move (possibly alternative) or null
 */
export function getOpeningMoveWithAlternatives(
  dice: number[],
  useAlternative: boolean = false
): OpeningMove | null {
  const opening = getOpeningMove(dice);
  if (!opening) return null;

  // If not using alternatives or no alternatives exist, return standard move
  if (!useAlternative || !opening.alternatives || opening.alternatives.length === 0) {
    return opening;
  }

  // Randomly choose between standard move and alternatives
  const allOptions = [
    { moves: opening.moves, strategy: opening.strategy },
    ...opening.alternatives
  ];

  const chosen = allOptions[Math.floor(Math.random() * allOptions.length)];

  return {
    dice: opening.dice,
    moves: chosen.moves,
    strategy: chosen.strategy
  };
}
