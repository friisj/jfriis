-- ============================================================================
-- Migration: Calibration Seed Management
--
-- Moves photographer types + seed configs to a database table so new types
-- and seed images can be managed from the UI without code changes.
-- ============================================================================

-- 1. Create the calibration seeds table
CREATE TABLE IF NOT EXISTS cog_calibration_seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  seed_subject TEXT NOT NULL,
  seed_image_path TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calibration_seeds_position
  ON cog_calibration_seeds (position);

-- 2. Seed with the 7 existing types
INSERT INTO cog_calibration_seeds (type_key, label, seed_subject, seed_image_path, position) VALUES
  ('portrait',   'Portrait',    'Close-up portrait of a woman with auburn hair, neutral expression, soft directional light, clean background',                                       'calibration-seeds/portrait.jpg',   0),
  ('fashion',    'Fashion',     'Full-body fashion photograph of a model in a tailored black coat, editorial pose, studio setting',                                                   'calibration-seeds/fashion.jpg',    1),
  ('editorial',  'Editorial',   'Editorial photograph of a CEO standing in a glass-walled corner office, city skyline behind, late afternoon light',                                  'calibration-seeds/editorial.jpg',  2),
  ('street',     'Street',      'Street photograph of a musician playing saxophone on a rain-wet sidewalk at dusk, neon reflections',                                                 'calibration-seeds/street.jpg',     3),
  ('landscape',  'Landscape',   'Dramatic landscape of coastal cliffs at golden hour, waves crashing below, clouds streaked with light',                                              'calibration-seeds/landscape.jpg',  4),
  ('fine_art',   'Fine Art',    'Fine art photograph of a dancer mid-leap in an empty white gallery, motion blur on extremities, sharp torso',                                        'calibration-seeds/fine_art.jpg',   5),
  ('commercial', 'Commercial',  'Commercial product photograph of a luxury watch on a dark slate surface, single hard light source, precise reflections',                             'calibration-seeds/commercial.jpg', 6)
ON CONFLICT (type_key) DO NOTHING;

-- 3. Drop the CHECK constraint on cog_photographer_configs.type
-- so new types can be added dynamically from the UI
ALTER TABLE cog_photographer_configs
  DROP CONSTRAINT IF EXISTS cog_photographer_configs_type_check;

-- 4. RLS: admin-only (same pattern as benchmark tables)
ALTER TABLE cog_calibration_seeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on calibration seeds"
  ON cog_calibration_seeds FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
