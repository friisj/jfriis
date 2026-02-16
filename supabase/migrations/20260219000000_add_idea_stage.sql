-- Add idea_stage column to log_entries for tracking idea lifecycle
-- Only meaningful when type = 'idea'

ALTER TABLE log_entries ADD COLUMN idea_stage TEXT;

-- Backfill existing idea-typed entries
UPDATE log_entries SET idea_stage = 'captured' WHERE type = 'idea';
UPDATE log_entries SET idea_stage = 'exploring' WHERE type = 'idea-shaped';
UPDATE log_entries SET idea_stage = 'validated' WHERE type = 'idea-validated';

-- Normalize type variants back to 'idea'
UPDATE log_entries SET type = 'idea' WHERE type IN ('idea-shaped', 'idea-validated');

-- Add check constraint for valid stages
ALTER TABLE log_entries ADD CONSTRAINT log_entries_idea_stage_valid
  CHECK (idea_stage IS NULL OR idea_stage IN (
    'captured',    -- Raw idea, just jotted down
    'exploring',   -- Being researched/shaped
    'validated',   -- Has evidence supporting it
    'graduated',   -- Promoted to studio project or venture
    'parked'       -- Deliberately set aside
  ));
