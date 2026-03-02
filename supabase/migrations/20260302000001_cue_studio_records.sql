-- Seed Cue as a studio project with hypotheses and experiments

INSERT INTO studio_projects (slug, name, description, status, temperature, problem_statement, success_criteria, current_focus, user_id)
VALUES (
  'cue',
  'Cue',
  'Personal social intelligence tool. Pulse: a daily digest from RSS sources filtered by interest profile. Brief: AI-generated conversation prep that computes topic overlap with a contact and surfaces relevant recent items.',
  'active',
  'warm',
  'Pre-meeting research is scattered and time-consuming: manually scanning feeds, recalling what contacts care about, and synthesizing context before a conversation. There is no single tool that combines a personal interest feed with contact-aware conversation prep.',
  'A working Pulse feed that surfaces genuinely relevant items daily, and Brief generation that produces 3-5 useful talking points given a contact in under 10 seconds.',
  'Foundation phase: DB schema, routing skeleton, profile and contact CRUD',
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  temperature = EXCLUDED.temperature,
  problem_statement = EXCLUDED.problem_statement,
  success_criteria = EXCLUDED.success_criteria,
  current_focus = EXCLUDED.current_focus;

-- Hypothesis 1: Pulse relevance scoring
INSERT INTO studio_hypotheses (project_id, statement, validation_criteria, sequence, status)
VALUES (
  (SELECT id FROM studio_projects WHERE slug = 'cue'),
  'If we score RSS items against a weighted interest profile, then a daily digest can surface the 10-20 most relevant items without requiring manual curation.',
  'At least 70% of surfaced items are rated as relevant or very relevant after a week of use. The feed replaces the manual RSS-checking habit.',
  1,
  'proposed'
)
ON CONFLICT DO NOTHING;

-- Hypothesis 2: Brief utility
INSERT INTO studio_hypotheses (project_id, statement, validation_criteria, sequence, status)
VALUES (
  (SELECT id FROM studio_projects WHERE slug = 'cue'),
  'If we compute topic overlap between the user and a contact and surface recent relevant Pulse items, then AI can generate 3-5 talking points that feel natural and prepared without additional research.',
  'Generated briefs require fewer than 2 edits before use. Cue Brief is used before at least 80% of scheduled meetings within 2 weeks of launch.',
  2,
  'proposed'
)
ON CONFLICT DO NOTHING;

-- Experiments
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
VALUES
  (
    (SELECT id FROM studio_projects WHERE slug = 'cue'),
    (SELECT id FROM studio_hypotheses WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'cue') AND sequence = 1),
    'pulse-feed',
    'Pulse Feed',
    'RSS fetching, topic tagging, relevance scoring against interest profile, and Pulse feed UI.',
    'experiment',
    'planned'
  ),
  (
    (SELECT id FROM studio_projects WHERE slug = 'cue'),
    (SELECT id FROM studio_hypotheses WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'cue') AND sequence = 2),
    'brief-generation',
    'Brief Generation',
    'AI-generated conversation prep: topic overlap computation, relevant Pulse item selection, structured talking points via Claude.',
    'experiment',
    'planned'
  ),
  (
    (SELECT id FROM studio_projects WHERE slug = 'cue'),
    NULL,
    'contact-profile',
    'Contact Profile',
    'Contact CRUD, topic interest tagging per contact, and the interest profile editor.',
    'prototype',
    'planned'
  )
ON CONFLICT (project_id, slug) DO NOTHING;

-- Genesis idea log entry
INSERT INTO log_entries (title, slug, content, entry_date, type, idea_stage, published, is_private, tags)
VALUES (
  'Cue',
  'cue-genesis',
  '{"markdown": "Genesis idea for studio project: Cue.\n\nPre-meeting research is scattered and time-consuming. A personal social intelligence tool combining a daily RSS digest (Pulse) filtered by topic interest with AI-generated conversation prep (Brief) that computes overlap with a specific contact and surfaces relevant recent items."}'::jsonb,
  '2026-03-02',
  'idea',
  'graduated',
  false,
  true,
  ARRAY['studio', 'genesis', 'ai', 'social', 'rss']
)
ON CONFLICT (slug) DO NOTHING;

-- Entity link: studio_project evolved_from log_entry
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type, metadata)
SELECT
  'studio_project',
  sp.id,
  'log_entry',
  le.id,
  'evolved_from',
  '{}'::jsonb
FROM studio_projects sp, log_entries le
WHERE sp.slug = 'cue' AND le.slug = 'cue-genesis'
ON CONFLICT DO NOTHING;
