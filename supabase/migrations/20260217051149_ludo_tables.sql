-- Ludo Tables Migration
-- Creates all tables for the Ludo studio project (3D backgammon engine)
-- Prefix: ludo_ (matching studio_/cog_/verbivore_ namespacing convention)
-- No user_id columns — jfriis is single-user with passkey auth
-- No profiles table — jfriis has its own auth system
-- Sound library is code-based; sound_effects table was removed upstream

-- ============================================================================
-- THEMES
-- ============================================================================
-- Board theme configurations with 80+ visual parameters as JSONB

CREATE TABLE ludo_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  description TEXT CHECK (char_length(description) <= 500),
  theme_data JSONB NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ludo_themes_is_public ON ludo_themes(is_public);
CREATE INDEX idx_ludo_themes_created_at ON ludo_themes(created_at DESC);
CREATE INDEX idx_ludo_themes_theme_data ON ludo_themes USING GIN (theme_data);

CREATE TRIGGER set_ludo_themes_updated_at
  BEFORE UPDATE ON ludo_themes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE ludo_themes IS 'User-created board themes with 80+ visual parameters as JSONB';

-- ============================================================================
-- SOUND COLLECTIONS
-- ============================================================================
-- Named collections of sounds switchable at runtime
-- Sound library is code-based; collections map gameplay events to library IDs

CREATE TABLE ludo_sound_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  description TEXT CHECK (char_length(description) <= 500),
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ludo_sound_collections_is_active ON ludo_sound_collections(is_active);
CREATE INDEX idx_ludo_sound_collections_created_at ON ludo_sound_collections(created_at DESC);

CREATE TRIGGER set_ludo_sound_collections_updated_at
  BEFORE UPDATE ON ludo_sound_collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE ludo_sound_collections IS 'Named collections of sounds switchable at runtime';

-- ============================================================================
-- SOUND COLLECTION ASSIGNMENTS
-- ============================================================================
-- Maps code-based sound library IDs to gameplay events within a collection

CREATE TABLE ludo_sound_collection_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES ludo_sound_collections(id) ON DELETE CASCADE,
  sound_library_id VARCHAR(100) NOT NULL,
  gameplay_event VARCHAR(30) NOT NULL CHECK (gameplay_event IN (
    'dice_roll', 'dice_bounce', 'dice_settle',
    'checker_pickup', 'checker_slide', 'checker_place',
    'hit_impact', 'bear_off',
    'game_win', 'game_loss', 'match_win',
    'button_click', 'panel_open', 'panel_close',
    'checker_select', 'invalid_wrong_player', 'invalid_cannot_move'
  )),
  playback_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, gameplay_event)
);

CREATE INDEX idx_ludo_sca_collection_id ON ludo_sound_collection_assignments(collection_id);
CREATE INDEX idx_ludo_sca_gameplay_event ON ludo_sound_collection_assignments(gameplay_event);

COMMENT ON TABLE ludo_sound_collection_assignments IS 'Maps sound library IDs to gameplay events within a collection';
COMMENT ON COLUMN ludo_sound_collection_assignments.sound_library_id IS 'Reference to sound in code-based library (e.g., "impact_multi_bounce")';

-- ============================================================================
-- GAMEPLAY SESSIONS
-- ============================================================================
-- AI vs AI match-level metadata with aggregate results

CREATE TABLE ludo_gameplay_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('observable', 'batch')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Configuration
  white_ai_preset VARCHAR(50),
  white_ai_personality VARCHAR(50),
  black_ai_preset VARCHAR(50),
  black_ai_personality VARCHAR(50),
  match_length INTEGER CHECK (match_length > 0),
  iteration_count INTEGER CHECK (iteration_count > 0),
  random_seed VARCHAR(50),

  -- Aggregate Results
  total_games INTEGER DEFAULT 0 CHECK (total_games >= 0),
  white_wins INTEGER DEFAULT 0 CHECK (white_wins >= 0),
  black_wins INTEGER DEFAULT 0 CHECK (black_wins >= 0),
  total_moves INTEGER DEFAULT 0 CHECK (total_moves >= 0),
  avg_game_duration_ms INTEGER CHECK (avg_game_duration_ms >= 0),

  -- Analysis Results
  anomaly_count INTEGER DEFAULT 0 CHECK (anomaly_count >= 0),
  rule_violations INTEGER DEFAULT 0 CHECK (rule_violations >= 0),
  strategy_inconsistencies INTEGER DEFAULT 0 CHECK (strategy_inconsistencies >= 0),

  -- Metadata
  app_version VARCHAR(20),
  notes TEXT
);

