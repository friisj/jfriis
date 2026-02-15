-- Seed Armature studio project, hypothesis, and experiment
-- Source: docs/studio/armature/README.md (2026-02-14)

-- ============================================================================
-- STUDIO PROJECT
-- ============================================================================

INSERT INTO studio_projects (slug, name, description, status, temperature, current_focus, path, problem_statement, hypothesis)
VALUES (
  'armature',
  'Armature',
  'Browser-based Three.js tool for shaping and posing a human character model, inspired by traditional artist armatures.',
  'active',
  'hot',
  'Exploration complete, decisions made. Ready for prototype: source MakeHuman CC0 base model and build core shape+pose pipeline.',
  'components/studio/prototypes/armature/',
  'Artists need quick, flexible figure reference for drawing. Full 3D suites are too complex, static references are too rigid, and simple posable tools lack meaningful body shaping. The gap: a tool as quick as a simple poser but with body modification.',
  'If we build a lightweight browser-based posable figure with discrete, hot-swappable modes for body shaping and pose manipulation, we can provide artists with a usable alternative to full 3D suites for figure reference.'
);

-- ============================================================================
-- HYPOTHESIS
-- ============================================================================

INSERT INTO studio_hypotheses (project_id, statement, validation_criteria, sequence, status)
VALUES (
  (SELECT id FROM studio_projects WHERE slug = 'armature'),
  'A rigged Three.js character with discrete, hot-swappable modes for body shaping and pose manipulation can provide artists with a usable, lightweight alternative to full 3D suites for figure reference.',
  'Users can shape a figure''s proportions and pose it in under 60 seconds without prior instruction.',
  1,
  'proposed'
);

-- ============================================================================
-- EXPERIMENT
-- ============================================================================

INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
VALUES (
  (SELECT id FROM studio_projects WHERE slug = 'armature'),
  (SELECT id FROM studio_hypotheses WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'armature') AND sequence = 1),
  'armature-prototype',
  'Armature Prototype',
  'Initial prototype: load MakeHuman GLB in Three.js, validate shape (morph targets + bone scaling) and pose (IK + FK) pipeline with two-tab mode switching.',
  'prototype',
  'planned'
);
