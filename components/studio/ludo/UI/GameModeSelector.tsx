'use client';

import { useGameStore } from '@/lib/studio/ludo/game/stores/gameStore';
import { useFlowStore } from '@/lib/studio/ludo/game/stores/flowStore';
import { PlayMode, Player } from '@/lib/studio/ludo/game/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function GameModeSelector() {
  // Game state from gameStore
  const { resetGame } = useGameStore();

  // Flow/player state from flowStore
  const { playMode, players, setPlayMode } = useFlowStore();

  const handleModeChange = (mode: PlayMode) => {
    setPlayMode(mode);
    resetGame(); // Reset game when changing modes
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Play Mode</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant={playMode === PlayMode.TWO_PLAYER ? "default" : "outline"}
              onClick={() => handleModeChange(PlayMode.TWO_PLAYER)}
              className="justify-start"
            >
              👥 Two Player
            </Button>
            <Button
              variant={playMode === PlayMode.AI_OPPONENT ? "default" : "outline"}
              onClick={() => handleModeChange(PlayMode.AI_OPPONENT)}
              className="justify-start"
            >
              🤖 vs AI Opponent
            </Button>
            <Button
              variant={playMode === PlayMode.NETWORK_MULTIPLAYER ? "default" : "outline"}
              onClick={() => handleModeChange(PlayMode.NETWORK_MULTIPLAYER)}
              className="justify-start"
              disabled
            >
              🌐 Network Multiplayer (Coming Soon)
            </Button>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">White:</span>
              <span className="font-medium">{players[Player.WHITE].name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Black:</span>
              <span className="font-medium">{players[Player.BLACK].name}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}