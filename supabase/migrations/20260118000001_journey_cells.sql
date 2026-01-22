-- Phase 2: Journey Canvas - Journey Cells Table
--
-- Creates journey_cells table for canvas grid (stage × layer intersections)
-- Part of Canvas Views Expansion project
--
-- Design Decision: Create new cells table for grid pattern
-- - Touchpoints table has different semantics (single interaction points)
-- - Cells are stage × layer intersections with layer-specific fields
-- - Pattern consistency with Blueprint cells from Phase 1

-- ============================================================================
-- JOURNEY_CELLS TABLE
-- ============================================================================

CREATE TABLE journey_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES journey_stages(id) ON DELETE CASCADE,
  layer_type TEXT NOT NULL CHECK (layer_type IN ('touchpoint', 'emotion', 'pain_point', 'channel', 'opportunity')),
  content TEXT,

  -- Layer-specific fields
  emotion_score INTEGER CHECK (emotion_score IS NULL OR emotion_score BETWEEN -5 AND 5),  -- For emotion layer
  channel_type TEXT,  -- For channel layer (email, phone, web, chat, in-person, etc.)

  -- Ordering within cell (for future multi-item cells)
  sequence INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One cell per stage × layer intersection
  UNIQUE(stage_id, layer_type)
);

-- Index for efficient queries
CREATE INDEX idx_journey_cells_stage ON journey_cells(stage_id);

-- Updated_at trigger
CREATE TRIGGER update_journey_cells_updated_at
  BEFORE UPDATE ON journey_cells
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
--
-- MVP Design Decision: Permissive policies for single-user admin context
--
-- Current policies allow all authenticated users to view/manage all journey cells.
-- This is intentional for the MVP phase because:
-- 1. Journey canvas is an admin-only feature behind authentication
-- 2. Currently single-user (Jon's personal studio)
-- 3. Simplifies development without user-ownership complexity
--
-- Future Multi-User Considerations:
-- If multi-tenant support is added, update to ownership-based policies:
--   CREATE POLICY "Users can view own journey cells" ON journey_cells
--     FOR SELECT TO authenticated
--     USING (EXISTS (
--       SELECT 1 FROM journey_stages js
--       JOIN user_journeys uj ON js.user_journey_id = uj.id
--       WHERE js.id = journey_cells.stage_id
--         AND uj.user_id = auth.uid()  -- Add user_id to user_journeys
--     ));
--
-- ============================================================================

ALTER TABLE journey_cells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view journey cells" ON journey_cells
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage journey cells" ON journey_cells
  FOR ALL TO authenticated USING (true);

-- ============================================================================
-- ORPHAN CLEANUP TRIGGER
-- ============================================================================

-- Cleanup entity_links when journey_cells are deleted
CREATE OR REPLACE FUNCTION cleanup_journey_cell_entity_links()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM entity_links
  WHERE (source_type = 'journey_cell' AND source_id = OLD.id)
     OR (target_type = 'journey_cell' AND target_id = OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_journey_cell_links
  AFTER DELETE ON journey_cells
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_journey_cell_entity_links();

-- ============================================================================
-- ATOMIC REORDER FUNCTION FOR JOURNEY STAGES
-- ============================================================================

CREATE OR REPLACE FUNCTION reorder_journey_stages(
  p_journey_id UUID,
  p_stage_ids UUID[]
)
RETURNS INTEGER AS $$
DECLARE
  v_stage_count INTEGER;
  v_valid_count INTEGER;
  i INTEGER;
BEGIN
  -- Count input stages
  v_stage_count := array_length(p_stage_ids, 1);

  -- Handle empty array
  IF v_stage_count IS NULL OR v_stage_count = 0 THEN
    RETURN 0;
  END IF;

  -- Verify all stages belong to the specified journey
  SELECT COUNT(*)
  INTO v_valid_count
  FROM journey_stages
  WHERE id = ANY(p_stage_ids)
    AND user_journey_id = p_journey_id;

  IF v_valid_count != v_stage_count THEN
    RAISE EXCEPTION 'Some stages do not belong to journey %', p_journey_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Phase 1: Set all to negative temporary values (avoids UNIQUE conflicts)
  FOR i IN 1..v_stage_count LOOP
    UPDATE journey_stages
    SET sequence = -10000 - i
    WHERE id = p_stage_ids[i]
      AND user_journey_id = p_journey_id;
  END LOOP;

  -- Phase 2: Set to final positive values (0-indexed)
  FOR i IN 1..v_stage_count LOOP
    UPDATE journey_stages
    SET sequence = i - 1
    WHERE id = p_stage_ids[i]
      AND user_journey_id = p_journey_id;
  END LOOP;

  RETURN v_stage_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION reorder_journey_stages(UUID, UUID[]) TO authenticated;

-- Add comment
COMMENT ON FUNCTION reorder_journey_stages IS
  'Atomically reorders journey stages. Takes journey ID and ordered array of stage IDs.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Verify table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'journey_cells'
  ) THEN
    RAISE EXCEPTION 'journey_cells table not created';
  END IF;

  -- Verify RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'journey_cells' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on journey_cells';
  END IF;

  -- Verify reorder function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'reorder_journey_stages'
  ) THEN
    RAISE EXCEPTION 'reorder_journey_stages function not created';
  END IF;

  RAISE NOTICE 'journey_cells table and reorder_journey_stages function created successfully';
END $$;

-- ============================================================================
-- TABLE COMMENT
-- ============================================================================

COMMENT ON TABLE journey_cells IS 'Canvas grid cells for customer journeys. Each cell is a stage × layer intersection.';
