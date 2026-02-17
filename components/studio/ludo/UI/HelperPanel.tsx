'use client';

import { useState, useEffect } from 'react';
import { CameraPreset } from '@/lib/studio/ludo/three/camera/presets';
import { GameRenderer } from '@/lib/studio/ludo/three/GameRenderer';

interface HelperPanelProps {
  currentCameraPreset: CameraPreset | null;
  onPresetChange: (preset: CameraPreset) => void;
  onReset: () => void;
  onRotate: (degrees: number) => void;
  onZoom: (delta: number) => void;
  renderer: GameRenderer | null;
}

type TabType = 'camera' | 'performance';

interface PerformanceStats {
  renderer: {
    rendering: {
      currentFPS: number;
      averageFrameTime: number;
      isDirty: boolean;
    };
    objectPool: {
      reuseRatio: number;
    };
  };
  scene: {
    objectCount: number;
  };
}

export function HelperPanel({
  currentCameraPreset,
  onPresetChange,
  onReset,
  onRotate,
  onZoom,
  renderer
}: HelperPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('camera');
  const [perfStats, setPerfStats] = useState<PerformanceStats | null>(null);

  // Update performance stats
  useEffect(() => {
    if (!renderer) return;

    const interval = setInterval(() => {
      if (renderer) {
        setPerfStats(renderer.getPerformanceStats());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [renderer]);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'camera', label: 'Camera' },
    { id: 'performance', label: 'Performance' }
  ];

  return (
    <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white text-xs w-64">
      {/* Tab Headers */}
      <div className="flex gap-1 mb-3 border-b border-white/20 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === tab.id
                ? 'bg-white/20 text-white font-semibold'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-2">
        {activeTab === 'camera' && (
          <>
            {/* Camera Presets */}
            <div>
              <div className="font-semibold mb-2 text-gray-300">Presets</div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => onPresetChange(CameraPreset.OVERHEAD)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    currentCameraPreset === CameraPreset.OVERHEAD
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Overhead
                </button>
                <button
                  onClick={() => onPresetChange(CameraPreset.WHITE_PLAYER)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    currentCameraPreset === CameraPreset.WHITE_PLAYER
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  White
                </button>
                <button
                  onClick={() => onPresetChange(CameraPreset.BLACK_PLAYER)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    currentCameraPreset === CameraPreset.BLACK_PLAYER
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Black
                </button>
                <button
                  onClick={() => onPresetChange(CameraPreset.SIDE_VIEW)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    currentCameraPreset === CameraPreset.SIDE_VIEW
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Side
                </button>
              </div>
            </div>

            {/* Rotation Controls */}
            <div>
              <div className="font-semibold mb-2 text-gray-300">Rotation</div>
              <div className="flex gap-1">
                <button
                  onClick={() => onRotate(-45)}
                  className="flex-1 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                  title="Rotate left 45°"
                >
                  ← 45°
                </button>
                <button
                  onClick={onReset}
                  className="flex-1 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => onRotate(45)}
                  className="flex-1 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                  title="Rotate right 45°"
                >
                  45° →
                </button>
              </div>
            </div>

            {/* Zoom Controls */}
            <div>
              <div className="font-semibold mb-2 text-gray-300">Zoom</div>
              <div className="flex gap-1">
                <button
                  onClick={() => onZoom(-3)}
                  className="flex-1 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                  title="Zoom in"
                >
                  + In
                </button>
                <button
                  onClick={() => onZoom(3)}
                  className="flex-1 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                  title="Zoom out"
                >
                  − Out
                </button>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="pt-2 border-t border-white/20">
              <div className="font-semibold mb-1 text-gray-300">Shortcuts</div>
              <div className="text-[10px] text-gray-400 space-y-0.5">
                <div>1-4: Camera presets</div>
                <div>Q/E or ←/→: Rotate 45°</div>
                <div>R: Reset camera</div>
                <div>Drag: Orbit • Scroll: Zoom</div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'performance' && (
          <>
            {perfStats ? (
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-400">FPS:</span>
                  <span>{perfStats.renderer.rendering.currentFPS.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Frame Time:</span>
                  <span>{perfStats.renderer.rendering.averageFrameTime.toFixed(1)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Objects:</span>
                  <span>{perfStats.scene.objectCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pool Eff:</span>
                  <span>{(perfStats.renderer.objectPool.reuseRatio * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Dirty:</span>
                  <span className={perfStats.renderer.rendering.isDirty ? 'text-red-400' : 'text-green-400'}>
                    {perfStats.renderer.rendering.isDirty ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-center py-4">
                {process.env.NODE_ENV === 'development' ? 'Loading stats...' : 'Only available in dev mode'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