CREATE INDEX idx_ludo_sessions_created ON ludo_gameplay_sessions(created_at DESC);
CREATE INDEX idx_ludo_sessions_mode ON ludo_gameplay_sessions(mode);
CREATE INDEX idx_ludo_sessions_completed ON ludo_gameplay_sessions(completed_at DESC)
  WHERE completed_at IS NOT NULL;

COMMENT ON TABLE ludo_gameplay_sessions IS 'AI vs AI match sessions with configuration and aggregate results';
COMMENT ON COLUMN ludo_gameplay_sessions.mode IS 'observable: real-time UI with logging | batch: headless background execution';

-- ============================================================================
-- GAMEPLAY EVENTS
-- ============================================================================
-- Individual game actions (dice rolls, moves, hits, doubles)

CREATE TABLE ludo_gameplay_events (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES ludo_gameplay_sessions(id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL CHECK (game_number > 0),
  move_number INTEGER NOT NULL CHECK (move_number >= 0),
  timestamp_ms BIGINT NOT NULL CHECK (timestamp_ms > 0),

  -- Event Type
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'dice_roll', 'move', 'hit', 'enter', 'bear_off',
    'double_offer', 'double_accept', 'double_decline',
    'game_end', 'rule_violation', 'opening_roll'
  )),

  -- Player Info
  player VARCHAR(10) CHECK (player IN ('white', 'black')),
  ai_preset VARCHAR(50),
  ai_personality VARCHAR(50),

  -- Dice
  dice_roll INTEGER[],

  -- Move Details
  move_from INTEGER,
  move_to INTEGER,
  move_distance INTEGER,

  -- AI Decision Data
  available_moves_count INTEGER CHECK (available_moves_count >= 0),
  evaluation_score DECIMAL(10, 4),
  decision_time_ms INTEGER CHECK (decision_time_ms >= 0),
  opening_book_match BOOLEAN,
  opening_book_name VARCHAR(100),

  -- Strategy Weights
  strategy_weights JSONB,

  -- Validation
  pre_move_valid BOOLEAN,
  post_move_valid BOOLEAN,
  rule_check_passed BOOLEAN,
  validation_errors TEXT[],

  -- Anomaly Detection
  is_anomaly BOOLEAN DEFAULT FALSE,
  anomaly_type VARCHAR(50),
  anomaly_severity VARCHAR(20) CHECK (anomaly_severity IN ('info', 'warning', 'error', 'critical')),
  anomaly_description TEXT
);

CREATE INDEX idx_ludo_events_session ON ludo_gameplay_events(session_id);
CREATE INDEX idx_ludo_events_session_game ON ludo_gameplay_events(session_id, game_number);
CREATE INDEX idx_ludo_events_type ON ludo_gameplay_events(event_type);
CREATE INDEX idx_ludo_events_anomaly ON ludo_gameplay_events(is_anomaly) WHERE is_anomaly = TRUE;
CREATE INDEX idx_ludo_events_timestamp ON ludo_gameplay_events(timestamp_ms);

COMMENT ON TABLE ludo_gameplay_events IS 'Individual game actions (dice rolls, moves, decisions) with AI reasoning';
COMMENT ON COLUMN ludo_gameplay_events.strategy_weights IS 'JSONB object containing AI personality weights used for this decision';

-- ============================================================================
-- GAMEPLAY SNAPSHOTS
-- ============================================================================
-- Compressed board states before/after moves for replay and analysis

