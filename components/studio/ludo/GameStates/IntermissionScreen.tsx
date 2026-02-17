'use client';

import { useGameStore } from '@/lib/studio/ludo/game/stores/gameStore';
import { useMatchStore } from '@/lib/studio/ludo/game/stores/matchStore';
import { Player, GameValue } from '@/lib/studio/ludo/game/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MatchManager } from '@/lib/studio/ludo/game/match';

export function IntermissionScreen() {
  // Game state from gameStore
  const { winner, board } = useGameStore();

  // Match state from matchStore
  const { matchState, startNextGame } = useMatchStore();

  if (!winner || !matchState) {
    return null; // Should never happen
  }

  // Calculate game value (single/gammon/backgammon)
  const gameValue = MatchManager.calculateGameValue(board, winner);
  const gameType = gameValue === GameValue.SINGLE ? 'game' :
                   gameValue === GameValue.GAMMON ? 'gammon' :
                   'backgammon';

  const winnerName = winner === Player.WHITE ? 'White' : 'Black';
  const currentScore = matchState.scores;
  const targetPoints = matchState.configuration.targetPoints;

  const handleNextGame = () => {
    startNextGame();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {winnerName} Wins{gameValue > GameValue.SINGLE ? ` a ${gameType.charAt(0).toUpperCase() + gameType.slice(1)}` : ''}!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Match Score */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-center text-muted-foreground">
              Match Score
            </h3>
            <div className="flex justify-center items-center gap-4 text-xl">
              <div className="text-center">
                <div className="font-bold">{currentScore[Player.WHITE]}</div>
                <div className="text-sm text-muted-foreground">White</div>
              </div>
              <div className="text-muted-foreground">-</div>
              <div className="text-center">
                <div className="font-bold">{currentScore[Player.BLACK]}</div>
                <div className="text-sm text-muted-foreground">Black</div>
              </div>
            </div>
          </div>

          {/* Match Progress */}
          <div className="text-center text-sm text-muted-foreground">
            First to {targetPoints} points
            {matchState.isCrawfordGame && (
              <div className="mt-1 text-yellow-600 font-medium">
                Crawford Game
              </div>
            )}
          </div>

          {/* Next Game Button */}
          <Button
            onClick={handleNextGame}
            className="w-full"
            size="lg"
          >
            Next Game
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
