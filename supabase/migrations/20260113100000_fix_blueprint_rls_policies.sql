-- Fix RLS policies for service_blueprints and blueprint_steps
-- Change from "authenticated" to "is_admin()" for write operations
-- This matches the security pattern used in other admin entities

-- ============================================================================
-- SERVICE BLUEPRINTS - Drop and recreate write policies
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can create service blueprints" ON service_blueprints;
DROP POLICY IF EXISTS "Authenticated users can update service blueprints" ON service_blueprints;
DROP POLICY IF EXISTS "Authenticated users can delete service blueprints" ON service_blueprints;

CREATE POLICY "Admin users can create service blueprints"
  ON service_blueprints FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can update service blueprints"
  ON service_blueprints FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can delete service blueprints"
  ON service_blueprints FOR DELETE
  USING (is_admin());

-- ============================================================================
-- BLUEPRINT STEPS - Drop and recreate write policies
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can create blueprint steps" ON blueprint_steps;
DROP POLICY IF EXISTS "Authenticated users can update blueprint steps" ON blueprint_steps;
DROP POLICY IF EXISTS "Authenticated users can delete blueprint steps" ON blueprint_steps;

CREATE POLICY "Admin users can create blueprint steps"
  ON blueprint_steps FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can update blueprint steps"
  ON blueprint_steps FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can delete blueprint steps"
  ON blueprint_steps FOR DELETE
  USING (is_admin());

-- ============================================================================
-- ADD MISSING INDEXES (MEDIUM priority from tech review)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_service_blueprints_blueprint_type
  ON service_blueprints(blueprint_type);

CREATE INDEX IF NOT EXISTS idx_service_blueprints_validation_status
  ON service_blueprints(validation_status);

-- GIN index for array overlap queries on tags
CREATE INDEX IF NOT EXISTS idx_service_blueprints_tags
  ON service_blueprints USING GIN (tags);
