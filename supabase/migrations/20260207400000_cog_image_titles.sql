-- Migration: Add title to cog_images
-- Purpose: Allow custom image titles, defaulting to filename

-- 1. Add the title column (nullable, defaults to null which means use filename)
ALTER TABLE cog_images ADD COLUMN IF NOT EXISTS title TEXT;

-- 2. No backfill needed - null title means "use filename as display name"
