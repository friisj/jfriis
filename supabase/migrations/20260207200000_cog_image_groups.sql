-- Migration: Add group_id to cog_images
-- Purpose: Replace implicit version chains (parent_image_id traversal) with explicit grouping

-- 1. Add the group_id column
ALTER TABLE cog_images ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES cog_images(id);

-- 2. Backfill: Find root of each image's chain and set as group_id
WITH RECURSIVE chain AS (
  -- Base case: images with no parent are their own root
  SELECT id, id AS root_id
  FROM cog_images
  WHERE parent_image_id IS NULL

  UNION ALL

  -- Recursive case: inherit root from parent
  SELECT c.id, ch.root_id
  FROM cog_images c
  JOIN chain ch ON c.parent_image_id = ch.id
)
UPDATE cog_images
SET group_id = chain.root_id
FROM chain
WHERE cog_images.id = chain.id
  AND cog_images.group_id IS NULL;

-- 3. Set default for new images (self-referential - they start their own group)
-- Note: This uses a trigger since DEFAULT can't reference the row's own id
CREATE OR REPLACE FUNCTION set_cog_image_default_group_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If group_id not provided, use the image's own id (new group)
  IF NEW.group_id IS NULL THEN
    NEW.group_id := NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cog_images_set_default_group_id ON cog_images;
CREATE TRIGGER cog_images_set_default_group_id
  BEFORE INSERT ON cog_images
  FOR EACH ROW
  EXECUTE FUNCTION set_cog_image_default_group_id();

-- 4. Add index for efficient group queries
CREATE INDEX IF NOT EXISTS idx_cog_images_group_id ON cog_images(group_id);
