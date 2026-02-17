import { create } from 'zustand';
import { Player, BoardPosition, DEBUG_GAME_STATES } from '../types';
import { logger } from '../../utils/logger';
import { copyBoard } from '../../utils/deepCopy';
import { useGameStore } from './gameStore';

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface DebugStoreState {
  // Debug mode flag
  debugMode: boolean;
}

// ============================================================================
// ACTIONS INTERFACE
// ============================================================================

interface DebugStoreActions {
  // Debug mode
  toggleDebugMode: () => void;
  setDebugMode: (enabled: boolean) => void;

  // Debug states
  loadDebugState: (stateName: string) => void;
  getAvailableDebugStates: () => string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Initialize board from a setup configuration
 */
function initializeBoardFromSetup(setup: { [position: number]: { player: Player; count: number } }): BoardPosition[] {
  // Initialize empty board (26 positions: 0-23 points, 24 bar, 25 off)
  const board: BoardPosition[] = Array.from({ length: 26 }, (_, index) => ({
    pointIndex: index,
    checkers: []
  }));

  // Place checkers according to setup
  let whiteCheckerId = 0;
  let blackCheckerId = 0;

  Object.entries(setup).forEach(([position, checkerSetup]) => {
    const pos = parseInt(position);
    const boardPosition = board[pos];

    logger.debug(`Setting up point ${pos + 1} (index ${pos}): ${checkerSetup.count} ${checkerSetup.player} checkers`);

    for (let i = 0; i < checkerSetup.count; i++) {
      const checkerId = checkerSetup.player === Player.WHITE ? whiteCheckerId++ : blackCheckerId++;
      boardPosition.checkers.push({
        id: `${checkerSetup.player}-${checkerId}`,
        player: checkerSetup.player,
        position: pos
      });
    }
  });

  return board;
}

// ============================================================================
// ZUSTAND STORE
// ============================================================================

export const useDebugStore = create<DebugStoreState & DebugStoreActions>((set, get) => ({
  // ============================================================================
  // INITIAL STATE
  // ============================================================================

  debugMode: false,

  // ============================================================================
  // DEBUG MODE ACTIONS
  // ============================================================================

  toggleDebugMode: () => {
    set(state => ({ debugMode: !state.debugMode }));
  },

  setDebugMode: (enabled: boolean) => {
    set({ debugMode: enabled });
  },

  // ============================================================================
  // DEBUG STATE ACTIONS
  // ============================================================================

  loadDebugState: (stateName: string) => {
    const debugState = DEBUG_GAME_STATES[stateName];
    if (!debugState) {
      logger.warn(`Debug state '${stateName}' not found`);
      return;
    }

    logger.info(`Loading debug state: ${stateName}`);
    const board = initializeBoardFromSetup(debugState);

    // Update game store with debug state
    useGameStore.setState({
      board: copyBoard(board), // Efficient deep copy
      currentPlayer: Player.WHITE,
      dice: null,
      availableMoves: [],
      gamePhase: 'rolling',
      winner: null,
      usedDice: [false, false],
      selectedChecker: null
    });
  },

  getAvailableDebugStates: () => {
    return Object.keys(DEBUG_GAME_STATES);
  },
}));
