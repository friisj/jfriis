'use client';

interface VinylCrackleControlProps {
  enabled: boolean;
  amount: number;
  onToggle: () => void;
  onAmountChange: (value: number) => void;
}

export function VinylCrackleControl({
  enabled,
  amount,
  onToggle,
  onAmountChange
}: VinylCrackleControlProps) {
  return (
    <div
      onClick={onToggle}
      className={`p-6 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${
        enabled
          ? 'bg-gradient-to-br from-amber-900/30 to-amber-950/20 border-amber-500/50 shadow-amber-500/30 shadow-xl'
          : 'bg-black/20 border-gray-700/30 hover:border-gray-600/40'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            enabled
              ? 'bg-amber-500 border-amber-400'
              : 'bg-transparent border-gray-600'
          }`}>
            {enabled && (
              <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M5 13l4 4L19 7"></path>
              </svg>
            )}
          </div>
          <span className={`text-lg font-medium transition-colors ${
            enabled ? 'text-amber-100' : 'text-gray-500'
          }`}>
            Vinyl Crackle
          </span>
        </div>
      </div>

      {/* Controls (only show when enabled) */}
      {enabled && (
        <div className="space-y-3 mt-4" onClick={(e) => e.stopPropagation()}>
          {/* Frequency Control */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-amber-200 text-xs">Frequency</label>
              <span className="text-amber-400 text-xs">{amount}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={amount}
              onChange={(e) => onAmountChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb-amber"
            />
            <div className="text-xs text-gray-400 mt-1">
              Click & pop frequency
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
