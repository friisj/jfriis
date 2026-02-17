import React from 'react';
import { CameraPreset } from '@/lib/studio/ludo/three/camera/presets';

interface CameraControlsProps {
  currentPreset: CameraPreset | null;
  onPresetChange: (preset: CameraPreset) => void;
  onReset: () => void;
  onRotate: (degrees: number) => void;
}

const PRESET_LABELS: Record<CameraPreset, { name: string; icon: string; description: string }> = {
  [CameraPreset.OVERHEAD]: {
    name: 'Overhead',
    icon: '⬇️',
    description: 'Bird\'s eye view'
  },
  [CameraPreset.WHITE_PLAYER]: {
    name: 'White',
    icon: '⚪',
    description: 'White player view'
  },
  [CameraPreset.BLACK_PLAYER]: {
    name: 'Black',
    icon: '⚫',
    description: 'Black player view'
  },
  [CameraPreset.SIDE_VIEW]: {
    name: 'Side',
    icon: '↔️',
    description: 'Side profile view'
  },
  [CameraPreset.CINEMATIC]: {
    name: 'Cinematic',
    icon: '🎬',
    description: '3/4 dramatic angle'
  }
};

export default function CameraControls({ currentPreset, onPresetChange, onReset, onRotate }: CameraControlsProps) {
  const presets = Object.values(CameraPreset);

  return (
    <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 p-3 rounded-lg shadow-lg">
      <div className="text-white text-xs font-bold mb-2 flex items-center gap-2">
        <span>🎥 Camera</span>
        <button
          onClick={onReset}
          className="ml-auto px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
          title="Reset camera (R)"
        >
          Reset
        </button>
      </div>

      {/* Rotation Controls */}
      <div className="mb-2 flex items-center justify-center gap-1">
        <button
          onClick={() => onRotate(-45)}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm font-bold transition-colors"
          title="Rotate left 45° (Q or ←)"
        >
          ↺
        </button>
        <span className="text-white text-[10px] px-2">Rotate</span>
        <button
          onClick={() => onRotate(45)}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm font-bold transition-colors"
          title="Rotate right 45° (E or →)"
        >
          ↻
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {presets.map((preset, index) => {
          const info = PRESET_LABELS[preset];
          const isActive = currentPreset === preset;

          return (
            <button
              key={preset}
              onClick={() => onPresetChange(preset)}
              className={`
                px-2.5 py-1.5 rounded text-xs font-medium transition-all
                flex flex-col items-center gap-0.5
                ${isActive
                  ? 'bg-blue-600 text-white shadow-md scale-105'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}
              `}
              title={`${info.description} (Press ${index + 1})`}
            >
              <span className="text-base">{info.icon}</span>
              <span className="text-[10px]">{info.name}</span>
              <span className="text-[9px] text-gray-400">{index + 1}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-600 text-[10px] text-gray-400 text-center">
        <div>Drag to orbit • Scroll to zoom</div>
        <div className="mt-0.5">Right-click to pan</div>
      </div>
    </div>
  );
}
