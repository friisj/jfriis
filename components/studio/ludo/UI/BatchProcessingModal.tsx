/**
 * Batch Processing Modal
 *
 * Allows users to run multiple headless AI vs AI games in the background
 */

'use client';

import { useState } from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card';
import { BatchConfig } from '@/lib/studio/ludo/audit/types';
import { AI_PRESETS } from '@/lib/studio/ludo/ai/players';

interface BatchProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: BatchConfig) => Promise<void>;
  isRunning: boolean;
  progress?: {
    current: number;
    total: number;
    estimatedTimeRemaining?: number;
  };
}

export function BatchProcessingModal({
  isOpen,
  onClose,
  onStart,
  isRunning,
  progress
}: BatchProcessingModalProps) {
  const [config, setConfig] = useState<BatchConfig>({
    iterations: 10,
    whiteAI: {
      preset: 'competitor',
      personality: 'BALANCED'
    },
    blackAI: {
      preset: 'competitor',
      personality: 'BALANCED'
    },
    matchLength: 1
  });

  if (!isOpen) return null;

  const handleStart = async () => {
    await onStart(config);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>🚀 Batch Processing - AI vs AI Testing</CardTitle>
          <CardDescription>
            Run multiple headless games in the background for comprehensive gameplay analysis
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!isRunning ? (
            <>
              {/* Iterations */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Number of Games</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={config.iterations}
                  onChange={(e) =>
                    setConfig({ ...config, iterations: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 rounded border border-gray-600 bg-gray-800 text-white"
                />
                <p className="text-xs text-gray-400">
                  Run 1-1000 games. Recommended: 10 for quick tests, 100+ for comprehensive analysis
                </p>
              </div>

              {/* White AI Configuration */}
              <div className="space-y-2">
                <label className="text-sm font-medium">White Player AI</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Preset</label>
                    <select
                      value={config.whiteAI.preset}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          whiteAI: { ...config.whiteAI, preset: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded border border-gray-600 bg-gray-800 text-white text-sm"
                    >
                      {Object.keys(AI_PRESETS).map((preset) => (
                        <option key={preset} value={preset}>
                          {AI_PRESETS[preset as keyof typeof AI_PRESETS].name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Personality</label>
                    <select
                      value={config.whiteAI.personality}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          whiteAI: { ...config.whiteAI, personality: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded border border-gray-600 bg-gray-800 text-white text-sm"
                    >
                      <option value="BALANCED">Balanced</option>
                      <option value="AGGRESSIVE">Aggressive</option>
                      <option value="DEFENSIVE">Defensive</option>
                      <option value="TACTICAL">Tactical</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Black AI Configuration */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Black Player AI</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Preset</label>
                    <select
                      value={config.blackAI.preset}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          blackAI: { ...config.blackAI, preset: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded border border-gray-600 bg-gray-800 text-white text-sm"
                    >
                      {Object.keys(AI_PRESETS).map((preset) => (
                        <option key={preset} value={preset}>
                          {AI_PRESETS[preset as keyof typeof AI_PRESETS].name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Personality</label>
                    <select
                      value={config.blackAI.personality}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          blackAI: { ...config.blackAI, personality: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded border border-gray-600 bg-gray-800 text-white text-sm"
                    >
                      <option value="BALANCED">Balanced</option>
                      <option value="AGGRESSIVE">Aggressive</option>
                      <option value="DEFENSIVE">Defensive</option>
                      <option value="TACTICAL">Tactical</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Match Length */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Match Length</label>
                <select
                  value={config.matchLength}
                  onChange={(e) =>
                    setConfig({ ...config, matchLength: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded border border-gray-600 bg-gray-800 text-white"
                >
                  <option value="1">Single Game</option>
                  <option value="3">3 Point Match</option>
                  <option value="5">5 Point Match</option>
                  <option value="7">7 Point Match</option>
                </select>
              </div>

              {/* Info Box */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs space-y-1">
                <p className="font-medium text-blue-400">What happens during batch processing:</p>
                <ul className="list-disc list-inside space-y-0.5 text-gray-300">
                  <li>Games run headless (no rendering) for maximum speed</li>
                  <li>All events logged to database for later analysis</li>
                  <li>Board snapshots captured for debugging</li>
                  <li>Estimated time: ~{Math.ceil(config.iterations * 0.5)}s - {Math.ceil(config.iterations * 2)}s</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button onClick={handleStart} className="flex-1" size="lg">
                  🚀 Start Batch Processing
                </Button>
                <Button onClick={onClose} variant="outline">
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Progress Display */}
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-400">
                    {progress?.current || 0} / {progress?.total || 0}
                  </div>
                  <div className="text-sm text-gray-400">Games Completed</div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
                    style={{
                      width: `${((progress?.current || 0) / (progress?.total || 1)) * 100}%`
                    }}
                  />
                </div>

                {/* Time Remaining */}
                {progress?.estimatedTimeRemaining && (
                  <div className="text-center text-sm text-gray-400">
                    Estimated time remaining: {formatTime(progress.estimatedTimeRemaining)}
                  </div>
                )}

                {/* Status */}
                <div className="p-3 bg-gray-800 rounded text-xs text-center">
                  <p className="text-gray-300">
                    Running headless games in the background...
                  </p>
                  <p className="text-gray-500 mt-1">
                    You can close this window. Processing will continue.
                  </p>
                </div>
              </div>

              <Button onClick={onClose} variant="outline" className="w-full">
                Close (Continue in Background)
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
