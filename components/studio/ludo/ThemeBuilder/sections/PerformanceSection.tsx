import React from 'react';
import { BoardTheme } from '@/lib/studio/ludo/three/variants';
import { NumberSlider } from '../controls/NumberSlider';

interface PerformanceSectionProps {
  theme: BoardTheme;
  onUpdate: (path: string, value: unknown) => void;
}

/**
 * PerformanceSection - LOD and quality settings for different device tiers.
 */
export function PerformanceSection({ theme, onUpdate }: PerformanceSectionProps) {
  return (
    <div className="space-y-6">
      <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded text-xs text-blue-200">
        💡 <strong>Performance Presets:</strong> Configure quality tiers for different devices.
        Higher segments = smoother geometry but more GPU load.
      </div>

      {/* Default Tier */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Default Quality Tier</h4>
        <p className="text-xs text-gray-400 mb-3">
          Which tier to use by default for this theme
        </p>
        <div className="space-y-2">
          {(['low', 'medium', 'high', 'ultra'] as const).map((tier) => (
            <label key={tier} className="flex items-center space-x-2 text-sm text-gray-300">
              <input
                type="radio"
                name="defaultTier"
                value={tier}
                checked={theme.performance.defaultTier === tier}
                onChange={() => onUpdate('defaultTier', tier)}
                className="accent-blue-500"
              />
              <span className="capitalize">{tier}</span>
              {tier === 'low' && <span className="text-xs text-gray-500">(Mobile)</span>}
              {tier === 'medium' && <span className="text-xs text-gray-500">(Desktop)</span>}
              {tier === 'high' && <span className="text-xs text-gray-500">(High-end)</span>}
              {tier === 'ultra' && <span className="text-xs text-gray-500">(Max quality)</span>}
            </label>
          ))}
        </div>
      </div>

      {/* Checker Segments Per Tier */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Checker Segments Per Tier</h4>
        <p className="text-xs text-gray-400 mb-3">
          Geometry detail level for checker cylinders
        </p>
        <NumberSlider
          label="Low Tier"
          value={theme.performance.checkerSegments.low}
          min={8}
          max={16}
          step={2}
          onChange={(value) => onUpdate('checkerSegments.low', value)}
          hint="8-16 segments"
        />
        <NumberSlider
          label="Medium Tier"
          value={theme.performance.checkerSegments.medium}
          min={12}
          max={24}
          step={2}
          onChange={(value) => onUpdate('checkerSegments.medium', value)}
          hint="12-24 segments"
        />
        <NumberSlider
          label="High Tier"
          value={theme.performance.checkerSegments.high}
          min={20}
          max={36}
          step={2}
          onChange={(value) => onUpdate('checkerSegments.high', value)}
          hint="20-36 segments"
        />
        <NumberSlider
          label="Ultra Tier"
          value={theme.performance.checkerSegments.ultra}
          min={28}
          max={48}
          step={2}
          onChange={(value) => onUpdate('checkerSegments.ultra', value)}
          hint="28-48 segments"
        />
      </div>

      {/* Shadow Map Size Per Tier */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Shadow Map Size Per Tier</h4>
        <p className="text-xs text-gray-400 mb-3">
          Shadow resolution (higher = sharper but more memory)
        </p>
        <div className="space-y-3">
          {(['low', 'medium', 'high', 'ultra'] as const).map((tier) => (
            <div key={tier}>
              <label className="text-xs text-gray-400 block mb-1 capitalize">{tier} Tier</label>
              <select
                value={theme.performance.shadowMapSize[tier]}
                onChange={(e) => onUpdate(`shadowMapSize.${tier}`, parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value={512}>512 (Lowest)</option>
                <option value={1024}>1024 (Low)</option>
                <option value={2048}>2048 (Medium)</option>
                <option value={4096}>4096 (High)</option>
                <option value={8192}>8192 (Highest)</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
