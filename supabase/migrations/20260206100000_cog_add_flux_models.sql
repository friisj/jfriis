-- Add Flux 2 models to image_model constraint
-- Flux 2 Pro: Up to 8 reference images, 4MP resolution
-- Flux 2 Dev: Up to 5 reference images, 2MP resolution, faster

-- Drop the existing constraint
ALTER TABLE cog_jobs DROP CONSTRAINT IF EXISTS cog_jobs_image_model_check;

-- Add updated constraint with Flux models
ALTER TABLE cog_jobs
ADD CONSTRAINT cog_jobs_image_model_check
CHECK (image_model IN ('auto', 'imagen-4', 'imagen-3-capability', 'gemini-3-pro-image', 'flux-2-pro', 'flux-2-dev'));

-- Update the comment to include Flux models
COMMENT ON COLUMN cog_jobs.image_model IS 'Image generation model: auto (recommended), flux-2-pro (up to 8 refs, 4MP), flux-2-dev (up to 5 refs, 2MP, fast), gemini-3-pro-image (up to 14 refs, 4K), imagen-4 (text-only), imagen-3-capability (up to 4 refs)';
