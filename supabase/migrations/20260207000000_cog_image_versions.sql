-- Migration: Add image versioning support to cog_images
-- Parent-child chain model: refined images point to their source

ALTER TABLE cog_images
  ADD COLUMN parent_image_id UUID REFERENCES cog_images(id) ON DELETE SET NULL;

-- Index for finding child versions of an image
CREATE INDEX idx_cog_images_parent ON cog_images(parent_image_id);

-- Index for efficiently querying root images (no parent)
CREATE INDEX idx_cog_images_root ON cog_images(series_id) WHERE parent_image_id IS NULL;

COMMENT ON COLUMN cog_images.parent_image_id IS 'References the parent image this was refined from. NULL for original/root images.';
