-- Cog: Job input images for image-to-image generation
-- Reference images used as inputs for generation jobs

CREATE TABLE cog_job_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES cog_jobs(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES cog_images(id) ON DELETE CASCADE,
  reference_id INTEGER NOT NULL, -- [1], [2], etc. (max 4)
  context TEXT, -- optional per-image instructions
  negative_prompt TEXT, -- what to avoid for this image
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, reference_id),
  CONSTRAINT reference_id_range CHECK (reference_id >= 1 AND reference_id <= 4)
);

-- Indexes
CREATE INDEX idx_cog_job_inputs_job ON cog_job_inputs(job_id);
CREATE INDEX idx_cog_job_inputs_image ON cog_job_inputs(image_id);

-- RLS
ALTER TABLE cog_job_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to cog_job_inputs"
  ON cog_job_inputs FOR ALL
  USING (is_admin());

-- Add negative_prompt to jobs table for global negative prompts
ALTER TABLE cog_jobs ADD COLUMN negative_prompt TEXT;
