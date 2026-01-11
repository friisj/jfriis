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
