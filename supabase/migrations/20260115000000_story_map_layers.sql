-- Story Map Layers
-- Named rows for story maps representing actors/system layers
-- Part of Phase 2: Canvas Enhancements

-- ============================================================================
-- STORY MAP LAYERS (Rows)
-- ============================================================================

CREATE TABLE story_map_layers (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_map_id UUID NOT NULL REFERENCES story_maps(id) ON DELETE CASCADE,

  -- Layer Info
  name TEXT NOT NULL,
  description TEXT,
  sequence INTEGER NOT NULL,

  -- Layer Type (customer, internal_agent, ai_agent, platform, api, etc.)
  layer_type TEXT,

  -- Optional link to customer profile (for customer-type layers)
  customer_profile_id UUID REFERENCES customer_profiles(id) ON DELETE SET NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_layer_sequence UNIQUE (story_map_id, sequence)
);

-- Indexes
CREATE INDEX idx_story_map_layers_story_map ON story_map_layers(story_map_id);
CREATE INDEX idx_story_map_layers_sequence ON story_map_layers(story_map_id, sequence);
CREATE INDEX idx_story_map_layers_layer_type ON story_map_layers(layer_type);
CREATE INDEX idx_story_map_layers_customer_profile ON story_map_layers(customer_profile_id);

-- Updated_at trigger
CREATE TRIGGER update_story_map_layers_updated_at
  BEFORE UPDATE ON story_map_layers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ADD LAYER FK TO USER STORIES
-- ============================================================================

-- Add layer_id column (nullable to preserve backward compat with vertical_position)
ALTER TABLE user_stories
  ADD COLUMN layer_id UUID REFERENCES story_map_layers(id) ON DELETE SET NULL;

-- Index for layer lookups
CREATE INDEX idx_user_stories_layer ON user_stories(layer_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE story_map_layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read story map layers"
  ON story_map_layers FOR SELECT
  USING (true);

CREATE POLICY "Admin users can create story map layers"
  ON story_map_layers FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can update story map layers"
  ON story_map_layers FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can delete story map layers"
  ON story_map_layers FOR DELETE
  USING (is_admin());

-- ============================================================================
-- ENTITY_LINKS CLEANUP TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_story_map_layer_entity_links()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM entity_links
  WHERE (source_type = 'story_map_layer' AND source_id = OLD.id)
     OR (target_type = 'story_map_layer' AND target_id = OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_story_map_layer_links
  AFTER DELETE ON story_map_layers
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_story_map_layer_entity_links();
