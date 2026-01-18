-- ============================================================================
-- Atomic Reorder Function for Blueprint Steps
-- ============================================================================
--
-- Provides a single atomic operation to reorder blueprint steps.
-- Solves race condition when multiple users reorder steps simultaneously.
--
-- The function:
-- 1. Validates all step IDs belong to the specified blueprint
-- 2. Updates sequences in a single transaction
-- 3. Returns the number of steps reordered
--
-- ============================================================================

CREATE OR REPLACE FUNCTION reorder_blueprint_steps(
  p_blueprint_id UUID,
  p_step_ids UUID[]
)
RETURNS INTEGER AS $$
DECLARE
  v_step_count INTEGER;
  v_valid_count INTEGER;
  i INTEGER;
BEGIN
  -- Count input steps
  v_step_count := array_length(p_step_ids, 1);

  -- Handle empty array
  IF v_step_count IS NULL OR v_step_count = 0 THEN
    RETURN 0;
  END IF;

  -- Verify all steps belong to the specified blueprint
  SELECT COUNT(*)
  INTO v_valid_count
  FROM blueprint_steps
  WHERE id = ANY(p_step_ids)
    AND service_blueprint_id = p_blueprint_id;

  IF v_valid_count != v_step_count THEN
    RAISE EXCEPTION 'Some steps do not belong to blueprint %', p_blueprint_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Phase 1: Set all to negative temporary values (avoids UNIQUE conflicts)
  -- Using negative offsets from -10000 to avoid any real sequence values
  FOR i IN 1..v_step_count LOOP
    UPDATE blueprint_steps
    SET sequence = -10000 - i
    WHERE id = p_step_ids[i]
      AND service_blueprint_id = p_blueprint_id;
  END LOOP;

  -- Phase 2: Set to final positive values (0-indexed)
  FOR i IN 1..v_step_count LOOP
    UPDATE blueprint_steps
    SET sequence = i - 1
    WHERE id = p_step_ids[i]
      AND service_blueprint_id = p_blueprint_id;
  END LOOP;

  RETURN v_step_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION reorder_blueprint_steps(UUID, UUID[]) TO authenticated;

-- Add comment
COMMENT ON FUNCTION reorder_blueprint_steps IS
  'Atomically reorders blueprint steps. Takes blueprint ID and ordered array of step IDs.';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'reorder_blueprint_steps'
  ) THEN
    RAISE EXCEPTION 'reorder_blueprint_steps function not created';
  END IF;

  RAISE NOTICE 'reorder_blueprint_steps function created successfully';
END $$;
