import { create } from 'zustand';
import { createAIPlayer, AI_PRESETS } from '../../ai/players';
import { AIPlayer } from '../../ai/types';
import { Player, Move, BoardPosition, PendingAnimation } from '../types';
import { OFF_POSITION } from '../types';
import { logger } from '../../utils/logger';

interface AIState {
  aiPlayer: AIPlayer | null;
}

interface AIActions {
  setAIPlayer: (player: AIPlayer | null) => void;
  executeAIMove: (
    board: BoardPosition[],
    currentPlayer: Player,
    dice: number[],
    availableMoves: Move[],
    onMoveSelected: (animation: PendingAnimation) => void,
    onThinkingStart: () => void
  ) => Promise<void>;
  createAIPlayerFromPreset: (presetName: keyof typeof AI_PRESETS) => AIPlayer;
}

export const useAIStore = create<AIState & AIActions>((set, get) => ({
  aiPlayer: null,

  setAIPlayer: (player) => {
    set({ aiPlayer: player });
  },

  createAIPlayerFromPreset: (presetName) => {
    const preset = AI_PRESETS[presetName];
    return createAIPlayer(preset);
  },

  executeAIMove: async (board, currentPlayer, dice, availableMoves, onMoveSelected, onThinkingStart) => {
    const state = get();

    if (!state.aiPlayer) {
      logger.warn('executeAIMove called but no AI player configured');
      return;
    }

    if (availableMoves.length === 0) {
      return;
    }

    // Notify that AI is thinking
    onThinkingStart();

    try {
      // Debug: log available moves
      logger.debug('AI available moves:', availableMoves.map(m =>
        `${m.checkerId}: ${m.from} -> ${m.to} (distance: ${m.distance})`
      ));

      // Check if any moves are bear-off moves
      const bearOffMoves = availableMoves.filter(m => m.to === 25);
      if (bearOffMoves.length > 0) {
        logger.debug('AI has bear-off moves available:', bearOffMoves);
      }

      const selectedMove = await state.aiPlayer.evaluatePosition(
        board,
        currentPlayer,
        dice,
        availableMoves
      );

      logger.debug('AI selected move:', selectedMove);

      // Determine animation type
      const targetPosition = board.find(pos => pos.pointIndex === selectedMove.to);
      let animationType: 'move' | 'hit' | 'bear_off' = 'move';

      if (selectedMove.to === OFF_POSITION) {
        animationType = 'bear_off';
      } else if (targetPosition &&
                 targetPosition.checkers.length === 1 &&
                 targetPosition.checkers[0].player !== currentPlayer) {
        animationType = 'hit';
      }

      // Create animation for selected move
      const animation: PendingAnimation = {
        id: `ai-move-${Date.now()}-${Math.random()}`,
        type: animationType,
        checkerId: selectedMove.checkerId,
        from: selectedMove.from,
        to: selectedMove.to,
        timestamp: Date.now(),
        player: currentPlayer,
        move: selectedMove
      };

      // Notify caller with selected animation
      onMoveSelected(animation);

    } catch (error) {
      logger.error('AI move execution failed:', error);
      // Fallback to first available move
      if (availableMoves.length > 0) {
        const fallbackMove = availableMoves[0];
        const animation: PendingAnimation = {
          id: `ai-fallback-${Date.now()}`,
          type: 'move',
          checkerId: fallbackMove.checkerId,
          from: fallbackMove.from,
          to: fallbackMove.to,
          timestamp: Date.now(),
          player: currentPlayer,
          move: fallbackMove
        };
        onMoveSelected(animation);
      }
    }
  }
}));
