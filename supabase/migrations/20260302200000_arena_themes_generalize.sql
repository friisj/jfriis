-- Generalize arena_project_themes → arena_themes
-- Themes can now belong to skills (templates) not just projects.
-- This supports the two-layer model where templates ship with default theme configs.

-- 1. Rename table
ALTER TABLE arena_project_themes RENAME TO arena_themes;

-- 2. Add skill_id column (nullable — template themes reference a skill, project themes don't)
ALTER TABLE arena_themes
  ADD COLUMN skill_id UUID REFERENCES arena_skills(id) ON DELETE CASCADE;

-- 3. Add name column for multiple theme configs per scope (e.g., "default", "dark", "corporate")
ALTER TABLE arena_themes
  ADD COLUMN name TEXT NOT NULL DEFAULT 'default';

-- 4. Make project_id nullable (template themes have no project)
ALTER TABLE arena_themes
  ALTER COLUMN project_id DROP NOT NULL;

-- 5. Drop old unique constraint and index
ALTER TABLE arena_themes
  DROP CONSTRAINT arena_project_themes_project_id_dimension_platform_key;
DROP INDEX IF EXISTS idx_arena_project_themes_project;

-- 6. Add CHECK: at least one of project_id or skill_id must be non-null
ALTER TABLE arena_themes
  ADD CONSTRAINT arena_themes_owner_check
  CHECK (project_id IS NOT NULL OR skill_id IS NOT NULL);

-- 7. Add new unique constraint covering both scopes
-- Uses COALESCE to handle NULLs in the uniqueness check
CREATE UNIQUE INDEX idx_arena_themes_unique
  ON arena_themes (
    COALESCE(project_id, '00000000-0000-0000-0000-000000000000'),
    COALESCE(skill_id, '00000000-0000-0000-0000-000000000000'),
    dimension, platform, name
  );

-- 8. Add indexes for lookups
CREATE INDEX idx_arena_themes_project ON arena_themes(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_arena_themes_skill ON arena_themes(skill_id) WHERE skill_id IS NOT NULL;

-- 9. Update RLS policy name to match new table name
DROP POLICY IF EXISTS "Admin full access on arena_project_themes" ON arena_themes;
CREATE POLICY "Admin full access on arena_themes"
  ON arena_themes
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
