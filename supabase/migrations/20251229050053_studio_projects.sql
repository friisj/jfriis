-- Studio Projects Migration
-- Creates tables for studio project management with hypothesis-driven structure

-- ============================================================================
-- STUDIO PROJECTS
-- ============================================================================

CREATE TABLE studio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  temperature TEXT CHECK (temperature IN ('hot', 'warm', 'cold')),
  current_focus TEXT,

  -- PRD fields
  problem_statement TEXT,
  hypothesis TEXT,
  success_criteria TEXT,
  scope_out TEXT,

  -- Scaffolding
  path TEXT,                    -- components/studio/{slug}/
  scaffolded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for common queries
CREATE INDEX idx_studio_projects_status ON studio_projects(status);
CREATE INDEX idx_studio_projects_temperature ON studio_projects(temperature);

-- Updated_at trigger
CREATE TRIGGER set_studio_projects_updated_at
  BEFORE UPDATE ON studio_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE studio_projects IS 'Studio workshop projects with PRD fields and hypothesis-driven structure';

-- ============================================================================
-- STUDIO HYPOTHESES
-- ============================================================================

CREATE TABLE studio_hypotheses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,

  statement TEXT NOT NULL,              -- "If we X, then Y"
  validation_criteria TEXT,             -- How we'll know it's true/false
  sequence INTEGER NOT NULL DEFAULT 1,  -- Order in roadmap (1, 2, 3...)
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'testing', 'validated', 'invalidated')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for ordering
CREATE INDEX idx_studio_hypotheses_project_seq ON studio_hypotheses(project_id, sequence);

-- Updated_at trigger
CREATE TRIGGER set_studio_hypotheses_updated_at
  BEFORE UPDATE ON studio_hypotheses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE studio_hypotheses IS 'Hypotheses to validate within studio projects';

-- ============================================================================
-- STUDIO EXPERIMENTS
-- ============================================================================

CREATE TABLE studio_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
  hypothesis_id UUID REFERENCES studio_hypotheses(id) ON DELETE SET NULL,

  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  type TEXT NOT NULL DEFAULT 'experiment' CHECK (type IN ('spike', 'experiment', 'prototype')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'abandoned')),
  outcome TEXT CHECK (outcome IN ('success', 'failure', 'inconclusive')),
  learnings TEXT,               -- Quick observations (substantive notes go to log_entries)

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(project_id, slug)
);

-- Indexes
CREATE INDEX idx_studio_experiments_project ON studio_experiments(project_id);
CREATE INDEX idx_studio_experiments_hypothesis ON studio_experiments(hypothesis_id);
CREATE INDEX idx_studio_experiments_status ON studio_experiments(status);

-- Updated_at trigger
CREATE TRIGGER set_studio_experiments_updated_at
  BEFORE UPDATE ON studio_experiments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE studio_experiments IS 'Experiments/spikes that test hypotheses within studio projects';

-- ============================================================================
-- BIDIRECTIONAL LINKS - Add FKs to existing tables
-- ============================================================================

-- Log entries can link to project and/or experiment
ALTER TABLE log_entries
  ADD COLUMN studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,
  ADD COLUMN studio_experiment_id UUID REFERENCES studio_experiments(id) ON DELETE SET NULL;

CREATE INDEX idx_log_entries_studio_project ON log_entries(studio_project_id);
CREATE INDEX idx_log_entries_studio_experiment ON log_entries(studio_experiment_id);

-- Specimens link to project
ALTER TABLE specimens
  ADD COLUMN studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL;

CREATE INDEX idx_specimens_studio_project ON specimens(studio_project_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE studio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_experiments ENABLE ROW LEVEL SECURITY;

-- Public read for active/completed projects
CREATE POLICY "Public can view active studio projects"
  ON studio_projects FOR SELECT
  USING (status IN ('active', 'completed'));

-- Admin full access
CREATE POLICY "Admins have full access to studio projects"
  ON studio_projects FOR ALL
  USING (is_admin());

CREATE POLICY "Public can view hypotheses of active projects"
  ON studio_hypotheses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM studio_projects
      WHERE id = studio_hypotheses.project_id
      AND status IN ('active', 'completed')
    )
  );

CREATE POLICY "Admins have full access to studio hypotheses"
  ON studio_hypotheses FOR ALL
  USING (is_admin());

CREATE POLICY "Public can view experiments of active projects"
  ON studio_experiments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM studio_projects
      WHERE id = studio_experiments.project_id
      AND status IN ('active', 'completed')
    )
  );

CREATE POLICY "Admins have full access to studio experiments"
  ON studio_experiments FOR ALL
  USING (is_admin());