CREATE TABLE ludo_gameplay_snapshots (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES ludo_gameplay_sessions(id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL CHECK (game_number > 0),
  move_number INTEGER NOT NULL CHECK (move_number >= 0),
  snapshot_type VARCHAR(20) NOT NULL CHECK (snapshot_type IN ('before_move', 'after_move')),

  -- Compressed board state (zlib + base64)
  board_state_compressed TEXT NOT NULL,

  -- Quick reference (denormalized)
  white_pip_count INTEGER CHECK (white_pip_count >= 0),
  black_pip_count INTEGER CHECK (black_pip_count >= 0),
  white_checkers_on_bar INTEGER DEFAULT 0 CHECK (white_checkers_on_bar >= 0 AND white_checkers_on_bar <= 15),
  black_checkers_on_bar INTEGER DEFAULT 0 CHECK (black_checkers_on_bar >= 0 AND black_checkers_on_bar <= 15),
  white_checkers_off INTEGER DEFAULT 0 CHECK (white_checkers_off >= 0 AND white_checkers_off <= 15),
  black_checkers_off INTEGER DEFAULT 0 CHECK (black_checkers_off >= 0 AND black_checkers_off <= 15),

  is_keyframe BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_ludo_snapshots_session_game ON ludo_gameplay_snapshots(session_id, game_number);
CREATE INDEX idx_ludo_snapshots_keyframe ON ludo_gameplay_snapshots(is_keyframe) WHERE is_keyframe = TRUE;

COMMENT ON TABLE ludo_gameplay_snapshots IS 'Compressed board states before/after moves for replay and analysis';
COMMENT ON COLUMN ludo_gameplay_snapshots.board_state_compressed IS 'Zlib-compressed, base64-encoded board state';

-- ============================================================================
-- GAMEPLAY ANALYSIS
-- ============================================================================
-- Statistical metrics and detected patterns

CREATE TABLE ludo_gameplay_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ludo_gameplay_sessions(id) ON DELETE CASCADE,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Statistical Analysis
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Detected Patterns
  patterns_found TEXT[],

  -- Performance Metrics
  performance_score DECIMAL(5, 2) CHECK (performance_score >= 0 AND performance_score <= 100),

  -- Recommendations
  recommendations TEXT[]
);

CREATE INDEX idx_ludo_analysis_session ON ludo_gameplay_analysis(session_id);
CREATE INDEX idx_ludo_analysis_date ON ludo_gameplay_analysis(analyzed_at DESC);

COMMENT ON TABLE ludo_gameplay_analysis IS 'Statistical analysis and metrics computed from gameplay data';
COMMENT ON COLUMN ludo_gameplay_analysis.stats IS 'JSONB with statistical metrics (opening book usage, decision times, etc.)';

-- ============================================================================
-- GAMEPLAY ISSUES
-- ============================================================================
-- Detected anomalies, rule violations, and gameplay problems

CREATE TABLE ludo_gameplay_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ludo_gameplay_sessions(id) ON DELETE CASCADE,
  event_id BIGINT REFERENCES ludo_gameplay_events(id) ON DELETE SET NULL,

  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN (
    'rule_violation', 'strategy_inconsistency', 'invalid_move',
    'performance_anomaly', 'unexpected_outcome', 'evaluation_inconsistency',
    'opening_book_miss', 'forced_move_violation'
  )),

  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  title VARCHAR(200),
  description TEXT,

  -- Context
  game_number INTEGER,
  move_number INTEGER,
  player VARCHAR(10) CHECK (player IN ('white', 'black')),

  -- Evidence
  evidence JSONB,

  -- Resolution
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'wont_fix')),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Categorization
  tags TEXT[]
);

CREATE INDEX idx_ludo_issues_session ON ludo_gameplay_issues(session_id);
CREATE INDEX idx_ludo_issues_type ON ludo_gameplay_issues(issue_type);
CREATE INDEX idx_ludo_issues_severity ON ludo_gameplay_issues(severity);
CREATE INDEX idx_ludo_issues_status ON ludo_gameplay_issues(status);
CREATE INDEX idx_ludo_issues_detected ON ludo_gameplay_issues(detected_at DESC);

COMMENT ON TABLE ludo_gameplay_issues IS 'Detected anomalies, rule violations, and gameplay issues';
COMMENT ON COLUMN ludo_gameplay_issues.evidence IS 'JSONB with supporting data for the detected issue';

-- ============================================================================
-- MCTS EVALUATIONS
-- ============================================================================
-- MCTS move evaluation logs with performance metrics

