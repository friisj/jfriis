-- Migrate legacy hypotheses from studio_projects.hypothesis (text column, now dropped)
-- into structured studio_hypotheses rows.
--
-- Background: The original seed (20251229050148_seed_studio_projects.sql) stored each
-- project's primary hypothesis in a hypothesis TEXT column on studio_projects.
-- That column was dropped in 20260102010000_remove_project_hypothesis.sql once the
-- studio_hypotheses table existed, but the data was never migrated across.
-- This migration backfills the three projects that had non-null hypothesis text:
--   - design-system-tool
--   - experience-systems
--   - hando
-- Trux had a NULL hypothesis and receives no row.

DO $$
DECLARE
  v_project_id UUID;
BEGIN

  -- Design System Tool
  SELECT id INTO v_project_id
  FROM studio_projects
  WHERE slug = 'design-system-tool';

  IF v_project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM studio_hypotheses WHERE project_id = v_project_id
  ) THEN
    INSERT INTO studio_hypotheses (project_id, statement, status, sequence)
    VALUES (
      v_project_id,
      'If we build an interactive token configurator, we can rapidly prototype and validate design decisions while creating a portfolio showcase piece.',
      'proposed',
      1
    );
  END IF;

  -- Experience Systems
  SELECT id INTO v_project_id
  FROM studio_projects
  WHERE slug = 'experience-systems';

  IF v_project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM studio_hypotheses WHERE project_id = v_project_id
  ) THEN
    INSERT INTO studio_hypotheses (project_id, statement, status, sequence)
    VALUES (
      v_project_id,
      'If we define a formal system for experience metrics and governance, we can make experience design more rigorous and measurable.',
      'proposed',
      1
    );
  END IF;

  -- Hando
  SELECT id INTO v_project_id
  FROM studio_projects
  WHERE slug = 'hando';

  IF v_project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM studio_hypotheses WHERE project_id = v_project_id
  ) THEN
    INSERT INTO studio_hypotheses (project_id, statement, status, sequence)
    VALUES (
      v_project_id,
      'If we create a digital twin of a home with structured maintenance data, we can enable proactive and informed home management.',
      'proposed',
      1
    );
  END IF;

END $$;
