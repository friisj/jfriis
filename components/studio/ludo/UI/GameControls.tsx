'use client';

import { useMemo, useState } from 'react';
import { useGameStore } from '@/lib/studio/ludo/game/stores/gameStore';
import { useMatchStore } from '@/lib/studio/ludo/game/stores/matchStore';
import { useFlowStore } from '@/lib/studio/ludo/game/stores/flowStore';
import { useHistoryStore } from '@/lib/studio/ludo/game/stores/historyStore';
import { useDebugStore } from '@/lib/studio/ludo/game/stores/debugStore';
import { Player, DEBUG_GAME_STATES, GameType, GameValue, PlayerType } from '@/lib/studio/ludo/game/types';
import { GameRules } from '@/lib/studio/ludo/game/rules';
import { MatchManager } from '@/lib/studio/ludo/game/match';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// TODO: adapt to jfriis auth
// import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
const useKeyboardShortcuts = (_shortcuts: unknown[]) => {};

export default function GameControls() {
  // Game state from gameStore
  const {
    board,
    currentPlayer,
    dice,
    usedDice,
    gamePhase,
    winner,
    availableMoves,
    rollDice,
    switchTurn,
    moveChecker,
  } = useGameStore();

  // Match state from matchStore
  const {
    gameType,
    matchState,
    endCurrentGame,
    startNextGame,
    resignGame
  } = useMatchStore();

  // Flow/player state from flowStore
  const {
    players,
    newMatchSettings,
    restartCurrentGame
  } = useFlowStore();

  // Debug state
  const { debugMode, toggleDebugMode, loadDebugState } = useDebugStore();
  const {
    autoPlay,
    turnHistory,
    toggleAutoPlay,
    undoLastMove
  } = useHistoryStore();

  // Local state for resign menu
  const [showResignOptions, setShowResignOptions] = useState(false);

  // Memoize pip count calculations to avoid unnecessary recomputation
  const whitePips = useMemo(() => GameRules.calculatePipCount(board, Player.WHITE), [board]);
  const blackPips = useMemo(() => GameRules.calculatePipCount(board, Player.BLACK), [board]);

  const getGameStatus = () => {
    if (winner) {
      if (gameType === GameType.MATCH && matchState) {
        const gameValue = MatchManager.calculateGameValue(board, winner);
        const gameValueText = gameValue === GameValue.SINGLE ? 'wins' :
          gameValue === GameValue.GAMMON ? 'wins with GAMMON' :
          'wins with BACKGAMMON';
        return `🎉 ${winner.toUpperCase()} ${gameValueText}!`;
      }
      return `🎉 ${winner.toUpperCase()} WINS!`;
    }

    switch (gamePhase) {
      case 'setup':
        return 'Click "Roll Dice" to start the game';
      case 'rolling':
        return `${currentPlayer.toUpperCase()}'s turn - Click "Roll Dice"`;
      case 'moving':
        return `${currentPlayer.toUpperCase()}'s turn - Make your move (${availableMoves.length} moves available)`;
      case 'forced_move':
        return `${currentPlayer.toUpperCase()}'s turn - Playing forced move...`;
      case 'no_moves':
        return `${currentPlayer.toUpperCase()} has no legal moves - ${autoPlay ? 'Switching turns...' : 'Click "Next Turn"'}`;
      case 'finished':
        if (gameType === GameType.MATCH && matchState?.matchWinner) {
          return `🏆 MATCH COMPLETE! ${matchState.matchWinner.toUpperCase()} WINS THE MATCH!`;
        }
        return 'Game finished';
      default:
        return 'Game in progress';
    }
  };

  const canRollDice = gamePhase === 'setup' || gamePhase === 'rolling';
  const canUndo = turnHistory.length > 0 && gamePhase === 'moving';
  const needsManualProgression = !autoPlay && (
    gamePhase === 'no_moves' ||
    (gamePhase === 'moving' && availableMoves.length === 1)
  );

  // Keyboard shortcuts (memoized for performance)
  const shortcuts = useMemo(() => [
    {
      key: 'r',
      action: rollDice,
      enabled: canRollDice,
      description: 'Roll dice (R)'
    },
    {
      key: 'u',
      action: () => undoLastMove(),
      enabled: canUndo,
      description: 'Undo last move (U)'
    },
    {
      key: 'n',
      action: restartCurrentGame,
      enabled: true,
      description: 'Restart game (N)'
    },
    {
      key: ' ',
      action: () => {
        if (gamePhase === 'no_moves' && availableMoves.length === 0) {
          switchTurn();
        } else if (availableMoves.length === 1 && !autoPlay) {
          moveChecker(availableMoves[0]);
        }
      },
      enabled: needsManualProgression,
      description: 'Next turn / Play forced move (Space)'
    },
    {
      key: 'd',
      action: toggleDebugMode,
      enabled: true,
      description: 'Toggle debug/3D mode (D)'
    },
    {
      key: 'a',
      action: toggleAutoPlay,
      enabled: true,
      description: 'Toggle auto progression (A)'
    }
  ], [canRollDice, canUndo, needsManualProgression, rollDice, undoLastMove, restartCurrentGame,
      gamePhase, availableMoves, autoPlay, switchTurn, moveChecker, toggleDebugMode, toggleAutoPlay]);

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="space-y-4" role="complementary" aria-label="Game controls and information">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            <span aria-label={`Current player is ${currentPlayer}`}>
              {currentPlayer === Player.WHITE ? '⚪' : '⚫'} Current Player: {currentPlayer.toUpperCase()}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center" role="status" aria-live="polite">
            <p className="text-sm text-muted-foreground">
              {getGameStatus()}
            </p>
          </div>

          {dice && (
            <div className="flex justify-center space-x-2" role="region" aria-label="Dice results">
              <div className="text-center">
                <p className="text-xs text-muted-foreground" id="dice-label">Dice:</p>
                <div className="flex space-x-1" aria-labelledby="dice-label">
                  {dice.map((value, index) => (
                    <div
                      key={index}
                      className={`
                        w-8 h-8 border-2 flex items-center justify-center text-sm font-bold rounded transition-all
                        ${usedDice[index]
                          ? 'border-gray-400 bg-gray-200 text-gray-500 line-through'
                          : 'border-gray-300 bg-white text-black'
                        }
                      `}
                      role="img"
                      aria-label={`Dice ${index + 1}: ${value}, ${usedDice[index] ? 'used' : 'available'}`}
                      title={usedDice[index] ? 'Used' : 'Available'}
                    >
                      {value}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col space-y-2" role="group" aria-label="Game action buttons">
            <Button
              onClick={rollDice}
              disabled={!canRollDice}
              className="w-full"
              aria-label={canRollDice ? "Roll dice to start your turn" : "Cannot roll dice now"}
            >
              {gamePhase === 'rolling' ? 'Rolling...' : 'Roll Dice'}
            </Button>

            {/* Match game completion buttons */}
            {gameType === GameType.MATCH && winner && !matchState?.matchWinner && (
              <Button
                onClick={() => {
                  endCurrentGame();
                  // Auto-start next game after a delay
                  setTimeout(() => startNextGame(), 1000);
                }}
                variant="default"
                className="w-full"
              >
                Next Game →
              </Button>
            )}

            {/* Match finished - offer new match settings */}
            {gameType === GameType.MATCH && matchState?.matchWinner && (
              <Button
                onClick={newMatchSettings}
                variant="default"
                className="w-full"
              >
                🏆 New Match Settings
              </Button>
            )}

            {/* Single game - offer both restart and new settings */}
            {gameType !== GameType.MATCH && !winner && (
              <>
                <Button
                  onClick={restartCurrentGame}
                  variant="outline"
                  className="w-full"
                >
                  ↻ Restart Game
                </Button>
                <Button
                  onClick={newMatchSettings}
                  variant="outline"
                  className="w-full"
                >
                  ⚙️ New Game Settings
                </Button>
              </>
            )}

            {/* Single game finished - offer restart or new settings */}
            {gameType !== GameType.MATCH && winner && (
              <>
                <Button
                  onClick={restartCurrentGame}
                  variant="default"
                  className="w-full"
                >
                  ↻ Play Again
                </Button>
                <Button
                  onClick={newMatchSettings}
                  variant="outline"
                  className="w-full"
                >
                  ⚙️ New Game Settings
                </Button>
              </>
            )}

            {/* Active match - offer restart current game or abandon match */}
            {gameType === GameType.MATCH && !winner && !matchState?.matchWinner && (
              <>
                <Button
                  onClick={restartCurrentGame}
                  variant="outline"
                  className="w-full"
                >
                  ↻ Restart Game
                </Button>
                <Button
                  onClick={newMatchSettings}
                  variant="outline"
                  className="w-full text-orange-600 hover:text-orange-700 border-orange-300 hover:border-orange-400"
                >
                  ⚙️ Abandon Match
                </Button>
              </>
            )}

            <Button
              onClick={toggleDebugMode}
              variant={debugMode ? "default" : "outline"}
              className="w-full"
            >
              {debugMode ? "🔧 Debug Mode ON" : "🎮 3D Mode"}
            </Button>

            <Button
              onClick={toggleAutoPlay}
              variant={autoPlay ? "default" : "outline"}
              className="w-full"
              title={autoPlay ? "Automatically switches turns and plays forced moves" : "Manual control - click buttons to progress"}
            >
              {autoPlay ? "⚡ Auto Progression" : "🎯 Manual Control"}
            </Button>

            {canUndo && (
              <Button
                onClick={() => undoLastMove()}
                variant="outline"
                className="w-full"
              >
                ↶ Undo Last Move
              </Button>
            )}

            {/* Resign Button - Only show for active gameplay by human players */}
            {gamePhase !== 'setup' &&
             gamePhase !== 'finished' &&
             players[currentPlayer].type === PlayerType.HUMAN &&
             !winner && (
              <div className="space-y-2">
                {!showResignOptions ? (
                  <Button
                    onClick={() => setShowResignOptions(true)}
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                  >
                    🏳️ Resign
                  </Button>
                ) : (
                  <div className="space-y-2 border-2 border-red-300 rounded-lg p-2 bg-red-50/50">
                    <div className="text-xs text-center text-muted-foreground font-medium">
                      Select resign value:
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <Button
                        onClick={() => {
                          resignGame(GameValue.SINGLE);
                          setShowResignOptions(false);
                        }}
                        variant="outline"
                        size="sm"
                        className="text-xs"
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
                        className="text-xs"
                        title="Resign at gammon value (2 points × cube) - requires opponent has borne off"
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
                        className="text-xs"
                        title="Resign at backgammon value (3 points × cube) - requires opponent borne off AND you have checkers on bar/opponent home"
                      >
                        BG
                      </Button>
                    </div>
                    <Button
                      onClick={() => setShowResignOptions(false)}
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}

            {needsManualProgression && (
              <Button
                onClick={() => {
                  if (gamePhase === 'no_moves' && availableMoves.length === 0) {
                    switchTurn();
                  } else if (availableMoves.length === 1) {
                    moveChecker(availableMoves[0]);
                  }
                }}
                className="w-full"
                variant="default"
                disabled={gamePhase === 'no_moves' && availableMoves.length > 0}
              >
                {gamePhase === 'no_moves' ? "Next Turn" : "Play Forced Move"}
              </Button>
            )}
          </div>

          {gamePhase === 'moving' && availableMoves.length > 0 && (
            <div className="text-xs text-center text-muted-foreground">
              <p>Click a checker to select it, then click a destination point</p>
            </div>
          )}

          <div className="mt-4 pt-3 border-t" role="region" aria-label="Pip count scores">
            <h4 className="font-semibold mb-2 text-sm" id="pip-count-label">Pip Count:</h4>
            <div className="space-y-1 text-sm" aria-labelledby="pip-count-label">
              <div className="flex justify-between" aria-label={`White player has ${whitePips} pips`}>
                <span className="flex items-center gap-1">
                  ⚪ White:
                </span>
                <span className="font-mono" aria-live="polite">{whitePips}</span>
              </div>
              <div className="flex justify-between" aria-label={`Black player has ${blackPips} pips`}>
                <span className="flex items-center gap-1">
                  ⚫ Black:
                </span>
                <span className="font-mono" aria-live="polite">{blackPips}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How to Play:</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2 text-muted-foreground">
          <div className="space-y-1">
            <p>• Roll dice to start your turn</p>
            <p>• Click a checker to select it, then click destination</p>
            <p>• Double-click checkers with green rings to auto-move</p>
            <p>• Used dice are crossed out</p>
            <p>• Auto Progression: automatically switches turns and plays forced moves</p>
            <p>• Manual Control: click buttons to progress when needed</p>
            <p>• Lower pip count means closer to winning</p>
          </div>

          <div className="pt-2 border-t space-y-1">
            <p className="font-semibold text-foreground">Keyboard Shortcuts:</p>
            <p>• <kbd className="px-1 py-0.5 bg-muted rounded text-foreground">R</kbd> - Roll dice</p>
            <p>• <kbd className="px-1 py-0.5 bg-muted rounded text-foreground">U</kbd> - Undo last move</p>
            <p>• <kbd className="px-1 py-0.5 bg-muted rounded text-foreground">N</kbd> - Restart game</p>
            <p>• <kbd className="px-1 py-0.5 bg-muted rounded text-foreground">Space</kbd> - Next turn / Forced move</p>
            <p>• <kbd className="px-1 py-0.5 bg-muted rounded text-foreground">D</kbd> - Toggle debug mode</p>
            <p>• <kbd className="px-1 py-0.5 bg-muted rounded text-foreground">A</kbd> - Toggle auto progression</p>
          </div>
        </CardContent>
      </Card>

      {process.env.NODE_ENV === 'development' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-xs">Debug States</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.keys(DEBUG_GAME_STATES).map((stateName) => (
                <Button
                  key={stateName}
                  onClick={() => loadDebugState(stateName)}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                >
                  Load: {stateName.replace('-', ' ')}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xs">Debug Info</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1">
              <p>Game Phase: {gamePhase}</p>
              <p>Available Moves: {availableMoves.length}</p>
              {dice && <p>Dice: [{dice.join(', ')}]</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}