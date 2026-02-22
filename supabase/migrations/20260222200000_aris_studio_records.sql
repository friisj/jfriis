-- ARIS: Studio project records (project, hypothesis, experiment, genesis idea, entity link)
-- RTS-style strategic command layer for multi-agent AI workflows

-- Studio project
INSERT INTO studio_projects (slug, name, description, status, temperature, problem_statement, success_criteria, current_focus, user_id)
VALUES (
  'aris',
  'ARIS',
  'RTS-style strategic command layer for multi-agent AI workflows. Surfaces agents as named, visible assets with persistent roles and real-time status — managed through a command-and-control interface inspired by real-time strategy game mechanics.',
  'draft',
  'warm',
  'Modern multi-agent AI systems suffer from runaway autonomy, invisible state, poor delegation, and ad-hoc governance. These are fundamentally interface problems that no current orchestration tool addresses at the UX layer.',
  'A working prototype interface where humans can delegate tasks to named agents, monitor their status in real time, interrupt or redirect mid-execution, and audit what each agent did — without losing context or control. Qualitative success: it feels like commanding, not prompting.',
  'Initial concept exploration — defining the RTS metaphor and its mapping to agent orchestration primitives',
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT (slug) DO NOTHING;

-- Hypothesis H1: RTS metaphor as governance interface
INSERT INTO studio_hypotheses (project_id, statement, validation_criteria, sequence, status)
VALUES (
  (SELECT id FROM studio_projects WHERE slug = 'aris'),
  'If AI agents are surfaced as named, visible strategic assets with persistent roles and real-time status — managed through a command-and-control interface inspired by RTS game mechanics — then humans can more effectively orchestrate complex multi-agent workflows with appropriate oversight and governance.',
  'Build a prototype interface and evaluate whether users can successfully delegate, interrupt, and redirect agents without losing context or control. Qualitative measure: does the interaction feel like commanding versus prompting?',
  1,
  'proposed'
)
ON CONFLICT DO NOTHING;

-- Experiment: Initial prototype
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
VALUES (
  (SELECT id FROM studio_projects WHERE slug = 'aris'),
  (SELECT id FROM studio_hypotheses WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'aris') AND sequence = 1),
  'aris-prototype',
  'ARIS Prototype',
  'Prototype command interface mapping RTS mechanics (unit selection, mission assignment, status visibility, interruption) onto multi-agent AI orchestration. Explores agent roster view, task delegation UI, real-time status, and audit trail.',
  'prototype',
  'planned'
)
ON CONFLICT (project_id, slug) DO NOTHING;

-- Genesis idea (log entry)
INSERT INTO log_entries (title, slug, content, entry_date, type, idea_stage, published, is_private, tags)
VALUES (
  'ARIS',
  'aris-genesis',
  '{"markdown": "Genesis idea for studio project: ARIS.\n\nModern multi-agent AI systems suffer from runaway autonomy, invisible state, poor delegation, and ad-hoc governance. These are fundamentally interface problems. ARIS explores whether an RTS-style command-and-control interface — where agents are surfaced as named, visible strategic assets — gives humans more effective governance over complex multi-agent workflows."}'::jsonb,
  '2026-02-22',
  'idea',
  'graduated',
  false,
  true,
  ARRAY['studio', 'genesis', 'ai', 'agents', 'interfaces']
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
WHERE sp.slug = 'aris' AND le.slug = 'aris-genesis'
ON CONFLICT DO NOTHING;
