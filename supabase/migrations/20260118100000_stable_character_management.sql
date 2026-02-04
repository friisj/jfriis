-- Stable: Character Design and Asset Management System
-- This migration creates tables for managing synthetic character designs,
-- their parametric data, relationships, and associated assets.

-- Characters table
-- Stores the core character entities with rich parametric data
CREATE TABLE stable_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,

  -- Parametric data object (flexible JSONB for rich character attributes)
  -- Expected to contain: anatomy, physical_attributes, personality, voice_tone,
  -- behavior, style_variants, and other character-defining parameters
  parametric_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT stable_characters_name_not_empty CHECK (char_length(trim(name)) > 0)
);

-- Character relationships table
-- Simple relationship tracking between characters
CREATE TABLE stable_character_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_a_id UUID NOT NULL REFERENCES stable_characters(id) ON DELETE CASCADE,
  character_b_id UUID NOT NULL REFERENCES stable_characters(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT stable_relationships_no_self_reference CHECK (character_a_id != character_b_id),
  CONSTRAINT stable_relationships_type_not_empty CHECK (char_length(trim(relationship_type)) > 0)
);

-- Assets table
-- Flexible storage for character assets including prompts, media, outputs, etc.
CREATE TABLE stable_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES stable_characters(id) ON DELETE CASCADE,

  -- Asset classification
  asset_type TEXT NOT NULL, -- 'prompt', 'reference_media', 'generative_output', etc.
  name TEXT,

  -- Flexible data storage for asset-specific metadata
  -- Can store prompts, exclusions, generation parameters, etc.
  data JSONB DEFAULT '{}'::jsonb,

  -- File storage
  file_url TEXT, -- Supabase Storage URL or external URL
  file_type TEXT, -- MIME type
  file_size INTEGER, -- bytes

  -- Organization
  tags TEXT[] DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT stable_assets_type_not_empty CHECK (char_length(trim(asset_type)) > 0)
);

-- Indexes for performance
CREATE INDEX idx_stable_characters_created_at ON stable_characters(created_at DESC);
CREATE INDEX idx_stable_characters_name ON stable_characters(name);
CREATE INDEX idx_stable_character_relationships_char_a ON stable_character_relationships(character_a_id);
CREATE INDEX idx_stable_character_relationships_char_b ON stable_character_relationships(character_b_id);
CREATE INDEX idx_stable_assets_character_id ON stable_assets(character_id);
CREATE INDEX idx_stable_assets_asset_type ON stable_assets(asset_type);
CREATE INDEX idx_stable_assets_tags ON stable_assets USING gin(tags);

-- Updated_at trigger function (reuse existing if available, or create)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_stable_characters_updated_at
  BEFORE UPDATE ON stable_characters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stable_character_relationships_updated_at
  BEFORE UPDATE ON stable_character_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stable_assets_updated_at
  BEFORE UPDATE ON stable_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE stable_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE stable_character_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE stable_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin-only for personal tool)
CREATE POLICY "Admin full access to characters"
  ON stable_characters
  FOR ALL
  USING (is_admin());

CREATE POLICY "Admin full access to character relationships"
  ON stable_character_relationships
  FOR ALL
  USING (is_admin());

CREATE POLICY "Admin full access to assets"
  ON stable_assets
  FOR ALL
  USING (is_admin());

-- Comments for documentation
COMMENT ON TABLE stable_characters IS 'Character design entities with rich parametric data for character bible and asset management';
COMMENT ON TABLE stable_character_relationships IS 'Simple relationships between characters (family, rivals, teams, etc.)';
COMMENT ON TABLE stable_assets IS 'Flexible asset storage for prompts, reference media, generative outputs, and other character-related files';
COMMENT ON COLUMN stable_characters.parametric_data IS 'JSONB object containing anatomy, physical attributes, personality, voice/tone, behavior, style variants, etc.';
COMMENT ON COLUMN stable_assets.data IS 'JSONB object for asset-specific metadata (prompts, exclusions, generation params, etc.)';
