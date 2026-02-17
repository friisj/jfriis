import React from 'react';

interface MoveIndicatorProps {
  dice: number[] | null;
  usedDice: boolean[];
}

/**
 * Displays available dice moves with their usage state
 * Replaces physical 3rd/4th dice for doubles with explicit GUI state tracking
 */
export const MoveIndicator: React.FC<MoveIndicatorProps> = ({ dice, usedDice }) => {
  if (!dice || dice.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-gray-800/50 rounded-lg backdrop-blur-sm">
      <div className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        Available Moves
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        {dice.map((value, index) => {
          const isUsed = usedDice[index];

          return (
            <div
              key={index}
              className={`
                relative flex items-center justify-center
                w-12 h-12 rounded-lg font-bold text-xl
                transition-all duration-300
                ${
                  isUsed
                    ? 'bg-gray-700/50 text-gray-500 line-through opacity-50'
                    : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg scale-100 hover:scale-105'
                }
              `}
              title={isUsed ? `Move ${index + 1}: ${value} (Used)` : `Move ${index + 1}: ${value} (Available)`}
            >
              {value}

              {isUsed && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-green-400 text-2xl">✓</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {dice.length === 4 && (
        <div className="text-xs text-gray-400 mt-1">
          Doubles: {dice[0]} rolled
        </div>
      )}

      {usedDice.every(used => used) && (
        <div className="text-xs text-green-400 font-semibold mt-1">
          All moves completed
        </div>
      )}

      {!usedDice.some(used => used) && dice.length > 0 && (
        <div className="text-xs text-blue-400 mt-1">
          {dice.length} {dice.length === 1 ? 'move' : 'moves'} available
        </div>
      )}
    </div>
  );
};

export default MoveIndicator;
