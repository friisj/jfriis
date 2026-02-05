-- Phase 6: Cleanup Deprecated Tables and Columns
-- Part of Entity Relationship Simplification (OJI-10)
-- Migration created: 2026-01-03
--
-- This migration removes:
-- 1. Old evidence tables (replaced by universal `evidence` table)
-- 2. JSONB UUID array columns (replaced by `entity_links` table)
-- 3. Deprecated junction tables (migrated to `entity_links` table)

-- ============================================================================
-- 1. MIGRATE REMAINING JUNCTION TABLE DATA
-- ============================================================================

-- Migrate venture_specimens to entity_links (formerly project_specimens)
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type, position, metadata, created_at)
SELECT DISTINCT
  'venture',
  vs.venture_id,
  'specimen',
  vs.specimen_id,
  'contains',
  vs.position,
  '{}'::jsonb,
  vs.created_at
FROM venture_specimens vs
WHERE EXISTS (SELECT 1 FROM ventures v WHERE v.id = vs.venture_id)
  AND EXISTS (SELECT 1 FROM specimens s WHERE s.id = vs.specimen_id)
ON CONFLICT (source_type, source_id, target_type, target_id, link_type) DO NOTHING;

-- Migrate gallery_specimen_items to entity_links
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type, position, metadata, created_at)
SELECT DISTINCT
  'gallery_sequence',
  gsi.gallery_sequence_id,
  'specimen',
  gsi.specimen_id,
  'contains',
  gsi.position,
  '{}'::jsonb,
  gsi.created_at
FROM gallery_specimen_items gsi
WHERE EXISTS (SELECT 1 FROM gallery_sequences gs WHERE gs.id = gsi.gallery_sequence_id)
  AND EXISTS (SELECT 1 FROM specimens s WHERE s.id = gsi.specimen_id)
ON CONFLICT (source_type, source_id, target_type, target_id, link_type) DO NOTHING;

-- ============================================================================
-- 2. DROP OLD EVIDENCE TABLES
-- ============================================================================

-- Drop triggers first (they reference the tables)
DROP TRIGGER IF EXISTS update_assumption_evidence_updated_at ON assumption_evidence;
DROP TRIGGER IF EXISTS update_canvas_item_evidence_updated_at ON canvas_item_evidence;
DROP TRIGGER IF EXISTS update_touchpoint_evidence_updated_at ON touchpoint_evidence;

-- Drop RLS policies
DROP POLICY IF EXISTS "Assumption evidence readable by authenticated users" ON assumption_evidence;
DROP POLICY IF EXISTS "Assumption evidence insertable by authenticated users" ON assumption_evidence;
DROP POLICY IF EXISTS "Assumption evidence updatable by authenticated users" ON assumption_evidence;
DROP POLICY IF EXISTS "Assumption evidence deletable by authenticated users" ON assumption_evidence;

DROP POLICY IF EXISTS "Canvas item evidence readable by authenticated users" ON canvas_item_evidence;
DROP POLICY IF EXISTS "Canvas item evidence insertable by authenticated users" ON canvas_item_evidence;
DROP POLICY IF EXISTS "Canvas item evidence updatable by authenticated users" ON canvas_item_evidence;
DROP POLICY IF EXISTS "Canvas item evidence deletable by authenticated users" ON canvas_item_evidence;

DROP POLICY IF EXISTS "Touchpoint evidence readable by authenticated users" ON touchpoint_evidence;
DROP POLICY IF EXISTS "Touchpoint evidence insertable by authenticated users" ON touchpoint_evidence;
DROP POLICY IF EXISTS "Touchpoint evidence updatable by authenticated users" ON touchpoint_evidence;
DROP POLICY IF EXISTS "Touchpoint evidence deletable by authenticated users" ON touchpoint_evidence;

-- Drop the old evidence tables
DROP TABLE IF EXISTS assumption_evidence CASCADE;
DROP TABLE IF EXISTS canvas_item_evidence CASCADE;
DROP TABLE IF EXISTS touchpoint_evidence CASCADE;

-- ============================================================================
-- 3. DROP JSONB UUID ARRAY COLUMNS
-- ============================================================================

-- Remove from business_model_canvases
ALTER TABLE business_model_canvases
  DROP COLUMN IF EXISTS related_value_proposition_ids,
  DROP COLUMN IF EXISTS related_customer_profile_ids;

