import React from 'react';
import { BoardTheme } from '@/lib/studio/ludo/three/variants';
import { NumberSlider } from '../controls/NumberSlider';

interface ProportionsSectionProps {
  theme: BoardTheme;
  onUpdate: (path: string, value: unknown) => void;
}

/**
 * ProportionsSection - Advanced position calculation constants.
 * These control the precise placement of all game elements.
 * Only adjust if you know what you're doing!
 */
export function ProportionsSection({ theme, onUpdate }: ProportionsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded text-xs text-yellow-200">
        ⚠️ <strong>Advanced:</strong> These constants control position calculations.
        Changing them may require adjusting other parameters to maintain visual consistency.
      </div>

      {/* Triangle Positioning */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Triangle Positioning</h4>
        <NumberSlider
          label="Triangle Base Offset"
          value={theme.proportions.triangleBaseOffset}
          min={3.5}
          max={5.5}
          step={0.1}
          onChange={(value) => onUpdate('triangleBaseOffset', value)}
          hint="3.5-5.5 (board edge to base)"
        />
        <NumberSlider
          label="Triangle Tip Offset"
          value={theme.proportions.triangleTipOffset}
          min={0.1}
          max={0.5}
          step={0.05}
          onChange={(value) => onUpdate('triangleTipOffset', value)}
          hint="0.1-0.5 (board edge to tip)"
        />
      </div>

      {/* Board Layout */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Board Layout</h4>
        <NumberSlider
          label="Left Side Start X"
          value={theme.proportions.leftSideStartX}
          min={-8.5}
          max={-6.5}
          step={0.1}
          onChange={(value) => onUpdate('leftSideStartX', value)}
          hint="-8.5 to -6.5 (left points start)"
        />
        <NumberSlider
          label="Off Area Center X"
          value={theme.proportions.offAreaCenterX}
          min={8}
          max={10}
          step={0.1}
          onChange={(value) => onUpdate('offAreaCenterX', value)}
          hint="8-10 (bear-off X position)"
        />
      </div>

      {/* Checker Stacking */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Checker Stacking</h4>
        <NumberSlider
          label="Stack Progression Z"
          value={theme.proportions.checkerStackProgressionZ}
          min={0.5}
          max={0.6}
          step={0.01}
          onChange={(value) => onUpdate('checkerStackProgressionZ', value)}
          hint="0.5-0.6 (gap between checkers)"
        />
      </div>

      {/* Bar Positioning */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Bar Checkers</h4>
        <NumberSlider
          label="Bar Separation Z"
          value={theme.proportions.barSeparationZ}
          min={0.3}
          max={1.0}
          step={0.05}
          onChange={(value) => onUpdate('barSeparationZ', value)}
          hint="0.3-1.0 (white/black separation)"
        />
        <NumberSlider
          label="Bar Checker Spacing"
          value={theme.proportions.barCheckerSpacingMultiplier}
          min={2.0}
          max={3.5}
          step={0.1}
          onChange={(value) => onUpdate('barCheckerSpacingMultiplier', value)}
          hint="2.0-3.5 (multiplier)"
        />
      </div>

      {/* Off Area */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Off Area (Bear-off)</h4>
        <NumberSlider
          label="Off Area Separation Z"
          value={theme.proportions.offAreaSeparationZ}
          min={2.5}
          max={4.5}
          step={0.1}
          onChange={(value) => onUpdate('offAreaSeparationZ', value)}
          hint="2.5-4.5 (white/black separation)"
        />
        <NumberSlider
          label="Off Area Stack Spacing"
          value={theme.proportions.offAreaStackSpacing}
          min={0.005}
          max={0.02}
          step={0.001}
          onChange={(value) => onUpdate('offAreaStackSpacing', value)}
          hint="0.005-0.02 (gap between checkers)"
        />
      </div>
    </div>
  );
}
