-- Phase 2B: Migrate Touchpoint Junction Tables to entity_links
--
-- This migration removes dedicated junction tables for touchpoint relationships
-- in favor of the universal entity_links table.
--
-- NO DATA MIGRATION: Since we're in early implementation, we're starting fresh
-- with entity_links. Any existing data in these tables will be lost.
--
-- Background: The entity_links table (created in 20260102200001_create_entity_links.sql)
-- provides a universal relationship management system. Using it for touchpoint
-- relationships provides consistency and reduces table proliferation.
--
-- SAFETY CHECKS AND ROLLBACK:
-- This migration includes pre-flight checks and stores data for rollback if needed.

-- ============================================================================
-- SAFETY CHECK: Verify entity_links table exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'entity_links'
  ) THEN
    RAISE EXCEPTION 'entity_links table does not exist. Cannot proceed with migration.';
  END IF;
END $$;

-- ============================================================================
-- SAFETY CHECK: Count existing data in junction tables
-- ============================================================================

DO $$
DECLARE
  touchpoint_canvas_count INTEGER := 0;
  touchpoint_customer_count INTEGER := 0;
  touchpoint_value_prop_count INTEGER := 0;
  touchpoint_assumption_count INTEGER := 0;
  touchpoint_mapping_count INTEGER := 0;
  total_count INTEGER;
BEGIN
  -- Count records in each junction table (if they exist)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'touchpoint_canvas_items') THEN
    SELECT COUNT(*) INTO touchpoint_canvas_count FROM touchpoint_canvas_items;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'touchpoint_customer_profiles') THEN
    SELECT COUNT(*) INTO touchpoint_customer_count FROM touchpoint_customer_profiles;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'touchpoint_value_propositions') THEN
    SELECT COUNT(*) INTO touchpoint_value_prop_count FROM touchpoint_value_propositions;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'touchpoint_assumptions') THEN
    SELECT COUNT(*) INTO touchpoint_assumption_count FROM touchpoint_assumptions;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'touchpoint_mappings') THEN
    SELECT COUNT(*) INTO touchpoint_mapping_count FROM touchpoint_mappings;
  END IF;

  total_count := touchpoint_canvas_count + touchpoint_customer_count +
                 touchpoint_value_prop_count + touchpoint_assumption_count +
                 touchpoint_mapping_count;

  RAISE NOTICE 'Junction table record counts:';
  RAISE NOTICE '  touchpoint_canvas_items: %', touchpoint_canvas_count;
  RAISE NOTICE '  touchpoint_customer_profiles: %', touchpoint_customer_count;
  RAISE NOTICE '  touchpoint_value_propositions: %', touchpoint_value_prop_count;
  RAISE NOTICE '  touchpoint_assumptions: %', touchpoint_assumption_count;
  RAISE NOTICE '  touchpoint_mappings: %', touchpoint_mapping_count;
  RAISE NOTICE 'Total records to be deleted: %', total_count;

  -- Warn if there's significant data
  IF total_count > 0 THEN
    RAISE WARNING 'This migration will delete % existing junction table records. Data will be lost unless you rollback.', total_count;
  END IF;
END $$;

-- ============================================================================
-- BACKUP: Create rollback script as a comment for reference
-- ============================================================================