-- Remove from customer_profiles
ALTER TABLE customer_profiles
  DROP COLUMN IF EXISTS related_business_model_ids,
  DROP COLUMN IF EXISTS related_value_proposition_ids;

-- Remove from user_journeys
ALTER TABLE user_journeys
  DROP COLUMN IF EXISTS related_value_proposition_ids,
  DROP COLUMN IF EXISTS related_business_model_ids;

-- ============================================================================
-- 4. DROP DEPRECATED JUNCTION TABLES
-- ============================================================================

-- Drop triggers first (using renamed table names)
DROP TRIGGER IF EXISTS update_venture_specimens_updated_at ON venture_specimens;
DROP TRIGGER IF EXISTS update_log_entry_specimens_updated_at ON log_entry_specimens;
DROP TRIGGER IF EXISTS update_log_entry_ventures_updated_at ON log_entry_ventures;
DROP TRIGGER IF EXISTS update_gallery_specimen_items_updated_at ON gallery_specimen_items;

-- Drop RLS policies for junction tables (using renamed table names)
DROP POLICY IF EXISTS "Venture specimens readable by authenticated users" ON venture_specimens;
DROP POLICY IF EXISTS "Venture specimens insertable by authenticated users" ON venture_specimens;
DROP POLICY IF EXISTS "Venture specimens updatable by authenticated users" ON venture_specimens;
DROP POLICY IF EXISTS "Venture specimens deletable by authenticated users" ON venture_specimens;

DROP POLICY IF EXISTS "Log entry specimens readable by authenticated users" ON log_entry_specimens;
DROP POLICY IF EXISTS "Log entry specimens insertable by authenticated users" ON log_entry_specimens;
DROP POLICY IF EXISTS "Log entry specimens updatable by authenticated users" ON log_entry_specimens;
DROP POLICY IF EXISTS "Log entry specimens deletable by authenticated users" ON log_entry_specimens;

DROP POLICY IF EXISTS "Log entry ventures readable by authenticated users" ON log_entry_ventures;
DROP POLICY IF EXISTS "Log entry ventures insertable by authenticated users" ON log_entry_ventures;
DROP POLICY IF EXISTS "Log entry ventures updatable by authenticated users" ON log_entry_ventures;
DROP POLICY IF EXISTS "Log entry ventures deletable by authenticated users" ON log_entry_ventures;

DROP POLICY IF EXISTS "Gallery specimen items readable by authenticated users" ON gallery_specimen_items;
DROP POLICY IF EXISTS "Gallery specimen items insertable by authenticated users" ON gallery_specimen_items;
DROP POLICY IF EXISTS "Gallery specimen items updatable by authenticated users" ON gallery_specimen_items;
DROP POLICY IF EXISTS "Gallery specimen items deletable by authenticated users" ON gallery_specimen_items;

-- Drop the deprecated junction tables (using renamed table names)
DROP TABLE IF EXISTS venture_specimens CASCADE;
DROP TABLE IF EXISTS log_entry_specimens CASCADE;
DROP TABLE IF EXISTS log_entry_ventures CASCADE;
DROP TABLE IF EXISTS gallery_specimen_items CASCADE;

-- ============================================================================
-- 5. UPDATE SUPABASE TYPES COMMENT
-- ============================================================================

COMMENT ON TABLE evidence IS 'Universal evidence storage for all entities. Replaces assumption_evidence, canvas_item_evidence, touchpoint_evidence.';
COMMENT ON TABLE entity_links IS 'Universal entity relationship table. Replaces JSONB UUID arrays and simple junction tables.';

-- ============================================================================
-- 6. LOG CLEANUP RESULTS
-- ============================================================================

DO $$
DECLARE
  evidence_count INTEGER;
  links_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO evidence_count FROM evidence;
  SELECT COUNT(*) INTO links_count FROM entity_links;

  RAISE NOTICE 'Phase 6 Cleanup Complete:';
  RAISE NOTICE '  - Evidence records preserved: %', evidence_count;
  RAISE NOTICE '  - Entity links preserved: %', links_count;
  RAISE NOTICE '  - Dropped tables: assumption_evidence, canvas_item_evidence, touchpoint_evidence';
  RAISE NOTICE '  - Dropped tables: project_specimens, log_entry_specimens, log_entry_projects, gallery_specimen_items';
  RAISE NOTICE '  - Dropped columns: related_*_ids from BMC, VPC, customer_profiles, user_journeys';
END $$;
