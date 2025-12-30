-- Assumptions as first-class entities
-- Based on methodologies from Teresa Torres, David Bland, and Strategyzer
-- Migration created: 2025-12-29

-- ============================================================================
-- 1. ASSUMPTIONS TABLE
-- ============================================================================

CREATE TABLE assumptions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  statement TEXT NOT NULL,

  -- Category (from Teresa Torres + David Bland)
  -- Desirability: Do customers want this?
  -- Viability: Can we make money / sustain this?
  -- Feasibility: Can we build it?
  -- Usability: Can customers use it effectively?
  -- Ethical: Is there potential harm?
  category TEXT NOT NULL CHECK (category IN (
    'desirability',
    'viability',
    'feasibility',
    'usability',
    'ethical'
  )),

  -- Prioritization (David Bland's 2x2 matrix)
  -- Importance: How critical is this to success?
  importance TEXT NOT NULL DEFAULT 'medium' CHECK (importance IN ('critical', 'high', 'medium', 'low')),
  -- Evidence Level: How much evidence do we have?
  evidence_level TEXT NOT NULL DEFAULT 'none' CHECK (evidence_level IN ('none', 'weak', 'moderate', 'strong')),

  -- Status (Strategyzer's design-test loop)
  status TEXT NOT NULL DEFAULT 'identified' CHECK (status IN (
    'identified',   -- Just captured
    'prioritized',  -- In the queue to test
    'testing',      -- Currently being tested
    'validated',    -- Supported by evidence
    'invalidated',  -- Refuted by evidence
    'archived'      -- No longer relevant
  )),

  -- Leap of Faith flag (high importance + low evidence = test first)
  -- This can be computed but storing for query efficiency
  is_leap_of_faith BOOLEAN DEFAULT false,

  -- Studio Context
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,
  hypothesis_id UUID REFERENCES studio_hypotheses(id) ON DELETE SET NULL,

  -- Source tracking (where this assumption came from)
  -- Allows linking back to the canvas block that generated it
  source_type TEXT CHECK (source_type IN (
    'business_model_canvas',
    'value_map',
    'customer_profile',
    'value_proposition_canvas',
    'opportunity',
    'solution',
    'manual'
  )),
  source_id UUID,  -- ID of the source canvas/entity
  source_block TEXT,  -- Which block in the canvas (e.g., 'customer_segments', 'products_services')

  -- Validation details
  validation_criteria TEXT,  -- What would prove this true/false?
  validated_at TIMESTAMPTZ,
  invalidated_at TIMESTAMPTZ,
  decision TEXT,  -- What did we decide? (persevere/pivot/kill)
  decision_notes TEXT,

  -- Metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_assumption_slug_per_project UNIQUE (studio_project_id, slug)
);

-- Indexes
CREATE INDEX idx_assumptions_project ON assumptions(studio_project_id);
CREATE INDEX idx_assumptions_hypothesis ON assumptions(hypothesis_id);
CREATE INDEX idx_assumptions_category ON assumptions(category);
CREATE INDEX idx_assumptions_status ON assumptions(status);
CREATE INDEX idx_assumptions_importance ON assumptions(importance);
CREATE INDEX idx_assumptions_leap_of_faith ON assumptions(is_leap_of_faith) WHERE is_leap_of_faith = true;
CREATE INDEX idx_assumptions_source ON assumptions(source_type, source_id);

-- Trigger for updated_at
CREATE TRIGGER update_assumptions_updated_at
  BEFORE UPDATE ON assumptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE assumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to assumptions" ON assumptions
  FOR SELECT USING (true);

CREATE POLICY "Admin full access to assumptions" ON assumptions
  FOR ALL USING (is_admin());

-- ============================================================================
-- 2. ASSUMPTION_EXPERIMENTS JUNCTION TABLE
-- ============================================================================

CREATE TABLE assumption_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assumption_id UUID NOT NULL REFERENCES assumptions(id) ON DELETE CASCADE,
  experiment_id UUID NOT NULL REFERENCES studio_experiments(id) ON DELETE CASCADE,

  -- Result of the experiment for this assumption
  result TEXT CHECK (result IN ('supports', 'refutes', 'inconclusive')),
  confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),

  -- Notes about what we learned
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each assumption-experiment pair is unique
  CONSTRAINT unique_assumption_experiment UNIQUE (assumption_id, experiment_id)
);

-- Indexes
CREATE INDEX idx_assumption_experiments_assumption ON assumption_experiments(assumption_id);
CREATE INDEX idx_assumption_experiments_experiment ON assumption_experiments(experiment_id);
CREATE INDEX idx_assumption_experiments_result ON assumption_experiments(result);

