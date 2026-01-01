-- Add unique constraints to prevent duplicate entries
-- This addresses critical data integrity issues identified in the code review

-- First, remove any existing duplicates in canvas_item_assumptions
-- Keep only the oldest entry for each duplicate pair
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY canvas_item_id, assumption_id
      ORDER BY created_at ASC
    ) AS rn
  FROM canvas_item_assumptions
)
DELETE FROM canvas_item_assumptions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add unique constraint on canvas_item_assumptions
-- Prevents the same assumption from being linked to an item multiple times
ALTER TABLE canvas_item_assumptions
ADD CONSTRAINT canvas_item_assumptions_unique
UNIQUE (canvas_item_id, assumption_id);

-- Remove duplicates in canvas_item_mappings
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY source_item_id, target_item_id
      ORDER BY created_at ASC
    ) AS rn
  FROM canvas_item_mappings
)
DELETE FROM canvas_item_mappings
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add unique constraint on canvas_item_mappings
-- Prevents duplicate FIT mappings between the same source and target items
ALTER TABLE canvas_item_mappings
ADD CONSTRAINT canvas_item_mappings_unique
UNIQUE (source_item_id, target_item_id);

-- Add CASCADE deletes for foreign keys to prevent orphaned records
-- When a canvas_item is deleted, automatically delete related assumptions
ALTER TABLE canvas_item_assumptions
DROP CONSTRAINT IF EXISTS canvas_item_assumptions_canvas_item_id_fkey;

ALTER TABLE canvas_item_assumptions
ADD CONSTRAINT canvas_item_assumptions_canvas_item_id_fkey
FOREIGN KEY (canvas_item_id)
REFERENCES canvas_items(id)
ON DELETE CASCADE;

ALTER TABLE canvas_item_assumptions
DROP CONSTRAINT IF EXISTS canvas_item_assumptions_assumption_id_fkey;

ALTER TABLE canvas_item_assumptions
ADD CONSTRAINT canvas_item_assumptions_assumption_id_fkey
FOREIGN KEY (assumption_id)
REFERENCES assumptions(id)
ON DELETE CASCADE;

-- When a canvas_item is deleted, automatically delete related evidence
ALTER TABLE canvas_item_evidence
DROP CONSTRAINT IF EXISTS canvas_item_evidence_canvas_item_id_fkey;

ALTER TABLE canvas_item_evidence
ADD CONSTRAINT canvas_item_evidence_canvas_item_id_fkey
FOREIGN KEY (canvas_item_id)
REFERENCES canvas_items(id)
ON DELETE CASCADE;

-- When a canvas_item is deleted, automatically delete related mappings
ALTER TABLE canvas_item_mappings
DROP CONSTRAINT IF EXISTS canvas_item_mappings_source_item_id_fkey;

ALTER TABLE canvas_item_mappings
ADD CONSTRAINT canvas_item_mappings_source_item_id_fkey
FOREIGN KEY (source_item_id)
REFERENCES canvas_items(id)
ON DELETE CASCADE;

ALTER TABLE canvas_item_mappings
DROP CONSTRAINT IF EXISTS canvas_item_mappings_target_item_id_fkey;

ALTER TABLE canvas_item_mappings
ADD CONSTRAINT canvas_item_mappings_target_item_id_fkey
FOREIGN KEY (target_item_id)
REFERENCES canvas_items(id)
ON DELETE CASCADE;

-- When a canvas is deleted, automatically delete related placements
ALTER TABLE canvas_item_placements
DROP CONSTRAINT IF EXISTS canvas_item_placements_canvas_item_id_fkey;

ALTER TABLE canvas_item_placements
ADD CONSTRAINT canvas_item_placements_canvas_item_id_fkey
FOREIGN KEY (canvas_item_id)
REFERENCES canvas_items(id)
ON DELETE CASCADE;

-- Add comments explaining the constraints
COMMENT ON CONSTRAINT canvas_item_assumptions_unique ON canvas_item_assumptions IS
  'Prevents duplicate assumption links to the same canvas item';

COMMENT ON CONSTRAINT canvas_item_mappings_unique ON canvas_item_mappings IS
  'Prevents duplicate FIT mappings between the same source and target items';
