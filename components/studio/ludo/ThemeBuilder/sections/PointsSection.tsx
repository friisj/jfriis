import React from 'react';
import { BoardTheme } from '@/lib/studio/ludo/three/variants';
import { NumberSlider } from '../controls/NumberSlider';
import { ColorPicker } from '../controls/ColorPicker';

interface PointsSectionProps {
  theme: BoardTheme;
  onUpdate: (path: string, value: unknown) => void;
}

export function PointsSection({ theme, onUpdate }: PointsSectionProps) {
  return (
    <div className="space-y-6">
      {/* Colors */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Alternate Colors</h4>
        <ColorPicker
          label="Color 1 (Even Points)"
          value={theme.points.alternateColors[0]}
          onChange={(value) => onUpdate('alternateColors.0', value)}
        />
        <ColorPicker
          label="Color 2 (Odd Points)"
          value={theme.points.alternateColors[1]}
          onChange={(value) => onUpdate('alternateColors.1', value)}
        />
      </div>

      {/* Dimensions */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Dimensions</h4>
        <NumberSlider
          label="Triangle Depth (Height)"
          value={theme.points.triangleDepth}
          min={0.005}
          max={0.05}
          step={0.005}
          onChange={(value) => onUpdate('triangleDepth', value)}
          hint="0.005-0.05 units"
        />
        <NumberSlider
          label="Triangle Width"
          value={theme.points.triangleWidth}
          min={0.3}
          max={0.8}
          step={0.05}
          onChange={(value) => onUpdate('triangleWidth', value)}
          hint="0.3-0.8 units"
        />
      </div>

      {/* Shape */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Shape Style</h4>
        <p className="text-xs text-gray-400 mb-3">
          Triangle = classic pointed, Rounded = beveled edges
        </p>
        <div className="space-y-2">
          {(['triangle', 'rounded'] as const).map((shape) => (
            <label key={shape} className="flex items-center space-x-2 text-sm text-gray-300">
              <input
                type="radio"
                name="pointShape"
                value={shape}
                checked={theme.points.shape === shape}
                onChange={() => onUpdate('shape', shape)}
                className="accent-blue-500"
              />
              <span className="capitalize">{shape}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
