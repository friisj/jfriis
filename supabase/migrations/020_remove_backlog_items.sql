-- Remove backlog_items entity and related tables
-- Relying on log_entries with type='idea' for idea capture instead

-- Drop junction table first (has FK constraint)
DROP TABLE IF EXISTS backlog_log_entries CASCADE;

-- Drop main backlog_items table
DROP TABLE IF EXISTS backlog_items CASCADE;

-- Clean up any orphaned entity_links records
DELETE FROM entity_links
WHERE source_entity_type = 'backlog_item'
   OR target_entity_type = 'backlog_item';

-- Update entity_links CHECK constraints to remove backlog_item
ALTER TABLE entity_links DROP CONSTRAINT IF EXISTS entity_links_source_type_valid;
ALTER TABLE entity_links ADD CONSTRAINT entity_links_source_type_valid
  CHECK (source_type IN (
    'project',
    'log_entry',
    'specimen',
    'studio_project',
    'hypothesis',
    'experiment',
    'business_model_canvas',
    'customer_profile',
    'value_proposition_canvas',
    'value_map',
    'canvas_item',
    'user_journey',
    'journey_stage',
    'touchpoint',
    'assumption',
    'gallery_sequence'
  ));

ALTER TABLE entity_links DROP CONSTRAINT IF EXISTS entity_links_target_type_valid;
ALTER TABLE entity_links ADD CONSTRAINT entity_links_target_type_valid
  CHECK (target_type IN (
    'project',
    'log_entry',
    'specimen',
    'studio_project',
    'hypothesis',
    'experiment',
    'business_model_canvas',
    'customer_profile',
    'value_proposition_canvas',
    'value_map',
    'canvas_item',
    'user_journey',
    'journey_stage',
    'touchpoint',
    'assumption',
    'gallery_sequence'
  ));

-- Note: log_entries.type field already supports 'idea' for idea capture
-- Recommended types: 'idea', 'idea-shaped', 'idea-validated', 'experiment'
