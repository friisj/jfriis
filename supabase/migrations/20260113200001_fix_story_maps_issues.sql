-- Fix story_releases table to have updated_at for BaseRecord consistency
-- This addresses HIGH-4 from tech review

-- Add updated_at column to story_releases
ALTER TABLE story_releases
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Add updated_at trigger for story_releases
CREATE TRIGGER update_story_releases_updated_at
  BEFORE UPDATE ON story_releases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
