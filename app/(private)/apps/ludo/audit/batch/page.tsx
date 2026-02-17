/**
 * Batch Simulation Runner
 *
 * Configure and launch headless AI vs AI simulations for MCTS data gathering
 */

'use client';

import { useState } from 'react';
// TODO: adapt to jfriis auth
// import { useUser } from '@/lib/hooks/useUser';
const useUser = () => ({ user: null as { id: string; email: string } | null, isAuthenticated: false });
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/studio/ludo/utils/logger';
import Link from 'next/link';

interface BatchConfig {
  whiteAIPreset: string;
  whiteAIPersonality: string;
  blackAIPreset: string;
  blackAIPersonality: string;
  matchLength: number;
  iterations: number;
  randomSeed?: number;
  notes?: string;
}

interface BatchProgress {
  sessionId: string;
  current: number;
  total: number;
  status: 'running' | 'completed' | 'error';
  estimatedTimeRemaining?: number;
  error?: string;

  // Current game progress
  currentGameMoveNumber?: number;
  currentGameTotalMoves?: number;
  currentGamePhase?: string;
  currentGamePipCount?: number;
  initialPipCount?: number;
}

const AI_PRESETS = ['beginner', 'easy', 'medium', 'hard', 'expert'];
const AI_PERSONALITIES = ['balanced', 'aggressive', 'defensive', 'tactical'];

