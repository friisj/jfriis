-- Cog Thinking Jobs: simple 3-step linear chain (story -> subject -> creative direction -> image)
CREATE TABLE cog_thinking_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES cog_series(id) ON DELETE CASCADE,
  title TEXT,

  -- Inputs
  story TEXT NOT NULL,
  photographer TEXT NOT NULL,
  publication TEXT NOT NULL,
  aspect_ratio TEXT,
  image_size TEXT DEFAULT '2K',
  style_hints TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft',

  -- Step outputs (written progressively during execution)
  derived_subject TEXT,
  subject_thinking TEXT,
  creative_direction TEXT,
  direction_thinking TEXT,
  generation_prompt TEXT,

  -- Result
  generated_image_id UUID REFERENCES cog_images(id) ON DELETE SET NULL,

  -- Execution tracking
  trace JSONB[] DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE cog_thinking_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access" ON cog_thinking_jobs
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Indexes
CREATE INDEX idx_thinking_jobs_series ON cog_thinking_jobs(series_id);
CREATE INDEX idx_thinking_jobs_status ON cog_thinking_jobs(status);
