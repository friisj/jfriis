-- Universal Evidence Table
-- Consolidates assumption_evidence, canvas_item_evidence, touchpoint_evidence
-- Part of Entity Relationship Simplification (OJI-5)
-- Migration created: 2026-01-02

-- ============================================================================
-- 1. UNIVERSAL EVIDENCE TABLE
-- ============================================================================

CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic reference to parent entity
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,

  -- Evidence classification
  evidence_type TEXT NOT NULL,

  -- Content
  title TEXT,
  content TEXT,
  source_url TEXT,
  source_reference TEXT,

  -- Quality indicators
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  supports BOOLEAN DEFAULT true,

  -- Collection metadata
  collected_at TIMESTAMPTZ,
  collector_notes TEXT,

  -- Flexible metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

CREATE INDEX idx_evidence_entity ON evidence (entity_type, entity_id);
CREATE INDEX idx_evidence_type ON evidence (evidence_type);
CREATE INDEX idx_evidence_tags ON evidence USING GIN (tags);
CREATE INDEX idx_evidence_created ON evidence (created_at DESC);
CREATE INDEX idx_evidence_supports ON evidence (supports) WHERE supports IS NOT NULL;

-- ============================================================================
-- 3. TRIGGER FOR updated_at
-- ============================================================================

CREATE TRIGGER update_evidence_updated_at
  BEFORE UPDATE ON evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

-- Read: public can read all evidence
CREATE POLICY "Public read access to evidence"
  ON evidence FOR SELECT
  USING (true);

-- Insert: admin users can add evidence
CREATE POLICY "Admin insert access to evidence"
  ON evidence FOR INSERT
  WITH CHECK (is_admin());

-- Update: admin users can update evidence
CREATE POLICY "Admin update access to evidence"
  ON evidence FOR UPDATE
  USING (is_admin());

-- Delete: admin users can delete evidence
CREATE POLICY "Admin delete access to evidence"
  ON evidence FOR DELETE
  USING (is_admin());

-- ============================================================================
-- 5. COMMENTS
-- ============================================================================

COMMENT ON TABLE evidence IS 'Universal evidence storage for any entity type. Replaces assumption_evidence, canvas_item_evidence, touchpoint_evidence.';
COMMENT ON COLUMN evidence.entity_type IS 'Type of entity this evidence is for: assumption, canvas_item, touchpoint, hypothesis, experiment, etc.';
COMMENT ON COLUMN evidence.entity_id IS 'UUID of the entity this evidence supports/refutes';
COMMENT ON COLUMN evidence.evidence_type IS 'Classification: interview, survey, analytics, experiment, observation, research, competitor, expert, user_test, prototype, ab_test, heuristic_eval, etc.';
COMMENT ON COLUMN evidence.confidence IS 'Confidence level 0.0-1.0 (replaces low/medium/high text)';
COMMENT ON COLUMN evidence.supports IS 'true=supports, false=refutes, null=unclear';