export default function BatchRunnerPage() {
  const { user, isAuthenticated } = useUser();
  const [config, setConfig] = useState<BatchConfig>({
    whiteAIPreset: 'expert',
    whiteAIPersonality: 'balanced',
    blackAIPreset: 'expert',
    blackAIPersonality: 'balanced',
    matchLength: 1,
    iterations: 10,
    notes: ''
  });
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [batchRunnerInstance, setBatchRunnerInstance] = useState<any>(null);

  const handleAbort = () => {
    if (batchRunnerInstance) {
      batchRunnerInstance.abort();
      setProgress(prev => prev ? { ...prev, status: 'error', error: 'Aborted by user' } : null);
      setIsRunning(false);
    }
  };

  const handleStartBatch = async () => {
    if (!isAuthenticated || !user?.id) {
      logger.warn('User must be authenticated to start batch run');
      return;
    }

    setIsRunning(true);
    setProgress({
      sessionId: '',
      current: 0,
      total: config.iterations,
      status: 'running'
    });

    try {
      // Import batch runner directly (runs client-side with user auth context)
      const { batchRunner } = await import('@/lib/studio/ludo/audit/runner');
      setBatchRunnerInstance(batchRunner);

      const batchConfig = {
        whiteAI: {
          preset: config.whiteAIPreset,
          personality: config.whiteAIPersonality
        },
        blackAI: {
          preset: config.blackAIPreset,
          personality: config.blackAIPersonality
        },
        matchLength: config.matchLength,
        iterations: config.iterations,
        randomSeed: config.randomSeed,
        notes: config.notes
      };

      // Run batch with progress callback
      const sessionId = await batchRunner.runBatch(
        batchConfig,
        user.id,
        (progress) => {
          setProgress({
            sessionId: progress.sessionId,
            current: progress.current,
            total: progress.total,
            status: 'running',
            estimatedTimeRemaining: progress.estimatedTimeRemaining,
            currentGameMoveNumber: progress.currentGameMoveNumber,
            currentGameTotalMoves: progress.currentGameTotalMoves,
            currentGamePhase: progress.currentGamePhase,
            currentGamePipCount: progress.currentGamePipCount,
            initialPipCount: progress.initialPipCount
          });
        }
      );

      setProgress({
        sessionId,
        current: config.iterations,
        total: config.iterations,
        status: 'completed'
      });

      logger.info(`Batch run completed: ${sessionId}`);
    } catch (error) {
      logger.error('Batch run failed:', error);
      setProgress({
        sessionId: '',
        current: 0,
        total: config.iterations,
        status: 'error',
        error: String(error)
      });
    } finally {
      setIsRunning(false);
    }
  };

  const formatTimeRemaining = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>🔒 Authentication Required</CardTitle>
            <CardDescription>
              Please log in to run batch simulations
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/audit">
            <Button variant="outline" size="sm">
              ← Back to Sessions
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">🚀 Batch Simulation Runner</h1>
        </div>
        <p className="text-gray-400">
          Launch headless AI vs AI games to generate MCTS evaluation data
        </p>
      </div>

      {/* Configuration Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>⚙️ Batch Configuration</CardTitle>
          <CardDescription>
            Configure AI opponents and simulation parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* White AI Configuration */}
          <div>
            <h3 className="text-lg font-semibold mb-3">⚪ White AI</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Difficulty Preset
                </label>
                <select
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  value={config.whiteAIPreset}
                  onChange={(e) => setConfig({ ...config, whiteAIPreset: e.target.value })}
                  disabled={isRunning}
                >
                  {AI_PRESETS.map(preset => (
                    <option key={preset} value={preset} className="bg-gray-800 text-white">
                      {preset.charAt(0).toUpperCase() + preset.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Personality
                </label>
                <select
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  value={config.whiteAIPersonality}
                  onChange={(e) => setConfig({ ...config, whiteAIPersonality: e.target.value })}
                  disabled={isRunning}
                >
                  {AI_PERSONALITIES.map(personality => (
                    <option key={personality} value={personality} className="bg-gray-800 text-white">
                      {personality.charAt(0).toUpperCase() + personality.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Black AI Configuration */}
          <div>
            <h3 className="text-lg font-semibold mb-3">⚫ Black AI</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Difficulty Preset
                </label>
                <select
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  value={config.blackAIPreset}
                  onChange={(e) => setConfig({ ...config, blackAIPreset: e.target.value })}
                  disabled={isRunning}
                >
                  {AI_PRESETS.map(preset => (
                    <option key={preset} value={preset} className="bg-gray-800 text-white">
                      {preset.charAt(0).toUpperCase() + preset.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Personality
                </label>
                <select
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  value={config.blackAIPersonality}
                  onChange={(e) => setConfig({ ...config, blackAIPersonality: e.target.value })}
                  disabled={isRunning}
                >
                  {AI_PERSONALITIES.map(personality => (
                    <option key={personality} value={personality} className="bg-gray-800 text-white">
                      {personality.charAt(0).toUpperCase() + personality.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Simulation Parameters */}
          <div>
            <h3 className="text-lg font-semibold mb-3">🎲 Simulation Parameters</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Number of Games
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  value={config.iterations}
                  onChange={(e) => setConfig({ ...config, iterations: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={1000}
                  disabled={isRunning}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 10-100 for testing, 100-1000 for data gathering
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Match Length
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  value={config.matchLength}
                  onChange={(e) => setConfig({ ...config, matchLength: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={25}
                  disabled={isRunning}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Points to play (1 = single game)
                </p>
              </div>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Notes (Optional)
            </label>
            <textarea
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
              rows={3}
              value={config.notes}
              onChange={(e) => setConfig({ ...config, notes: e.target.value })}
              placeholder="e.g., Testing MCTS with expert vs expert, balanced personalities"
              disabled={isRunning}
            />
          </div>

          {/* Start/Abort Buttons */}
          <div className="flex justify-end gap-3">
            {isRunning && (
              <Button
                onClick={handleAbort}
                variant="destructive"
                size="lg"
                className="px-8"
              >
                ⏹️ Abort Run
              </Button>
            )}
            <Button
              onClick={handleStartBatch}
              disabled={isRunning || config.iterations < 1}
              size="lg"
              className="px-8"
            >
              {isRunning ? '⏳ Running...' : '🚀 Start Batch Run'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Card */}
      {progress && (
        <Card>
          <CardHeader>
            <CardTitle>
              {progress.status === 'running' && '⏳ Running...'}
              {progress.status === 'completed' && '✅ Completed'}
              {progress.status === 'error' && '❌ Error'}
            </CardTitle>
            <CardDescription>
              {progress.status === 'running' && `Processing game ${progress.current} of ${progress.total}`}
              {progress.status === 'completed' && `Successfully completed ${progress.total} games`}
              {progress.status === 'error' && 'Batch run failed'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Current Game Progress Bar */}
            {progress.status === 'running' && progress.currentGamePipCount !== undefined && progress.initialPipCount && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-gray-300">Current Game Progress</h4>
                  <span className="text-xs text-gray-400">
                    {progress.currentGamePipCount} pips remaining
                    {progress.currentGamePhase && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                        {progress.currentGamePhase === 'opening_roll' && '🎲 Opening Roll'}
                        {progress.currentGamePhase === 'playing' && '♟️ Playing'}
                        {progress.currentGamePhase === 'finished' && '✓ Finished'}
                      </span>
                    )}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-blue-400 transition-all duration-200"
                    style={{
                      width: `${Math.max(2, ((progress.initialPipCount - progress.currentGamePipCount) / progress.initialPipCount) * 100)}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {progress.currentGameMoveNumber === 0 && 'Starting game...'}
                  {progress.currentGameMoveNumber && progress.currentGameMoveNumber > 0 && (
                    <span>
                      Move {progress.currentGameMoveNumber} • {Math.round(((progress.initialPipCount - progress.currentGamePipCount) / progress.initialPipCount) * 100)}% complete
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Overall Batch Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-300">Overall Progress</h4>
                <span className="text-xs text-gray-400">
                  {progress.current} / {progress.total} games
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    progress.status === 'completed' ? 'bg-green-500' :
                    progress.status === 'error' ? 'bg-red-500' :
                    'bg-blue-500'
                  }`}
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 mt-2 text-center">
                {progress.estimatedTimeRemaining && progress.status === 'running' && (
                  <span>
                    ≈ {formatTimeRemaining(progress.estimatedTimeRemaining)} remaining
                  </span>
                )}
              </p>
            </div>

            {/* Completed State */}
            {progress.status === 'completed' && progress.sessionId && (
              <div className="space-y-3">
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-md">
                  <p className="text-green-400 font-medium mb-2">
                    ✓ Batch run completed successfully!
                  </p>
                  <p className="text-sm text-gray-400">
                    Session ID: <code className="bg-gray-800 px-2 py-1 rounded">{progress.sessionId}</code>
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link href={`/audit?filter=batch`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      📊 View All Sessions
                    </Button>
                  </Link>
                  <Link href="/training" className="flex-1">
                    <Button variant="outline" className="w-full">
                      📈 View MCTS Analytics
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Error State */}
            {progress.status === 'error' && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-md">
                <p className="text-red-400 font-medium mb-2">
                  ✗ Batch run failed
                </p>
                {progress.error && (
                  <pre className="text-sm text-gray-400 whitespace-pre-wrap font-mono">
                    {progress.error}
                  </pre>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="mt-6 bg-blue-500/5 border-blue-500/30">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-2 text-blue-400">💡 About Batch Simulations</h3>
          <ul className="text-sm text-gray-400 space-y-2 list-disc list-inside">
            <li>Batch simulations run headless (no UI rendering) for maximum performance</li>
            <li>All moves are logged with MCTS evaluation data when using Hard or Expert AI</li>
            <li>Results can be viewed in the Audit Sessions browser and MCTS Analytics dashboard</li>
            <li>Large batch runs (100+ games) are recommended for statistical analysis</li>
            <li>Batch runs execute synchronously - tab must remain open until completion</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
