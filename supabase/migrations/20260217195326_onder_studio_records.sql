-- Onder: Studio project records (project, hypothesis, experiments, genesis idea, entity link)
-- Generative ambient audio instrument — no application-specific tables needed (pure client-side)

-- Studio project
INSERT INTO studio_projects (slug, name, description, status, temperature, problem_statement, success_criteria, user_id)
VALUES (
  'onder',
  'Onder',
  'Generative ambient audio instrument built with Tone.js. Features a 6-layer polyphonic pad synthesizer, Circle of Fifths chord selection, 5 color layers (arpeggios, strings, sparkles, whistle, wash), vinyl crackle, and a Flow Engine for autonomous chord drift and layer evolution.',
  'active',
  'warm',
  'Creating ambient music requires deep synthesis knowledge and complex DAW setups. There is no lightweight browser-based instrument that lets users explore generative ambient soundscapes through intuitive controls.',
  'Working browser-based ambient instrument with real-time synthesis, chord-driven harmony, and autonomous generative evolution via Flow Engine.',
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT (slug) DO NOTHING;

-- Hypothesis
INSERT INTO studio_hypotheses (project_id, statement, validation_criteria, sequence, status)
SELECT
  sp.id,
  'A browser-based polyphonic synthesizer with chord-driven harmony and autonomous drift can produce compelling ambient music without requiring deep synthesis expertise',
  'Users can create evolving ambient soundscapes using only chord selection, layer toggles, and flow engine controls — no synthesis parameter editing required for a good-sounding result',
  1,
  'testing'
FROM studio_projects sp WHERE sp.slug = 'onder';

-- Experiment 1: Core synthesis engine
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
SELECT
  sp.id,
  sh.id,
  'pad-synthesizer',
  'Pad Synthesizer',
  'Core 6-layer polyphonic pad synthesis with bass, chord voicing, and real-time audio bus routing via Tone.js',
  'prototype',
  'in_progress'
FROM studio_projects sp
JOIN studio_hypotheses sh ON sh.project_id = sp.id AND sh.sequence = 1
WHERE sp.slug = 'onder';

-- Experiment 2: Color layers
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
SELECT
  sp.id,
  sh.id,
  'color-layers',
  'Color Layers',
  'Five additional synthesis layers (Crystalline Arpeggios, ARP Solina Strings, Crystal Sparkles, Celtic Whistle, Ambient Wash) with independent controls and harmonic modes',
  'prototype',
  'in_progress'
FROM studio_projects sp
JOIN studio_hypotheses sh ON sh.project_id = sp.id AND sh.sequence = 1
WHERE sp.slug = 'onder';

-- Experiment 3: Flow Engine
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
SELECT
  sp.id,
  sh.id,
  'flow-engine',
  'Flow Engine',
  'Autonomous evolution system with probabilistic chord drift, layer evolution, chaos factor, pace control, and memory for creating self-evolving ambient compositions',
  'prototype',
  'in_progress'
FROM studio_projects sp
JOIN studio_hypotheses sh ON sh.project_id = sp.id AND sh.sequence = 1
WHERE sp.slug = 'onder';

-- Genesis idea (log entry)
INSERT INTO log_entries (title, slug, content, type, idea_stage, published, entry_date, studio_project_id)
SELECT
  'Onder: Browser-based generative ambient instrument',
  'onder-genesis',
  '{"markdown": "What if ambient music creation could be as simple as selecting chords on a circle of fifths and letting a flow engine evolve the soundscape autonomously? Built around Tone.js polyphonic synthesis with layered textures — pads, arpeggios, strings, sparkles, whistle, wash — each following or complementing the harmonic center. Part of the Squirrel monorepo exploration into audio analysis and synthesis pipelines."}'::jsonb,
  'idea',
  'graduated',
  false,
  '2025-06-01',
  sp.id
FROM studio_projects sp WHERE sp.slug = 'onder'
ON CONFLICT (slug) DO NOTHING;

-- Entity link: project evolved from genesis idea
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type)
SELECT
  'studio_project', sp.id,
  'log_entry', le.id,
  'evolved_from'
FROM studio_projects sp, log_entries le
WHERE sp.slug = 'onder' AND le.slug = 'onder-genesis'
ON CONFLICT DO NOTHING;
