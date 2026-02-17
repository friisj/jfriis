-- Seed Verbivore as a studio project with hypothesis and experiments

-- Studio project (user_id set to first user in system, matching other studio project seeds)
INSERT INTO studio_projects (slug, name, description, status, temperature, problem_statement, success_criteria, current_focus, user_id)
VALUES (
  'verbivore',
  'Verbivore',
  'AI-assisted glossary publishing platform. Create, curate, and publish glossary entries with AI-powered content generation, term management, and editorial workflows.',
  'active',
  'warm',
  'Publishing high-quality glossary content is time-intensive: researching terms, writing definitions, creating etymologies, and maintaining editorial consistency across entries.',
  'Functional glossary management with AI-assisted content generation for entries, terms, definitions, and editorial splitting.',
  'Core platform migration and AI content generation',
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  temperature = EXCLUDED.temperature,
  problem_statement = EXCLUDED.problem_statement,
  success_criteria = EXCLUDED.success_criteria,
  current_focus = EXCLUDED.current_focus;

-- Hypothesis
INSERT INTO studio_hypotheses (project_id, statement, validation_criteria, sequence, status)
VALUES (
  (SELECT id FROM studio_projects WHERE slug = 'verbivore'),
  'If we integrate AI content generation into the glossary editorial workflow, then we can produce higher-quality entries faster because AI handles research-heavy tasks (definitions, etymology, pronunciation) while the editor focuses on curation and narrative.',
  'AI-generated definitions are accepted without major edits >70% of the time. Entry creation time drops by >50% compared to fully manual process.',
  1,
  'testing'
)
ON CONFLICT DO NOTHING;

-- Experiments
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
VALUES
  (
    (SELECT id FROM studio_projects WHERE slug = 'verbivore'),
    (SELECT id FROM studio_hypotheses WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'verbivore') LIMIT 1),
    'core-platform',
    'Core Platform',
    'Entry and term CRUD, categories, publishing workflow, and the foundational data model for glossary management.',
    'prototype',
    'in_progress'
  ),
  (
    (SELECT id FROM studio_projects WHERE slug = 'verbivore'),
    (SELECT id FROM studio_hypotheses WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'verbivore') LIMIT 1),
    'ai-content-gen',
    'AI Content Generation',
    'AI-generated entry content and term definitions using style guides and contextual prompts.',
    'experiment',
    'in_progress'
  ),
  (
    (SELECT id FROM studio_projects WHERE slug = 'verbivore'),
    (SELECT id FROM studio_hypotheses WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'verbivore') LIMIT 1),
    'style-system',
    'Style Guide System',
    'Customizable AI prompt templates with evaluation criteria (accuracy, whimsy, formality, creativity, etc.) for consistent content generation.',
    'experiment',
    'in_progress'
  ),
  (
    (SELECT id FROM studio_projects WHERE slug = 'verbivore'),
    (SELECT id FROM studio_hypotheses WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'verbivore') LIMIT 1),
    'entry-splitting',
    'Entry Splitting',
    'AI analysis of long entries to suggest optimal splitting strategies, then execute splits with automatic relationship tracking.',
    'experiment',
    'planned'
  ),
  (
    (SELECT id FROM studio_projects WHERE slug = 'verbivore'),
    (SELECT id FROM studio_hypotheses WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'verbivore') LIMIT 1),
    'public-reader',
    'Public Reader',
    'Public-facing glossary reading experience using the verbivore_public_entries and verbivore_public_terms views.',
    'prototype',
    'planned'
  )
ON CONFLICT (project_id, slug) DO NOTHING;
