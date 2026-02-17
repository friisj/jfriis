import React from 'react';
import { BoardTheme } from '@/lib/studio/ludo/three/variants';
import { Player } from '@/lib/studio/ludo/game/types';
import { NumberSlider } from '../controls/NumberSlider';
import { ColorPicker } from '../controls/ColorPicker';

interface DiceSectionProps {
  theme: BoardTheme;
  onUpdate: (path: string, value: unknown) => void;
}

export function DiceSection({ theme, onUpdate }: DiceSectionProps) {
  return (
    <div className="space-y-6">
      {/* Size */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Size</h4>
        <NumberSlider
          label="Dice Size"
          value={theme.dice.size}
          min={0.3}
          max={0.8}
          step={0.05}
          onChange={(value) => onUpdate('size', value)}
          hint="0.3-0.8 units"
        />
      </div>

      {/* White Player Dice */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">White Player Dice</h4>
        <ColorPicker
          label="Face Color"
          value={theme.dice.colors[Player.WHITE].face}
          onChange={(value) => onUpdate(`colors.${Player.WHITE}.face`, value)}
        />
        <ColorPicker
          label="Dots Color"
          value={theme.dice.colors[Player.WHITE].dots}
          onChange={(value) => onUpdate(`colors.${Player.WHITE}.dots`, value)}
        />
      </div>

      {/* Black Player Dice */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Black Player Dice</h4>
        <ColorPicker
          label="Face Color"
          value={theme.dice.colors[Player.BLACK].face}
          onChange={(value) => onUpdate(`colors.${Player.BLACK}.face`, value)}
        />
        <ColorPicker
          label="Dots Color"
          value={theme.dice.colors[Player.BLACK].dots}
          onChange={(value) => onUpdate(`colors.${Player.BLACK}.dots`, value)}
        />
      </div>

      {/* Dot Details */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Dot Details</h4>
        <NumberSlider
          label="Dot Radius"
          value={theme.dice.dotRadius}
          min={0.02}
          max={0.08}
          step={0.005}
          onChange={(value) => onUpdate('dotRadius', value)}
          hint="0.02-0.08 units"
        />
        <NumberSlider
          label="Dot Segments"
          value={theme.dice.dotSegments}
          min={4}
          max={16}
          step={2}
          onChange={(value) => onUpdate('dotSegments', value)}
          hint="4-16 (higher = smoother)"
        />
      </div>
    </div>
  );
}
