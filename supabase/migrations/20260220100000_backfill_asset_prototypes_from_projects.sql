-- Backfill studio_asset_prototypes from studio_projects that have an app_path.
-- Each project with an app gets one prototype asset representing its primary app.
-- This populates the prototype assets table that was created empty in the
-- experiment asset extraction migration.

INSERT INTO studio_asset_prototypes (project_id, slug, name, description, app_path)
SELECT
  p.id,
  p.slug,
  p.name || ' App',
  'Primary app prototype for ' || p.name,
  p.app_path
FROM studio_projects p
WHERE p.app_path IS NOT NULL;
