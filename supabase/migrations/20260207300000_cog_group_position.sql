-- Migration: Add group_position to cog_images
-- Purpose: Allow manual ordering of images within a group

-- 1. Add the group_position column (nullable, NULL means order by created_at)
ALTER TABLE cog_images ADD COLUMN IF NOT EXISTS group_position INTEGER;

-- 2. Add index for efficient ordering within groups
CREATE INDEX IF NOT EXISTS idx_cog_images_group_position ON cog_images(group_id, group_position);
