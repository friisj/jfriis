-- Allow arena_themes to exist independently as template themes,
-- without requiring either project_id or skill_id.
-- Previously the CHECK constraint required one of those to be non-null.
-- Now is_template = true is a third valid ownership state.

ALTER TABLE arena_themes ADD COLUMN is_template BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing themes with skill_id but no project_id are templates
UPDATE arena_themes SET is_template = true
  WHERE skill_id IS NOT NULL AND project_id IS NULL;

-- Relax the ownership constraint to allow independent templates
ALTER TABLE arena_themes DROP CONSTRAINT arena_themes_owner_check;
ALTER TABLE arena_themes ADD CONSTRAINT arena_themes_owner_check
  CHECK (project_id IS NOT NULL OR skill_id IS NOT NULL OR is_template = true);

-- Index for efficient template theme lookups
CREATE INDEX idx_arena_themes_template ON arena_themes(name, dimension)
  WHERE is_template = true;
