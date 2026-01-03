-- Fix Critical Cleanup Trigger Issues (Remaining)
-- Part of Entity Relationship Simplification Tech Review Fixes
-- Migration created: 2026-01-03
--
-- Note: gallery_sequences trigger and CHECK constraints were already added
-- in migration 20260102200005_critical_fixes_phase2.sql
--
-- This migration fixes:
-- - CRITICAL-1: value_maps trigger was using wrong entity type (value_proposition_canvas -> value_map)
-- - Adds value_proposition_canvases (FIT analysis table) triggers

-- ============================================================================
-- CRITICAL-1: Fix value_maps triggers if they exist with wrong entity type
-- The original triggers in 20260102200002 used 'value_proposition_canvas'
-- but should use 'value_map'
-- ============================================================================

-- First, drop any existing triggers on value_maps (safe even if they don't exist)
DROP TRIGGER IF EXISTS cleanup_vpc_links ON value_maps;
DROP TRIGGER IF EXISTS cleanup_vpc_evidence ON value_maps;
DROP TRIGGER IF EXISTS cleanup_value_map_links ON value_maps;
DROP TRIGGER IF EXISTS cleanup_value_map_evidence ON value_maps;

-- Create correct triggers for value_maps table with 'value_map' entity type
CREATE TRIGGER cleanup_value_map_links
  BEFORE DELETE ON value_maps
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('value_map');

CREATE TRIGGER cleanup_value_map_evidence
  BEFORE DELETE ON value_maps
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_evidence('value_map');

-- ============================================================================
-- Add triggers for value_proposition_canvases (FIT analysis table)
-- This table was created separately and had no cleanup triggers
-- ============================================================================

-- Drop if exists (safe), then create
DROP TRIGGER IF EXISTS cleanup_vpc_links ON value_proposition_canvases;
DROP TRIGGER IF EXISTS cleanup_vpc_evidence ON value_proposition_canvases;

CREATE TRIGGER cleanup_vpc_links
  BEFORE DELETE ON value_proposition_canvases
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('value_proposition_canvas');

CREATE TRIGGER cleanup_vpc_evidence
  BEFORE DELETE ON value_proposition_canvases
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_evidence('value_proposition_canvas');

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TRIGGER cleanup_value_map_links ON value_maps IS
  'Cleans up entity_links when a value_map is deleted (uses value_map entity type)';

COMMENT ON TRIGGER cleanup_vpc_links ON value_proposition_canvases IS
  'Cleans up entity_links when a value_proposition_canvas (FIT analysis) is deleted';
