-- Add inference_log column to cog_jobs for storing the 6-step inference
-- pipeline outputs with token counts and timing for each step.
-- Populated incrementally during the foundation phase.

ALTER TABLE cog_jobs
ADD COLUMN IF NOT EXISTS inference_log jsonb DEFAULT NULL;
