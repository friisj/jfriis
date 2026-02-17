/**
 * Gameplay Audit System - Type Definitions
 *
 * Types for automated AI vs AI testing and logging system
 */

import { Player } from '../game/types';

// =====================================================
// Gameplay Session Types
// =====================================================

export type AuditMode = 'observable' | 'batch';

export interface GameplaySession {
  id: string;
  user_id: string;
  mode: AuditMode;
  created_at: string;
  completed_at: string | null;

  // Configuration
  white_ai_preset: string | null;
  white_ai_personality: string | null;
  black_ai_preset: string | null;
  black_ai_personality: string | null;
  match_length: number | null;
  iteration_count: number | null;
  random_seed: string | null;

  // Aggregate Results
  total_games: number;
  white_wins: number;
  black_wins: number;
  total_moves: number;
  avg_game_duration_ms: number | null;

  // Analysis Results
  anomaly_count: number;
  rule_violations: number;
  strategy_inconsistencies: number;

  // Metadata
  app_version: string | null;
  notes: string | null;
}

export interface CreateSessionConfig {
  mode: AuditMode;
  white_ai_preset: string;
  white_ai_personality: string;
  black_ai_preset: string;
  black_ai_personality: string;
  match_length: number;
  iteration_count?: number;
  random_seed?: string;
  notes?: string;
}

// =====================================================
// Gameplay Event Types
// =====================================================

export type EventType =
  | 'dice_roll'
  | 'move'
  | 'hit'
  | 'enter'
  | 'bear_off'
  | 'double_offer'
  | 'double_accept'
  | 'double_decline'
  | 'game_end'
  | 'rule_violation'
  | 'opening_roll';

export type AnomalySeverity = 'info' | 'warning' | 'error' | 'critical';

export interface GameplayEvent {
  id: number;
  session_id: string;
  game_number: number;
  move_number: number;
  timestamp_ms: number;

  // Event Type
  event_type: EventType;

  // Player Info
  player: Player | null;
  ai_preset: string | null;
  ai_personality: string | null;

  // Dice
  dice_roll: number[] | null;

  // Move Details
  move_from: number | null;
  move_to: number | null;
  move_distance: number | null;

  // AI Decision Data
  available_moves_count: number | null;
  evaluation_score: number | null;
  decision_time_ms: number | null;
  opening_book_match: boolean | null;
  opening_book_name: string | null;

  // Strategy Weights
  strategy_weights: StrategyWeights | null;

  // Validation
  pre_move_valid: boolean | null;
  post_move_valid: boolean | null;
  rule_check_passed: boolean | null;
  validation_errors: string[] | null;

  // Anomaly Detection
  is_anomaly: boolean;
  anomaly_type: string | null;
  anomaly_severity: AnomalySeverity | null;
  anomaly_description: string | null;
}

export interface StrategyWeights {
  // Position Evaluation
  hitting_blots: number;
  getting_hit: number;
  building_points: number;
  breaking_points: number;

  // Strategic Concepts
  prime_value: number;
  anchor_value: number;
  advanced_anchor: number;

  // Risk Tolerance
  risk_tolerance: number;
  blitz_aggression: number;

  // Game Phase
  opening_variation: number;
  endgame_bearing_off: number;
}

export interface CreateEventData {
  session_id: string;
  game_number: number;
  move_number: number;
  event_type: EventType;
  player?: Player;
  ai_preset?: string;
  ai_personality?: string;
  dice_roll?: number[];
  move_from?: number;
  move_to?: number;
  move_distance?: number;
  available_moves_count?: number;
  evaluation_score?: number;
  decision_time_ms?: number;
  opening_book_match?: boolean;
  opening_book_name?: string;
  strategy_weights?: StrategyWeights;
  pre_move_valid?: boolean;
  post_move_valid?: boolean;
  rule_check_passed?: boolean;
  validation_errors?: string[];
  is_anomaly?: boolean;
  anomaly_type?: string;
  anomaly_severity?: AnomalySeverity;
  anomaly_description?: string;
}

// =====================================================
// Gameplay Snapshot Types
// =====================================================

export type SnapshotType = 'before_move' | 'after_move';

export interface GameplaySnapshot {
  id: number;
  session_id: string;
  game_number: number;
  move_number: number;
  snapshot_type: SnapshotType;

  // Compressed board state
  board_state_compressed: string;

  // Quick reference
  white_pip_count: number | null;
  black_pip_count: number | null;
  white_checkers_on_bar: number;
  black_checkers_on_bar: number;
  white_checkers_off: number;
  black_checkers_off: number;

