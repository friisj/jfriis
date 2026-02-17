'use client';

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

  // Color schemes for each layer
  const colorSchemes: Record<string, {
    enabled: string;
    disabled: string;
    text: string;
    textDisabled: string;
    checkbox: string;
    checkboxBorder: string;
    label: string;
    value: string;
    sliderThumb: string;
  }> = {
    wash: {
      enabled: 'bg-gradient-to-br from-cyan-900/30 to-cyan-950/20 border-cyan-500/50 shadow-cyan-500/30 shadow-xl',
      disabled: 'bg-black/20 border-gray-700/30 hover:border-gray-600/40',
      text: 'text-cyan-100',
      textDisabled: 'text-gray-500',
      checkbox: 'bg-cyan-500 border-cyan-400',
      checkboxBorder: 'bg-transparent border-gray-600',
      label: 'text-cyan-200',
      value: 'text-cyan-400',
      sliderThumb: 'slider-thumb-cyan'
    },
    arpeggios: {
      enabled: 'bg-gradient-to-br from-purple-900/30 to-purple-950/20 border-purple-500/50 shadow-purple-500/30 shadow-xl',
      disabled: 'bg-black/20 border-gray-700/30 hover:border-gray-600/40',
      text: 'text-purple-100',
      textDisabled: 'text-gray-500',
      checkbox: 'bg-purple-500 border-purple-400',
      checkboxBorder: 'bg-transparent border-gray-600',
      label: 'text-purple-200',
      value: 'text-purple-400',
      sliderThumb: 'slider-thumb-purple'
    },
    strings: {
      enabled: 'bg-gradient-to-br from-rose-900/30 to-rose-950/20 border-rose-500/50 shadow-rose-500/30 shadow-xl',
      disabled: 'bg-black/20 border-gray-700/30 hover:border-gray-600/40',
      text: 'text-rose-100',
      textDisabled: 'text-gray-500',
      checkbox: 'bg-rose-500 border-rose-400',
      checkboxBorder: 'bg-transparent border-gray-600',
      label: 'text-rose-200',
      value: 'text-rose-400',
      sliderThumb: 'slider-thumb-rose'
    },
    sparkles: {
      enabled: 'bg-gradient-to-br from-yellow-900/30 to-yellow-950/20 border-yellow-500/50 shadow-yellow-500/30 shadow-xl',
      disabled: 'bg-black/20 border-gray-700/30 hover:border-gray-600/40',
      text: 'text-yellow-100',
      textDisabled: 'text-gray-500',
      checkbox: 'bg-yellow-500 border-yellow-400',
      checkboxBorder: 'bg-transparent border-gray-600',
      label: 'text-yellow-200',
      value: 'text-yellow-400',
      sliderThumb: 'slider-thumb-yellow'
    },
    lead: {
      enabled: 'bg-gradient-to-br from-indigo-900/30 to-indigo-950/20 border-indigo-500/50 shadow-indigo-500/30 shadow-xl',
      disabled: 'bg-black/20 border-gray-700/30 hover:border-gray-600/40',
      text: 'text-indigo-100',
      textDisabled: 'text-gray-500',
      checkbox: 'bg-indigo-500 border-indigo-400',
      checkboxBorder: 'bg-transparent border-gray-600',
      label: 'text-indigo-200',
      value: 'text-indigo-400',
      sliderThumb: 'slider-thumb-indigo'
    }
  };

  const colors = colorSchemes[layer.id] || colorSchemes.wash;

  // Large subtle toggle - entire box is clickable (all layers now use this style)
  return (
    <div
      onClick={() => updateLayer({ enabled: !layer.enabled })}
      className={`p-6 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${
        layer.enabled ? colors.enabled : colors.disabled
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            layer.enabled ? colors.checkbox : colors.checkboxBorder
          }`}>
            {layer.enabled && (
              <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M5 13l4 4L19 7"></path>
              </svg>
            )}
          </div>
          <span className={`text-lg font-medium transition-colors ${
            layer.enabled ? colors.text : colors.textDisabled
          }`}>
            {layer.name}
          </span>
        </div>
      </div>

      {/* Controls (only show when enabled) */}
      {layer.enabled && (
        <div className="space-y-3 mt-4" onClick={(e) => e.stopPropagation()}>
          {layer.id === 'wash' ? (
            <>
              {/* Stereo Movement Speed Control (Wash only) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className={`${colors.label} text-xs`}>Movement Speed</label>
                  <span className={`${colors.value} text-xs`}>{layer.panSpeed ?? 50}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={layer.panSpeed ?? 50}
                  onChange={(e) => updateLayer({ panSpeed: parseInt(e.target.value) })}
                  className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${colors.sliderThumb}`}
                />
                <div className="text-xs text-gray-400 mt-1">
                  Stereo panning speed
                </div>
              </div>

              {/* Pan Modulation Depth Control (Wash only) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className={`${colors.label} text-xs`}>Pan Depth</label>
                  <span className={`${colors.value} text-xs`}>{layer.panDepth ?? 90}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={layer.panDepth ?? 90}
                  onChange={(e) => updateLayer({ panDepth: parseInt(e.target.value) })}
                  className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${colors.sliderThumb}`}
                />
                <div className="text-xs text-gray-400 mt-1">
                  Stereo width modulation
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Volume Control (All other layers) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className={`${colors.label} text-xs`}>Volume</label>
                  <span className={`${colors.value} text-xs`}>{layer.volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={layer.volume}
                  onChange={(e) => updateLayer({ volume: parseInt(e.target.value) })}
                  className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${colors.sliderThumb}`}
                />
                <div className="text-xs text-gray-400 mt-1">
                  {layer.volume === 0 ? 'Muted' : `${(-60 + (layer.volume/100) * 50).toFixed(1)}dB`}
                </div>
              </div>

              {/* Density Control (All other layers) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className={`${colors.label} text-xs`}>
                    {layer.id === 'strings' ? 'Ensemble Amount' : 'Density'}
                  </label>
                  <span className={`${colors.value} text-xs`}>{layer.density}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={layer.density}
                  onChange={(e) => updateLayer({ density: parseInt(e.target.value) })}
                  className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${colors.sliderThumb}`}
                />
                <div className="text-xs text-gray-400 mt-1">
                  {layer.id === 'strings' ? 'Chorus ensemble effect' : 'Activity rate'}
                </div>
              </div>

              {/* Character Control (All other layers except sparkle and whistle) */}
              {layer.id !== 'sparkle' && layer.id !== 'whistle' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className={`${colors.label} text-xs`}>{layer.characterLabel}</label>
                    <span className={`${colors.value} text-xs`}>{layer.character}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={layer.character}
                    onChange={(e) => updateLayer({ character: parseInt(e.target.value) })}
                    className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${colors.sliderThumb}`}
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    {layer.id === 'strings' ? 'Swirling phaser effect' : 'Layer-specific character'}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}