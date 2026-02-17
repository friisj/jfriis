/**
 * Session Report Modal
 *
 * Displays comprehensive analysis of an audit session including:
 * - Rule compliance
 * - Strategy consistency
 * - Anomaly detection
 * - Statistical overview
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card';
import { Button } from './button';
import {
  ruleAnalyzer,
  strategyAnalyzer,
  anomalyDetector,
  statReporter
} from '@/lib/studio/ludo/audit/analyzers';
import { auditClient } from '@/lib/studio/ludo/audit/client';
import {
  ValidationReport,
  ConsistencyReport,
  AnomalyDetectionResult,
  AnalysisStats
} from '@/lib/studio/ludo/audit/types';
import { logger } from '@/lib/studio/ludo/utils/logger';

interface SessionReportModalProps {
  sessionId: string;
  onClose: () => void;
}

type TabType = 'overview' | 'rules' | 'strategy' | 'anomalies' | 'events';

export function SessionReportModal({ sessionId, onClose }: SessionReportModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [ruleReport, setRuleReport] = useState<ValidationReport | null>(null);
  const [strategyReport, setStrategyReport] = useState<ConsistencyReport | null>(null);
  const [anomalyReport, setAnomalyReport] = useState<AnomalyDetectionResult | null>(null);
  const [allEvents, setAllEvents] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
  }, [sessionId]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [statsData, rulesData, strategyData, anomalyData, eventsData] = await Promise.all([
        statReporter.generateReport(sessionId),
        ruleAnalyzer.analyzeSession(sessionId),
        strategyAnalyzer.analyzeSession(sessionId),
        anomalyDetector.detectAnomalies(sessionId),
        auditClient.getSessionEvents(sessionId, {}) // Get all events
      ]);

      setStats(statsData);
      setRuleReport(rulesData);
      setStrategyReport(strategyData);
      setAnomalyReport(anomalyData);
      setAllEvents(eventsData);
    } catch (error) {
      logger.error('Failed to load session reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const reportData = {
      sessionId,
      generated_at: new Date().toISOString(),
      overview: stats,
      rule_compliance: ruleReport,
      strategy_consistency: strategyReport,
      anomalies: anomalyReport,
      all_events: allEvents
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${sessionId.slice(0, 8)}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>📊 Session Analysis Report</CardTitle>
              <CardDescription>Session ID: {sessionId.slice(0, 16)}...</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportReport} variant="outline" size="sm">
                💾 Export JSON
              </Button>
              <Button onClick={onClose} variant="outline" size="sm">
                ✕ Close
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-gray-700 pb-2">
            <Button
              variant={activeTab === 'overview' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('overview')}
              size="sm"
            >
              📈 Overview
            </Button>
            <Button
              variant={activeTab === 'rules' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('rules')}
              size="sm"
            >
              ⚖️ Rule Compliance
            </Button>
            <Button
              variant={activeTab === 'strategy' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('strategy')}
              size="sm"
            >
              🎯 Strategy
            </Button>
            <Button
              variant={activeTab === 'anomalies' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('anomalies')}
              size="sm"
            >
              ⚠️ Anomalies
            </Button>
            <Button
              variant={activeTab === 'events' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('events')}
              size="sm"
            >
              📋 Event Log
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Analyzing session data...</p>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && stats && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                      title="Total Games"
                      value={stats.total_games?.toString() || '0'}
                      icon="🎮"
                    />
                    <StatCard
                      title="White Wins"
                      value={stats.white_wins?.toString() || '0'}
                      icon="⚪"
                    />
                    <StatCard
                      title="Black Wins"
                      value={stats.black_wins?.toString() || '0'}
                      icon="⚫"
                    />
                    <StatCard
                      title="Rule Compliance"
                      value={`${stats.rule_compliance?.toFixed(1) || '100.0'}%`}
                      icon="⚖️"
                      color={
                        (stats.rule_compliance || 100) >= 99
                          ? 'text-green-400'
                          : (stats.rule_compliance || 100) >= 95
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Decision Time */}
                    <Card className="bg-muted/30">
                      <CardHeader>
                        <CardTitle className="text-sm">⏱️ Average Decision Time</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">White:</span>
                            <span className="font-medium">
                              {stats.avg_decision_time_ms?.white?.toFixed(0) || '0'}ms
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Black:</span>
                            <span className="font-medium">
                              {stats.avg_decision_time_ms?.black?.toFixed(0) || '0'}ms
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Hit Rate */}
                    <Card className="bg-muted/30">
                      <CardHeader>
                        <CardTitle className="text-sm">🎯 Hit Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">White:</span>
                            <span className="font-medium">
                              {stats.hit_rate?.white || 0} hits
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Black:</span>
                            <span className="font-medium">
                              {stats.hit_rate?.black || 0} hits
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Opening Book Usage */}
                    <Card className="bg-muted/30">
                      <CardHeader>
                        <CardTitle className="text-sm">📖 Opening Book Usage</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">White:</span>
                            <span className="font-medium">
                              {stats.opening_book_usage?.white || 0} moves
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Black:</span>
                            <span className="font-medium">
                              {stats.opening_book_usage?.black || 0} moves
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Rule Compliance Tab */}
              {activeTab === 'rules' && ruleReport && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <StatCard
                      title="Total Moves"
                      value={ruleReport.total_moves.toString()}
                      icon="🎲"
                    />
                    <StatCard
                      title="Violations Found"
                      value={ruleReport.violations_found.toString()}
                      icon="⚠️"
                      color={ruleReport.violations_found > 0 ? 'text-red-400' : 'text-green-400'}
                    />
                    <StatCard
                      title="Compliance Rate"
                      value={`${ruleReport.compliance_rate.toFixed(1)}%`}
                      icon="✅"
                      color={
                        ruleReport.compliance_rate >= 99
                          ? 'text-green-400'
                          : ruleReport.compliance_rate >= 95
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }
                    />
                  </div>

                  {ruleReport.violations.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">Violations Detected:</h3>
                      {ruleReport.violations.map((violation, idx) => (
                        <Card
                          key={violation.event_id}
                          className={`border-l-4 ${
                            violation.severity === 'critical'
                              ? 'border-red-500 bg-red-500/10'
                              : 'border-yellow-500 bg-yellow-500/10'
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-semibold text-sm">
                                {violation.rule}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  violation.severity === 'critical'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}
                              >
                                {violation.severity}
                              </span>
                            </div>
                            <p className="text-sm text-gray-300">{violation.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Event ID: {violation.event_id}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-green-400">
                      ✅ No rule violations detected - Perfect compliance!
                    </div>
                  )}
                </div>
              )}

              {/* Strategy Consistency Tab */}
              {activeTab === 'strategy' && strategyReport && (
                <div className="space-y-4">
                  {Object.entries(strategyReport).map(([player, report]) => (
                    <Card key={player} className="bg-muted/30">
                      <CardHeader>
                        <CardTitle className="text-sm capitalize">
                          {player === 'white' ? '⚪' : '⚫'} {player} - {report.personality}
                        </CardTitle>
                        <CardDescription>
                          Consistency Score: {report.consistency_score.toFixed(1)}%
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Consistency</span>
                            <span>{report.consistency_score.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                report.consistency_score >= 80
                                  ? 'bg-green-500'
                                  : report.consistency_score >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${report.consistency_score}%` }}
                            />
                          </div>
                        </div>

                        <div className="text-xs">
                          <p className="font-semibold mb-2">Behavioral Analysis:</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-gray-400">Hit Frequency:</span>{' '}
                              <span className="font-medium">
                                {(report.actual.hit_frequency * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Blot Exposure:</span>{' '}
                              <span className="font-medium">
                                {(report.actual.blot_exposure * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Prime Building:</span>{' '}
                              <span className="font-medium">
                                {(report.actual.prime_building * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Deviation:</span>{' '}
                              <span className="font-medium">
                                {(report.deviation * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Anomalies Tab */}
              {activeTab === 'anomalies' && anomalyReport && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <StatCard
                      title="Total Events"
                      value={anomalyReport.total_events.toString()}
                      icon="📊"
                    />
                    <StatCard
                      title="Anomalies"
                      value={anomalyReport.anomalies.length.toString()}
                      icon="⚠️"
                      color={anomalyReport.anomalies.length > 0 ? 'text-yellow-400' : 'text-green-400'}
                    />
                    <StatCard
                      title="Anomaly Rate"
                      value={`${anomalyReport.anomaly_rate.toFixed(2)}%`}
                      icon="📈"
                      color={
                        anomalyReport.anomaly_rate > 5
                          ? 'text-red-400'
                          : anomalyReport.anomaly_rate > 1
                          ? 'text-yellow-400'
                          : 'text-green-400'
                      }
                    />
                  </div>

                  {anomalyReport.anomalies.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">Detected Anomalies:</h3>
                      {anomalyReport.anomalies.map((anomaly, idx) => (
                        <Card
                          key={`${anomaly.event_id}-${idx}`}
                          className={`border-l-4 ${
                            anomaly.severity === 'error'
                              ? 'border-red-500 bg-red-500/10'
                              : anomaly.severity === 'warning'
                              ? 'border-yellow-500 bg-yellow-500/10'
                              : 'border-blue-500 bg-blue-500/10'
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-semibold text-sm capitalize">
                                {anomaly.type.replace(/_/g, ' ')}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  anomaly.severity === 'error'
                                    ? 'bg-red-500/20 text-red-400'
                                    : anomaly.severity === 'warning'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}
                              >
                                {anomaly.severity}
                              </span>
                            </div>
                            <p className="text-sm text-gray-300 mb-2">{anomaly.description}</p>
                            {anomaly.context && (
                              <div className="text-xs text-gray-500">
                                <p>Context: {JSON.stringify(anomaly.context)}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-green-400">
                      ✅ No anomalies detected - Clean session!
                    </div>
                  )}
                </div>
              )}

              {/* Event Log Tab */}
              {activeTab === 'events' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-400">
                      {allEvents.length} events recorded
                    </p>
                  </div>

                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {allEvents.map((event, idx) => (
                      <Card
                        key={event.id}
                        className={`bg-muted/30 ${
                          event.is_anomaly ? 'border-l-4 border-red-500' : ''
                        }`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {event.event_type === 'dice_roll' ? '🎲' :
                                 event.event_type === 'opening_roll' ? '🎲' :
                                 event.event_type === 'move' ? '♟️' :
                                 event.event_type === 'hit' ? '💥' :
                                 event.event_type === 'enter' ? '↩️' :
                                 event.event_type === 'bear_off' ? '🏁' :
                                 event.event_type === 'game_end' ? '🏆' :
                                 event.event_type === 'double_offer' ? '🎯' :
                                 event.event_type === 'double_accept' ? '✅' :
                                 event.event_type === 'double_decline' ? '❌' :
                                 event.event_type === 'rule_violation' ? '⚠️' : '📝'}
                              </span>
                              <div>
                                <p className="text-sm font-medium capitalize">
                                  {event.event_type.replace(/_/g, ' ')}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Game {event.game_number}, Move {event.move_number}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {new Date(event.created_at).toLocaleTimeString()}
                            </span>
                          </div>

                          <div className="text-xs space-y-1">
                            {event.player && (
                              <div>
                                <span className="text-gray-400">Player:</span>{' '}
                                <span className="font-medium">{event.player}</span>
                              </div>
                            )}
                            {event.dice_roll && (
                              <div>
                                <span className="text-gray-400">Dice:</span>{' '}
                                <span className="font-medium">[{event.dice_roll.join(', ')}]</span>
                              </div>
                            )}
                            {(event.move_from !== null || event.move_to !== null) && (
                              <div>
                                <span className="text-gray-400">Move:</span>{' '}
                                <span className="font-medium">
                                  {event.move_from !== null ? event.move_from : 'bar'} → {event.move_to !== null ? event.move_to : 'off'}
                                </span>
                                {event.available_moves_count && (
                                  <span className="text-gray-500"> ({event.available_moves_count} options)</span>
                                )}
                              </div>
                            )}
                            {event.ai_preset && (
                              <div>
                                <span className="text-gray-400">AI:</span>{' '}
                                <span className="font-medium">{event.ai_preset}</span>
                                {event.ai_personality && (
                                  <span className="text-gray-500"> ({event.ai_personality})</span>
                                )}
                              </div>
                            )}
                            {event.decision_time_ms && (
                              <div>
                                <span className="text-gray-400">Decision Time:</span>{' '}
                                <span className="font-medium">{event.decision_time_ms}ms</span>
                              </div>
                            )}
                            {event.evaluation_score !== null && event.evaluation_score !== undefined && (
                              <div>
                                <span className="text-gray-400">Evaluation:</span>{' '}
                                <span className="font-medium">{event.evaluation_score.toFixed(2)}</span>
                              </div>
                            )}
                            {event.opening_book_match && (
                              <div className="text-blue-400">
                                📖 Opening book match
                                {event.opening_book_name && `: ${event.opening_book_name}`}
                              </div>
                            )}
                            {event.validation_errors && event.validation_errors.length > 0 && (
                              <div className="text-red-400">
                                ❌ Validation errors: {event.validation_errors.join(', ')}
                              </div>
                            )}
                            {event.is_anomaly && (
                              <div className="text-yellow-400">
                                ⚠️ {event.anomaly_type}: {event.anomaly_description}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper component for stat cards
function StatCard({
  title,
  value,
  icon,
  color = 'text-blue-400'
}: {
  title: string;
  value: string;
  icon: string;
  color?: string;
}) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">{title}</span>
          <span className="text-lg">{icon}</span>
        </div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
