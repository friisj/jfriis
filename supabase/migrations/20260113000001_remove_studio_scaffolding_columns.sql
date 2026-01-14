-- Remove Scaffolding Columns from Studio Projects
-- These columns were for a scaffold script that was removed
-- Path can be derived from project/experiment slugs, scaffolded_at is no longer meaningful

-- Remove columns
ALTER TABLE studio_projects
  DROP COLUMN IF EXISTS path,
  DROP COLUMN IF EXISTS scaffolded_at;

COMMENT ON TABLE studio_projects IS 'Studio workshop projects with PRD fields and hypothesis-driven structure. View at /studio/{slug}';
