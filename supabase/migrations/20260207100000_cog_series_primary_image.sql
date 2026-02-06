-- Add primary_image_id to cog_series for version management
-- When set, this image is displayed in the grid instead of the root

ALTER TABLE cog_series
ADD COLUMN primary_image_id uuid REFERENCES cog_images(id) ON DELETE SET NULL;

-- Add index for lookups
CREATE INDEX idx_cog_series_primary_image ON cog_series(primary_image_id) WHERE primary_image_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN cog_series.primary_image_id IS 'The primary/default image to display for this series. If null, shows the root image.';
