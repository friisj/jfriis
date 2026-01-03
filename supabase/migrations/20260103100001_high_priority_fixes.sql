-- High Priority Fixes
-- Part of Entity Relationship Simplification Tech Review Fixes
-- Migration created: 2026-01-03
--
-- HIGH-1: Fix value_map entity type in migrated data
-- HIGH-2: Add bidirectional index for symmetric relationships

-- ============================================================================
-- HIGH-1: Fix value_map entity type in migrated data
-- During migration, BMC relationships may have been linked to 'value_proposition_canvas'
-- when they should link to 'value_map' (the actual table for Value Maps)
-- ============================================================================

-- Correct entity_links where source should be value_map
UPDATE entity_links
SET source_type = 'value_map'
WHERE source_type = 'value_proposition_canvas'
  AND source_id IN (SELECT id FROM value_maps);

-- Correct entity_links where target should be value_map
UPDATE entity_links
SET target_type = 'value_map'
WHERE target_type = 'value_proposition_canvas'
  AND target_id IN (SELECT id FROM value_maps);

-- Correct evidence attached to value_maps
UPDATE evidence
SET entity_type = 'value_map'
WHERE entity_type = 'value_proposition_canvas'
  AND entity_id IN (SELECT id FROM value_maps);

-- ============================================================================
-- HIGH-2: Add bidirectional index for symmetric relationships
-- Optimizes queries that need to find relationships in both directions
-- (e.g., "find all entities related to X" regardless of direction)
-- ============================================================================

-- Create covering index for bidirectional queries on symmetric relationships
-- This helps queries like:
--   SELECT * FROM entity_links
--   WHERE link_type = 'related'
--     AND ((source_type = X AND source_id = Y) OR (target_type = X AND target_id = Y))
CREATE INDEX IF NOT EXISTS idx_entity_links_bidirectional_source
  ON entity_links (link_type, source_type, source_id)
  WHERE link_type IN ('related', 'references');

CREATE INDEX IF NOT EXISTS idx_entity_links_bidirectional_target
  ON entity_links (link_type, target_type, target_id)
  WHERE link_type IN ('related', 'references');

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON INDEX idx_entity_links_bidirectional_source IS
  'Partial index optimizing source-side queries for symmetric relationship types';

COMMENT ON INDEX idx_entity_links_bidirectional_target IS
  'Partial index optimizing target-side queries for symmetric relationship types';
