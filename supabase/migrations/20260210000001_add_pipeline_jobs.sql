-- Add pipeline job support to Cog
-- Migration: 20260210000001_add_pipeline_jobs.sql

-- Style guides table: reusable system prompts for pipeline jobs
CREATE TABLE cog_style_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES cog_series(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_style_guides_series_id ON cog_style_guides(series_id);
CREATE INDEX idx_style_guides_user_id ON cog_style_guides(user_id);

-- Add pipeline support to existing cog_jobs table
ALTER TABLE cog_jobs
  ADD COLUMN job_type TEXT DEFAULT 'batch' CHECK (job_type IN ('batch', 'pipeline')),
  ADD COLUMN style_guide_id UUID REFERENCES cog_style_guides(id) ON DELETE SET NULL,
  ADD COLUMN initial_images JSONB; -- array of image URLs/IDs for pipeline input

CREATE INDEX idx_jobs_job_type ON cog_jobs(job_type);
CREATE INDEX idx_jobs_style_guide_id ON cog_jobs(style_guide_id);

-- Pipeline steps: sequential operations in a pipeline job (renamed to avoid conflict with existing cog_job_steps)
CREATE TABLE cog_pipeline_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES cog_jobs(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('generate', 'refine', 'inpaint', 'eval', 'upscale')),
  model TEXT NOT NULL,
  config JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_pipeline_step_order UNIQUE(job_id, step_order)
);

CREATE INDEX idx_pipeline_steps_job_id ON cog_pipeline_steps(job_id);
CREATE INDEX idx_pipeline_steps_status ON cog_pipeline_steps(status);
CREATE INDEX idx_pipeline_steps_order ON cog_pipeline_steps(job_id, step_order);

-- Step outputs: one image output per step (linear pipeline)
CREATE TABLE cog_pipeline_step_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES cog_pipeline_steps(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES cog_images(id) ON DELETE CASCADE,
  metadata JSONB, -- eval scores, generation params, etc
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_pipeline_step_output UNIQUE(step_id)
);

CREATE INDEX idx_pipeline_step_outputs_step_id ON cog_pipeline_step_outputs(step_id);
CREATE INDEX idx_pipeline_step_outputs_image_id ON cog_pipeline_step_outputs(image_id);

-- RLS Policies for cog_style_guides
ALTER TABLE cog_style_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage style guides"
  ON cog_style_guides FOR ALL
  USING (is_admin());

-- RLS Policies for cog_pipeline_steps
ALTER TABLE cog_pipeline_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage pipeline steps"
  ON cog_pipeline_steps FOR ALL
  USING (is_admin());

-- RLS Policies for cog_pipeline_step_outputs
ALTER TABLE cog_pipeline_step_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage pipeline step outputs"
  ON cog_pipeline_step_outputs FOR ALL
  USING (is_admin());

-- Add comments for documentation
COMMENT ON TABLE cog_style_guides IS 'Reusable style guides (system prompts) for pipeline jobs';
COMMENT ON TABLE cog_pipeline_steps IS 'Sequential steps in a pipeline job (generate, refine, inpaint, eval, upscale)';
COMMENT ON TABLE cog_pipeline_step_outputs IS 'Output images from each pipeline step (one per step for linear pipeline)';
COMMENT ON COLUMN cog_jobs.job_type IS 'Job type: batch (parallel generation) or pipeline (sequential steps)';
COMMENT ON COLUMN cog_jobs.initial_images IS 'Input images for pipeline jobs (array of URLs or image IDs)';
COMMENT ON COLUMN cog_pipeline_steps.config IS 'Step-specific configuration (prompts, masks, eval criteria, model params)';
COMMENT ON COLUMN cog_pipeline_steps.step_type IS 'Step operation: generate (initial), refine (img2img), inpaint, eval (vision model), upscale';
