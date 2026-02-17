'use client';

import { memo } from 'react';
import { useMatchStore } from '@/lib/studio/ludo/game/stores/matchStore';
import { useGameStore } from '@/lib/studio/ludo/game/stores/gameStore';
import { Player } from '@/lib/studio/ludo/game/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const DoublingCube = memo(function DoublingCube() {
  // Game state from gameStore
  const { currentPlayer, gamePhase } = useGameStore();

  // Match state from matchStore
  const {
    doublingCube,
    pendingDouble,
    matchState,
    offerDouble,
    acceptDouble,
    declineDouble
  } = useMatchStore();

  // Only show if doubling cube is enabled
  if (!doublingCube) {
    return null;
  }

  const canOfferDouble =
    gamePhase === 'rolling' &&
    doublingCube.canDouble &&
    !pendingDouble &&
    (!doublingCube.owner || doublingCube.owner === currentPlayer);

  const isPendingForCurrentPlayer =
    pendingDouble && pendingDouble.offeredBy !== currentPlayer;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-sm">Doubling Cube</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Cube Value Display */}
        <div className="text-center">
          <div className="inline-block bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-800 dark:to-amber-900 border-2 border-amber-400 dark:border-amber-600 rounded-lg p-4 shadow-lg">
            <div className="text-4xl font-bold text-amber-900 dark:text-amber-100">
              {doublingCube.value}
            </div>
          </div>
        </div>

        {/* Cube Ownership */}
        <div className="text-center text-xs text-muted-foreground">
          {doublingCube.owner ? (
            <span>
              Owned by {doublingCube.owner === Player.WHITE ? '⚪' : '⚫'}{' '}
              {doublingCube.owner.toUpperCase()}
            </span>
          ) : (
            <span>Centered (both can double)</span>
          )}
        </div>

        {/* Crawford Game Indicator */}
        {matchState?.isCrawfordGame && (
          <div className="text-center bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 text-xs py-1 px-2 rounded">
            Crawford Game - No doubling
          </div>
        )}

        {/* Pending Double Offer */}
        {pendingDouble && (
          <div className="space-y-2 border-t pt-3">
            {isPendingForCurrentPlayer ? (
              <>
                <div className="text-sm font-medium text-center">
                  {pendingDouble.offeredBy === Player.WHITE ? '⚪' : '⚫'}{' '}
                  {pendingDouble.offeredBy.toUpperCase()} offers to double to{' '}
                  {doublingCube.value * 2}
                </div>
                <div className="text-xs text-center text-muted-foreground mb-2">
                  Accept or decline the double
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={acceptDouble} variant="default" size="sm">
                    Accept
                  </Button>
                  <Button onClick={declineDouble} variant="destructive" size="sm">
                    Decline (Resign)
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-sm text-center text-muted-foreground">
                Waiting for opponent&apos;s response...
              </div>
            )}
          </div>
        )}

        {/* Offer Double Button */}
        {!pendingDouble && canOfferDouble && (
          <Button
            onClick={offerDouble}
            className="w-full"
            variant="default"
            size="sm"
          >
            Offer Double to {doublingCube.value * 2}
          </Button>
        )}

        {/* Info Text */}
        {!canOfferDouble && !pendingDouble && doublingCube.canDouble && (
          <div className="text-xs text-center text-muted-foreground">
            {doublingCube.owner && doublingCube.owner !== currentPlayer
              ? 'Opponent owns the cube'
              : gamePhase !== 'rolling'
              ? 'Can only double before rolling'
              : 'Cannot double'}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
