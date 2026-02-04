-- Add image configuration options to cog_jobs
-- These control output resolution and aspect ratio for Gemini image generation

ALTER TABLE cog_jobs
ADD COLUMN image_size text DEFAULT '2K'
CHECK (image_size IN ('1K', '2K', '4K'));

ALTER TABLE cog_jobs
ADD COLUMN aspect_ratio text DEFAULT '1:1'
CHECK (aspect_ratio IN ('1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'));

COMMENT ON COLUMN cog_jobs.image_size IS 'Output image resolution: 1K (~1024px), 2K (~2048px), 4K (~4096px)';
COMMENT ON COLUMN cog_jobs.aspect_ratio IS 'Output image aspect ratio';
