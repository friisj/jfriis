-- Universal Entity Links Table
-- Replaces JSONB UUID arrays and simple junction tables
-- Part of Entity Relationship Simplification (OJI-5)
-- Migration created: 2026-01-02

-- ============================================================================
-- 1. ENTITY LINKS TABLE
-- ============================================================================

CREATE TABLE entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source entity (the "from" side)
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,

  -- Target entity (the "to" side)
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,

  -- Relationship classification
  link_type TEXT NOT NULL DEFAULT 'related',

  -- Optional relationship metadata
  strength TEXT CHECK (strength IN ('strong', 'moderate', 'weak', 'tentative')),
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  -- Ordering (for ordered relationships like gallery items)
  position INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate links
  UNIQUE(source_type, source_id, target_type, target_id, link_type)
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

-- Efficient querying in both directions
CREATE INDEX idx_entity_links_source ON entity_links (source_type, source_id);
CREATE INDEX idx_entity_links_target ON entity_links (target_type, target_id);
CREATE INDEX idx_entity_links_type ON entity_links (link_type);

-- For ordered relationships
CREATE INDEX idx_entity_links_position ON entity_links (source_type, source_id, position)
  WHERE position IS NOT NULL;

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE entity_links ENABLE ROW LEVEL SECURITY;

-- Read: public can read all links
CREATE POLICY "Public read access to entity_links"
  ON entity_links FOR SELECT
  USING (true);

-- Insert: admin users can create links
CREATE POLICY "Admin insert access to entity_links"
  ON entity_links FOR INSERT
  WITH CHECK (is_admin());

-- Update: admin users can update links (for position, notes)
CREATE POLICY "Admin update access to entity_links"
  ON entity_links FOR UPDATE
  USING (is_admin());

-- Delete: admin users can remove links
CREATE POLICY "Admin delete access to entity_links"
  ON entity_links FOR DELETE
  USING (is_admin());

-- ============================================================================
-- 4. COMMENTS
-- ============================================================================

COMMENT ON TABLE entity_links IS 'Universal relationship table for loose associations between entities. Replaces JSONB UUID arrays and simple junction tables.';
COMMENT ON COLUMN entity_links.source_type IS 'Entity type of the source: project, log_entry, backlog_item, specimen, studio_project, hypothesis, experiment, business_model_canvas, customer_profile, value_proposition_canvas, canvas_item, user_journey, journey_stage, touchpoint, assumption';
COMMENT ON COLUMN entity_links.target_type IS 'Entity type of the target (same options as source_type)';
COMMENT ON COLUMN entity_links.link_type IS 'Relationship type: related, references, evolved_from, inspired_by, derived_from, validates, tests, supports, contradicts, contains, part_of, addresses_job, relieves_pain, creates_gain, documents, demonstrates';
COMMENT ON COLUMN entity_links.strength IS 'Relationship strength: strong, moderate, weak, tentative';
COMMENT ON COLUMN entity_links.position IS 'For ordered relationships (galleries, etc.)';
