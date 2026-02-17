import React from 'react';
import { BoardTheme } from '@/lib/studio/ludo/three/variants';
import { NumberSlider } from '../controls/NumberSlider';
import { ColorPicker } from '../controls/ColorPicker';

interface BoardSectionProps {
  theme: BoardTheme;
  onUpdate: (path: string, value: unknown) => void;
}

/**
 * BoardSection - Controls for board dimensions and colors.
 *
 * Groups:
 * - Main board dimensions (width, height, thickness)
 * - Main board color
 * - Bar dimensions and color
 * - Off area dimensions and color
 */
export function BoardSection({ theme, onUpdate }: BoardSectionProps) {
  return (
    <div className="space-y-6">
      {/* Main Board */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Main Board</h4>
        <NumberSlider
          label="Width"
          value={theme.board.dimensions.width}
          min={12}
          max={24}
          step={0.5}
          onChange={(value) => onUpdate('dimensions.width', value)}
          hint="12-24 units"
        />
        <NumberSlider
          label="Height"
          value={theme.board.dimensions.height}
          min={0.1}
          max={0.5}
          step={0.05}
          onChange={(value) => onUpdate('dimensions.height', value)}
          hint="0.1-0.5 units"
        />
        <NumberSlider
          label="Thickness"
          value={theme.board.dimensions.thickness}
          min={8}
          max={12}
          step={0.5}
          onChange={(value) => onUpdate('dimensions.thickness', value)}
          hint="8-12 units"
        />
        <ColorPicker
          label="Color"
          value={theme.board.color}
          onChange={(value) => onUpdate('color', value)}
        />
      </div>

      {/* Bar */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Bar</h4>
        <NumberSlider
          label="Width"
          value={theme.board.bar.width}
          min={0.5}
          max={2.0}
          step={0.1}
          onChange={(value) => onUpdate('bar.width', value)}
          hint="0.5-2.0 units"
        />
        <NumberSlider
          label="Height"
          value={theme.board.bar.height}
          min={0.2}
          max={0.6}
          step={0.05}
          onChange={(value) => onUpdate('bar.height', value)}
          hint="0.2-0.6 units"
        />
        <NumberSlider
          label="Thickness"
          value={theme.board.bar.thickness}
          min={8}
          max={12}
          step={0.5}
          onChange={(value) => onUpdate('bar.thickness', value)}
          hint="8-12 units"
        />
        <ColorPicker
          label="Color"
          value={theme.board.bar.color}
          onChange={(value) => onUpdate('bar.color', value)}
        />
      </div>

      {/* Off Area */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Off Area (Bear-off)</h4>
        <NumberSlider
          label="Width"
          value={theme.board.off.width}
          min={0.8}
          max={1.5}
          step={0.1}
          onChange={(value) => onUpdate('off.width', value)}
          hint="0.8-1.5 units"
        />
        <NumberSlider
          label="Height"
          value={theme.board.off.height}
          min={0.05}
          max={0.2}
          step={0.05}
          onChange={(value) => onUpdate('off.height', value)}
          hint="0.05-0.2 units"
        />
        <NumberSlider
          label="Thickness"
          value={theme.board.off.thickness}
          min={6}
          max={10}
          step={0.5}
          onChange={(value) => onUpdate('off.thickness', value)}
          hint="6-10 units"
        />
        <ColorPicker
          label="Color"
          value={theme.board.off.color}
          onChange={(value) => onUpdate('off.color', value)}
        />
      </div>
    </div>
  );
}