  // Optimization
  is_keyframe: boolean;
}

export interface CreateSnapshotData {
  session_id: string;
  game_number: number;
  move_number: number;
  snapshot_type: SnapshotType;
  board_state_compressed: string;
  white_pip_count?: number;
  black_pip_count?: number;
  white_checkers_on_bar?: number;
  black_checkers_on_bar?: number;
  white_checkers_off?: number;
  black_checkers_off?: number;
  is_keyframe?: boolean;
}

// =====================================================
// Gameplay Analysis Types
// =====================================================

export interface GameplayAnalysis {
  id: string;
  session_id: string;
  analyzed_at: string;

  // Statistical Analysis
  stats: AnalysisStats;

  // Detected Patterns
  patterns_found: string[] | null;

  // Performance Metrics
  performance_score: number | null;

  // Recommendations
  recommendations: string[] | null;
}

export interface AnalysisStats {
  opening_book_usage?: {
    white: number;
    black: number;
  };
  avg_decision_time_ms?: {
    white: number;
    black: number;
  };
  move_diversity?: number;
  strategy_consistency?: {
    white: number;
    black: number;
  };
  rule_compliance?: number;
  pip_count_progression?: number[];
  hit_rate?: {
    white: number;
    black: number;
  };
  [key: string]: unknown; // Allow additional stats
}

// =====================================================
// Gameplay Issue Types
// =====================================================

export type IssueType =
  | 'rule_violation'
  | 'strategy_inconsistency'
  | 'invalid_move'
  | 'performance_anomaly'
  | 'unexpected_outcome'
  | 'evaluation_inconsistency'
  | 'opening_book_miss'
  | 'forced_move_violation';

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IssueStatus = 'open' | 'investigating' | 'resolved' | 'wont_fix';

export interface GameplayIssue {
  id: string;
  session_id: string;
  event_id: number | null;

  detected_at: string;
  issue_type: IssueType;
  severity: IssueSeverity;

  title: string | null;
  description: string | null;

  // Context
  game_number: number | null;
  move_number: number | null;
  player: Player | null;

  // Evidence
  evidence: Record<string, unknown> | null;

  // Resolution
  status: IssueStatus;
  resolved_at: string | null;
  resolution_notes: string | null;

  // Categorization
  tags: string[] | null;
}

export interface CreateIssueData {
  session_id: string;
  event_id?: number;
  issue_type: IssueType;
  severity: IssueSeverity;
  title?: string;
  description?: string;
  game_number?: number;
  move_number?: number;
  player?: Player;
  evidence?: Record<string, unknown>;
  tags?: string[];
}

// =====================================================
// Batch Processing Types
// =====================================================

export interface BatchConfig {
  iterations: number;
  whiteAI: {
    preset: string;
    personality: string;
  };
  blackAI: {
    preset: string;
    personality: string;
  };
  matchLength: number;
  randomSeed?: number;
  notes?: string;
}

export interface BatchProgress {
  current: number;
  total: number;
  sessionId: string;
  estimatedTimeRemaining?: number; // milliseconds

  // Current game progress
  currentGameMoveNumber?: number;
  currentGameTotalMoves?: number;
  currentGamePhase?: string; // e.g., "opening_roll", "playing", "finished"
  currentGamePipCount?: number; // Combined pip count (both players)
  initialPipCount?: number; // Starting pip count (334 for standard game)
}

export type ProgressCallback = (progress: BatchProgress) => void;

// =====================================================
// Analysis Result Types
// =====================================================

export interface ValidationReport {
  total_moves: number;
  violations_found: number;
  compliance_rate: number;
  violations: RuleViolation[];
}

export interface RuleViolation {
  event_id: number;
  rule: string;
  description: string;
  severity: IssueSeverity;
}

export interface ConsistencyReport {
  [player: string]: {
    personality: string;
    expected: StrategyWeights;
    actual: BehaviorMetrics;
    deviation: number;
    consistency_score: number;
    anomalies: ConsistencyAnomaly[];
  };
}

export interface BehaviorMetrics {
  hit_frequency: number;
  blot_exposure: number;
  prime_building: number;
  anchor_establishment: number;
  racing_preference: number;
  opening_book_adherence: number;
}

export interface ConsistencyAnomaly {
  move_number: number;
  expected_behavior: string;
  actual_behavior: string;
  deviation: number;
}

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  total_events: number;
  anomaly_rate: number;
}

export interface Anomaly {
  event_id: number;
  type: string;
  severity: AnomalySeverity;
  description: string;
  context?: Record<string, unknown>;
}
