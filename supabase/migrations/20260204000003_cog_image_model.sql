-- Add image_model column to cog_jobs table
-- Allows selection of which image generation model to use

ALTER TABLE cog_jobs
ADD COLUMN image_model text DEFAULT 'auto'
CHECK (image_model IN ('auto', 'imagen-4', 'imagen-3-capability', 'gemini-3-pro-image'));

COMMENT ON COLUMN cog_jobs.image_model IS 'Image generation model: auto (recommended), imagen-4 (text-only), imagen-3-capability (up to 4 refs), gemini-3-pro-image (up to 14 refs, 4K)';
