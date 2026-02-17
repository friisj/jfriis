import { create } from 'zustand';
import { PendingAnimation } from '../types';
import { logger } from '../../utils/logger';

interface AnimationState {
  pendingAnimations: PendingAnimation[];
  isAnimating: boolean;
}

interface AnimationActions {
  queueAnimation: (animation: PendingAnimation) => void;
  clearAnimation: (onMoveComplete?: (move: any) => void) => void;
  getNextAnimation: () => PendingAnimation | undefined;
}

export const useAnimationStore = create<AnimationState & AnimationActions>((set, get) => ({
  pendingAnimations: [],
  isAnimating: false,

  queueAnimation: (animation) => {
    const state = get();
    logger.debug('🎬 Queueing animation:', animation.id, animation.type, `${animation.from} -> ${animation.to}`);

    set({
      pendingAnimations: [...state.pendingAnimations, animation],
      isAnimating: false // Board component will set this to true when it starts animating
    });
  },

  clearAnimation: (onMoveComplete) => {
    const state = get();

    if (state.pendingAnimations.length === 0) {
      logger.debug('🎬 No animations to clear');
      set({ isAnimating: false });
      return;
    }

    // Remove the first animation from the queue
    const [completed, ...remaining] = state.pendingAnimations;
    logger.debug('🎬 Clearing animation:', completed.id, `${completed.from} -> ${completed.to}`);

    // Execute the actual move now that animation is complete
    // NOTE: Hit animations have no move object (they're reactive, state already updated)
    if (completed.move && onMoveComplete) {
      onMoveComplete(completed.move);
    } else if (!completed.move) {
      logger.debug('🎬 Hit animation complete (no state update needed)');
    }

    set({
      pendingAnimations: remaining,
      isAnimating: false
    });
  },

  getNextAnimation: () => {
    const state = get();
    return state.pendingAnimations[0];
  }
}));
