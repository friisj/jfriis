import React from 'react';
import { BoardTheme } from '@/lib/studio/ludo/three/variants';
import { Player } from '@/lib/studio/ludo/game/types';
import { NumberSlider } from '../controls/NumberSlider';
import { ColorPicker } from '../controls/ColorPicker';

interface CheckersSectionProps {
  theme: BoardTheme;
  onUpdate: (path: string, value: unknown) => void;
}

export function CheckersSection({ theme, onUpdate }: CheckersSectionProps) {
  return (
    <div className="space-y-6">
      {/* Dimensions */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Dimensions</h4>
        <NumberSlider
          label="Top Radius"
          value={theme.checkers.radius.top}
          min={0.15}
          max={0.35}
          step={0.01}
          onChange={(value) => onUpdate('radius.top', value)}
          hint="0.15-0.35 units"
        />
        <NumberSlider
          label="Bottom Radius"
          value={theme.checkers.radius.bottom}
          min={0.15}
          max={0.35}
          step={0.01}
          onChange={(value) => onUpdate('radius.bottom', value)}
          hint="0.15-0.35 units"
        />
        <NumberSlider
          label="Height"
          value={theme.checkers.height}
          min={0.05}
          max={0.2}
          step={0.01}
          onChange={(value) => onUpdate('height', value)}
          hint="0.05-0.2 units"
        />
        <NumberSlider
          label="Geometry Segments"
          value={theme.checkers.segments}
          min={8}
          max={48}
          step={4}
          onChange={(value) => onUpdate('segments', value)}
          hint="8-48 (higher = smoother)"
        />
      </div>

      {/* Colors */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Player Colors</h4>
        <ColorPicker
          label="White Player"
          value={theme.checkers.colors[Player.WHITE]}
          onChange={(value) => onUpdate(`colors.${Player.WHITE}`, value)}
        />
        <ColorPicker
          label="Black Player"
          value={theme.checkers.colors[Player.BLACK]}
          onChange={(value) => onUpdate(`colors.${Player.BLACK}`, value)}
        />
      </div>
    </div>
  );
}