CREATE TABLE ludo_mcts_evaluations (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES ludo_gameplay_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Game Context
  game_number INTEGER NOT NULL CHECK (game_number > 0),
  move_number INTEGER NOT NULL CHECK (move_number >= 0),
  player VARCHAR(10) NOT NULL CHECK (player IN ('white', 'black')),
  ai_difficulty VARCHAR(20) NOT NULL,

  -- Position Complexity
  is_forced_move BOOLEAN NOT NULL DEFAULT FALSE,
  is_opening_move BOOLEAN NOT NULL DEFAULT FALSE,
  is_contact_position BOOLEAN NOT NULL DEFAULT FALSE,
  is_bearoff_with_contact BOOLEAN NOT NULL DEFAULT FALSE,
  is_cube_decision BOOLEAN NOT NULL DEFAULT FALSE,
  is_match_critical BOOLEAN NOT NULL DEFAULT FALSE,
  move_count INTEGER NOT NULL CHECK (move_count >= 0),

  -- Time Budget
  thinking_time_budget_ms INTEGER NOT NULL CHECK (thinking_time_budget_ms >= 0),
  mcts_time_budget_ms INTEGER NOT NULL CHECK (mcts_time_budget_ms >= 0),

  -- MCTS Configuration
  rollout_count_target INTEGER NOT NULL CHECK (rollout_count_target >= 0),
  rollout_count_actual INTEGER NOT NULL CHECK (rollout_count_actual >= 0),
  rollout_policy VARCHAR(20) NOT NULL CHECK (rollout_policy IN ('random', 'heuristic')),
  exploration_constant DECIMAL(5, 3) NOT NULL,

  -- MCTS Performance
  actual_time_ms INTEGER NOT NULL CHECK (actual_time_ms >= 0),
  games_per_second INTEGER CHECK (games_per_second >= 0),
  nodes_created INTEGER CHECK (nodes_created >= 0),
  simulations_run INTEGER CHECK (simulations_run >= 0),

  -- Selected Move
  selected_move_from INTEGER NOT NULL,
  selected_move_to INTEGER NOT NULL,
  selected_move_visits INTEGER CHECK (selected_move_visits >= 0),
  selected_move_win_rate DECIMAL(5, 4) CHECK (selected_move_win_rate >= 0 AND selected_move_win_rate <= 1),

  -- Alternative Moves (top 3)
  alternative_moves JSONB,

  -- Rule-based Comparison
  rule_based_move_from INTEGER,
  rule_based_move_to INTEGER,
  rule_based_score DECIMAL(10, 4),
  mcts_rule_agreement BOOLEAN,

  -- Performance Flags
  exceeded_time_budget BOOLEAN DEFAULT FALSE,
  fallback_to_rules BOOLEAN DEFAULT FALSE,
  fallback_reason TEXT,

  -- Board State Hash
  position_hash VARCHAR(64)
);

CREATE INDEX idx_ludo_mcts_eval_session ON ludo_mcts_evaluations(session_id);
CREATE INDEX idx_ludo_mcts_eval_created ON ludo_mcts_evaluations(created_at DESC);
CREATE INDEX idx_ludo_mcts_eval_difficulty ON ludo_mcts_evaluations(ai_difficulty);
CREATE INDEX idx_ludo_mcts_eval_complexity ON ludo_mcts_evaluations(is_contact_position, is_cube_decision);
CREATE INDEX idx_ludo_mcts_eval_position_hash ON ludo_mcts_evaluations(position_hash);
CREATE INDEX idx_ludo_mcts_eval_fallback ON ludo_mcts_evaluations(fallback_to_rules)
  WHERE fallback_to_rules = TRUE;

COMMENT ON TABLE ludo_mcts_evaluations IS 'MCTS move evaluations with performance metrics and decision data';
COMMENT ON COLUMN ludo_mcts_evaluations.alternative_moves IS 'JSONB array of top alternative moves with statistics';
COMMENT ON COLUMN ludo_mcts_evaluations.mcts_rule_agreement IS 'True if MCTS and rule-based evaluations selected same move';

-- ============================================================================
-- MCTS PERFORMANCE BENCHMARKS
-- ============================================================================
-- Track MCTS rollout performance over time

CREATE TABLE ludo_mcts_performance_benchmarks (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Benchmark Configuration
  duration_ms INTEGER NOT NULL CHECK (duration_ms > 0),
  rollout_policy VARCHAR(20) NOT NULL CHECK (rollout_policy IN ('random', 'heuristic')),

  -- Results
  games_simulated INTEGER NOT NULL CHECK (games_simulated > 0),
  games_per_second INTEGER NOT NULL CHECK (games_per_second > 0),

  -- System Info
  device_info JSONB,
  app_version VARCHAR(20),

  -- Performance Classification
  performance_tier VARCHAR(20) CHECK (performance_tier IN ('low', 'medium', 'high', 'optimal'))
);

