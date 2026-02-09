-- Add thumbnail storage paths to cog_images table
-- These store WebP versions at different resolutions for optimal performance

ALTER TABLE cog_images
  ADD COLUMN thumbnail_256 TEXT, -- 256x256 for grid views
  ADD COLUMN thumbnail_128 TEXT, -- 128x128 for group drawers
  ADD COLUMN thumbnail_64 TEXT;  -- 64x64 for tiny previews

-- Add comment explaining the thumbnail system
COMMENT ON COLUMN cog_images.thumbnail_256 IS 'Storage path for 256x256 WebP thumbnail (grid display)';
COMMENT ON COLUMN cog_images.thumbnail_128 IS 'Storage path for 128x128 WebP thumbnail (group drawers)';
COMMENT ON COLUMN cog_images.thumbnail_64 IS 'Storage path for 64x64 WebP thumbnail (tiny previews)';

-- Index for efficient thumbnail lookups (optional, useful if we query by thumbnail existence)
CREATE INDEX idx_cog_images_thumbnails ON cog_images(thumbnail_256) WHERE thumbnail_256 IS NOT NULL;
