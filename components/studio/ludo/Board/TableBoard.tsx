'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/lib/studio/ludo/game/stores/gameStore';
import { Player } from '@/lib/studio/ludo/game/types';

export default function TableBoard() {
  // Game state from gameStore
  const {
    board,
    currentPlayer,
    availableMoves,
    moveChecker,
    gamePhase
  } = useGameStore();

  const [selectedChecker, setSelectedChecker] = useState<string | null>(null);
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
    };
  }, [clickTimeout]);

  const handlePointClick = (pointIndex: number) => {
    if (!selectedChecker || gamePhase !== 'moving') return;

    // Find if there's a valid move to this point
    const move = availableMoves.find(move => 
      move.checkerId === selectedChecker && 
      move.to === pointIndex
    );

    if (move) {
      moveChecker(move);
      setSelectedChecker(null);
    }
  };

  const handleCheckerClick = (checkerId: string) => {
    if (gamePhase !== 'moving') return;

    // Clear any existing timeout
    if (clickTimeout) {
      clearTimeout(clickTimeout);
    }

    // Delay single-click action to allow double-click to take precedence
    const timeout = setTimeout(() => {
      // Get the checker to check if it belongs to current player
      const checker = board
        .flatMap(pos => pos.checkers)
        .find(c => c.id === checkerId);
      
      if (!checker || checker.player !== currentPlayer) return;

      // Check if this checker can move
      const canMove = availableMoves.some(move => move.checkerId === checkerId);
      if (!canMove) return;

      // Toggle selection
      setSelectedChecker(selectedChecker === checkerId ? null : checkerId);
      setClickTimeout(null);
    }, 200); // 200ms delay

    setClickTimeout(timeout);
  };

  const handleCheckerDoubleClick = (checkerId: string) => {
    if (gamePhase !== 'moving') return;

    // Clear the single-click timeout to prevent selection
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
    }

    // Get the checker to check if it belongs to current player
    const checker = board
      .flatMap(pos => pos.checkers)
      .find(c => c.id === checkerId);
    
    if (!checker || checker.player !== currentPlayer) return;

    // Get all moves for this checker
    const checkerMoves = availableMoves.filter(move => move.checkerId === checkerId);
    
    // If no moves available for this checker, do nothing
    if (checkerMoves.length === 0) {
      return;
    }
    
    // Group moves by destination to handle doubles properly
    const movesByDestination = new Map<number, typeof checkerMoves>();
    checkerMoves.forEach(move => {
      if (!movesByDestination.has(move.to)) {
        movesByDestination.set(move.to, []);
      }
      movesByDestination.get(move.to)!.push(move);
    });
    
    // If exactly one unique destination, execute it automatically
    if (movesByDestination.size === 1) {
      // Execute the move directly - use the first move to the destination
      const validMove = Array.from(movesByDestination.values())[0][0];
      moveChecker(validMove);
      setSelectedChecker(null);
    } else {
      // Multiple destinations available - fallback to selection behavior
      setSelectedChecker(selectedChecker === checkerId ? null : checkerId);
    }
  };

  const renderPoint = (pointIndex: number) => {
    const position = board.find(pos => pos.pointIndex === pointIndex);
    if (!position) return null;

    const checkers = position.checkers;
    const isTopRow = pointIndex >= 12;
    
    // Check if this point is a valid destination for selected checker
    const isValidDestination = selectedChecker && availableMoves.some(move => 
      move.checkerId === selectedChecker && move.to === pointIndex
    );
    
    // Check if this point has checkers that can move (when no checker selected)
    const hasMovableCheckers = !selectedChecker && availableMoves.some(move => 
      move.from === pointIndex
    );
    
    return (
      <td 
        key={pointIndex}
        className={`
          border border-gray-400 p-2 min-w-[80px] h-[120px] cursor-pointer
          ${isTopRow ? 'align-top' : 'align-bottom'}
          ${isValidDestination ? 'bg-green-200 hover:bg-green-300' : 
            hasMovableCheckers ? 'bg-blue-100 hover:bg-blue-200' : 
            'hover:bg-gray-100'}
        `}
        onClick={() => handlePointClick(pointIndex)}
      >
        <div className={`flex flex-col ${isTopRow ? '' : 'flex-col-reverse'} h-full`}>
          <div className="text-xs font-bold text-center mb-1">
            {pointIndex + 1}
          </div>
          <div className="flex-1 space-y-1">
            {checkers.map((checker, index) => {
              const canMove = availableMoves.some(move => move.checkerId === checker.id);
              const checkerMoves = availableMoves.filter(move => move.checkerId === checker.id);
              const hasSingleMove = checkerMoves.length === 1;
              
              return (
                <div
                  key={checker.id}
                  className={`
                    w-6 h-6 rounded-full border-2 cursor-pointer text-xs flex items-center justify-center
                    ${checker.player === Player.WHITE 
                      ? 'bg-white border-gray-400 text-black' 
                      : 'bg-gray-800 border-gray-600 text-white'
                    }
                    ${selectedChecker === checker.id ? 'ring-2 ring-blue-500 ring-offset-1' : 
                      hasSingleMove && !selectedChecker ? 'ring-2 ring-green-400 ring-offset-1' :
                      canMove && !selectedChecker ? 'ring-1 ring-yellow-400' : ''}
                    hover:scale-110 transition-transform
                  `}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCheckerClick(checker.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleCheckerDoubleClick(checker.id);
                }}
                  title={`${checker.player} checker ${checker.id}${canMove ? ' (can move)' : ''}${hasSingleMove ? ' - Double-click to move' : ''}`}
                >
                  {index + 1 > 5 ? '•' : index + 1}
                </div>
              );
            })}
          </div>
        </div>
      </td>
    );
  };

  const renderSpecialArea = (title: string, pointIndex: number) => {
    const position = board.find(pos => pos.pointIndex === pointIndex);
    const checkers = position?.checkers || [];

    // Check if this area is a valid destination for selected checker
    const isValidDestination = selectedChecker && availableMoves.some(move => 
      move.checkerId === selectedChecker && move.to === pointIndex
    );
    
    // Check if this area has checkers that can move
    const hasMovableCheckers = !selectedChecker && availableMoves.some(move => 
      move.from === pointIndex
    );

    return (
      <div 
        className={`
          border border-gray-400 p-2 min-w-[100px] h-[120px] cursor-pointer
          ${isValidDestination ? 'bg-green-200 hover:bg-green-300' : 
            hasMovableCheckers ? 'bg-blue-100 hover:bg-blue-200' : 
            'hover:bg-gray-100'}
        `}
        onClick={() => handlePointClick(pointIndex)}
      >
        <div className="text-xs font-bold text-center mb-2">{title}</div>
        <div className="space-y-1">
          {checkers.map((checker, index) => {
            const canMove = availableMoves.some(move => move.checkerId === checker.id);
            const checkerMoves = availableMoves.filter(move => move.checkerId === checker.id);
            const hasSingleMove = checkerMoves.length === 1;
            
            return (
              <div
                key={checker.id}
                className={`
                  w-6 h-6 rounded-full border-2 cursor-pointer text-xs flex items-center justify-center
                  ${checker.player === Player.WHITE 
                    ? 'bg-white border-gray-400 text-black' 
                    : 'bg-gray-800 border-gray-600 text-white'
                  }
                  ${selectedChecker === checker.id ? 'ring-2 ring-blue-500 ring-offset-1' : 
                    hasSingleMove && !selectedChecker ? 'ring-2 ring-green-400 ring-offset-1' :
                    canMove && !selectedChecker ? 'ring-1 ring-yellow-400' : ''}
                  hover:scale-110 transition-transform
                `}
              onClick={(e) => {
                e.stopPropagation();
                handleCheckerClick(checker.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleCheckerDoubleClick(checker.id);
              }}
                title={`${checker.player} checker ${checker.id}${canMove ? ' (can move)' : ''}${hasSingleMove ? ' - Double-click to move' : ''}`}
              >
                {index + 1}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 bg-white">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-center">Backgammon Board (Table View)</h3>
        <p className="text-sm text-center text-gray-600">
          Current Player: {currentPlayer.toUpperCase()} | Phase: {gamePhase}
        </p>
      </div>

      <div className="border-2 border-gray-600 bg-amber-100">
        <table className="w-full border-collapse">
          <tbody>
            {/* Top Row - Points 13-24 */}
            <tr>
              <td className="border border-gray-400 p-1 w-[100px]" rowSpan={3}>
                {renderSpecialArea("Bar", 24)}
              </td>
              {Array.from({ length: 6 }, (_, i) => renderPoint(12 + i))}
              <td className="border border-gray-400 p-1 w-4 bg-amber-800" rowSpan={3}>
                <div className="writing-mode-vertical text-white text-xs font-bold text-center">
                  BAR
                </div>
              </td>
              {Array.from({ length: 6 }, (_, i) => renderPoint(18 + i))}
              <td className="border border-gray-400 p-1 w-[100px]" rowSpan={3}>
                {renderSpecialArea("Off", 25)}
              </td>
            </tr>

            {/* Middle spacer */}
            <tr>
              <td colSpan={6} className="h-4 bg-amber-200 border-x border-gray-400"></td>
              <td colSpan={6} className="h-4 bg-amber-200 border-x border-gray-400"></td>
            </tr>

            {/* Bottom Row - Points 12-1 */}
            <tr>
              {Array.from({ length: 6 }, (_, i) => renderPoint(11 - i))}
              {Array.from({ length: 6 }, (_, i) => renderPoint(5 - i))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Move Hints Legend */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
        <div className="font-bold mb-2">Move Hints:</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-gray-400 rounded"></div>
            <span>Points with movable checkers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-200 border border-gray-400 rounded"></div>
            <span>Valid destinations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border-2 border-yellow-400 rounded-full"></div>
            <span>Multi-move checkers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border-2 border-green-400 rounded-full"></div>
            <span>Single-move (double-click)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full"></div>
            <span>Selected checker</span>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-gray-100 text-xs">
          <div className="font-bold">Debug Info:</div>
          <div>Available Moves: {availableMoves.length}</div>
          <div>Total Checkers on Board: {board.reduce((sum, pos) => sum + pos.checkers.length, 0)}</div>
        </div>
      )}
    </div>
  );
}