CREATE INDEX idx_ludo_mcts_bench_created ON ludo_mcts_performance_benchmarks(created_at DESC);
CREATE INDEX idx_ludo_mcts_bench_tier ON ludo_mcts_performance_benchmarks(performance_tier);

COMMENT ON TABLE ludo_mcts_performance_benchmarks IS 'MCTS rollout performance benchmarks over time';

-- ============================================================================
-- MCTS POSITION LIBRARY
-- ============================================================================
-- Interesting positions for training and testing

CREATE TABLE ludo_mcts_position_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Position Metadata
  name VARCHAR(200),
  description TEXT,
  category VARCHAR(50) CHECK (category IN (
    'opening', 'contact', 'bearoff', 'race', 'blitz', 'holding', 'back_game', 'cube_decision'
  )),

  -- Position Data
  board_state_compressed TEXT NOT NULL,
  current_player VARCHAR(10) NOT NULL CHECK (current_player IN ('white', 'black')),

  -- Complexity Metrics
  white_pip_count INTEGER CHECK (white_pip_count >= 0),
  black_pip_count INTEGER CHECK (black_pip_count >= 0),
  position_hash VARCHAR(64) UNIQUE,

  -- Evaluation Data
  best_move_from INTEGER,
  best_move_to INTEGER,
  best_move_win_rate DECIMAL(5, 4) CHECK (best_move_win_rate >= 0 AND best_move_win_rate <= 1),
  evaluation_simulations INTEGER CHECK (evaluation_simulations >= 0),

  -- Usage Tracking
  times_evaluated INTEGER DEFAULT 0 CHECK (times_evaluated >= 0),
  last_evaluated_at TIMESTAMPTZ,

  -- Tags
  tags TEXT[]
);

CREATE INDEX idx_ludo_mcts_pos_category ON ludo_mcts_position_library(category);
CREATE INDEX idx_ludo_mcts_pos_hash ON ludo_mcts_position_library(position_hash);
CREATE INDEX idx_ludo_mcts_pos_tags ON ludo_mcts_position_library USING GIN (tags);

COMMENT ON TABLE ludo_mcts_position_library IS 'Interesting backgammon positions for training and testing';
COMMENT ON COLUMN ludo_mcts_position_library.board_state_compressed IS 'Zlib-compressed, base64-encoded board state';

-- ============================================================================
-- MCTS TRAINING SESSIONS
-- ============================================================================
-- Parameter tuning and training sessions

CREATE TABLE ludo_mcts_training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Training Configuration
  training_type VARCHAR(50) NOT NULL CHECK (training_type IN (
    'rollout_count_tuning', 'exploration_constant_tuning',
    'time_budget_optimization', 'policy_comparison'
  )),

  -- Parameters Tested
  parameters_tested JSONB NOT NULL,

  -- Results
  total_positions_evaluated INTEGER DEFAULT 0 CHECK (total_positions_evaluated >= 0),
  total_simulations_run INTEGER DEFAULT 0 CHECK (total_simulations_run >= 0),
  avg_games_per_second INTEGER CHECK (avg_games_per_second >= 0),

  -- Best Configuration Found
  best_configuration JSONB,
  best_performance_score DECIMAL(10, 4),

  -- Comparison Data
  baseline_configuration JSONB,
  improvement_percent DECIMAL(5, 2),

  -- Notes
  notes TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'cancelled', 'failed'))
);

CREATE INDEX idx_ludo_mcts_training_created ON ludo_mcts_training_sessions(created_at DESC);
CREATE INDEX idx_ludo_mcts_training_type ON ludo_mcts_training_sessions(training_type);
CREATE INDEX idx_ludo_mcts_training_status ON ludo_mcts_training_sessions(status);

