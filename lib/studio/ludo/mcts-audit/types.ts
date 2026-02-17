/**
 * MCTS Analytics Database Types
 *
 * TypeScript interfaces matching the MCTS tables schema
 * from migration 012_create_mcts_tables.sql
 */

/**
 * MCTS move evaluation record
 * Logs each MCTS evaluation with performance metrics
 */
export interface MCTSEvaluation {
  id: number;
  session_id: string | null;
  user_id: string | null;
  created_at: string;

  // Game Context
  game_number: number;
  move_number: number;
  player: 'white' | 'black';
  ai_difficulty: string;

  // Position Complexity
  is_forced_move: boolean;
  is_opening_move: boolean;
  is_contact_position: boolean;
  is_bearoff_with_contact: boolean;
  is_cube_decision: boolean;
  is_match_critical: boolean;
  move_count: number;

  // Time Budget
  thinking_time_budget_ms: number;
  mcts_time_budget_ms: number;

  // MCTS Configuration
  rollout_count_target: number;
  rollout_count_actual: number;
  rollout_policy: 'random' | 'heuristic';
  exploration_constant: number;

  // MCTS Performance
  actual_time_ms: number;
  games_per_second: number | null;
  nodes_created: number | null;
  simulations_run: number | null;

  // Selected Move
  selected_move_from: number;
  selected_move_to: number;
  selected_move_visits: number | null;
  selected_move_win_rate: number | null;

  // Alternative Moves
  alternative_moves: MCTSMoveEvaluation[] | null;

  // Rule-based Comparison
  rule_based_move_from: number | null;
  rule_based_move_to: number | null;
  rule_based_score: number | null;
  mcts_rule_agreement: boolean | null;

  // Performance Flags
  exceeded_time_budget: boolean;
  fallback_to_rules: boolean;
  fallback_reason: string | null;

  // Position Hash
  position_hash: string | null;
}

/**
 * Alternative move evaluation (stored in JSONB)
 */
export interface MCTSMoveEvaluation {
  from: number;
  to: number;
  visits: number;
  winRate: number;
  score: number;
}

/**
 * Insert type for MCTS evaluations (omits auto-generated fields)
 */
export type MCTSEvaluationInsert = Omit<MCTSEvaluation, 'id' | 'created_at'> & {
  created_at?: string;
};

/**
 * MCTS performance benchmark record
 */
export interface MCTSPerformanceBenchmark {
  id: number;
  user_id: string | null;
  created_at: string;

  // Benchmark Configuration
  duration_ms: number;
  rollout_policy: 'random' | 'heuristic';

  // Results
  games_simulated: number;
  games_per_second: number;

  // System Info
  device_info: Record<string, unknown> | null;
  app_version: string | null;

  // Performance Classification
  performance_tier: 'low' | 'medium' | 'high' | 'optimal' | null;
}

/**
 * Insert type for benchmarks
 */
export type MCTSPerformanceBenchmarkInsert = Omit<MCTSPerformanceBenchmark, 'id' | 'created_at'> & {
  created_at?: string;
};

/**
 * MCTS position library record
 */
export interface MCTSPosition {
  id: string;
  user_id: string | null;
  created_at: string;

  // Position Metadata
  name: string | null;
  description: string | null;
  category: 'opening' | 'contact' | 'bearoff' | 'race' | 'blitz' | 'holding' | 'back_game' | 'cube_decision' | null;

  // Position Data
  board_state_compressed: string;
  current_player: 'white' | 'black';

  // Complexity Metrics
  white_pip_count: number | null;
  black_pip_count: number | null;
  position_hash: string | null;

  // Evaluation Data
  best_move_from: number | null;
  best_move_to: number | null;
  best_move_win_rate: number | null;
  evaluation_simulations: number | null;

  // Usage Tracking
  times_evaluated: number;
  last_evaluated_at: string | null;

  // Tags
  tags: string[] | null;
}

/**
 * Insert type for positions
 */
export type MCTSPositionInsert = Omit<MCTSPosition, 'id' | 'created_at' | 'times_evaluated' | 'last_evaluated_at'> & {
  id?: string;
  created_at?: string;
  times_evaluated?: number;
  last_evaluated_at?: string | null;
};

/**
 * MCTS training session record
 */
export interface MCTSTrainingSession {
  id: string;
  user_id: string | null;
  created_at: string;
  completed_at: string | null;

  // Training Configuration
  training_type: 'rollout_count_tuning' | 'exploration_constant_tuning' | 'time_budget_optimization' | 'policy_comparison';

  // Parameters Tested
  parameters_tested: Record<string, unknown>;

  // Results
  total_positions_evaluated: number;
  total_simulations_run: number;
  avg_games_per_second: number | null;

  // Best Configuration Found
  best_configuration: Record<string, unknown> | null;
  best_performance_score: number | null;

  // Comparison Data
  baseline_configuration: Record<string, unknown> | null;
  improvement_percent: number | null;

  // Notes
  notes: string | null;

  // Status
  status: 'running' | 'completed' | 'cancelled' | 'failed';
}

/**
 * Insert type for training sessions
 */
export type MCTSTrainingSessionInsert = Omit<MCTSTrainingSession, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

/**
 * View: MCTS Performance by Difficulty
 */
export interface MCTSPerformanceByDifficulty {
  ai_difficulty: string;
  total_evaluations: number;
  avg_rollouts: number;
  avg_time_ms: number;
  avg_games_per_second: number;
  fallback_count: number;
  rule_agreement_rate: number;
}

/**
 * View: MCTS Performance by Complexity
 */
export interface MCTSPerformanceByComplexity {
  position_type: 'forced' | 'opening' | 'cube' | 'bearoff_contact' | 'contact' | 'routine';
  total_evaluations: number;
  avg_rollouts: number;
  avg_time_ms: number;
  avg_time_budget: number;
  avg_games_per_second: number;
}

/**
 * View: Recent MCTS Performance Trends
 */
export interface MCTSRecentPerformance {
  time_bucket: string;
  evaluations_count: number;
  avg_games_per_second: number;
  min_games_per_second: number;
  max_games_per_second: number;
  median_games_per_second: number;
}
