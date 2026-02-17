import React from 'react';
import { BoardTheme } from '@/lib/studio/ludo/three/variants';
import { NumberSlider } from '../controls/NumberSlider';
import { Vector3Input } from '../controls/Vector3Input';

interface LayoutSectionProps {
  theme: BoardTheme;
  onUpdate: (path: string, value: unknown) => void;
}

export function LayoutSection({ theme, onUpdate }: LayoutSectionProps) {
  return (
    <div className="space-y-6">
      {/* Spacing */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Spacing</h4>
        <NumberSlider
          label="Point Spacing"
          value={theme.layout.pointSpacing}
          min={0.8}
          max={1.5}
          step={0.05}
          onChange={(value) => onUpdate('pointSpacing', value)}
          hint="0.8-1.5 units (between triangles)"
        />
        <NumberSlider
          label="Board Section Gap"
          value={theme.layout.boardSectionGap}
          min={1.0}
          max={2.5}
          step={0.1}
          onChange={(value) => onUpdate('boardSectionGap', value)}
          hint="1.0-2.5 units (bar width)"
        />
        <NumberSlider
          label="Checker Stack Spacing"
          value={theme.layout.checkerStackSpacing}
          min={0.08}
          max={0.2}
          step={0.01}
          onChange={(value) => onUpdate('checkerStackSpacing', value)}
          hint="0.08-0.2 units (vertical gap)"
        />
      </div>

      {/* Dice Position */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Dice Position</h4>
        <p className="text-xs text-gray-400 mb-3">
          Position of dice when rolled (relative to board center)
        </p>
        <Vector3Input
          label="Dice Position"
          value={theme.layout.dicePosition}
          onChange={(value) => onUpdate('dicePosition', value)}
          step={0.1}
        />
      </div>
    </div>
  );
}
