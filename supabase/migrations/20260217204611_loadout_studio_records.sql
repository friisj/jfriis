-- Loadout: Studio project records (project, hypothesis, experiments, genesis idea, entity link)
-- Camping/outdoor gear inventory manager — no application-specific tables (uses localStorage)

-- Studio project
INSERT INTO studio_projects (slug, name, description, status, temperature, problem_statement, success_criteria, user_id)
VALUES (
  'loadout',
  'Loadout',
  'Camping and outdoor gear inventory management application. Track items with metadata (weight, price, condition), organize into collections, manage trip lifecycles with gear check-in/out, and handle purchase requests for lost or damaged items.',
  'active',
  'cold',
  'Outdoor enthusiasts lack a lightweight tool to track what gear they own, organize it into trip-ready collections, and manage the lifecycle of items through trips — including tracking what gets damaged or lost and needs replacement.',
  'Working inventory app with item tracking, collection management, trip gear check-in/out workflow, and automatic purchase request generation for lost items.',
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT (slug) DO NOTHING;

-- Hypothesis
INSERT INTO studio_hypotheses (project_id, statement, validation_criteria, sequence, status)
SELECT
  sp.id,
  'A browser-based gear inventory with collection grouping and trip check-in/out workflow is sufficient to manage outdoor gear for a solo user without backend infrastructure',
  'User can track 50+ items across multiple collections, run 5+ trips with full check-in/out lifecycle, and purchase requests auto-generate for lost items — all via localStorage',
  1,
  'testing'
FROM studio_projects sp WHERE sp.slug = 'loadout';

-- Experiment 1: Item inventory
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
SELECT
  sp.id,
  sh.id,
  'item-inventory',
  'Item Inventory',
  'Core CRUD for gear items with search, filter, category, tags, weight, price, condition tracking, and status lifecycle',
  'prototype',
  'in_progress'
FROM studio_projects sp
JOIN studio_hypotheses sh ON sh.project_id = sp.id AND sh.sequence = 1
WHERE sp.slug = 'loadout';

-- Experiment 2: Collections
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
SELECT
  sp.id,
  sh.id,
  'collections',
  'Collections',
  'Named, color-coded groupings of items (e.g., Ultralight Backpacking, Car Camping) with weight/value totals and inline item management',
  'prototype',
  'in_progress'
FROM studio_projects sp
JOIN studio_hypotheses sh ON sh.project_id = sp.id AND sh.sequence = 1
WHERE sp.slug = 'loadout';

-- Experiment 3: Trip workflow
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
SELECT
  sp.id,
  sh.id,
  'trip-workflow',
  'Trip Workflow',
  'Full trip lifecycle (planning → packing → active → unpacking → completed) with gear check-out/check-in, condition tracking, and automatic purchase request generation for lost items',
  'prototype',
  'in_progress'
FROM studio_projects sp
JOIN studio_hypotheses sh ON sh.project_id = sp.id AND sh.sequence = 1
WHERE sp.slug = 'loadout';

-- Genesis idea
INSERT INTO log_entries (title, slug, content, type, idea_stage, published, entry_date, studio_project_id)
SELECT
  'Loadout: Gear inventory for outdoor trips',
  'loadout-genesis',
  '{"markdown": "A lightweight browser tool for managing outdoor gear inventory. Core insight: the trip check-in/out workflow is the natural point where gear condition gets assessed and replacements get triggered. Collections serve as reusable packing templates. localStorage-first for zero-friction single-user operation."}'::jsonb,
  'idea',
  'graduated',
  false,
  '2025-08-01',
  sp.id
FROM studio_projects sp WHERE sp.slug = 'loadout'
ON CONFLICT (slug) DO NOTHING;

-- Entity link: project evolved from genesis idea
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type)
SELECT
  'studio_project', sp.id,
  'log_entry', le.id,
  'evolved_from'
FROM studio_projects sp, log_entries le
WHERE sp.slug = 'loadout' AND le.slug = 'loadout-genesis'
ON CONFLICT DO NOTHING;
