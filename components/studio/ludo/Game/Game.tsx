'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import TableBoard from '@/components/studio/ludo/Board/TableBoard';

// Dynamically import Board component (contains Three.js) to reduce initial bundle
const Board = dynamic(() => import('@/components/studio/ludo/Board/Board'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-white">
      <div className="text-center">
        <div className="animate-pulse mb-4">🎲</div>
        <div>Loading 3D board...</div>
      </div>
    </div>
  ),
});
import GameControls from '@/components/studio/ludo/UI/GameControls';
import { GameModeSelector } from '@/components/studio/ludo/UI/GameModeSelector';
import { AIOpponentConfig } from '@/components/studio/ludo/UI/AIOpponentConfig';
import { AIThinkingIndicator } from '@/components/studio/ludo/UI/AIThinkingIndicator';
import { MatchSetup } from '@/components/studio/ludo/UI/MatchSetup';
import { MatchScoreboard } from '@/components/studio/ludo/UI/MatchScoreboard';
import { DoublingCube } from '@/components/studio/ludo/UI/DoublingCube';
import { HUD } from '@/components/studio/ludo/HUD/HUD';
import { SettingsScreen } from '@/components/studio/ludo/GameStates/SettingsScreen';
import { IntermissionScreen } from '@/components/studio/ludo/GameStates/IntermissionScreen';
import { MatchEndScreen } from '@/components/studio/ludo/GameStates/MatchEndScreen';
import { SettingsModal } from '@/components/studio/ludo/UI/SettingsModal';
import { ThemeBuilderPanel } from '@/components/studio/ludo/ThemeBuilder/ThemeBuilderPanel';
import { useGameStore } from '@/lib/studio/ludo/game/stores/gameStore';
import { useMatchStore } from '@/lib/studio/ludo/game/stores/matchStore';
import { useFlowStore } from '@/lib/studio/ludo/game/stores/flowStore';
import { useHistoryStore } from '@/lib/studio/ludo/game/stores/historyStore';
import { useDebugStore } from '@/lib/studio/ludo/game/stores/debugStore';
import { useSettingsStore } from '@/lib/studio/ludo/settings/store';
import { useThemeBuilderStoreV2 } from '@/lib/studio/ludo/theme-builder/store-v2';
// TODO: adapt to jfriis auth
// import { useAuthStore } from '@/lib/auth/store';
const useAuthStore = () => ({ initialize: () => {} });
import { GameType, PlayMode, GameFlowState } from '@/lib/studio/ludo/game/types';
import { gameAudioController } from '@/lib/studio/ludo/audio/GameAudioController';
import { getCurrentVariant } from '@/lib/studio/ludo/three/variants';
import { useAudioStore } from '@/lib/studio/ludo/audio/store';

