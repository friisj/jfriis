-- Update Studio Experiment Types
-- Removes 'spike', adds 'discovery_interviews' and 'landing_page'

-- First, update any existing 'spike' records to 'experiment' (graceful migration)
UPDATE studio_experiments
SET type = 'experiment'
WHERE type = 'spike';

-- Drop the existing constraint
ALTER TABLE studio_experiments
DROP CONSTRAINT IF EXISTS studio_experiments_type_check;

-- Add new constraint with updated types
ALTER TABLE studio_experiments
ADD CONSTRAINT studio_experiments_type_check
CHECK (type IN ('experiment', 'prototype', 'discovery_interviews', 'landing_page'));

-- Update comment to reflect new types
COMMENT ON COLUMN studio_experiments.type IS 'Experiment type: experiment (default), prototype (working code), discovery_interviews (user research), landing_page (marketing validation)';
