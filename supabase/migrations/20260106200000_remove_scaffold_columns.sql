-- Remove scaffolding-related columns from studio_projects table
-- These columns are no longer needed after refactoring to generic dynamic pages

ALTER TABLE studio_projects
DROP COLUMN IF EXISTS scaffolded_at,
DROP COLUMN IF EXISTS path;

-- Add comment explaining the change
COMMENT ON TABLE studio_projects IS 'Studio projects with hypothesis-driven roadmaps. Projects are immediately available at /studio/{slug} without scaffolding.';