COMMENT ON TABLE ludo_mcts_training_sessions IS 'MCTS parameter tuning and training sessions';

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Auto-update session stats when gameplay events are inserted
CREATE OR REPLACE FUNCTION ludo_update_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'game_end' THEN
    UPDATE ludo_gameplay_sessions
    SET total_games = total_games + 1,
        white_wins = white_wins + CASE WHEN NEW.player = 'white' THEN 1 ELSE 0 END,
        black_wins = black_wins + CASE WHEN NEW.player = 'black' THEN 1 ELSE 0 END
    WHERE id = NEW.session_id;
  END IF;

  IF NEW.event_type IN ('move', 'hit', 'enter', 'bear_off') THEN
    UPDATE ludo_gameplay_sessions
    SET total_moves = total_moves + 1
    WHERE id = NEW.session_id;
  END IF;

  IF NEW.is_anomaly = TRUE THEN
    UPDATE ludo_gameplay_sessions
    SET anomaly_count = anomaly_count + 1
    WHERE id = NEW.session_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ludo_update_session_stats
  AFTER INSERT ON ludo_gameplay_events
  FOR EACH ROW EXECUTE FUNCTION ludo_update_session_stats();

-- Auto-update position library evaluation count
CREATE OR REPLACE FUNCTION ludo_update_position_evaluation_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.position_hash IS NOT NULL THEN
    UPDATE ludo_mcts_position_library
    SET times_evaluated = times_evaluated + 1,
        last_evaluated_at = now()
    WHERE position_hash = NEW.position_hash;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ludo_update_position_evaluation_count
  AFTER INSERT ON ludo_mcts_evaluations
  FOR EACH ROW EXECUTE FUNCTION ludo_update_position_evaluation_count();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- MCTS Performance Summary by Difficulty
CREATE VIEW ludo_mcts_performance_by_difficulty AS
SELECT
  ai_difficulty,
  COUNT(*) as total_evaluations,
  AVG(rollout_count_actual) as avg_rollouts,
  AVG(actual_time_ms) as avg_time_ms,
  AVG(games_per_second) as avg_games_per_second,
  SUM(CASE WHEN fallback_to_rules THEN 1 ELSE 0 END) as fallback_count,
  AVG(CASE WHEN mcts_rule_agreement THEN 1 ELSE 0 END) as rule_agreement_rate
FROM ludo_mcts_evaluations
GROUP BY ai_difficulty;

-- MCTS Performance by Position Complexity
CREATE VIEW ludo_mcts_performance_by_complexity AS
SELECT
  CASE
    WHEN is_forced_move THEN 'forced'
    WHEN is_opening_move THEN 'opening'
    WHEN is_cube_decision THEN 'cube'
    WHEN is_bearoff_with_contact THEN 'bearoff_contact'
    WHEN is_contact_position THEN 'contact'
    ELSE 'routine'
  END as position_type,
  COUNT(*) as total_evaluations,
  AVG(rollout_count_actual) as avg_rollouts,
  AVG(actual_time_ms) as avg_time_ms,
  AVG(thinking_time_budget_ms) as avg_time_budget,
  AVG(games_per_second) as avg_games_per_second
FROM ludo_mcts_evaluations
GROUP BY position_type;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE ludo_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ludo_sound_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ludo_sound_collection_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ludo_gameplay_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ludo_gameplay_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ludo_gameplay_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ludo_gameplay_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ludo_gameplay_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE ludo_mcts_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ludo_mcts_performance_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ludo_mcts_position_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE ludo_mcts_training_sessions ENABLE ROW LEVEL SECURITY;

-- Admin full access (uses jfriis is_admin() pattern)
CREATE POLICY "Admin full access on ludo_themes"
  ON ludo_themes FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on ludo_sound_collections"
  ON ludo_sound_collections FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on ludo_sound_collection_assignments"
  ON ludo_sound_collection_assignments FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on ludo_gameplay_sessions"
  ON ludo_gameplay_sessions FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on ludo_gameplay_events"
  ON ludo_gameplay_events FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on ludo_gameplay_snapshots"
  ON ludo_gameplay_snapshots FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on ludo_gameplay_analysis"
  ON ludo_gameplay_analysis FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on ludo_gameplay_issues"
  ON ludo_gameplay_issues FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on ludo_mcts_evaluations"
  ON ludo_mcts_evaluations FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on ludo_mcts_performance_benchmarks"
  ON ludo_mcts_performance_benchmarks FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on ludo_mcts_position_library"
  ON ludo_mcts_position_library FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on ludo_mcts_training_sessions"
  ON ludo_mcts_training_sessions FOR ALL USING (is_admin());

-- Public read for public themes (gallery)
CREATE POLICY "Public themes are viewable by everyone"
  ON ludo_themes FOR SELECT USING (is_public = true);
