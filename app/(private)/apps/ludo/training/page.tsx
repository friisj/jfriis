'use client';

/**
 * MCTS Training & Analytics Page
 *
 * Interactive dashboard for monitoring MCTS performance,
 * analyzing evaluations, and tuning parameters.
 */

import { useEffect, useState } from 'react';
import {
  getPerformanceByDifficulty,
  getPerformanceByComplexity,
  getRecentPerformanceTrends,
  getRecentBenchmarks,
  isMCTSAuditEnabled
} from '@/lib/studio/ludo/mcts-audit/client';
import type {
  MCTSPerformanceByDifficulty,
  MCTSPerformanceByComplexity,
  MCTSRecentPerformance,
  MCTSPerformanceBenchmark
} from '@/lib/studio/ludo/mcts-audit/types';
import { logger } from '@/lib/studio/ludo/utils/logger';

type TabType = 'performance' | 'evaluations' | 'benchmarks';

export default function TrainingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('performance');
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Performance data
  const [performanceByDifficulty, setPerformanceByDifficulty] = useState<MCTSPerformanceByDifficulty[]>([]);
  const [performanceByComplexity, setPerformanceByComplexity] = useState<MCTSPerformanceByComplexity[]>([]);
  const [recentTrends, setRecentTrends] = useState<MCTSRecentPerformance[]>([]);
  const [benchmarks, setBenchmarks] = useState<MCTSPerformanceBenchmark[]>([]);

  useEffect(() => {
    const enabled = isMCTSAuditEnabled();
    setIsEnabled(enabled);

    if (enabled) {
      loadData();
    } else {
      setLoading(false);
    }
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [difficultyData, complexityData, trendsData, benchmarksData] = await Promise.all([
        getPerformanceByDifficulty(),
        getPerformanceByComplexity(),
        getRecentPerformanceTrends(24),
        getRecentBenchmarks(10)
      ]);

      setPerformanceByDifficulty(difficultyData);
      setPerformanceByComplexity(complexityData);
      setRecentTrends(trendsData);
      setBenchmarks(benchmarksData);

      logger.info('[Training] Data loaded successfully');
    } catch (error) {
      logger.error(`[Training] Failed to load data: ${error}`);
    } finally {
      setLoading(false);
    }
  }

  if (!isEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">MCTS Training & Analytics</h1>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2 text-yellow-400">⚠️ MCTS Audit System Disabled</h2>
            <p className="text-gray-300 mb-4">
              The MCTS analytics system requires Supabase configuration.
              Please set up your Supabase credentials to enable this feature.
            </p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2 text-blue-400">📋 Setup Instructions</h2>
            <ol className="text-gray-300 space-y-2 list-decimal list-inside">
              <li>Set up Supabase project and get credentials</li>
              <li>Add credentials to <code className="bg-slate-800 px-2 py-1 rounded">.env.local</code></li>
              <li>Run migration: <code className="bg-slate-800 px-2 py-1 rounded">supabase migration up</code></li>
              <li>Or use Supabase Dashboard to run <code className="bg-slate-800 px-2 py-1 rounded">012_create_mcts_tables.sql</code></li>
              <li>Refresh this page</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🧠 MCTS Training & Analytics</h1>
          <p className="text-gray-400 mb-4">
            Monitor Monte Carlo Tree Search performance, analyze evaluations, and optimize parameters
          </p>
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4 text-sm">
            <p className="text-gray-300">
              <strong className="text-purple-300">What is this?</strong> This dashboard analyzes data from AI games where MCTS (Monte Carlo Tree Search)
              was used to pick moves. Use it to verify MCTS is working correctly, identify performance bottlenecks, and tune rollout counts
              for different position types. Data comes from batch simulations and live games with MCTS evaluation logging enabled.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'performance'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Performance Dashboard
          </button>
          <button
            onClick={() => setActiveTab('evaluations')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'evaluations'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Evaluation Analysis
          </button>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'benchmarks'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Benchmarks
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading MCTS analytics...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'performance' && (
              <PerformanceDashboard
                difficultyData={performanceByDifficulty}
                complexityData={performanceByComplexity}
                trendsData={recentTrends}
              />
            )}
            {activeTab === 'evaluations' && (
              <EvaluationAnalysis />
            )}
            {activeTab === 'benchmarks' && (
              <BenchmarksTab benchmarks={benchmarks} />
            )}
          </>
        )}

        {/* Refresh Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Data'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PerformanceDashboard({
  difficultyData,
  complexityData,
  trendsData
}: {
  difficultyData: MCTSPerformanceByDifficulty[];
  complexityData: MCTSPerformanceByComplexity[];
  trendsData: MCTSRecentPerformance[];
}) {
  return (
    <div className="space-y-6">
      {/* Metrics Guide */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-blue-400 mb-3">📖 Understanding the Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-blue-300 mb-1">Evaluations</dt>
            <dd className="text-gray-300">Number of move decisions analyzed by MCTS. More = more data for tuning.</dd>
          </div>
          <div>
            <dt className="font-medium text-blue-300 mb-1">Avg Rollouts</dt>
            <dd className="text-gray-300">Monte Carlo simulations per move. Higher = more thorough analysis but slower.</dd>
          </div>
          <div>
            <dt className="font-medium text-blue-300 mb-1">Avg Time</dt>
            <dd className="text-gray-300">Wall clock time per evaluation. Target: under 1 second for good UX.</dd>
          </div>
          <div>
            <dt className="font-medium text-blue-300 mb-1">Games/Sec</dt>
            <dd className="text-gray-300">MCTS simulation speed. <span className="text-green-400">20K+</span> = optimal, <span className="text-yellow-400">5K+</span> = acceptable, <span className="text-red-400">&lt;5K</span> = slow device.</dd>
          </div>
          <div>
            <dt className="font-medium text-blue-300 mb-1">Rule Agreement</dt>
            <dd className="text-gray-300">% of moves where MCTS picks the same move as rule-based AI. Low = MCTS finding better moves.</dd>
          </div>
          <div>
            <dt className="font-medium text-blue-300 mb-1">Fallbacks</dt>
            <dd className="text-gray-300">Times MCTS failed and fell back to rules. Should be near zero.</dd>
          </div>
        </div>
      </div>

      {/* Performance by Difficulty */}
      <div className="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-semibold mb-4">📊 Performance by Difficulty</h2>
        {difficultyData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">No data available yet.</p>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-sm text-gray-300 mb-2">
                <strong>To generate data:</strong>
              </p>
              <ol className="text-sm text-gray-400 list-decimal list-inside text-left space-y-1">
                <li>Play games against Hard or Expert AI opponents</li>
                <li>MCTS evaluations will be automatically logged</li>
                <li>Data will appear here after games are played</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-700">
                  <th className="pb-3 pr-4">Difficulty</th>
                  <th className="pb-3 pr-4 text-right">Evaluations</th>
                  <th className="pb-3 pr-4 text-right">Avg Rollouts</th>
                  <th className="pb-3 pr-4 text-right">Avg Time</th>
                  <th className="pb-3 pr-4 text-right">Games/Sec</th>
                  <th className="pb-3 pr-4 text-right">Rule Agreement</th>
                  <th className="pb-3 pr-4 text-right">Fallbacks</th>
                </tr>
              </thead>
              <tbody>
                {difficultyData.map((row) => (
                  <tr key={row.ai_difficulty} className="border-b border-gray-800 hover:bg-slate-700/30">
                    <td className="py-3 pr-4 font-medium">{row.ai_difficulty}</td>
                    <td className="py-3 pr-4 text-right text-gray-300">{row.total_evaluations.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-right text-gray-300">{Math.round(row.avg_rollouts).toLocaleString()}</td>
                    <td className="py-3 pr-4 text-right text-gray-300">{Math.round(row.avg_time_ms)}ms</td>
                    <td className="py-3 pr-4 text-right">
                      <span className={getPerformanceColor(row.avg_games_per_second)}>
                        {Math.round(row.avg_games_per_second).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-300">
                      {(row.rule_agreement_rate * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span className={row.fallback_count > 0 ? 'text-yellow-400' : 'text-green-400'}>
                        {row.fallback_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Performance by Complexity */}
      <div className="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-semibold">🎯 Performance by Position Complexity</h2>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-4 text-sm">
          <p className="text-gray-300 mb-2">
            <strong className="text-purple-300">Position Types:</strong>
          </p>
          <ul className="space-y-1 text-gray-400">
            <li><strong className="text-gray-300">Forced Move:</strong> Only one legal move available (fast)</li>
            <li><strong className="text-gray-300">Opening:</strong> First 1-2 moves of the game (often cached)</li>
            <li><strong className="text-gray-300">Contact:</strong> Checkers in hitting range (complex, needs more rollouts)</li>
            <li><strong className="text-gray-300">Bearoff + Contact:</strong> Bearing off with opponent still in play (critical)</li>
            <li><strong className="text-gray-300">Cube Decision:</strong> Doubling cube situations (rare in current implementation)</li>
            <li><strong className="text-gray-300">Routine:</strong> Race positions with no contact (simpler)</li>
          </ul>
        </div>
        {complexityData.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No data available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-700">
                  <th className="pb-3 pr-4">Position Type</th>
                  <th className="pb-3 pr-4 text-right">Evaluations</th>
                  <th className="pb-3 pr-4 text-right">Avg Rollouts</th>
                  <th className="pb-3 pr-4 text-right">Avg Time</th>
                  <th className="pb-3 pr-4 text-right">Time Budget</th>
                  <th className="pb-3 pr-4 text-right">Games/Sec</th>
                </tr>
              </thead>
              <tbody>
                {complexityData.map((row) => (
                  <tr key={row.position_type} className="border-b border-gray-800 hover:bg-slate-700/30">
                    <td className="py-3 pr-4 font-medium">{getPositionTypeLabel(row.position_type)}</td>
                    <td className="py-3 pr-4 text-right text-gray-300">{row.total_evaluations.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-right text-gray-300">{Math.round(row.avg_rollouts).toLocaleString()}</td>
                    <td className="py-3 pr-4 text-right text-gray-300">{Math.round(row.avg_time_ms)}ms</td>
                    <td className="py-3 pr-4 text-right text-gray-300">{Math.round(row.avg_time_budget)}ms</td>
                    <td className="py-3 pr-4 text-right">
                      <span className={getPerformanceColor(row.avg_games_per_second)}>
                        {Math.round(row.avg_games_per_second).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Performance Trends */}
      <div className="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-semibold mb-4">📈 Recent Performance Trends (Last 24 Hours)</h2>
        {trendsData.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No trend data available yet.</p>
        ) : (
          <div className="space-y-2">
            {trendsData.slice(0, 10).map((trend) => (
              <div key={trend.time_bucket} className="flex items-center justify-between p-3 bg-slate-900/50 rounded">
                <span className="text-sm text-gray-400">
                  {new Date(trend.time_bucket).toLocaleString()}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-300">
                    {trend.evaluations_count} evaluations
                  </span>
                  <span className={`text-sm font-medium ${getPerformanceColor(trend.median_games_per_second)}`}>
                    {Math.round(trend.median_games_per_second).toLocaleString()} games/sec
                  </span>
                  <span className="text-xs text-gray-500">
                    ({Math.round(trend.min_games_per_second).toLocaleString()} - {Math.round(trend.max_games_per_second).toLocaleString()})
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EvaluationAnalysis() {
  return (
    <div className="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
      <h2 className="text-2xl font-semibold mb-4">🔍 Evaluation Analysis</h2>
      <div className="text-center py-12 text-gray-400">
        <p className="mb-2">Coming soon: Detailed evaluation analysis</p>
        <ul className="text-sm space-y-1">
          <li>• Position browser with move alternatives</li>
          <li>• Move quality comparison (MCTS vs Rules)</li>
          <li>• Win rate distributions</li>
          <li>• Position library management</li>
        </ul>
      </div>
    </div>
  );
}

function BenchmarksTab({ benchmarks }: { benchmarks: MCTSPerformanceBenchmark[] }) {
  return (
    <div className="space-y-6">
      {/* Benchmark Explainer */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-green-400 mb-2">💡 About Benchmarks</h3>
        <p className="text-sm text-gray-300 mb-3">
          These benchmarks measure raw MCTS simulation speed by running lightweight rollouts for a fixed duration (typically 1 second).
          They help determine if your device is fast enough for real-time MCTS.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-green-500/10 rounded px-3 py-2">
            <div className="font-semibold text-green-300">Optimal (20K+)</div>
            <div className="text-gray-400">Desktop, high-end mobile</div>
          </div>
          <div className="bg-blue-500/10 rounded px-3 py-2">
            <div className="font-semibold text-blue-300">High (10K-20K)</div>
            <div className="text-gray-400">Modern mobile devices</div>
          </div>
          <div className="bg-yellow-500/10 rounded px-3 py-2">
            <div className="font-semibold text-yellow-300">Medium (5K-10K)</div>
            <div className="text-gray-400">Older mobile, acceptable</div>
          </div>
          <div className="bg-red-500/10 rounded px-3 py-2">
            <div className="font-semibold text-red-300">Low (&lt;5K)</div>
            <div className="text-gray-400">MCTS auto-disabled</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-semibold mb-4">⚡ Performance Benchmarks</h2>
        {benchmarks.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            No benchmarks recorded yet. Benchmarks run automatically on app startup.
          </p>
        ) : (
          <div className="space-y-4">
            {benchmarks.map((benchmark) => (
              <div key={benchmark.id} className="p-4 bg-slate-900/50 rounded-lg border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">
                    {new Date(benchmark.created_at).toLocaleString()}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPerformanceTierBadge(benchmark.performance_tier)}`}>
                    {benchmark.performance_tier}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-blue-400">
                      {benchmark.games_per_second.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">games/second</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-300">
                      {benchmark.games_simulated.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">games simulated</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-300">
                      {benchmark.duration_ms}ms
                    </div>
                    <div className="text-xs text-gray-500">duration</div>
                  </div>
                </div>
                {benchmark.device_info && (
                  <div className="mt-3 text-xs text-gray-500">
                    {typeof benchmark.device_info === 'object' && 'platform' in benchmark.device_info && (
                      <span>{String(benchmark.device_info.platform)}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions
function getPerformanceColor(gamesPerSecond: number): string {
  if (gamesPerSecond >= 20000) return 'text-green-400 font-medium';
  if (gamesPerSecond >= 10000) return 'text-blue-400 font-medium';
  if (gamesPerSecond >= 5000) return 'text-yellow-400 font-medium';
  return 'text-red-400 font-medium';
}

function getPerformanceTierBadge(tier: string | null): string {
  switch (tier) {
    case 'optimal':
      return 'bg-green-500/20 text-green-400 border border-green-500/30';
    case 'high':
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    case 'low':
      return 'bg-red-500/20 text-red-400 border border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  }
}

function getPositionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'forced': '🎯 Forced Move',
    'opening': '📖 Opening',
    'cube': '🎲 Cube Decision',
    'bearoff_contact': '🏁 Bearoff + Contact',
    'contact': '⚔️ Contact',
    'routine': '➡️ Routine'
  };
  return labels[type] || type;
}
