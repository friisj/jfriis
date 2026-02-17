import { create } from 'zustand';
import { BoardPosition, Move } from '../types';
import { logger } from '../../utils/logger';

interface TurnSnapshot {
  board: BoardPosition[];
  usedDice: boolean[];
  availableMoves: Move[];
  dieIndex: number; // Which die was used for this move
}

interface HistoryState {
  turnHistory: TurnSnapshot[];
  autoPlay: boolean;
  showHelpers: boolean;
}

interface HistoryActions {
  recordTurn: (snapshot: TurnSnapshot) => void;
  undoLastMove: (onRestore?: (state: TurnSnapshot) => void) => void;
  undoMove: (dieIndex: number, onRestore?: (state: TurnSnapshot) => void) => void;
  clearHistory: () => void;
  toggleAutoPlay: () => void;
  toggleHelpers: () => void;
}

export const useHistoryStore = create<HistoryState & HistoryActions>((set, get) => ({
  turnHistory: [],
  autoPlay: true,
  showHelpers: false,

  recordTurn: (snapshot) => {
    set(state => ({
      turnHistory: [...state.turnHistory, snapshot]
    }));
  },

  undoLastMove: (onRestore) => {
    const state = get();
    if (state.turnHistory.length === 0) {
      logger.warn('No moves to undo');
      return;
    }

    const previousState = state.turnHistory[state.turnHistory.length - 1];
    const newHistory = state.turnHistory.slice(0, -1);

    set({ turnHistory: newHistory });

    if (onRestore) {
      onRestore(previousState);
    }
  },

  undoMove: (dieIndex, onRestore) => {
    const state = get();
    if (state.turnHistory.length === 0) {
      logger.warn('No moves to undo');
      return;
    }

    // Find the most recent move with this die index
    let targetMoveIndex = -1;
    for (let i = state.turnHistory.length - 1; i >= 0; i--) {
      if (state.turnHistory[i].dieIndex === dieIndex) {
        targetMoveIndex = i;
        break;
      }
    }

    if (targetMoveIndex === -1) {
      logger.warn(`No move found for die index ${dieIndex}`);
      return;
    }

    const previousState = state.turnHistory[targetMoveIndex];
    const newHistory = state.turnHistory.slice(0, targetMoveIndex);

    set({ turnHistory: newHistory });

    if (onRestore) {
      onRestore(previousState);
    }
  },

  clearHistory: () => {
    set({ turnHistory: [] });
  },

  toggleAutoPlay: () => {
    set(state => ({ autoPlay: !state.autoPlay }));
  },

  toggleHelpers: () => {
    set(state => ({ showHelpers: !state.showHelpers }));
  }
}));
