'use client';

import { useState } from 'react';
import { useMatchStore } from '@/lib/studio/ludo/game/stores/matchStore';
import { useFlowStore } from '@/lib/studio/ludo/game/stores/flowStore';
import { useSettingsStore } from '@/lib/studio/ludo/settings/store';
import { PlayMode, MatchConfiguration, DEFAULT_MATCH_CONFIG } from '@/lib/studio/ludo/game/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AIOpponentConfig } from '@/components/studio/ludo/UI/AIOpponentConfig';
import { MatchSetup } from '@/components/studio/ludo/UI/MatchSetup';
import { SettingsModal } from '@/components/studio/ludo/UI/SettingsModal';
import { AuditConfigComponent, AuditConfig } from '@/components/studio/ludo/UI/AuditConfig';
// TODO: adapt to jfriis auth
// import { useUser } from '@/lib/hooks/useUser';
const useUser = () => ({ user: null, isAuthenticated: false });

type GameTypeSelection = 'single' | 'match';

export function SettingsScreen() {
  // Match state from matchStore
  const { startMatch } = useMatchStore();

  // Flow/player state from flowStore
  const {
    playMode,
    setPlayMode,
    startGameFromSettings
  } = useFlowStore();

  const { theme, openSettings } = useSettingsStore();
  const { isAuthenticated, user } = useUser();

  const [matchConfig, setMatchConfig] = useState<MatchConfiguration & { gameType: GameTypeSelection }>({
    ...DEFAULT_MATCH_CONFIG,
    gameType: 'single'
  });

  const [auditConfig, setAuditConfig] = useState<AuditConfig>({
    enabled: false,
    mode: 'observable',
    enableMCTS: false
  });

  const [enableMCTS, setEnableMCTS] = useState(false);

  const handleStartGame = async () => {
    // Prepare configuration based on game type
    const finalConfig: MatchConfiguration = matchConfig.gameType === 'single'
      ? {
          enabled: false,
          targetPoints: 1,
          doublingCubeEnabled: matchConfig.doublingCubeEnabled,
          useJacobyRule: matchConfig.useJacobyRule,
          automaticDoubles: matchConfig.automaticDoubles,
          useCrawfordRule: false,
          maxDoubles: 64
        }
      : {
          ...matchConfig,
          enabled: true
        };

    // Auto-enable audit for AI vs AI mode
    const finalAuditConfig = playMode === PlayMode.AI_VS_AI && isAuthenticated
      ? {
          enabled: true,
          mode: 'observable' as const,
          notes: 'AI vs AI Observable Mode',
          enableMCTS: true  // Always enable MCTS for AI vs AI
        }
      : (auditConfig.enabled || enableMCTS) ? {
          enabled: auditConfig.enabled,
          mode: auditConfig.mode,
          notes: auditConfig.notes,
          enableMCTS: enableMCTS
        } : undefined;

    // Initialize match/game with configuration
    startMatch(finalConfig, finalAuditConfig);

    // Transition to PLAYING state
    startGameFromSettings();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl"></CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Match Configuration - moved to top */}
              <MatchSetup
                value={matchConfig}
                onChange={setMatchConfig}
              />

              {/* Play Mode Selection */}
              <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant={playMode === PlayMode.TWO_PLAYER ? "default" : "outline"}
                    onClick={() => setPlayMode(PlayMode.TWO_PLAYER)}
                    className="justify-start"
                  >
                    👥 Two Player
                  </Button>
                  <Button
                    variant={playMode === PlayMode.AI_OPPONENT ? "default" : "outline"}
                    onClick={() => setPlayMode(PlayMode.AI_OPPONENT)}
                    className="justify-start"
                  >
                    🤖 vs AI Opponent
                  </Button>
                  <Button
                    variant={playMode === PlayMode.AI_VS_AI ? "default" : "outline"}
                    onClick={() => setPlayMode(PlayMode.AI_VS_AI)}
                    className="justify-start"
                  >
                    🤖🆚🤖 AI vs AI (Observable)
                  </Button>
                  <Button
                    variant={playMode === PlayMode.NETWORK_MULTIPLAYER ? "default" : "outline"}
                    onClick={() => setPlayMode(PlayMode.NETWORK_MULTIPLAYER)}
                    className="justify-start"
                    disabled
                  >
                    🌐 Network Multiplayer (Coming Soon)
                  </Button>
                </div>

              {/* AI Opponent Configuration (if AI mode selected) */}
              {playMode === PlayMode.AI_OPPONENT && (
                <AIOpponentConfig />
              )}

              {/* AI vs AI Configuration (if AI vs AI mode selected) */}
              {playMode === PlayMode.AI_VS_AI && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs">
                    <p className="text-blue-400 font-medium mb-1">🤖🆚🤖 AI vs AI Observable Mode</p>
                    <p className="text-gray-300">
                      Watch two AIs compete in real-time with full gameplay logging.
                      Both players will be set to AI (Medium/Balanced).
                      {isAuthenticated ? ' Audit logging will be automatically enabled.' : ' Login required for audit logging.'}
                    </p>
                  </div>
                  {!isAuthenticated && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs">
                      <p className="text-yellow-400">
                        ⚠️ You must be logged in to use AI vs AI mode with audit logging.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* MCTS Evaluation Logging (if authenticated and Hard/Expert AI) */}
              {isAuthenticated && (playMode === PlayMode.AI_OPPONENT || playMode === PlayMode.AI_VS_AI) && (
                <div className="border border-purple-500/30 rounded-lg p-4 bg-purple-500/5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableMCTS}
                      onChange={(e) => setEnableMCTS(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">📊 Enable MCTS Evaluation Logging</span>
                  </label>
                  <p className="text-xs text-gray-400 mt-2">
                    Log MCTS search tree data for Hard/Expert AI (⚠️ ~1 sec per move). View data at /training.
                  </p>
                </div>
              )}

              {/* Audit Configuration (if authenticated) */}
              {isAuthenticated && (
                <AuditConfigComponent
                  value={auditConfig}
                  onChange={setAuditConfig}
                  isAuthenticated={isAuthenticated}
                />
              )}

              {/* Settings Link - Visual Theme */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-sm">Visual Theme</h3>
                    <p className="text-xs text-muted-foreground">
                      Current: <span className="font-medium">{theme === 'classic' ? '🎲 Classic' : '✨ Modern'}</span>
                    </p>
                  </div>
                  <Button
                    onClick={() => openSettings()}
                    variant="outline"
                    size="sm"
                  >
                    Change Theme
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Adjust visual settings, audio, and more in Settings (press Esc)
                </p>
              </div>

              {/* Start Game Button - dynamic text */}
              <Button
                onClick={handleStartGame}
                className="w-full"
                size="lg"
              >
                {matchConfig.gameType === 'single'
                  ? 'Start Single Game'
                  : `Start Match (${matchConfig.targetPoints} points)`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal />
    </>
  );
}
