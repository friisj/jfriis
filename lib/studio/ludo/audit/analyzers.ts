// @ts-nocheck
/**
 * Gameplay Audit System - Analysis Tools
 *
 * Tools for analyzing logged gameplay data
 */

import { GameplayEvent, ValidationReport, ConsistencyReport, AnomalyDetectionResult, AnalysisStats } from './types';
import { auditClient } from './client';
import { logger } from '../utils/logger';

// =====================================================
// Rule Compliance Analyzer
// =====================================================

export class RuleComplianceAnalyzer {
  /**
   * Analyze a session for rule violations
   */
  async analyzeSession(sessionId: string): Promise<ValidationReport> {
    logger.info(`Analyzing rule compliance for session: ${sessionId}`);

    const events = await auditClient.getSessionEvents(sessionId);
    const violations: ValidationReport['violations'] = [];
    let totalMoves = 0;

    for (const event of events) {
      if (event.event_type === 'move') {
        totalMoves++;

        // Check for validation errors
        if (event.validation_errors && event.validation_errors.length > 0) {
          violations.push({
            event_id: event.id,
            rule: 'Move Validation',
            description: event.validation_errors.join(', '),
            severity: event.anomaly_severity === 'critical' ? 'critical' : 'high'
          });
        }

        // Check for rule violation events
        if (event.rule_check_passed === false) {
          violations.push({
            event_id: event.id,
            rule: 'Rule Check',
            description: 'Move failed rule validation',
            severity: 'high'
          });
        }
      } else if (event.event_type === 'rule_violation') {
        violations.push({
          event_id: event.id,
          rule: 'Rule Violation',
          description: event.anomaly_description || 'Unknown violation',
          severity: event.anomaly_severity === 'critical' ? 'critical' : 'high'
        });
      }
    }

    const compliance_rate = totalMoves > 0
      ? ((totalMoves - violations.length) / totalMoves) * 100
      : 100;

    return {
      total_moves: totalMoves,
      violations_found: violations.length,
      compliance_rate,
      violations
    };
  }
}

// =====================================================
// Strategy Consistency Analyzer
// =====================================================

export class StrategyConsistencyAnalyzer {
  /**
   * Analyze AI personality consistency
   */
  async analyzeSession(sessionId: string): Promise<ConsistencyReport> {
    logger.info(`Analyzing strategy consistency for session: ${sessionId}`);

    const events = await auditClient.getSessionEvents(sessionId, {
      eventType: 'move'
    });

    const playerStats: Record<string, {
      personality: string;
      hitCount: number;
      blotExposure: number;
      primeBuilding: number;
      moves: number;
    }> = {};

    // Collect behavioral data
    for (const event of events) {
      if (!event.player || !event.ai_personality) continue;

      if (!playerStats[event.player]) {
        playerStats[event.player] = {
          personality: event.ai_personality,
          hitCount: 0,
          blotExposure: 0,
          primeBuilding: 0,
          moves: 0
        };
      }

      const stats = playerStats[event.player];
      stats.moves++;

      // Count specific behaviors (simplified)
      // In production, would analyze board snapshots for deeper insights
      if (event.strategy_weights) {
        stats.hitCount += event.strategy_weights.hitting_blots || 0;
        stats.blotExposure += event.strategy_weights.getting_hit || 0;
        stats.primeBuilding += event.strategy_weights.prime_value || 0;
      }
    }

    // Build consistency report
    const report: ConsistencyReport = {};

    for (const [player, stats] of Object.entries(playerStats)) {
      const expected = this.getExpectedBehavior(stats.personality);
      const actual = {
        hit_frequency: stats.hitCount / stats.moves,
        blot_exposure: stats.blotExposure / stats.moves,
        prime_building: stats.primeBuilding / stats.moves,
        anchor_establishment: 0, // Would calculate from board analysis
        racing_preference: 0, // Would calculate from board analysis
        opening_book_adherence: 0 // Would calculate from opening moves
      };

      // Calculate deviation (simplified)
      const deviation = this.calculateDeviation(expected, actual);
      const consistency_score = Math.max(0, 100 - deviation * 100);

      report[player] = {
        personality: stats.personality,
        expected,
        actual,
        deviation,
        consistency_score,
        anomalies: [] // Would detect specific inconsistent moves
      };
    }

    return report;
  }

  private getExpectedBehavior(personality: string): Record<string, number> {
    // Simplified expected values for each personality
    switch (personality.toUpperCase()) {
      case 'AGGRESSIVE':
        return {
          hitting_blots: 0.8,
          getting_hit: 0.6,
          building_points: 0.5,
          breaking_points: 0.7,
          prime_value: 0.6,
          anchor_value: 0.4,
          advanced_anchor: 0.7,
          risk_tolerance: 0.9,
          blitz_aggression: 0.9,
          opening_variation: 0.6,
          endgame_bearing_off: 0.5
        };
      case 'DEFENSIVE':
        return {
          hitting_blots: 0.3,
          getting_hit: 0.2,
          building_points: 0.9,
          breaking_points: 0.3,
          prime_value: 0.8,
          anchor_value: 0.9,
          advanced_anchor: 0.6,
          risk_tolerance: 0.2,
          blitz_aggression: 0.1,
          opening_variation: 0.4,
          endgame_bearing_off: 0.7
        };
      case 'TACTICAL':
        return {
          hitting_blots: 0.6,
          getting_hit: 0.4,
          building_points: 0.7,
          breaking_points: 0.5,
          prime_value: 0.7,
          anchor_value: 0.6,
          advanced_anchor: 0.8,
          risk_tolerance: 0.5,
          blitz_aggression: 0.4,
          opening_variation: 0.7,
          endgame_bearing_off: 0.6
        };
      default: // BALANCED
        return {
          hitting_blots: 0.5,
          getting_hit: 0.4,
          building_points: 0.6,
          breaking_points: 0.5,
          prime_value: 0.6,
          anchor_value: 0.6,
          advanced_anchor: 0.6,
          risk_tolerance: 0.5,
          blitz_aggression: 0.5,
          opening_variation: 0.5,
          endgame_bearing_off: 0.6
        };
    }
  }

