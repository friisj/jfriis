'use client';

import { useGameStore } from '@/lib/studio/ludo/game/stores/gameStore';
import { useMatchStore } from '@/lib/studio/ludo/game/stores/matchStore';
import { useFlowStore } from '@/lib/studio/ludo/game/stores/flowStore';
import { Player, GameValue } from '@/lib/studio/ludo/game/types';
import { GameFlowState } from '@/lib/studio/ludo/game/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function MatchEndScreen() {
  // Game state from gameStore
  const { resetGame } = useGameStore();

  // Match state from matchStore
  const { matchState, startMatch } = useMatchStore();

  // Flow state from flowStore
  const { setGameFlowState } = useFlowStore();

  if (!matchState || !matchState.matchWinner) {
    return null; // Should never happen
  }

  const winnerName = matchState.matchWinner === Player.WHITE ? 'White' : 'Black';
  const finalScore = matchState.scores;

  // Calculate match statistics
  const totalGames = matchState.gameHistory.length;
  const whiteWins = matchState.gameHistory.filter(g => g.winner === Player.WHITE).length;
  const blackWins = matchState.gameHistory.filter(g => g.winner === Player.BLACK).length;
  const gammons = matchState.gameHistory.filter(g => g.gameValue === GameValue.GAMMON).length;
  const backgammons = matchState.gameHistory.filter(g => g.gameValue === GameValue.BACKGAMMON).length;

  const handleNewMatch = () => {
    resetGame();
    setGameFlowState(GameFlowState.SETTINGS);
  };

  const handleRematch = () => {
    // Start new match with same configuration
    startMatch(matchState.configuration);
    setGameFlowState(GameFlowState.PLAYING);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {winnerName} Wins the Match!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Final Score */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-center text-muted-foreground">
              Final Score
            </h3>
            <div className="flex justify-center items-center gap-4 text-2xl">
              <div className="text-center">
                <div className="font-bold">{finalScore[Player.WHITE]}</div>
                <div className="text-sm text-muted-foreground">White</div>
              </div>
              <div className="text-muted-foreground">-</div>
              <div className="text-center">
                <div className="font-bold">{finalScore[Player.BLACK]}</div>
                <div className="text-sm text-muted-foreground">Black</div>
              </div>
            </div>
          </div>

          {/* Match Statistics */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-center text-muted-foreground">
              Match Statistics
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-center p-2 bg-muted rounded">
                <div className="font-bold">{totalGames}</div>
                <div className="text-xs text-muted-foreground">Total Games</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="font-bold">{whiteWins} - {blackWins}</div>
                <div className="text-xs text-muted-foreground">Games Won</div>
              </div>
              {(gammons > 0 || backgammons > 0) && (
                <>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="font-bold">{gammons}</div>
                    <div className="text-xs text-muted-foreground">Gammons</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="font-bold">{backgammons}</div>
                    <div className="text-xs text-muted-foreground">Backgammons</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleRematch}
              className="w-full"
              size="lg"
            >
              Rematch
            </Button>
            <Button
              onClick={handleNewMatch}
              variant="outline"
              className="w-full"
            >
              New Match
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
