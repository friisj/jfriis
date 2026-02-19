-- Update experiment types to match Bland's methodology vocabulary
-- Renames discovery_interviews → interview, landing_page → smoke_test
-- Final types: spike, experiment, prototype, interview, smoke_test

-- Rename existing type values
UPDATE studio_experiments SET type = 'interview' WHERE type = 'discovery_interviews';
UPDATE studio_experiments SET type = 'smoke_test' WHERE type = 'landing_page';

-- Update the type constraint to reflect the new vocabulary
ALTER TABLE studio_experiments DROP CONSTRAINT IF EXISTS studio_experiments_type_check;
ALTER TABLE studio_experiments ADD CONSTRAINT studio_experiments_type_check
  CHECK (type IN ('spike', 'experiment', 'prototype', 'interview', 'smoke_test'));
