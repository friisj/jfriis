-- Add expected_outcome column to studio_experiments
-- This column stores what we expect to learn from the experiment

ALTER TABLE studio_experiments
ADD COLUMN IF NOT EXISTS expected_outcome TEXT;

COMMENT ON COLUMN studio_experiments.expected_outcome IS 'What we expect to learn or prove from this experiment';
