-- Phase 1: Blueprint Canvas - Blueprint Cells Table
--
-- Creates blueprint_cells table for canvas grid (step × layer intersections)
-- Part of Canvas Views Expansion project
--
-- Design Decision: Use relational cells instead of JSONB layers for:
-- - Explicit UUID per cell for selection/edit tracking
-- - Future entity_links support (evidence, assumptions)
-- - Pattern consistency with Story Maps (activities + user_stories)
-- - Natural grid → row mapping for canvas UI

-- ============================================================================
-- BLUEPRINT_CELLS TABLE
-- ============================================================================

CREATE TABLE blueprint_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES blueprint_steps(id) ON DELETE CASCADE,
  layer_type TEXT NOT NULL CHECK (layer_type IN ('customer_action', 'frontstage', 'backstage', 'support_process')),
  content TEXT,

  -- Optional metadata for detail panel
  actors TEXT,                    -- Comma-separated list of actors involved
  duration_estimate TEXT,         -- Time estimate for this step/layer
  cost_implication TEXT CHECK (cost_implication IS NULL OR cost_implication IN ('none', 'low', 'medium', 'high')),
  failure_risk TEXT CHECK (failure_risk IS NULL OR failure_risk IN ('none', 'low', 'medium', 'high')),

  -- Ordering within cell (for future multi-item cells)
  sequence INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One cell per step × layer intersection
  UNIQUE(step_id, layer_type)
);

-- Index for efficient queries
CREATE INDEX idx_blueprint_cells_step ON blueprint_cells(step_id);

-- Updated_at trigger
CREATE TRIGGER update_blueprint_cells_updated_at
  BEFORE UPDATE ON blueprint_cells
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
--
-- MVP Design Decision: Permissive policies for single-user admin context
--
-- Current policies allow all authenticated users to view/manage all blueprint cells.
-- This is intentional for the MVP phase because:
-- 1. Blueprint canvas is an admin-only feature behind authentication
-- 2. Currently single-user (Jon's personal studio)
-- 3. Simplifies development without user-ownership complexity
--
-- Future Multi-User Considerations:
-- If multi-tenant support is added, update to ownership-based policies:
--   CREATE POLICY "Users can view own blueprint cells" ON blueprint_cells
--     FOR SELECT TO authenticated
--     USING (EXISTS (
--       SELECT 1 FROM blueprint_steps bs
--       JOIN service_blueprints sb ON bs.service_blueprint_id = sb.id
--       WHERE bs.id = blueprint_cells.step_id
--         AND sb.user_id = auth.uid()  -- Add user_id to service_blueprints
--     ));
--
-- ============================================================================

ALTER TABLE blueprint_cells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view blueprint cells" ON blueprint_cells
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage blueprint cells" ON blueprint_cells
  FOR ALL TO authenticated USING (true);

-- ============================================================================
-- ORPHAN CLEANUP TRIGGER
-- ============================================================================

-- Cleanup entity_links when blueprint_cells are deleted
CREATE OR REPLACE FUNCTION cleanup_blueprint_cell_entity_links()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM entity_links
  WHERE (source_type = 'blueprint_cell' AND source_id = OLD.id)
     OR (target_type = 'blueprint_cell' AND target_id = OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_blueprint_cell_links
  AFTER DELETE ON blueprint_cells
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_blueprint_cell_entity_links();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Verify table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'blueprint_cells'
  ) THEN
    RAISE EXCEPTION 'blueprint_cells table not created';
  END IF;

  -- Verify RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'blueprint_cells' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on blueprint_cells';
  END IF;

  RAISE NOTICE 'blueprint_cells table created successfully';
END $$;

-- ============================================================================
-- TABLE COMMENT
-- ============================================================================

COMMENT ON TABLE blueprint_cells IS 'Canvas grid cells for service blueprints. Each cell is a step × layer intersection.';
