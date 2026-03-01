-- Arena tables: skills, sessions, and session artifacts for the skill gym
-- Arena is a private tinkering app for refining design skills through
-- AI-driven feedback loops with De Bono hat annotations

-- =============================================================================
-- 1. arena_skills — persisted SkillState snapshots
-- =============================================================================

CREATE TABLE arena_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state JSONB NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('figma', 'manual', 'refined', 'base')),
  parent_skill_id UUID REFERENCES arena_skills(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE arena_skills IS 'Persisted SkillState snapshots. No package grouping yet.';

CREATE TRIGGER update_arena_skills_updated_at
  BEFORE UPDATE ON arena_skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 2. arena_sessions — gym refinement sessions working on a skill
-- =============================================================================

CREATE TABLE arena_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_skill_id UUID NOT NULL REFERENCES arena_skills(id) ON DELETE RESTRICT,
  output_skill_id UUID REFERENCES arena_skills(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  round_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE arena_sessions IS 'A gym refinement session working on a skill.';

CREATE TRIGGER update_arena_sessions_updated_at
  BEFORE UPDATE ON arena_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. arena_session_annotations — De Bono hat annotations per session round
-- =============================================================================

CREATE TABLE arena_session_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES arena_sessions(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  hat_key TEXT NOT NULL CHECK (hat_key IN ('white', 'red', 'black', 'yellow', 'green', 'blue')),
  segments JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE arena_session_annotations IS 'De Bono hat annotations per session round.';

-- =============================================================================
-- 4. arena_session_feedback — per-decision feedback per round
-- =============================================================================

CREATE TABLE arena_session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES arena_sessions(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  dimension TEXT NOT NULL CHECK (dimension IN ('color', 'typography', 'spacing')),
  decision_label TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approve', 'adjust', 'flag')),
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE arena_session_feedback IS 'Per-decision feedback (approve/adjust/flag) per round.';

-- =============================================================================
-- 5. arena_session_iterations — skill state snapshot per refinement round
-- =============================================================================

CREATE TABLE arena_session_iterations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES arena_sessions(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  skill_state JSONB NOT NULL,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, round)
);

COMMENT ON TABLE arena_session_iterations IS 'Skill state snapshot produced at each refinement round.';

-- =============================================================================
-- 6. Indexes
-- =============================================================================

CREATE INDEX idx_arena_skills_source ON arena_skills(source);
CREATE INDEX idx_arena_skills_parent ON arena_skills(parent_skill_id);
CREATE INDEX idx_arena_sessions_status ON arena_sessions(status);
CREATE INDEX idx_arena_sessions_input_skill ON arena_sessions(input_skill_id);
CREATE INDEX idx_arena_session_annotations_round ON arena_session_annotations(session_id, round);
CREATE INDEX idx_arena_session_feedback_round ON arena_session_feedback(session_id, round);
CREATE INDEX idx_arena_session_iterations_session ON arena_session_iterations(session_id);

-- =============================================================================
-- 7. RLS — admin-only access (private app, auth at route level)
-- =============================================================================

ALTER TABLE arena_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_session_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_session_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_session_iterations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to arena_skills"
  ON arena_skills FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to arena_sessions"
  ON arena_sessions FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to arena_session_annotations"
  ON arena_session_annotations FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to arena_session_feedback"
  ON arena_session_feedback FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to arena_session_iterations"
  ON arena_session_iterations FOR ALL USING (is_admin());
