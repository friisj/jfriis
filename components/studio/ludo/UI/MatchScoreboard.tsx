'use client';

import { memo } from 'react';
import { useMatchStore } from '@/lib/studio/ludo/game/stores/matchStore';
import { Player, GameType } from '@/lib/studio/ludo/game/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MatchManager } from '@/lib/studio/ludo/game/match';

export const MatchScoreboard = memo(function MatchScoreboard() {
  // Match state from matchStore
  const { gameType, matchState, doublingCube } = useMatchStore();

  // Only show if we're in a match
  if (gameType !== GameType.MATCH || !matchState) {
    return null;
  }

  const whiteScore = matchState.scores[Player.WHITE];
  const blackScore = matchState.scores[Player.BLACK];
  const targetPoints = matchState.configuration.targetPoints;

  const matchStatus = MatchManager.getMatchStatus(matchState);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-lg">Match Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score Display */}
        <div className="flex justify-between items-center text-lg">
          <div className="flex-1 text-center">
            <div className="font-bold text-2xl">{whiteScore}</div>
            <div className="text-xs text-muted-foreground">⚪ White</div>
          </div>
          <div className="text-muted-foreground">-</div>
          <div className="flex-1 text-center">
            <div className="font-bold text-2xl">{blackScore}</div>
            <div className="text-xs text-muted-foreground">⚫ Black</div>
          </div>
        </div>

        {/* Target Score */}
        <div className="text-center text-sm text-muted-foreground">
          First to {targetPoints} points
        </div>

        {/* Game Number */}
        <div className="text-center text-xs text-muted-foreground border-t pt-2">
          Game {matchState.currentGameNumber}
          {matchState.gamesPlayed > 0 && ` of ${matchState.gamesPlayed + 1}`}
        </div>

        {/* Crawford/Post-Crawford Indicator */}
        {matchState.isCrawfordGame && (
          <div className="text-center bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 text-xs py-1 px-2 rounded">
            🎯 CRAWFORD GAME - No doubling
          </div>
        )}
        {matchState.isPostCrawford && !matchState.isCrawfordGame && (
          <div className="text-center bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 text-xs py-1 px-2 rounded">
            📊 POST-CRAWFORD
          </div>
        )}

        {/* Leading Player */}
        {matchStatus.leadingPlayer && (
          <div className="text-center text-xs text-muted-foreground">
            {matchStatus.leadingPlayer === Player.WHITE ? '⚪' : '⚫'} {matchStatus.leadingPlayer.toUpperCase()} leads by {matchStatus.pointsDifference}
          </div>
        )}

        {/* Doubling Cube */}
        {doublingCube && matchState.configuration.doublingCubeEnabled && (
          <div className="text-center border-t pt-2">
            <div className="text-xs text-muted-foreground">Cube Value</div>
            <div className="font-bold text-lg">{doublingCube.value}</div>
            {doublingCube.owner && (
              <div className="text-xs text-muted-foreground">
                Owned by {doublingCube.owner === Player.WHITE ? '⚪' : '⚫'} {doublingCube.owner.toUpperCase()}
              </div>
            )}
            {!doublingCube.owner && (
              <div className="text-xs text-muted-foreground">
                Centered (both can double)
              </div>
            )}
          </div>
        )}

        {/* Recent Games */}
        {matchState.gameHistory.length > 0 && (
          <div className="border-t pt-2">
            <div className="text-xs font-medium mb-1">Recent Games:</div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {matchState.gameHistory.slice(-3).reverse().map((game) => (
                <div key={game.gameNumber} className="text-xs flex justify-between items-center">
                  <span className="text-muted-foreground">Game {game.gameNumber}:</span>
                  <span>
                    {game.winner === Player.WHITE ? '⚪' : '⚫'} {game.winner.toUpperCase()} +{game.pointsAwarded}
                    {game.gameValue > 1 && (
                      <span className="text-muted-foreground ml-1">
                        ({game.gameValue === 2 ? 'Gammon' : 'Backgammon'})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
