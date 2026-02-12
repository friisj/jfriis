-- Add per-image routing configs to pipeline jobs
ALTER TABLE cog_jobs ADD COLUMN IF NOT EXISTS reference_image_configs jsonb DEFAULT NULL;

-- Extend image source to include stock photo providers
ALTER TABLE cog_images DROP CONSTRAINT cog_images_source_check;
ALTER TABLE cog_images ADD CONSTRAINT cog_images_source_check
  CHECK (source IN ('upload', 'generated', 'unsplash', 'pexels'));
