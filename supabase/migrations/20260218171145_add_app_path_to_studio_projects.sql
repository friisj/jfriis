-- Add app_path column to studio_projects
-- Stores the URL path to the project's prototype app (e.g., '/apps/ludo', '/tools/cog')
-- Replaces filesystem-based app detection with explicit DB field

ALTER TABLE studio_projects ADD COLUMN app_path TEXT;

-- Backfill existing projects that have apps under /apps/{slug}
UPDATE studio_projects SET app_path = '/apps/' || slug
WHERE slug IN ('chalk', 'ludo', 'loadout', 'onder', 'putt', 'verbivore');
