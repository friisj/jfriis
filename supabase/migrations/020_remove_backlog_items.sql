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

-- Note: log_entries.type field already supports 'idea' for idea capture
-- Recommended types: 'idea', 'idea-shaped', 'idea-validated', 'experiment'
