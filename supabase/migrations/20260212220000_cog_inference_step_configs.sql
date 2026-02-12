-- Add per-step inference pipeline overrides to cog_jobs
-- Null = all defaults (backward compatible)
ALTER TABLE cog_jobs ADD COLUMN IF NOT EXISTS inference_step_configs jsonb DEFAULT NULL;