  private calculateDeviation(
    expected: Record<string, number>,
    actual: Record<string, number>
  ): number {
    let totalDev = 0;
    let count = 0;

    for (const key in expected) {
      if (actual[key] !== undefined) {
        totalDev += Math.abs(expected[key] - actual[key]);
        count++;
      }
    }

    return count > 0 ? totalDev / count : 0;
  }
}

// =====================================================
// Anomaly Detector
// =====================================================

export class AnomalyDetector {
  /**
   * Detect anomalies in gameplay session
   */
  async detectAnomalies(sessionId: string): Promise<AnomalyDetectionResult> {
    logger.info(`Detecting anomalies for session: ${sessionId}`);

    const events = await auditClient.getSessionEvents(sessionId);
    const anomalies: AnomalyDetectionResult['anomalies'] = [];

    for (const event of events) {
      // Already flagged anomalies
      if (event.is_anomaly) {
        anomalies.push({
          event_id: event.id,
          type: event.anomaly_type || 'unknown',
          severity: event.anomaly_severity || 'info',
          description: event.anomaly_description || 'Anomaly detected',
          context: {
            game_number: event.game_number,
            move_number: event.move_number,
            player: event.player
          }
        });
      }

      // Detect new anomalies
      if (event.event_type === 'move') {
        // Extremely long decision time
        if (event.decision_time_ms && event.decision_time_ms > 10000) {
          anomalies.push({
            event_id: event.id,
            type: 'slow_decision',
            severity: 'warning',
            description: `AI took ${event.decision_time_ms}ms to decide (>10s)`,
            context: { decision_time_ms: event.decision_time_ms }
          });
        }

        // No available moves reported
        if (event.available_moves_count === 0 && event.move_from !== null) {
          anomalies.push({
            event_id: event.id,
            type: 'impossible_move',
            severity: 'error',
            description: 'Move made despite no available moves',
            context: {
              move_from: event.move_from,
              move_to: event.move_to
            }
          });
        }
      }
    }

    return {
      anomalies,
      total_events: events.length,
      anomaly_rate: events.length > 0 ? (anomalies.length / events.length) * 100 : 0
    };
  }
}

// =====================================================
// Statistical Reporter
// =====================================================

export class StatisticalReporter {
  /**
   * Generate comprehensive statistics for a session
   */
  async generateReport(sessionId: string): Promise<AnalysisStats> {
    logger.info(`Generating statistics for session: ${sessionId}`);

    const events = await auditClient.getSessionEvents(sessionId);
    const session = await auditClient.getSession(sessionId);

    const stats: AnalysisStats = {};

    // Opening book usage
    const openingBookMoves = events.filter(e => e.opening_book_match === true);
    stats.opening_book_usage = {
      white: openingBookMoves.filter(e => e.player === 'white').length,
      black: openingBookMoves.filter(e => e.player === 'black').length
    };

    // Average decision time
    const decisionTimes = events.filter(e => e.decision_time_ms);
    const whiteDecisions = decisionTimes.filter(e => e.player === 'white');
    const blackDecisions = decisionTimes.filter(e => e.player === 'black');

    stats.avg_decision_time_ms = {
      white: whiteDecisions.length > 0
        ? whiteDecisions.reduce((sum, e) => sum + (e.decision_time_ms || 0), 0) / whiteDecisions.length
        : 0,
      black: blackDecisions.length > 0
        ? blackDecisions.reduce((sum, e) => sum + (e.decision_time_ms || 0), 0) / blackDecisions.length
        : 0
    };

    // Hit rate
    const hits = events.filter(e => e.event_type === 'hit');
    stats.hit_rate = {
      white: hits.filter(e => e.player === 'white').length,
      black: hits.filter(e => e.player === 'black').length
    };

    // Rule compliance
    const violations = events.filter(e => e.event_type === 'rule_violation');
    const totalMoves = events.filter(e => e.event_type === 'move').length;
    stats.rule_compliance = totalMoves > 0
      ? ((totalMoves - violations.length) / totalMoves) * 100
      : 100;

    // Add session metadata
    if (session) {
      stats.total_games = session.total_games;
      stats.white_wins = session.white_wins;
      stats.black_wins = session.black_wins;
    }

    return stats;
  }
}

// Export analyzer instances
export const ruleAnalyzer = new RuleComplianceAnalyzer();
export const strategyAnalyzer = new StrategyConsistencyAnalyzer();
export const anomalyDetector = new AnomalyDetector();
export const statReporter = new StatisticalReporter();
