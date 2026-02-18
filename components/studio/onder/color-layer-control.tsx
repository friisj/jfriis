'use client';

import { useState } from 'react';
import { ColorLayer, LayerMetrics } from '@/lib/studio/onder/color-layers';
import { Button } from '@/components/ui/button';

interface ColorLayerControlProps {
  layer: ColorLayer;
  metrics?: LayerMetrics;
  onUpdate: (layerId: string, params: Partial<ColorLayer>) => void;
  onTrigger: (layerId: string) => void;
  flowEngineState?: {
    upcomingLayers: string[];
    decayingLayers: string[];
  };
}

export function ColorLayerControl({ layer, metrics, onUpdate, onTrigger, flowEngineState }: ColorLayerControlProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateLayer = (params: Partial<ColorLayer>) => {
    onUpdate(layer.id, params);
  };

  const getVolumeColor = (volume: number) => {
    if (volume < 20) return 'bg-red-500';
    if (volume < 40) return 'bg-orange-500';
    if (volume < 60) return 'bg-yellow-500';
    if (volume < 80) return 'bg-green-500';
    return 'bg-emerald-500';
  };

  const getActivityColor = (activity: number) => {
    if (activity < 25) return 'bg-gray-500';
    if (activity < 50) return 'bg-blue-500';
    if (activity < 75) return 'bg-cyan-500';
    return 'bg-purple-500';
  };

  return (
    <div className={`p-4 rounded-lg border transition-all duration-200 ${
      layer.enabled
        ? flowEngineState?.upcomingLayers.includes(layer.id)
          ? 'bg-black/60 border-yellow-500/60 shadow-yellow-500/30 shadow-lg'
          : flowEngineState?.decayingLayers.includes(layer.id)
          ? 'bg-black/60 border-blue-500/60 shadow-blue-500/30 shadow-lg'
          : 'bg-black/60 border-cyan-500/40 shadow-cyan-500/20 shadow-lg'
        : 'bg-black/30 border-gray-600/30'
    }`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h4 className={`font-semibold transition-colors ${
            layer.enabled ? 'text-cyan-200' : 'text-gray-400'
          }`}>
            {layer.name}
          </h4>

          {/* Flow Engine Status Indicators */}
          {flowEngineState?.upcomingLayers.includes(layer.id) && (
            <div className="px-2 py-1 text-xs bg-yellow-500/20 border border-yellow-500/40 text-yellow-200 rounded-full">
              🌊 Upcoming
            </div>
          )}

          {flowEngineState?.decayingLayers.includes(layer.id) && (
            <div className="px-2 py-1 text-xs bg-blue-500/20 border border-blue-500/40 text-blue-200 rounded-full">
              🌊 Recently Changed
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Visual Metrics */}
          {layer.enabled && metrics && (
            <div className="flex items-center gap-2">
              {/* Level meter */}
              <div className="w-8 h-2 bg-black/50 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ${getVolumeColor(layer.volume)}`}
                  style={{ width: `${Math.max(0, Math.min(100, (metrics.rmsLevel + 60) / 50 * 100))}%` }}
                />
              </div>

              {/* Activity indicator */}
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                getActivityColor(metrics.activity)
              }`} />
            </div>
          )}

          {/* Enable/Disable Switch */}
          <button
            onClick={() => updateLayer({ enabled: !layer.enabled })}
            className={`w-12 h-6 rounded-full transition-all duration-200 relative ${
              layer.enabled
                ? 'bg-cyan-600'
                : 'bg-gray-600'
            }`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-200 ${
              layer.enabled ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Main Controls - Always Visible */}
      <div className={`space-y-3 transition-opacity duration-200 ${
        layer.enabled ? 'opacity-100' : 'opacity-50'
      }`}>

        {/* Volume Control */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm text-cyan-300">Volume</label>
            <span className="text-xs text-cyan-400">{layer.volume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={layer.volume}
            onChange={(e) => updateLayer({ volume: parseInt(e.target.value) })}
            disabled={!layer.enabled}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb-cyan"
          />
          <div className="text-xs text-gray-400 mt-1">
            {layer.volume === 0 ? 'Muted' : `${(-60 + (layer.volume/100) * 50).toFixed(1)}dB`}
          </div>
        </div>

        {/* Density Control */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm text-cyan-300">Density</label>
            <span className="text-xs text-cyan-400">{layer.density}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={layer.density}
            onChange={(e) => updateLayer({ density: parseInt(e.target.value) })}
            disabled={!layer.enabled}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb-cyan"
          />
          <div className="text-xs text-gray-400 mt-1">
            Activity rate
          </div>
        </div>

        {/* Character Control */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm text-cyan-300">{layer.characterLabel}</label>
            <span className="text-xs text-cyan-400">{layer.character}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={layer.character}
            onChange={(e) => updateLayer({ character: parseInt(e.target.value) })}
            disabled={!layer.enabled}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb-cyan"
          />
          <div className="text-xs text-gray-400 mt-1">
            Layer-specific character
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {layer.enabled && (
        <div className="flex items-center gap-2 mt-4">
          {/* Manual Trigger */}
          <Button
            onMouseDown={() => onTrigger(layer.id)}
            variant="outline"
            size="sm"
            className="flex-1 bg-white/5 border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all duration-200"
          >
            Trigger
          </Button>

          {/* Advanced Controls Toggle */}
          <Button
            onClick={() => setShowAdvanced(!showAdvanced)}
            variant="ghost"
            size="sm"
            className="px-3 text-gray-400 hover:text-cyan-300 transition-colors"
          >
            {showAdvanced ? '▼' : '▶'} Advanced
          </Button>
        </div>
      )}

      {/* Advanced Controls - Collapsible */}
      {layer.enabled && showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-3">

          {/* Send Levels */}
          <div>
            <h5 className="text-sm font-medium text-cyan-300 mb-2">Effect Sends</h5>

            <div className="grid grid-cols-2 gap-3">
              {/* Chorus Send */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-300">Chorus</label>
                  <span className="text-xs text-gray-400">{layer.sendLevels.chorus}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={layer.sendLevels.chorus}
                  onChange={(e) => updateLayer({
                    sendLevels: {
                      ...layer.sendLevels,
                      chorus: parseInt(e.target.value)
                    }
                  })}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb-small"
                />
              </div>

              {/* Reverb Send */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-300">Reverb</label>
                  <span className="text-xs text-gray-400">{layer.sendLevels.reverb}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={layer.sendLevels.reverb}
                  onChange={(e) => updateLayer({
                    sendLevels: {
                      ...layer.sendLevels,
                      reverb: parseInt(e.target.value)
                    }
                  })}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb-small"
                />
              </div>
            </div>
          </div>

          {/* Behavior Controls */}
          <div>
            <h5 className="text-sm font-medium text-cyan-300 mb-2">Behavior</h5>

            <div className="grid grid-cols-2 gap-3">
              {/* Harmonic Mode */}
              <div>
                <label className="text-xs text-gray-300 block mb-1">Harmonic Mode</label>
                <select
                  value={layer.harmonicMode}
                  onChange={(e) => updateLayer({
                    harmonicMode: e.target.value as ColorLayer['harmonicMode']
                  })}
                  className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-gray-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="follow">Follow Chords</option>
                  <option value="complement">Complement</option>
                  <option value="independent">Independent</option>
                </select>
              </div>

              {/* Rhythm Sync */}
              <div>
                <label className="text-xs text-gray-300 block mb-1">Rhythm Sync</label>
                <button
                  onClick={() => updateLayer({ rhythmSync: !layer.rhythmSync })}
                  className={`w-full py-1 px-2 text-xs rounded transition-colors ${
                    layer.rhythmSync
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {layer.rhythmSync ? 'Synced' : 'Free'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && layer.enabled && metrics && (
        <div className="mt-3 pt-3 border-t border-gray-800/50">
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-400">Debug Info</summary>
            <div className="mt-2 font-mono space-y-1">
              <div>RMS: {metrics.rmsLevel.toFixed(1)}dB</div>
              <div>Peak: {metrics.peakLevel.toFixed(1)}dB</div>
              <div>Activity: {metrics.activity.toFixed(1)}%</div>
              <div>Harmonic: {metrics.harmonicContent.toFixed(1)}%</div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
