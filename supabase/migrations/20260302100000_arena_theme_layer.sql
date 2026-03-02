-- Arena Theme Layer
-- Adds arena_project_themes table for storing quantitative token values
-- separate from the qualitative skill intent layer.
-- Each row represents one dimension's tokens for a project + platform combo.

CREATE TABLE arena_project_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES arena_projects(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'tailwind',
  tokens JSONB NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, dimension, platform)
);

-- Index for project lookups
CREATE INDEX idx_arena_project_themes_project ON arena_project_themes(project_id);

-- Auto-update updated_at on change
CREATE TRIGGER arena_project_themes_updated_at
  BEFORE UPDATE ON arena_project_themes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: admin-only access (matches other arena tables)
ALTER TABLE arena_project_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on arena_project_themes"
  ON arena_project_themes
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
