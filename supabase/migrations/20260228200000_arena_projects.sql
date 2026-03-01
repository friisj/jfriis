-- Arena projects: catalogue source design systems and group skills/sessions
-- A project represents a Figma file or design system that skills are imported from

CREATE TABLE arena_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  figma_file_key TEXT,
  figma_file_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE arena_projects IS 'Source design systems / Figma files that arena skills are imported from.';

CREATE TRIGGER update_arena_projects_updated_at
  BEFORE UPDATE ON arena_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add project FK to arena_skills
ALTER TABLE arena_skills
  ADD COLUMN project_id UUID REFERENCES arena_projects(id) ON DELETE SET NULL;

CREATE INDEX idx_arena_skills_project ON arena_skills(project_id);
CREATE INDEX idx_arena_projects_slug ON arena_projects(slug);

-- RLS: admin-only (same pattern as existing arena tables)
ALTER TABLE arena_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to arena_projects"
  ON arena_projects FOR ALL USING (is_admin());
