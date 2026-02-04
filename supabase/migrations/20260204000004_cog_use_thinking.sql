-- Add use_thinking column to cog_jobs table
-- Enables thinking mode for Gemini 3 Pro Image to reason about composition

ALTER TABLE cog_jobs
ADD COLUMN use_thinking boolean DEFAULT false;

COMMENT ON COLUMN cog_jobs.use_thinking IS 'Enable thinking mode for Gemini image generation to reason about composition, style, and photorealism';
