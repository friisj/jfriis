-- Cog Remix: Stock photo sourcing + augmentation job type
-- Phase 0: Config, Phase 1: Source, Phase 2: Augment (stubbed)

-- Main remix job record
CREATE TABLE cog_remix_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES cog_series(id) ON DELETE CASCADE,
  title TEXT,
  story TEXT NOT NULL,
  topics TEXT[] DEFAULT '{}',
  colors TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'running', 'completed', 'failed', 'cancelled')),
  source_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (source_status IN ('pending', 'running', 'completed', 'failed')),
  augment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (augment_status IN ('pending', 'running', 'completed', 'failed')),
  selected_image_id UUID REFERENCES cog_images(id) ON DELETE SET NULL,
  target_aspect_ratio TEXT,
  target_colors TEXT[] DEFAULT '{}',
  trace JSONB DEFAULT '[]',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_cog_remix_jobs_series ON cog_remix_jobs(series_id);
CREATE INDEX idx_cog_remix_jobs_status ON cog_remix_jobs(status);

-- Updated_at trigger
CREATE TRIGGER update_cog_remix_jobs_updated_at
  BEFORE UPDATE ON cog_remix_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Search iterations: one per search attempt (max 3)
CREATE TABLE cog_remix_search_iterations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES cog_remix_jobs(id) ON DELETE CASCADE,
  iteration_number INT NOT NULL,
  search_params JSONB NOT NULL DEFAULT '{}',
  llm_reasoning TEXT,
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cog_remix_iterations_job ON cog_remix_search_iterations(job_id);

-- Candidates: each stock photo result with vision evaluation
CREATE TABLE cog_remix_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES cog_remix_jobs(id) ON DELETE CASCADE,
  iteration_id UUID NOT NULL REFERENCES cog_remix_search_iterations(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('unsplash', 'pexels')),
  source_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  photographer TEXT,
  photographer_url TEXT,
  width INT,
  height INT,
  eval_score FLOAT,
  eval_reasoning TEXT,
  selected BOOLEAN DEFAULT FALSE,
  image_id UUID REFERENCES cog_images(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cog_remix_candidates_job ON cog_remix_candidates(job_id);
CREATE INDEX idx_cog_remix_candidates_iteration ON cog_remix_candidates(iteration_id);

-- Augment steps: Phase 2 processing steps (stubbed for now)
CREATE TABLE cog_remix_augment_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES cog_remix_jobs(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  step_type TEXT NOT NULL
    CHECK (step_type IN ('color_grade', 'crop', 'reframe', 'upscale', 'creative')),
  config JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  input_image_id UUID REFERENCES cog_images(id) ON DELETE SET NULL,
  output_image_id UUID REFERENCES cog_images(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cog_remix_augment_steps_job ON cog_remix_augment_steps(job_id);

-- RLS: admin-only (same pattern as all cog tables)
ALTER TABLE cog_remix_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cog_remix_search_iterations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cog_remix_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cog_remix_augment_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to cog_remix_jobs"
  ON cog_remix_jobs FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to cog_remix_search_iterations"
  ON cog_remix_search_iterations FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to cog_remix_candidates"
  ON cog_remix_candidates FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to cog_remix_augment_steps"
  ON cog_remix_augment_steps FOR ALL USING (is_admin());