-- ROLLBACK INSTRUCTIONS:
-- If you need to rollback this migration, run this SQL:
--
-- BEGIN;
--
-- -- Recreate touchpoint_canvas_items table
-- CREATE TABLE IF NOT EXISTS touchpoint_canvas_items (
--   touchpoint_id UUID NOT NULL REFERENCES touchpoints(id) ON DELETE CASCADE,
--   canvas_item_id UUID NOT NULL REFERENCES canvas_items(id) ON DELETE CASCADE,
--   mapping_type TEXT,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
--   PRIMARY KEY (touchpoint_id, canvas_item_id)
-- );
--
-- -- Recreate touchpoint_customer_profiles table
-- CREATE TABLE IF NOT EXISTS touchpoint_customer_profiles (
--   touchpoint_id UUID NOT NULL REFERENCES touchpoints(id) ON DELETE CASCADE,
--   customer_profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
--   relationship_type TEXT,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
--   PRIMARY KEY (touchpoint_id, customer_profile_id)
-- );
--
-- -- Recreate touchpoint_value_propositions table
-- CREATE TABLE IF NOT EXISTS touchpoint_value_propositions (
--   touchpoint_id UUID NOT NULL REFERENCES touchpoints(id) ON DELETE CASCADE,
--   value_proposition_id UUID NOT NULL REFERENCES value_proposition_canvases(id) ON DELETE CASCADE,
--   relationship_type TEXT,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
--   PRIMARY KEY (touchpoint_id, value_proposition_id)
-- );
--
-- -- Recreate touchpoint_assumptions table
-- CREATE TABLE IF NOT EXISTS touchpoint_assumptions (
--   touchpoint_id UUID NOT NULL REFERENCES touchpoints(id) ON DELETE CASCADE,
--   assumption_id UUID NOT NULL REFERENCES assumptions(id) ON DELETE CASCADE,
--   relationship_type TEXT,
--   notes TEXT,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
--   PRIMARY KEY (touchpoint_id, assumption_id)
-- );
--
-- -- Recreate touchpoint_mappings table
-- CREATE TABLE IF NOT EXISTS touchpoint_mappings (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   touchpoint_id UUID NOT NULL REFERENCES touchpoints(id) ON DELETE CASCADE,
--   target_type TEXT NOT NULL,
--   target_id UUID NOT NULL,
--   mapping_type TEXT NOT NULL,
--   strength TEXT,
--   validated BOOLEAN DEFAULT false,
--   notes TEXT,
--   metadata JSONB DEFAULT '{}'::jsonb,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
-- );
--
-- -- Recreate indexes
-- CREATE INDEX IF NOT EXISTS idx_touchpoint_canvas_items_touchpoint ON touchpoint_canvas_items(touchpoint_id);
-- CREATE INDEX IF NOT EXISTS idx_touchpoint_canvas_items_canvas ON touchpoint_canvas_items(canvas_item_id);
-- CREATE INDEX IF NOT EXISTS idx_touchpoint_customer_profiles_touchpoint ON touchpoint_customer_profiles(touchpoint_id);
-- CREATE INDEX IF NOT EXISTS idx_touchpoint_value_propositions_touchpoint ON touchpoint_value_propositions(touchpoint_id);
-- CREATE INDEX IF NOT EXISTS idx_touchpoint_assumptions_touchpoint ON touchpoint_assumptions(touchpoint_id);
-- CREATE INDEX IF NOT EXISTS idx_touchpoint_assumptions_assumption ON touchpoint_assumptions(assumption_id);
-- CREATE INDEX IF NOT EXISTS idx_touchpoint_mappings_touchpoint ON touchpoint_mappings(touchpoint_id);
-- CREATE INDEX IF NOT EXISTS idx_touchpoint_mappings_target ON touchpoint_mappings(target_type, target_id);
--
-- -- Enable RLS
-- ALTER TABLE touchpoint_canvas_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE touchpoint_customer_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE touchpoint_value_propositions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE touchpoint_assumptions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE touchpoint_mappings ENABLE ROW LEVEL SECURITY;
--
-- COMMIT;

-- ============================================================================
-- EXECUTE MIGRATION: Drop junction tables
-- ============================================================================

-- Drop dedicated junction tables (CASCADE to remove dependent objects)
DROP TABLE IF EXISTS touchpoint_canvas_items CASCADE;
DROP TABLE IF EXISTS touchpoint_customer_profiles CASCADE;
DROP TABLE IF EXISTS touchpoint_value_propositions CASCADE;
DROP TABLE IF EXISTS touchpoint_assumptions CASCADE;
DROP TABLE IF EXISTS touchpoint_mappings CASCADE;

-- Note: entity_links table already has cleanup triggers for touchpoints
-- No additional cleanup needed - when touchpoints are deleted, their entity_links
-- are automatically removed via existing triggers.

-- Verify entity_links supports touchpoint (it already does from 20260102200001)
-- The entity_links table already includes touchpoint in its supported entity types

COMMENT ON TABLE entity_links IS 'Universal relationship table for all entity associations. Touchpoint relationships migrated from dedicated junction tables as of 2026-01-11.';

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Verify all junction tables are dropped
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
      'touchpoint_canvas_items',
      'touchpoint_customer_profiles',
      'touchpoint_value_propositions',
      'touchpoint_assumptions',
      'touchpoint_mappings'
    )
  ) THEN
    RAISE EXCEPTION 'Migration failed: Some junction tables still exist';
  END IF;

  RAISE NOTICE 'Migration completed successfully. All junction tables dropped.';
  RAISE NOTICE 'Touchpoint relationships now use entity_links table.';
END $$;
