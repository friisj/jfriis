-- Chalk experiment decomposition: break monolithic experiments into 6 discrete spikes.
-- Adds 4 new experiments, renames 1, deletes 1, creates 6 spike assets with entity links,
-- and links the existing Chalk App prototype asset to the tldraw-canvas experiment.

-- ============================================================================
-- Step 1: Add new experiments
-- ============================================================================

-- wireframe-renderer: demonstrates the wireframe schema and 7 component renderers
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
SELECT
  sp.id,
  sh.id,
  'wireframe-renderer',
  'Wireframe Schema & Renderer',
  'Demonstrates the wireframe component schema and all 7 lo-fi renderers (container, text, button, input, list, image, divider).',
  'prototype',
  'in_progress'
FROM studio_projects sp
JOIN studio_hypotheses sh ON sh.project_id = sp.id
WHERE sp.slug = 'chalk'
LIMIT 1;

-- annotation-markup: unified annotation canvas with rect, freehand, and text tools
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
SELECT
  sp.id,
  sh.id,
  'annotation-markup',
  'Annotation & Markup System',
  'Multi-tool annotation canvas supporting rectangle, freehand, and text annotations with screenshot capture.',
  'prototype',
  'in_progress'
FROM studio_projects sp
JOIN studio_hypotheses sh ON sh.project_id = sp.id
WHERE sp.slug = 'chalk'
LIMIT 1;

-- voice-annotation: voice-annotated rectangles with Deepgram transcription
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
SELECT
  sp.id,
  sh.id,
  'voice-annotation',
  'Voice Annotation & Transcription',
  'Draw rectangles while recording voice annotations. Audio transcribed via Deepgram for AI interpretation.',
  'prototype',
  'in_progress'
FROM studio_projects sp
JOIN studio_hypotheses sh ON sh.project_id = sp.id
WHERE sp.slug = 'chalk'
LIMIT 1;

-- vision-iteration: Claude vision iteration from markup screenshots
INSERT INTO studio_experiments (project_id, hypothesis_id, slug, name, description, type, status)
SELECT
  sp.id,
  sh.id,
  'vision-iteration',
  'Claude Vision Iteration',
  'Captures annotated wireframe screenshots and sends them to Claude vision API for intelligent iteration.',
  'prototype',
  'in_progress'
FROM studio_projects sp
JOIN studio_hypotheses sh ON sh.project_id = sp.id
WHERE sp.slug = 'chalk'
LIMIT 1;

-- ============================================================================
-- Step 2: Update existing experiments
-- ============================================================================

-- Rename ai-wireframe-generation → ai-generation for consistency
UPDATE studio_experiments
SET slug = 'ai-generation', name = 'AI Wireframe Generation'
WHERE slug = 'ai-wireframe-generation'
  AND project_id = (SELECT id FROM studio_projects WHERE slug = 'chalk');

-- Delete markup-voice-iteration (replaced by annotation-markup, voice-annotation, vision-iteration)
DELETE FROM studio_experiments
WHERE slug = 'markup-voice-iteration'
  AND project_id = (SELECT id FROM studio_projects WHERE slug = 'chalk');

-- ============================================================================
-- Step 3: Create spike assets for all 6 experiments
-- ============================================================================

INSERT INTO studio_asset_spikes (project_id, slug, name, description, component_key)
SELECT sp.id, v.slug, v.name, v.description, v.component_key
FROM studio_projects sp
CROSS JOIN (VALUES
  ('wireframe-renderer',  'Wireframe Schema & Renderer',       'Static demo of all 7 wireframe component types with sample data.',            'chalk/wireframe-renderer'),
  ('tldraw-canvas',       'Tldraw Canvas Integration',         'Standalone tldraw canvas with custom wireframe shapes (Button, Input, Container, Form).', 'chalk/tldraw-canvas'),
  ('ai-generation',       'AI Wireframe Generation',           'Chat-driven wireframe generation with multi-option selection.',               'chalk/ai-generation'),
  ('annotation-markup',   'Annotation & Markup System',        'Multi-tool annotation canvas with rectangle, freehand, and text tools.',      'chalk/annotation-markup'),
  ('voice-annotation',    'Voice Annotation & Transcription',  'Voice-annotated rectangles with Deepgram real-time transcription.',           'chalk/voice-annotation'),
  ('vision-iteration',    'Claude Vision Iteration',           'Markup screenshot → Claude vision API for intelligent wireframe iteration.',  'chalk/vision-iteration')
) AS v(slug, name, description, component_key)
WHERE sp.slug = 'chalk';

-- ============================================================================
-- Step 4: Create entity links (experiment → spike asset) for all 6
-- ============================================================================

INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type, metadata)
SELECT 'experiment', e.id, 'asset_spike', s.id, 'contains', '{}'::jsonb
FROM studio_experiments e
JOIN studio_asset_spikes s ON s.project_id = e.project_id AND s.slug = e.slug
JOIN studio_projects sp ON sp.id = e.project_id
WHERE sp.slug = 'chalk'
  AND e.slug IN ('wireframe-renderer', 'tldraw-canvas', 'ai-generation', 'annotation-markup', 'voice-annotation', 'vision-iteration');

-- ============================================================================
-- Step 5: Link Chalk App prototype asset to tldraw-canvas experiment
-- ============================================================================

INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type, metadata)
SELECT 'experiment', e.id, 'asset_prototype', ap.id, 'contains', '{}'::jsonb
FROM studio_experiments e
JOIN studio_projects sp ON e.project_id = sp.id
JOIN studio_asset_prototypes ap ON ap.project_id = sp.id AND ap.slug = 'chalk'
WHERE sp.slug = 'chalk' AND e.slug = 'tldraw-canvas';
