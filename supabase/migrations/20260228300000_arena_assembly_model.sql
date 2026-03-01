-- Arena Schema Evolution: Project-Centric Assembly Model
--
-- Evolves from flat monolithic skills to per-dimension composable skills with
-- project assemblies, test component registry, session targeting, and templates.

-- =============================================================================
-- Migration 1: Per-Dimension Skills + Project Assembly
-- =============================================================================

-- Skills can now be scoped to a single dimension. NULL = legacy monolithic skill.
ALTER TABLE arena_skills
  ADD COLUMN dimension TEXT CHECK (dimension IN ('color', 'typography', 'spacing'));

-- Project assembly: one active skill per dimension per project
CREATE TABLE arena_project_assembly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES arena_projects(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL CHECK (dimension IN ('color', 'typography', 'spacing')),
  skill_id UUID NOT NULL REFERENCES arena_skills(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, dimension)
);

CREATE INDEX idx_arena_project_assembly_project ON arena_project_assembly(project_id);

ALTER TABLE arena_project_assembly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Arena project assembly admin access" ON arena_project_assembly
  FOR ALL USING (is_admin());

-- =============================================================================
-- Migration 2: Enrich Project Inputs
-- =============================================================================

-- Structured multi-modal inputs (Figma links, fonts, images, URLs)
ALTER TABLE arena_projects
  ADD COLUMN inputs JSONB NOT NULL DEFAULT '{}';

-- Migrate existing figma_file_url into inputs if present
UPDATE arena_projects
SET inputs = jsonb_build_object(
  'figma_links', CASE
    WHEN figma_file_url IS NOT NULL THEN jsonb_build_array(jsonb_build_object('url', figma_file_url))
    ELSE '[]'::jsonb
  END,
  'fonts', '[]'::jsonb,
  'images', '[]'::jsonb,
  'urls', '[]'::jsonb
)
WHERE figma_file_url IS NOT NULL;

-- =============================================================================
-- Migration 3: Test Component Registry
-- =============================================================================

CREATE TABLE arena_test_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  component_key TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_default BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE arena_test_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Arena test components admin access" ON arena_test_components
  FOR ALL USING (is_admin());

-- Link sessions to selected test components
CREATE TABLE arena_session_components (
  session_id UUID NOT NULL REFERENCES arena_sessions(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES arena_test_components(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, component_id)
);

ALTER TABLE arena_session_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Arena session components admin access" ON arena_session_components
  FOR ALL USING (is_admin());

-- Seed default test components (Card, Form, Dashboard)
INSERT INTO arena_test_components (slug, name, description, component_key, category, is_default) VALUES
  ('card', 'Card', 'Notification card with title, body, timestamp, and action buttons', 'CanonicalCard', 'general', true),
  ('form', 'Form', 'Contact form with name, email, message fields and submit button', 'CanonicalForm', 'general', true),
  ('dashboard', 'Dashboard', 'Weekly overview with KPI tiles, bar chart, and sparkline', 'CanonicalDashboard', 'data', true);

-- =============================================================================
-- Migration 4: Session Restructuring
-- =============================================================================

-- Sessions now target a specific project + dimension for controlled experiments
ALTER TABLE arena_sessions
  ADD COLUMN project_id UUID REFERENCES arena_projects(id) ON DELETE SET NULL,
  ADD COLUMN target_dimension TEXT CHECK (target_dimension IN ('color', 'typography', 'spacing')),
  ADD COLUMN config JSONB NOT NULL DEFAULT '{}';

CREATE INDEX idx_arena_sessions_project ON arena_sessions(project_id);

-- =============================================================================
-- Migration 5: Skill Templates
-- =============================================================================

ALTER TABLE arena_skills
  ADD COLUMN is_template BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN template_description TEXT;
