-- Seed Ludo as a studio project with hypotheses and experiments

-- Studio project
INSERT INTO studio_projects (slug, name, description, status, temperature, problem_statement, success_criteria, current_focus, user_id)
VALUES (
  'ludo',
  'Ludo',
  '3D backgammon engine with MCTS AI, physics-based rendering, parametric themes, and synthesized audio. Built with Three.js, Cannon-ES, Zustand, and Tone.js.',
  'active',
  'warm',
  'Browser-based board games lack the tactile satisfaction of physical play. Most web backgammon implementations use flat 2D boards with weak AI opponents, making the experience feel hollow compared to real-world play.',
  'A playable 3D backgammon game with expert-level AI (MCTS), physics-based dice and checker animations, customizable board themes, and synthesized audio — all running smoothly in a browser.',
  'MCTS AI tuning and 3D rendering polish',
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  temperature = EXCLUDED.temperature,
  problem_statement = EXCLUDED.problem_statement,
  success_criteria = EXCLUDED.success_criteria,
  current_focus = EXCLUDED.current_focus;

-- Hypothesis 1: MCTS AI
INSERT INTO studio_hypotheses (project_id, statement, validation_criteria, sequence, status)
VALUES (
  (SELECT id FROM studio_projects WHERE slug = 'ludo'),
  'If we implement Monte Carlo Tree Search with adaptive time budgeting, then the AI opponent can provide expert-level backgammon play that challenges experienced players in a browser.',
  'Expert-difficulty AI wins >55% of matches against intermediate AI. MCTS stays within time budget (2-4s per move) on typical hardware. Rule-based fallback triggers <10% of moves.',
  1,
  'testing'
)
ON CONFLICT DO NOTHING;

-- Hypothesis 2: Physics-based 3D
INSERT INTO studio_hypotheses (project_id, statement, validation_criteria, sequence, status)
VALUES (
  (SELECT id FROM studio_projects WHERE slug = 'ludo'),
  'If we use Three.js with Cannon-ES physics for dice and checker animations, then the game creates a more immersive and satisfying experience than 2D implementations.',
  'Physics-based dice rolls feel realistic. Checker animations are smooth at 60fps. 80+ parameter theme system enables diverse visual styles without performance degradation.',
  2,
  'testing'
)
ON CONFLICT DO NOTHING;

-- Hypothesis 3: Synthesized audio
INSERT INTO studio_hypotheses (project_id, statement, validation_criteria, sequence, status)
VALUES (
  (SELECT id FROM studio_projects WHERE slug = 'ludo'),
  'If we use Web Audio synthesis and Tone.js generative soundscapes instead of audio files, then we can create rich, adaptive game audio with zero asset downloads.',
  'All gameplay sounds are synthesized with no audio file dependencies. Sound collections are switchable at runtime. Ambient soundscape responds to game state without stuttering.',
  3,
  'testing'
)
ON CONFLICT DO NOTHING;

-- Experiments
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
VALUES
  (
    (SELECT id FROM studio_projects WHERE slug = 'ludo'),
    (SELECT id FROM studio_hypotheses WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'ludo') AND sequence = 1),
    'core-game-engine',
    'Core Game Engine',
    'Full backgammon rules implementation: move validation, hit detection, bear-off logic, doubling cube, Crawford rule, match play with gammon/backgammon scoring. 15-move opening book.',
    'prototype',
    'in_progress'
  ),
  (
    (SELECT id FROM studio_projects WHERE slug = 'ludo'),
    (SELECT id FROM studio_hypotheses WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'ludo') AND sequence = 1),
    'mcts-ai',
    'MCTS AI Opponent',
    'Monte Carlo Tree Search AI with 5 difficulty levels, 4 personalities, adaptive time budgeting, 7-factor position evaluation, hybrid rule-based fallback, and opening book integration.',
    'experiment',
    'in_progress'
  ),
  (
    (SELECT id FROM studio_projects WHERE slug = 'ludo'),
    (SELECT id FROM studio_hypotheses WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'ludo') AND sequence = 2),
    '3d-renderer',
    '3D Board Renderer',
    'Three.js board rendering with Cannon-ES physics for dice and checkers. 7+ camera presets, animation system (move trails, hit effects), and object pooling for performance.',
    'prototype',
    'in_progress'
  ),
  (
    (SELECT id FROM studio_projects WHERE slug = 'ludo'),
    (SELECT id FROM studio_hypotheses WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'ludo') AND sequence = 2),
    'theme-builder',
    'Theme Builder',
    'Parametric theme editor with 80+ visual parameters (colors, textures, sizes, materials). Cloud-stored themes with public/private gallery.',
    'prototype',
    'in_progress'
  ),
  (
    (SELECT id FROM studio_projects WHERE slug = 'ludo'),
    (SELECT id FROM studio_hypotheses WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'ludo') AND sequence = 3),
    'audio-system',
    'Audio System',
    'Web Audio synthesis (SFX) and Tone.js generative soundscapes (ambient). Sound collections with event mapping. Includes ArpeggiatorSynth, WashSynth, SparkleSynth, WhistleSynth.',
    'experiment',
    'in_progress'
  ),
  (
    (SELECT id FROM studio_projects WHERE slug = 'ludo'),
    (SELECT id FROM studio_hypotheses WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'ludo') AND sequence = 1),
    'gameplay-audit',
    'Gameplay Audit System',
    'Automated AI vs AI testing with event logging, compressed board snapshots, statistical analysis, anomaly detection, and MCTS performance benchmarking.',
    'experiment',
    'in_progress'
  )
ON CONFLICT (project_id, slug) DO NOTHING;

-- Genesis idea for lineage
INSERT INTO log_entries (title, slug, content, entry_date, type, idea_stage, published, is_private, tags)
VALUES (
  'Ludo',
  'ludo-genesis',
  '{"markdown": "Genesis idea for studio project: Ludo.\n\nBrowser-based board games lack the tactile satisfaction of physical play. A 3D backgammon engine with physics-based rendering, MCTS AI, and synthesized audio could bridge this gap — providing expert-level play and immersive aesthetics without any downloads.\n\nMigrated from standalone repo into jfriis as a studio project with 12 database tables, Three.js rendering, Cannon-ES physics, Zustand state management, and Tone.js audio."}'::jsonb,
  '2026-02-17',
  'idea',
  'graduated',
  false,
  true,
  ARRAY['studio', 'genesis', 'games', 'ai', '3d']
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
WHERE sp.slug = 'ludo' AND le.slug = 'ludo-genesis'
ON CONFLICT DO NOTHING;
