-- Chassis Studies: focused explorations producing reference material and parameter constraints
-- A study examines a specific anatomical or design area, records findings,
-- and optionally locks parameters back to modules.

CREATE TABLE luv_chassis_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES luv_chassis_modules(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  focus_area text NOT NULL DEFAULT '',
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  parameter_constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chassis_studies_module ON luv_chassis_studies(module_id);
CREATE INDEX idx_chassis_studies_slug ON luv_chassis_studies(slug);

CREATE TRIGGER set_chassis_studies_updated_at
  BEFORE UPDATE ON luv_chassis_studies
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

ALTER TABLE luv_chassis_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read studies"
  ON luv_chassis_studies FOR SELECT
  USING (true);

CREATE POLICY "Admin insert studies"
  ON luv_chassis_studies FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin update studies"
  ON luv_chassis_studies FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin delete studies"
  ON luv_chassis_studies FOR DELETE
  USING (is_admin());