-- Trigger
CREATE TRIGGER update_assumption_experiments_updated_at
  BEFORE UPDATE ON assumption_experiments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE assumption_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to assumption_experiments" ON assumption_experiments
  FOR SELECT USING (true);

CREATE POLICY "Admin full access to assumption_experiments" ON assumption_experiments
  FOR ALL USING (is_admin());

-- ============================================================================
-- 3. ASSUMPTION_EVIDENCE TABLE
-- ============================================================================

CREATE TABLE assumption_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assumption_id UUID NOT NULL REFERENCES assumptions(id) ON DELETE CASCADE,

  -- Evidence details
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'interview',
    'survey',
    'analytics',
    'experiment',
    'observation',
    'research',
    'competitor',
    'expert'
  )),
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT,  -- Link to source document/recording

  -- Assessment
  supports_assumption BOOLEAN,  -- true = supports, false = refutes, null = unclear
  confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),

  -- When was this evidence collected?
  collected_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_assumption_evidence_assumption ON assumption_evidence(assumption_id);
CREATE INDEX idx_assumption_evidence_type ON assumption_evidence(evidence_type);
CREATE INDEX idx_assumption_evidence_supports ON assumption_evidence(supports_assumption);

-- Trigger
CREATE TRIGGER update_assumption_evidence_updated_at
  BEFORE UPDATE ON assumption_evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE assumption_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to assumption_evidence" ON assumption_evidence
  FOR SELECT USING (true);

CREATE POLICY "Admin full access to assumption_evidence" ON assumption_evidence
  FOR ALL USING (is_admin());

-- ============================================================================
-- 4. HELPER FUNCTION: Update leap_of_faith flag
-- ============================================================================

CREATE OR REPLACE FUNCTION update_leap_of_faith()
RETURNS TRIGGER AS $$
BEGIN
  -- Leap of faith = high/critical importance AND none/weak evidence
  NEW.is_leap_of_faith := (
    NEW.importance IN ('critical', 'high') AND
    NEW.evidence_level IN ('none', 'weak')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_leap_of_faith
  BEFORE INSERT OR UPDATE OF importance, evidence_level ON assumptions
  FOR EACH ROW
  EXECUTE FUNCTION update_leap_of_faith();

-- ============================================================================
-- 5. SEED DATA: Example assumptions for Design System Tool
-- ============================================================================

INSERT INTO assumptions (
  slug,
  statement,
  category,
  importance,
  evidence_level,
  status,
  studio_project_id,
  source_type,
  source_block,
  validation_criteria,
  tags
)
SELECT
  'dst-designers-want-visual-token-mgmt',
  'Design system maintainers want a visual interface for managing design tokens rather than editing code directly',
  'desirability',
  'critical',
  'weak',
  'identified',
  sp.id,
  'customer_profile',
  'jobs',
  'At least 7 out of 10 interviewed designers express frustration with current code-based token management',
  ARRAY['core', 'user-need']
FROM studio_projects sp
WHERE sp.slug = 'design-system-tool'
LIMIT 1;

INSERT INTO assumptions (
  slug,
  statement,
  category,
  importance,
  evidence_level,
  status,
  studio_project_id,
  source_type,
  source_block,
  validation_criteria,
  tags
)
SELECT
  'dst-teams-pay-for-efficiency',
  'Design teams will pay for tools that demonstrably reduce token management time by 50% or more',
  'viability',
  'high',
  'none',
  'identified',
  sp.id,
  'business_model_canvas',
  'revenue_streams',
  'Pricing experiments show >20% conversion at $29/month price point',
  ARRAY['pricing', 'revenue']
FROM studio_projects sp
WHERE sp.slug = 'design-system-tool'
LIMIT 1;

INSERT INTO assumptions (
  slug,
  statement,
  category,
  importance,
  evidence_level,
  status,
  studio_project_id,
  source_type,
  source_block,
  validation_criteria,
  tags
)
SELECT
  'dst-browser-can-handle-tokens',
  'A browser-based tool can handle design systems with 1000+ tokens without performance degradation',
  'feasibility',
  'medium',
  'moderate',
  'testing',
  sp.id,
  'value_map',
  'products_services',
  'Performance tests show <100ms render time with 2000 tokens',
  ARRAY['technical', 'performance']
FROM studio_projects sp
WHERE sp.slug = 'design-system-tool'
LIMIT 1;
