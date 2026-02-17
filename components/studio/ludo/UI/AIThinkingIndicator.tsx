'use client';

import { memo } from 'react';
import { useGameStore } from '@/lib/studio/ludo/game/stores/gameStore';
import { useFlowStore } from '@/lib/studio/ludo/game/stores/flowStore';

export const AIThinkingIndicator = memo(function AIThinkingIndicator() {
  // Game state from gameStore
  const { gamePhase, currentPlayer } = useGameStore();

  // Flow/player state from flowStore
  const { players } = useFlowStore();

  // Only show when AI is thinking
  const isAIThinking = gamePhase === 'ai_thinking';
  const currentPlayerInfo = players[currentPlayer];

  if (!isAIThinking || !currentPlayerInfo.aiSettings) {
    return null;
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 animate-pulse">
      <div className="flex items-center gap-3">
        {/* Animated spinner */}
        <div className="relative w-5 h-5">
          <div className="absolute inset-0 border-2 border-blue-200 dark:border-blue-800 rounded-full"></div>
          <div className="absolute inset-0 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        </div>

        {/* Status text */}
        <div className="flex-1">
          <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
            🤖 {currentPlayerInfo.name} is thinking...
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400">
            Evaluating position ({currentPlayerInfo.aiSettings.difficulty})
          </div>
        </div>
      </div>
    </div>
  );
});
