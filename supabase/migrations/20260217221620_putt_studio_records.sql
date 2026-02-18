-- Putt: Studio records for 3D putting physics simulator
-- No application tables needed — putt is a purely client-side prototype with no persistence

-- Studio project
INSERT INTO studio_projects (slug, name, description, status, temperature, problem_statement, user_id)
VALUES (
  'putt',
  'Putt',
  '3D mini-golf putting simulator exploring realistic putting physics with Three.js and Cannon.js. Spike-driven prototype covering green generation, ball physics, cup mechanics, and undulation systems.',
  'active',
  'warm',
  'Realistic putting physics in the browser requires bridging the gap between physically accurate simulation and playable game feel — particularly around surface-projected ball motion, green undulation, and cup capture mechanics.',
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT DO NOTHING;

-- Hypothesis
INSERT INTO studio_hypotheses (project_id, statement, validation_criteria, sequence, status)
VALUES (
  (SELECT id FROM studio_projects WHERE slug = 'putt'),
  'Browser-based physics engines (Cannon.js) combined with procedural green generation can produce putting experiences that feel physically plausible and playable at interactive frame rates.',
  'Ball rolls realistically on sloped surfaces following stimpmeter-calibrated friction. Cup capture feels natural with USGA-spec dimensions. Green generation produces diverse, playable surfaces with validated slope constraints.',
  1,
  'testing'
)
ON CONFLICT DO NOTHING;

-- Experiment 1: Green generation system
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
VALUES (
  (SELECT id FROM studio_projects WHERE slug = 'putt'),
  (SELECT id FROM studio_hypotheses WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'putt') AND sequence = 1),
  'green-generation',
  'Complex Green Generation',
  'Procedural generation of realistic putting green surfaces with shape families (oval, pear, kidney, peanut, boomerang), tiered terrain features (ridges, swales, crowns, false fronts), and playability validation. Includes heightfield generation, SDF-based outlines, pin candidate detection, and difficulty classification (T1-T5).',
  'prototype',
  'in_progress'
)
ON CONFLICT DO NOTHING;

-- Experiment 2: Ball and cup physics
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
VALUES (
  (SELECT id FROM studio_projects WHERE slug = 'putt'),
  (SELECT id FROM studio_hypotheses WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'putt') AND sequence = 1),
  'physics-engine',
  'Ball & Cup Physics Engine',
  'Cannon.js-based ball physics with collision group switching, stimpmeter-calibrated friction, and USGA-spec cup mechanics. Includes compound cup body (bottom + walls + rim segments), ball capture detection, rim deflection calculation, and debug visualization overlays.',
  'prototype',
  'in_progress'
)
ON CONFLICT DO NOTHING;

-- Experiment 3: Undulation system
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
VALUES (
  (SELECT id FROM studio_projects WHERE slug = 'putt'),
  (SELECT id FROM studio_hypotheses WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'putt') AND sequence = 1),
  'undulation-system',
  'Undulation & Surface Detail',
  'Domain warping + fractional Brownian motion (fBm) undulation system for adding micro-terrain detail to greens. Configurable noise amplitude, wavelength, ridge strength, gaussian bumps, and sine wave overlays to produce varied and realistic putting surfaces.',
  'prototype',
  'planned'
)
ON CONFLICT DO NOTHING;

-- Genesis log entry
INSERT INTO log_entries (title, slug, content, type, idea_stage, published, entry_date, studio_project_id)
SELECT
  'Putt: 3D putting physics prototype',
  'putt-genesis',
  '{"markdown": "Spike-driven exploration of realistic putting simulation in the browser. Core physics with surface-projected ball motion on heightfield terrain, Cannon.js integration for collision and friction, procedural green generation with 5 shape families (oval, pear, kidney, peanut, boomerang), USGA-spec cup mechanics, and domain-warping undulation system. Migration into jfriis studio for continued development."}'::jsonb,
  'idea',
  'graduated',
  false,
  '2025-09-01',
  sp.id
FROM studio_projects sp WHERE sp.slug = 'putt'
ON CONFLICT DO NOTHING;

-- Link project to genesis idea
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type)
VALUES (
  'studio_project',
  (SELECT id FROM studio_projects WHERE slug = 'putt'),
  'log_entry',
  (SELECT id FROM log_entries WHERE slug = 'putt-genesis' LIMIT 1),
  'evolved_from'
);
