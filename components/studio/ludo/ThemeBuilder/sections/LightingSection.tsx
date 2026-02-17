import React from 'react';
import { BoardTheme } from '@/lib/studio/ludo/three/variants';
import { NumberSlider } from '../controls/NumberSlider';
import { ColorPicker } from '../controls/ColorPicker';

interface LightingSectionProps {
  theme: BoardTheme;
  onUpdate: (path: string, value: unknown) => void;
}

/**
 * LightingSection - Controls for lighting configuration.
 *
 * Groups:
 * - Scene background color
 * - Ambient light (omnidirectional base)
 * - Hemisphere light (sky/ground fill)
 * - Directional light (main shadow-casting)
 * - Shadow quality settings
 */
export function LightingSection({ theme, onUpdate }: LightingSectionProps) {
  return (
    <div className="space-y-6">
      {/* Background */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Background</h4>
        <ColorPicker
          label="Scene Background"
          value={theme.lighting.backgroundColor}
          onChange={(value) => onUpdate('backgroundColor', value)}
        />
      </div>

      {/* Ambient Light */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Ambient Light</h4>
        <p className="text-xs text-gray-400 mb-3">
          Omnidirectional base illumination (no shadows)
        </p>
        <ColorPicker
          label="Color"
          value={theme.lighting.ambientColor}
          onChange={(value) => onUpdate('ambientColor', value)}
        />
        <NumberSlider
          label="Intensity"
          value={theme.lighting.ambientIntensity}
          min={0}
          max={0.3}
          step={0.01}
          onChange={(value) => onUpdate('ambientIntensity', value)}
          hint="0-0.3 (higher = less dramatic)"
        />
      </div>

      {/* Hemisphere Light */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Hemisphere Light</h4>
        <p className="text-xs text-gray-400 mb-3">
          Simulates sky/ground reflected light
        </p>
        <ColorPicker
          label="Sky Color"
          value={theme.lighting.hemisphereSkyColor}
          onChange={(value) => onUpdate('hemisphereSkyColor', value)}
        />
        <ColorPicker
          label="Ground Color"
          value={theme.lighting.hemisphereGroundColor}
          onChange={(value) => onUpdate('hemisphereGroundColor', value)}
        />
        <NumberSlider
          label="Intensity"
          value={theme.lighting.hemisphereIntensity}
          min={0}
          max={0.5}
          step={0.01}
          onChange={(value) => onUpdate('hemisphereIntensity', value)}
          hint="0-0.5 (contributes to ambient fill)"
        />
      </div>

      {/* Directional Light */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Directional Light</h4>
        <p className="text-xs text-gray-400 mb-3">
          Main shadow-casting light source
        </p>
        <ColorPicker
          label="Color"
          value={theme.lighting.directionalColor}
          onChange={(value) => onUpdate('directionalColor', value)}
        />
        <NumberSlider
          label="Intensity"
          value={theme.lighting.directionalIntensity}
          min={0.5}
          max={2.0}
          step={0.1}
          onChange={(value) => onUpdate('directionalIntensity', value)}
          hint="0.5-2.0 (higher = stronger shadows)"
        />
      </div>

      {/* Shadow Quality */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Shadow Quality</h4>
        <p className="text-xs text-gray-400 mb-3">
          Higher values = sharper shadows but more memory
        </p>
        <div className="space-y-2">
          {[512, 1024, 2048, 4096].map((size) => (
            <label key={size} className="flex items-center space-x-2 text-sm text-gray-300">
              <input
                type="radio"
                name="shadowMapSize"
                value={size}
                checked={theme.lighting.shadowMapSize === size}
                onChange={() => onUpdate('shadowMapSize', size)}
                className="accent-blue-500"
              />
              <span>
                {size} {size === 512 && '(Low)'} {size === 1024 && '(Medium)'}
                {size === 2048 && '(High)'} {size === 4096 && '(Ultra)'}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
