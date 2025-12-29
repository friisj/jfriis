-- Seed studio_projects with existing registry data
-- Source: .claude/STUDIO_REGISTRY.md (2025-12-27)

INSERT INTO studio_projects (slug, name, description, status, temperature, current_focus, path, scaffolded_at, problem_statement, hypothesis)
VALUES
  (
    'design-system-tool',
    'Design System Tool',
    'Interactive design token configurator and theme builder for jonfriis.com',
    'active',
    'hot',
    'Completing interaction & state system (Phase 5). Foundation done (state opacity, scale transforms, focus rings, feedback colors). Advanced features pending (loading states, timing thresholds, blur effects).',
    'components/studio/',
    now(), -- Already scaffolded
    'Design systems require careful token management across primitives, semantics, and components. Manual configuration is tedious and error-prone.',
    'If we build an interactive token configurator, we can rapidly prototype and validate design decisions while creating a portfolio showcase piece.'
  ),
  (
    'experience-systems',
    'Experience Systems',
    'Conceptual framework for systematic experience design with governance and metrics',
    'paused',
    'warm',
    NULL,
    'docs/studio/experience-systems/',
    now(), -- Has exploration docs
    'Digital experiences lack systematic approaches to measuring and governing experiential quality across products.',
    'If we define a formal system for experience metrics and governance, we can make experience design more rigorous and measurable.'
  ),
  (
    'hando',
    'Hando',
    'Platform for home maintenance and management, starting with digital building models',
    'draft',
    'warm',
    'Defining twin (digital building model) as first sub-project',
    'components/studio/hando/',
    NULL, -- Not scaffolded yet
    'Home maintenance knowledge is scattered and reactive. Homeowners lack a coherent model of their building and its systems.',
    'If we create a digital twin of a home with structured maintenance data, we can enable proactive and informed home management.'
  ),
  (
    'trux',
    'Trux',
    'New studio project - purpose and features to be defined',
    'draft',
    'warm',
    'Initial project setup and definition',
    'components/studio/trux/',
    NULL, -- Not scaffolded
    NULL, -- TBD
    NULL  -- TBD
  );