export default function Game() {
  // Game state from gameStore
  const { gamePhase, winner } = useGameStore();

  // Match state from matchStore
  const { gameType, matchState, setupConfig, setSetupConfig, endCurrentGame } = useMatchStore();

  // Flow/player state from flowStore
  const { playMode, gameFlowState } = useFlowStore();

  const { toggleHelpers } = useHistoryStore();
  const { debugMode, toggleDebugMode } = useDebugStore();
  const { toggleSettings } = useSettingsStore();
  const { togglePanel: toggleThemeBuilder } = useThemeBuilderStoreV2();
  const { initialize: initializeAuth } = useAuthStore();
  const { volumeSettings } = useAudioStore();

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Auto-end match games when winner is detected
  useEffect(() => {
    if (winner && gameType === GameType.MATCH && matchState && gamePhase === 'finished') {
      // Only trigger if not already in intermission/match_end flow state
      if (gameFlowState === GameFlowState.PLAYING) {
        console.log('🎯 Winner detected in match play, ending game and updating scores...');
        endCurrentGame();
      }
    }
  }, [winner, gameType, matchState, gamePhase, gameFlowState, endCurrentGame]);

  // Initialize ambient audio with current theme
  useEffect(() => {
    const initAudio = async () => {
      try {
        const variant = getCurrentVariant();
        console.log('🎵 Variant:', variant?.theme?.name, 'Sonic enabled:', variant?.theme?.sonic?.enabled);

        if (variant?.theme?.sonic?.enabled) {
          console.log('📞 Calling gameAudioController.initialize()...');
          await gameAudioController.initialize(variant.theme);
          console.log('✅ Initialize completed');

          // Set enabled state based on volume settings from store
          const shouldEnable = !volumeSettings.muted && volumeSettings.ambient > 0;
          console.log('🔊 Volume settings - muted:', volumeSettings.muted, 'ambient:', volumeSettings.ambient, 'shouldEnable:', shouldEnable);

          gameAudioController.setEnabled(shouldEnable);
          console.log('✅ setEnabled called with:', shouldEnable);
          console.log('✅ isAmbientEnabled now returns:', gameAudioController.isAmbientEnabled());

          console.log('✅ Ambient audio system initialized and enabled state set to:', shouldEnable);
        } else {
          console.log('⚠️ Ambient audio disabled or no sonic config');
        }
      } catch (error) {
        console.error('❌ Failed to initialize ambient audio:', error);
        console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      }
    };

    initAudio();

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up game audio controller');
      gameAudioController.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally only run on mount - volume changes are handled by volume controls

  // No automatic ambient audio start - it's triggered by user clicking "Roll Dice"

  // Global keyboard listeners for 'D' (debug/table view), 'H' (helpers panel), 'Escape' (settings), and 'Shift+T' (theme builder)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger when typing in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 'd') {
        event.preventDefault();
        toggleDebugMode();
      } else if (key === 'h') {
        event.preventDefault();
        toggleHelpers();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        toggleSettings();
      } else if (key === 't' && event.shiftKey) {
        event.preventDefault();
        toggleThemeBuilder();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDebugMode, toggleHelpers, toggleSettings, toggleThemeBuilder]);

  // Render game state screens (settings, intermission, match end)
  if (gameFlowState === GameFlowState.SETTINGS) {
    return (
      <>
        <SettingsScreen />
        <SettingsModal />
        <ThemeBuilderPanel />
      </>
    );
  }

  if (gameFlowState === GameFlowState.INTERMISSION) {
    return (
      <>
        <div className="h-screen relative">
          {/* Show game board in background */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-green-900">
            {debugMode ? (
              <div className="w-full h-full flex items-center justify-center p-4">
                <TableBoard />
              </div>
            ) : (
              <Board />
            )}
          </div>
          {/* Intermission dialog overlay */}
          <IntermissionScreen />
        </div>
        <SettingsModal />
        <ThemeBuilderPanel />
      </>
    );
  }

  if (gameFlowState === GameFlowState.MATCH_END) {
    return (
      <>
        <div className="h-screen relative">
          {/* Show game board in background */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-green-900">
            {debugMode ? (
              <div className="w-full h-full flex items-center justify-center p-4">
                <TableBoard />
              </div>
            ) : (
              <Board />
            )}
          </div>
          {/* Match end dialog overlay */}
          <MatchEndScreen />
        </div>
        <SettingsModal />
        <ThemeBuilderPanel />
      </>
    );
  }

  // Main playing view (PLAYING state)
  return (
    <>
      <div className="h-screen flex">
        {/* Game Board */}
        <div className="flex-1 bg-gradient-to-br from-green-800 to-green-900 relative">
          {debugMode ? (
            <div className="w-full h-full flex items-center justify-center p-4">
              <TableBoard />
            </div>
          ) : (
            <>
              <Board />
              {/* HUD overlays 3D canvas */}
              <HUD />
            </>
          )}
        </div>

        {/* Sidebar (debug mode only, visible in table view) */}
        {debugMode && (
          <div className="w-80 bg-background p-4 overflow-y-auto border-l">
            <div className="space-y-4">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">Ludo Backgammon</h1>
                <p className="text-sm text-muted-foreground">
                  A 3D backgammon experience
                </p>
              </div>

              <GameModeSelector />

              {/* Show AI Configuration if in AI mode */}
              {playMode === PlayMode.AI_OPPONENT && (
                <AIOpponentConfig />
              )}

              {/* Show AI Thinking Indicator when AI is evaluating */}
              <AIThinkingIndicator />

              {/* Show Match Setup if in setup phase and not in a match */}
              {gamePhase === 'setup' && gameType === GameType.SINGLE && (
                <MatchSetup value={setupConfig} onChange={setSetupConfig} />
              )}

              {/* Show Match Scoreboard if in a match */}
              <MatchScoreboard />

              {/* Show Doubling Cube if enabled */}
              <DoublingCube />

              <GameControls />

              <div className="mt-8 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">How to Play:</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Roll dice to start your turn</li>
                  <li>• Click a checker to select it</li>
                  <li>• Click a destination point to move</li>
                  <li>• Move all checkers off the board to win</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
      <SettingsModal />
      <ThemeBuilderPanel />
    </>
  );
}
