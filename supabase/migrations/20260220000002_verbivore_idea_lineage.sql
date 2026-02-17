-- Create genesis idea for Verbivore studio project and link via entity_links
-- This establishes idea lineage so the project is traceable from the ideas pipeline

-- Genesis idea
INSERT INTO log_entries (title, slug, content, entry_date, type, idea_stage, published, is_private, tags)
VALUES (
  'Verbivore',
  'verbivore-genesis',
  '{"markdown": "Genesis idea for studio project: Verbivore.\n\nPublishing high-quality glossary content is time-intensive: researching terms, writing definitions, creating etymologies, and maintaining editorial consistency across entries. AI can meaningfully accelerate this by handling research-heavy tasks while the editor focuses on curation and narrative.\n\nMigrated from standalone repo into jfriis as a studio project with 10 database tables, 6 AI actions, and a dedicated route tree."}'::jsonb,
  '2026-02-16',
  'idea',
  'graduated',
  false,
  true,
  ARRAY['studio', 'genesis', 'ai', 'glossary']
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
WHERE sp.slug = 'verbivore' AND le.slug = 'verbivore-genesis'
ON CONFLICT DO NOTHING;
