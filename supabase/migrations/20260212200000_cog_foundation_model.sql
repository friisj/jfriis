-- Add foundation_model column to cog_jobs for controlling which image model
-- generates base candidates during the foundation phase.
-- Defaults to 'gemini-3-pro-image' which supports I2I with reference images.

ALTER TABLE cog_jobs
ADD COLUMN IF NOT EXISTS foundation_model text NOT NULL DEFAULT 'gemini-3-pro-image';
