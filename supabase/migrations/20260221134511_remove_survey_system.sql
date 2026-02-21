-- Remove survey system tables and columns
-- The survey system has been superseded by Claude skills
-- (/generate-boundary-objects, /generate-experiments)

-- Drop survey tables (cascade removes FK constraints)
DROP TABLE IF EXISTS studio_survey_artifacts CASCADE;
DROP TABLE IF EXISTS studio_survey_responses CASCADE;
DROP TABLE IF EXISTS studio_surveys CASCADE;

-- Remove survey-specific columns from studio_projects
-- Keep user_id (used by RLS policies for assumptions and other tables)
ALTER TABLE studio_projects
  DROP COLUMN IF EXISTS has_pending_survey,
  DROP COLUMN IF EXISTS survey_generated_at;

-- Drop survey-specific indexes (tables are gone, but be explicit)
DROP INDEX IF EXISTS idx_studio_surveys_project;
DROP INDEX IF EXISTS idx_studio_surveys_status;
DROP INDEX IF EXISTS idx_studio_surveys_processing_status;
DROP INDEX IF EXISTS idx_survey_responses_survey;
DROP INDEX IF EXISTS idx_survey_artifacts_survey;
DROP INDEX IF EXISTS idx_survey_artifacts_type;
DROP INDEX IF EXISTS idx_survey_artifacts_id;
DROP INDEX IF EXISTS idx_studio_projects_pending_survey;
