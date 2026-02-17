'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/studio/ludo/game/stores/gameStore';
import { useMatchStore } from '@/lib/studio/ludo/game/stores/matchStore';
import { useFlowStore } from '@/lib/studio/ludo/game/stores/flowStore';
import { useHistoryStore } from '@/lib/studio/ludo/game/stores/historyStore';
import { useSettingsStore } from '@/lib/studio/ludo/settings/store';
import { PlayerType, GameValue } from '@/lib/studio/ludo/game/types';
import { Button } from '@/components/ui/button';
import { MatchScoreboard } from '@/components/studio/ludo/UI/MatchScoreboard';
import { DoublingCube } from '@/components/studio/ludo/UI/DoublingCube';
import { GameStatusHUD } from '@/components/studio/ludo/HUD/GameStatusHUD';
import { AuditEventFeed } from '@/components/studio/ludo/UI/AuditEventFeed';

export function HUD() {
  // Game state from gameStore
  const { winner, gamePhase, currentPlayer } = useGameStore();

  // Match state from matchStore
  const { resignGame, auditConfig } = useMatchStore();

  // Flow/player state from flowStore
  const { restartCurrentGame, newMatchSettings, players } = useFlowStore();
  const { toggleAutoPlay, autoPlay } = useHistoryStore();
  const { openSettings } = useSettingsStore();
  const [showResignOptions, setShowResignOptions] = useState(false);

  const isAIThinking = gamePhase === 'ai_thinking';

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top-Left HUD: Game Controls, Match Info */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto">
        <div className="flex gap-2">
          <Button
            onClick={() => newMatchSettings()}
            variant="outline"
            size="sm"
            className="bg-black/30 hover:bg-black/50 text-white border-white/20"
            title="Configure new game settings"
          >
            New Game
          </Button>
          <Button
            onClick={() => restartCurrentGame()}
            variant="outline"
            size="sm"
            className="bg-black/30 hover:bg-black/50 text-white border-white/20"
            title="Restart game with same settings"
          >
            ↻ Restart
          </Button>
          {/* Resign Button - Only for human players during active gameplay */}
          {gamePhase !== 'setup' &&
           gamePhase !== 'finished' &&
           gamePhase !== 'opening_roll' &&
           players[currentPlayer].type === PlayerType.HUMAN &&
           !winner &&
           !isAIThinking && (
            <Button
              onClick={() => setShowResignOptions(!showResignOptions)}
              variant="outline"
              size="sm"
              className="bg-red-900/30 hover:bg-red-900/50 text-red-200 border-red-500/30"
              title="Resign current game"
            >
              🏳️
            </Button>
          )}
        </div>

        {/* Resign Options Menu */}
        {showResignOptions && gamePhase !== 'finished' && !winner && (
          <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-white/10">
            <div className="text-xs text-center text-gray-400 mb-2">
              Select resign value:
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  resignGame(GameValue.SINGLE);
                  setShowResignOptions(false);
                }}
                variant="outline"
                size="sm"
                className="bg-black/30 hover:bg-black/50 text-white border-white/20 text-xs"
                title="Resign at normal value (1 point × cube)"
              >
                Single
              </Button>
              <Button
                onClick={() => {
                  resignGame(GameValue.GAMMON);
                  setShowResignOptions(false);
                }}
                variant="outline"
                size="sm"
                className="bg-black/30 hover:bg-black/50 text-white border-white/20 text-xs"
                title="Resign at gammon value (2 points × cube)"
              >
                Gammon
              </Button>
              <Button
                onClick={() => {
                  resignGame(GameValue.BACKGAMMON);
                  setShowResignOptions(false);
                }}
                variant="outline"
                size="sm"
                className="bg-black/30 hover:bg-black/50 text-white border-white/20 text-xs"
                title="Resign at backgammon value (3 points × cube)"
              >
                Backgammon
              </Button>
              <Button
                onClick={() => setShowResignOptions(false)}
                variant="ghost"
                size="sm"
                className="text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <MatchScoreboard />
        <DoublingCube />
      </div>

      {/* Top-Right HUD: Settings & Auto-play */}
      <div className="absolute top-4 right-4 flex gap-2 pointer-events-auto">
        {/* Auto-play Toggle */}
        {!winner && !isAIThinking && (
          <Button
            onClick={toggleAutoPlay}
            variant={autoPlay ? "default" : "outline"}
            size="sm"
            className="bg-black/30 hover:bg-black/50 text-white border-white/20"
            title={autoPlay ? "Auto-progression enabled" : "Auto-progression disabled"}
          >
            {autoPlay ? "⚡ Auto" : "Manual"}
          </Button>
        )}
        <Button
          onClick={() => openSettings()}
          variant="outline"
          size="sm"
          className="bg-black/30 hover:bg-black/50 text-white border-white/20"
          title="Open settings (Esc)"
        >
          ⚙️ Settings
        </Button>
      </div>

      {/* Bottom-Center HUD: Game Status (consolidated) */}
      <GameStatusHUD />

      {/* Event Feed (if audit enabled) */}
      {auditConfig?.enabled && <AuditEventFeed />}
    </div>
  );
}
