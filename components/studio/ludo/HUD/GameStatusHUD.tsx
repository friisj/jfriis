'use client';

import { useGameStore } from '@/lib/studio/ludo/game/stores/gameStore';
import { useFlowStore } from '@/lib/studio/ludo/game/stores/flowStore';
import { useHistoryStore } from '@/lib/studio/ludo/game/stores/historyStore';
import { Player, PlayerType } from '@/lib/studio/ludo/game/types';
import { Button } from '@/components/ui/button';
import { copyBoard } from '@/lib/studio/ludo/utils/deepCopy';

export function GameStatusHUD() {
  // Game state from gameStore
  const {
    gamePhase,
    currentPlayer,
    dice,
    usedDice,
    availableMoves,
    winner,
    board,
    rollDice,
    switchTurn,
    openingRoll,
    rollOpeningDie
  } = useGameStore();

  // Flow/player state from flowStore
  const { players } = useFlowStore();
  const { undoMove, turnHistory } = useHistoryStore();

  // Calculate pip counts
  const calculatePipCount = (player: Player): number => {
    let total = 0;
    board.forEach(position => {
      if (position.pointIndex < 24) {
        position.checkers
          .filter(c => c.player === player)
          .forEach(c => {
            const distance = player === Player.WHITE
              ? 24 - c.position
              : c.position + 1;
            total += distance;
          });
      }
      if (position.pointIndex === 24) {
        const barCheckers = position.checkers.filter(c => c.player === player).length;
        total += barCheckers * 25;
      }
    });
    return total;
  };

  const whitePipCount = calculatePipCount(Player.WHITE);
  const blackPipCount = calculatePipCount(Player.BLACK);

  const isAIThinking = gamePhase === 'ai_thinking';
  const currentPlayerInfo = players[currentPlayer];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
      <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white min-w-[400px]">
        {/* Header: Player Turn + Pip Counts */}
        <div className="flex items-center justify-between mb-3">
          {/* Current Player Turn */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              currentPlayer === Player.WHITE ? 'bg-gray-300' : 'bg-gray-700'
            }`} />
            <span className="font-bold text-sm uppercase tracking-wide">
              {currentPlayer === Player.WHITE ? 'White' : 'Black'}&apos;s Turn
            </span>
          </div>

          {/* Pip Counts */}
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-gray-400">W:</span>
              <span className="font-mono font-bold">{whitePipCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-400">B:</span>
              <span className="font-mono font-bold">{blackPipCount}</span>
            </div>
          </div>
        </div>

        {/* Dice Display (when rolled) */}
        {dice && dice.length > 0 && (
          <div className="mb-3 flex items-center justify-center gap-2">
            {dice.map((value, index) => {
              // Check if this die was used in any move in turnHistory
              const wasUsedInMove = turnHistory.some(move => move.dieIndex === index);
              const canUndoThisDie = usedDice[index] && wasUsedInMove && gamePhase === 'moving';

              return (
                <div
                  key={index}
                  onClick={() => {
                    if (canUndoThisDie) {
                      undoMove(index, (snapshot) => {
                        useGameStore.setState({
                          board: copyBoard(snapshot.board),
                          usedDice: snapshot.usedDice,
                          availableMoves: snapshot.availableMoves,
                          gamePhase: 'moving',
                          winner: null
                        });
                      });
                    }
                  }}
                  className={`w-10 h-10 rounded flex items-center justify-center font-bold text-lg transition-all relative group ${
                    usedDice[index]
                      ? canUndoThisDie
                        ? 'bg-gray-700/50 text-gray-500 line-through opacity-50 cursor-pointer hover:opacity-70 hover:bg-gray-600/50'
                        : 'bg-gray-700/50 text-gray-500 line-through opacity-50'
                      : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
                  }`}
                  title={canUndoThisDie ? `Click to undo move using ${value}` : undefined}
                >
                  {value}
                  {/* Undo icon overlay on hover */}
                  {canUndoThisDie && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs">↶</span>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="ml-2 text-xs text-gray-400">
              {availableMoves.length} {availableMoves.length === 1 ? 'move' : 'moves'}
            </div>
          </div>
        )}

        {/* Main Action Area */}
        <div className="flex items-center gap-2">
          {/* Opening Roll Phase */}
          {gamePhase === 'opening_roll' && openingRoll && !winner && (
            <div className="flex-1">
              <div className="text-center mb-3">
                <div className="text-sm text-gray-300 mb-2">Opening Roll - Determining Starting Player</div>
                <div className="flex justify-center items-center gap-4">
                  {/* White's Die */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs text-gray-400">White</span>
                    {openingRoll.whiteRoll !== null ? (
                      <div className="w-12 h-12 rounded bg-gradient-to-br from-gray-200 to-gray-400 flex items-center justify-center font-bold text-2xl text-gray-900 shadow-lg">
                        {openingRoll.whiteRoll}
                      </div>
                    ) : players[Player.WHITE].type === PlayerType.HUMAN ? (
                      <Button
                        onClick={() => rollOpeningDie(Player.WHITE)}
                        size="sm"
                        className="w-12 h-12 bg-blue-600 hover:bg-blue-700"
                      >
                        Roll
                      </Button>
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  <span className="text-2xl text-gray-500">vs</span>

                  {/* Black's Die */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs text-gray-400">Black</span>
                    {openingRoll.blackRoll !== null ? (
                      <div className="w-12 h-12 rounded bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center font-bold text-2xl text-white shadow-lg">
                        {openingRoll.blackRoll}
                      </div>
                    ) : players[Player.BLACK].type === PlayerType.HUMAN ? (
                      <Button
                        onClick={() => rollOpeningDie(Player.BLACK)}
                        size="sm"
                        className="w-12 h-12 bg-blue-600 hover:bg-blue-700"
                      >
                        Roll
                      </Button>
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Show reroll count if automatic doubles occurred */}
                {openingRoll.rerollCount > 0 && (
                  <div className="mt-2 text-xs text-yellow-400">
                    Automatic Double! Cube value doubled. Re-rolling... (×{openingRoll.rerollCount})
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Thinking State */}
          {isAIThinking && (
            <div className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-900/30 rounded">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-blue-300">
                {currentPlayerInfo.name} is thinking...
              </span>
            </div>
          )}

          {/* Roll Dice Button */}
          {gamePhase === 'rolling' && !winner && !isAIThinking && (
            <Button
              onClick={() => rollDice()}
              size="lg"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {currentPlayer === Player.WHITE ? 'White' : 'Black'}: Roll Dice
            </Button>
          )}

          {/* Next Turn Button */}
          {gamePhase === 'no_moves' && !winner && !isAIThinking && (
            <Button
              onClick={() => switchTurn()}
              size="lg"
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Next Turn
            </Button>
          )}
        </div>

        {/* Winner Display */}
        {winner && (
          <div className="text-center py-2 text-lg font-bold text-yellow-400">
            🎉 {winner === Player.WHITE ? 'White' : 'Black'} Wins!
          </div>
        )}
      </div>
    </div>
  );
}
