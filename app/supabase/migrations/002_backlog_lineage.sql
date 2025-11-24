-- Migration: Backlog → Log Entry Lineage Tracking
-- Purpose: Pivot from "conversion" pattern to "reference" pattern
-- Author: Jon Friis
-- Date: 2025-01-15

-- Create junction table for backlog → log entry relationships
CREATE TABLE backlog_log_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backlog_item_id UUID NOT NULL REFERENCES backlog_items(id) ON DELETE CASCADE,
  log_entry_id UUID NOT NULL REFERENCES log_entries(id) ON DELETE CASCADE,

  -- Relationship semantics
  relationship_type TEXT NOT NULL DEFAULT 'inspired_by',
    -- inspired_by: Log entry based on backlog idea
    -- expanded_from: Log entry is detailed exploration of backlog item
    -- related_to: Loose connection between items

  -- Metadata
  notes TEXT, -- Optional context about the relationship
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(backlog_item_id, log_entry_id),
  CHECK (relationship_type IN ('inspired_by', 'expanded_from', 'related_to'))
);

-- Remove conversion fields from backlog_items
-- These fields implied destructive conversion (backlog item → something else)
-- New pattern: backlog items persist, log entries reference them
ALTER TABLE backlog_items
  DROP COLUMN IF EXISTS converted_to,
  DROP COLUMN IF EXISTS converted_id;

-- Indexes for performance
CREATE INDEX idx_backlog_log_entries_backlog ON backlog_log_entries(backlog_item_id);
CREATE INDEX idx_backlog_log_entries_log ON backlog_log_entries(log_entry_id);
CREATE INDEX idx_backlog_log_entries_type ON backlog_log_entries(relationship_type);

-- Comments for documentation
COMMENT ON TABLE backlog_log_entries IS 'Tracks lineage from backlog ideas to published log entries (reference pattern, not conversion)';
COMMENT ON COLUMN backlog_log_entries.relationship_type IS 'Semantic type of relationship: inspired_by, expanded_from, related_to';
COMMENT ON COLUMN backlog_log_entries.notes IS 'Optional context about how the log entry relates to the backlog idea';

-- Example query: Find all log entries derived from a backlog item
-- SELECT le.*
-- FROM log_entries le
-- JOIN backlog_log_entries ble ON le.id = ble.log_entry_id
-- WHERE ble.backlog_item_id = '<backlog-id>'
-- ORDER BY le.entry_date DESC;

-- Example query: Find the originating backlog item for a log entry
-- SELECT bi.*
-- FROM backlog_items bi
-- JOIN backlog_log_entries ble ON bi.id = ble.backlog_item_id
-- WHERE ble.log_entry_id = '<log-entry-id>'
-- AND ble.relationship_type = 'inspired_by';
