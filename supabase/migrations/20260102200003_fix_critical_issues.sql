-- Fix Critical Issues from Tech Review
-- Part of Entity Relationship Simplification (OJI-5)
-- Migration created: 2026-01-02

-- ============================================================================
-- 1. FIX VPC TABLE NAME IN ORPHAN CLEANUP TRIGGERS
-- ============================================================================
-- The entity type 'value_proposition_canvas' maps to 'value_proposition_canvases' table,
-- not 'value_maps'. Dropping and recreating the triggers on the correct table.

-- Drop incorrect triggers
DROP TRIGGER IF EXISTS cleanup_vpc_links ON value_maps;
DROP TRIGGER IF EXISTS cleanup_vpc_evidence ON value_maps;

-- Create triggers on correct table
CREATE TRIGGER cleanup_vpc_links
  BEFORE DELETE ON value_proposition_canvases
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('value_proposition_canvas');

CREATE TRIGGER cleanup_vpc_evidence
  BEFORE DELETE ON value_proposition_canvases
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_evidence('value_proposition_canvas');

-- Also add triggers for value_maps table using 'value_map' entity type
CREATE TRIGGER cleanup_value_map_links
  BEFORE DELETE ON value_maps
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('value_map');

CREATE TRIGGER cleanup_value_map_evidence
  BEFORE DELETE ON value_maps
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_evidence('value_map');

-- ============================================================================
-- 2. FIX RLS POLICIES - USE AUTHENTICATED INSTEAD OF is_admin()
-- ============================================================================
-- The spec says authenticated users should be able to modify evidence and links.
-- Updating policies to use auth.role() = 'authenticated' instead of is_admin().

-- Evidence table policies
DROP POLICY IF EXISTS "Admin insert access to evidence" ON evidence;
DROP POLICY IF EXISTS "Admin update access to evidence" ON evidence;
DROP POLICY IF EXISTS "Admin delete access to evidence" ON evidence;

CREATE POLICY "Authenticated insert access to evidence"
  ON evidence FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update access to evidence"
  ON evidence FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete access to evidence"
  ON evidence FOR DELETE
  USING (auth.role() = 'authenticated');

-- Entity links table policies
DROP POLICY IF EXISTS "Admin insert access to entity_links" ON entity_links;
DROP POLICY IF EXISTS "Admin update access to entity_links" ON entity_links;
DROP POLICY IF EXISTS "Admin delete access to entity_links" ON entity_links;

CREATE POLICY "Authenticated insert access to entity_links"
  ON entity_links FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update access to entity_links"
  ON entity_links FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete access to entity_links"
  ON entity_links FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- 3. ADD VALUE_MAP ENTITY TYPE TO TYPES
-- ============================================================================
-- Note: This is a database comment only - TypeScript types need to be updated separately

COMMENT ON TRIGGER cleanup_value_map_links ON value_maps IS 'Cleanup entity_links when a value_map is deleted';
COMMENT ON TRIGGER cleanup_value_map_evidence ON value_maps IS 'Cleanup evidence when a value_map is deleted';
