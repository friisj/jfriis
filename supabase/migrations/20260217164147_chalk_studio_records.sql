-- Chalk: Studio project records (project, hypothesis, experiments, genesis idea, entity link)

-- Studio project
INSERT INTO studio_projects (slug, name, description, status, temperature, problem_statement, success_criteria, user_id)
VALUES (
  'chalk',
  'Chalk',
  'AI-powered lo-fi design tool that enforces disciplined exploration before visual polish. Uses tldraw canvas with AI generation (Gemini), iteration (Claude), and voice annotation (Deepgram).',
  'active',
  'warm',
  'Design teams jump to high-fidelity mockups too early, skipping the divergent exploration phase that produces better design outcomes. There is no tool that enforces lo-fi-first discipline with AI assistance.',
  'Working prototype with tldraw canvas, multi-option AI wireframe generation, and markup/voice iteration feedback loops.',
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT (slug) DO NOTHING;

-- Hypothesis
INSERT INTO studio_hypotheses (project_id, statement, validation_criteria, sequence, status)
SELECT
  sp.id,
  'A structured lo-fi-first design process with AI assistance produces better design outcomes than jumping straight to high-fidelity mockups',
  'Users can generate multiple wireframe options, iterate via markup/voice, and converge on a design direction without touching high-fidelity tools',
  1,
  'testing'
FROM studio_projects sp WHERE sp.slug = 'chalk';

-- Experiment 1: tldraw canvas
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
SELECT
  sp.id,
  sh.id,
  'tldraw-canvas',
  'Tldraw Canvas Integration',
  'Core infinite canvas with tldraw v4, custom wireframe shape utilities, auto-save to Supabase, and version snapshots.',
  'prototype',
  'in_progress'
FROM studio_projects sp
JOIN studio_hypotheses sh ON sh.project_id = sp.id
WHERE sp.slug = 'chalk';

-- Experiment 2: AI wireframe generation
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
SELECT
  sp.id,
  sh.id,
  'ai-wireframe-generation',
  'AI Wireframe Generation',
  'Multi-option wireframe generation via Gemini 2.0 Flash. User describes a screen, AI produces 3-4 distinct lo-fi options with rationale and design principles.',
  'prototype',
  'in_progress'
FROM studio_projects sp
JOIN studio_hypotheses sh ON sh.project_id = sp.id
WHERE sp.slug = 'chalk';

-- Experiment 3: markup & voice iteration
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
SELECT
  sp.id,
  sh.id,
  'markup-voice-iteration',
  'Markup & Voice Iteration',
  'Feedback loops using visual markup annotations (freehand drawing, rectangles) and voice transcription (Deepgram Nova 2) to iterate on wireframes via Claude.',
  'prototype',
  'in_progress'
FROM studio_projects sp
JOIN studio_hypotheses sh ON sh.project_id = sp.id
WHERE sp.slug = 'chalk';

-- Genesis idea (log entry)
INSERT INTO log_entries (title, slug, content, entry_date, type, idea_stage, published, is_private, tags)
VALUES (
  'Chalk: Lo-fi design tool with AI',
  'chalk-genesis',
  '{"markdown": "Genesis idea for studio project: Chalk.\n\nDesign teams jump to high-fidelity mockups too early, skipping the divergent exploration phase that produces better outcomes. Chalk enforces lo-fi-first discipline: sketch wireframes on a tldraw canvas, generate multiple options with AI, iterate with markup and voice annotations, and only graduate to high-fidelity when the design direction is validated.\n\nMigrated from standalone repo into jfriis as a studio project with 4 database tables, 9 API routes, and tldraw canvas integration."}'::jsonb,
  '2025-10-24',
  'idea',
  'graduated',
  false,
  true,
  ARRAY['studio', 'genesis', 'design', 'ai', 'wireframing']
)
ON CONFLICT (slug) DO NOTHING;

-- Entity link: studio_project evolved_from log_entry (genesis idea)
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type, metadata)
SELECT
  'studio_project',
  sp.id,
  'log_entry',
  le.id,
  'evolved_from',
  '{}'::jsonb
FROM studio_projects sp, log_entries le
WHERE sp.slug = 'chalk' AND le.slug = 'chalk-genesis'
ON CONFLICT DO NOTHING;
