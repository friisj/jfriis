-- ============================================================================
-- Migration: Cog Pipeline Multi-Stage Config Architecture
--
-- Creates 3 new config tables + 1 base candidates table.
-- Adds new columns to cog_jobs for two-phase execution.
-- ============================================================================

-- ============================================================================
-- 1. Photographer Configs
-- ============================================================================

CREATE TABLE cog_photographer_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES cog_series(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  style_description TEXT NOT NULL,
  style_references TEXT[],
  techniques TEXT NOT NULL DEFAULT '',
  testbed_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photographer_configs_series ON cog_photographer_configs(series_id);
CREATE INDEX idx_photographer_configs_user ON cog_photographer_configs(user_id);

ALTER TABLE cog_photographer_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY photographer_configs_admin ON cog_photographer_configs
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

-- ============================================================================
-- 2. Director Configs
-- ============================================================================

CREATE TABLE cog_director_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES cog_series(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  approach_description TEXT NOT NULL,
  methods TEXT NOT NULL DEFAULT '',
  interview_mapping JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_director_configs_series ON cog_director_configs(series_id);
CREATE INDEX idx_director_configs_user ON cog_director_configs(user_id);

ALTER TABLE cog_director_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY director_configs_admin ON cog_director_configs
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

-- ============================================================================
-- 3. Production Configs
-- ============================================================================

CREATE TABLE cog_production_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES cog_series(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  shoot_details TEXT NOT NULL DEFAULT '',
  editorial_notes TEXT NOT NULL DEFAULT '',
  costume_notes TEXT NOT NULL DEFAULT '',
  conceptual_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_production_configs_series ON cog_production_configs(series_id);
CREATE INDEX idx_production_configs_user ON cog_production_configs(user_id);

ALTER TABLE cog_production_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY production_configs_admin ON cog_production_configs
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

-- ============================================================================
-- 4. Pipeline Base Candidates
-- ============================================================================

CREATE TABLE cog_pipeline_base_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES cog_jobs(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES cog_images(id) ON DELETE CASCADE,
  candidate_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_base_candidates_job ON cog_pipeline_base_candidates(job_id);
CREATE INDEX idx_base_candidates_image ON cog_pipeline_base_candidates(image_id);

ALTER TABLE cog_pipeline_base_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY base_candidates_admin ON cog_pipeline_base_candidates
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

-- ============================================================================
-- 5. Alter cog_jobs: Add config references, inference controls, two-phase state
-- ============================================================================

ALTER TABLE cog_jobs
  ADD COLUMN photographer_config_id UUID REFERENCES cog_photographer_configs(id) ON DELETE SET NULL,
  ADD COLUMN director_config_id UUID REFERENCES cog_director_configs(id) ON DELETE SET NULL,
  ADD COLUMN production_config_id UUID REFERENCES cog_production_configs(id) ON DELETE SET NULL,
  ADD COLUMN inference_model TEXT DEFAULT 'gemini-2.0-flash-thinking-exp',
  ADD COLUMN use_thinking_infer4 BOOLEAN DEFAULT true,
  ADD COLUMN use_thinking_infer6 BOOLEAN DEFAULT true,
  ADD COLUMN max_reference_images INTEGER DEFAULT 3,
  ADD COLUMN num_base_images INTEGER DEFAULT 3,
  ADD COLUMN selected_base_image_id UUID REFERENCES cog_images(id) ON DELETE SET NULL,
  ADD COLUMN foundation_status TEXT DEFAULT 'pending',
  ADD COLUMN sequence_status TEXT DEFAULT 'pending',
  ADD COLUMN colors TEXT[],
  ADD COLUMN themes TEXT[];

CREATE INDEX idx_jobs_photographer_config ON cog_jobs(photographer_config_id);
CREATE INDEX idx_jobs_director_config ON cog_jobs(director_config_id);
CREATE INDEX idx_jobs_production_config ON cog_jobs(production_config_id);
CREATE INDEX idx_jobs_selected_base ON cog_jobs(selected_base_image_id);
