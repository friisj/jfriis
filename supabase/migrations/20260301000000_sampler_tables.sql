-- Sampler: Sound effects MPC tool
-- Creates collections, sounds, and pads tables with storage bucket

-- ==========================================================================
-- sampler_collections: groups of pads forming an instrument layout
-- ==========================================================================
CREATE TABLE sampler_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  grid_rows INTEGER NOT NULL DEFAULT 4 CHECK (grid_rows BETWEEN 1 AND 8),
  grid_cols INTEGER NOT NULL DEFAULT 4 CHECK (grid_cols BETWEEN 1 AND 8),
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sampler_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to sampler_collections"
  ON sampler_collections FOR ALL USING (is_admin());

CREATE TRIGGER set_sampler_collections_updated_at
  BEFORE UPDATE ON sampler_collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_sampler_collections_slug ON sampler_collections (slug);

-- ==========================================================================
-- sampler_sounds: global sound library (files, generated, procedural)
-- ==========================================================================
CREATE TABLE sampler_sounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'file' CHECK (type IN ('file', 'generated', 'procedural')),
  source_config JSONB NOT NULL DEFAULT '{}',
  audio_url TEXT,
  duration_ms INTEGER,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sampler_sounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to sampler_sounds"
  ON sampler_sounds FOR ALL USING (is_admin());

CREATE TRIGGER set_sampler_sounds_updated_at
  BEFORE UPDATE ON sampler_sounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_sampler_sounds_type ON sampler_sounds (type);
CREATE INDEX idx_sampler_sounds_tags ON sampler_sounds USING GIN (tags);

-- ==========================================================================
-- sampler_pads: individual pads within a collection grid
-- ==========================================================================
CREATE TABLE sampler_pads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES sampler_collections(id) ON DELETE CASCADE,
  sound_id UUID REFERENCES sampler_sounds(id) ON DELETE SET NULL,
  row INTEGER NOT NULL CHECK (row >= 0),
  col INTEGER NOT NULL CHECK (col >= 0),
  row_span INTEGER NOT NULL DEFAULT 1 CHECK (row_span >= 1),
  col_span INTEGER NOT NULL DEFAULT 1 CHECK (col_span >= 1),
  effects JSONB NOT NULL DEFAULT '{"volume": 0.8, "pitch": 0}',
  label TEXT,
  color TEXT,
  pad_type TEXT NOT NULL DEFAULT 'trigger' CHECK (pad_type IN ('trigger', 'toggle', 'loop')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(collection_id, row, col)
);

ALTER TABLE sampler_pads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to sampler_pads"
  ON sampler_pads FOR ALL USING (is_admin());

CREATE TRIGGER set_sampler_pads_updated_at
  BEFORE UPDATE ON sampler_pads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_sampler_pads_collection ON sampler_pads (collection_id);
CREATE INDEX idx_sampler_pads_sound ON sampler_pads (sound_id);

-- ==========================================================================
-- Storage bucket for audio files (public read, admin write)
-- ==========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sampler-audio',
  'sampler-audio',
  true,
  52428800, -- 50MB
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/aac']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access (anyone can play sounds)
CREATE POLICY "Public can read sampler audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sampler-audio');

-- Admin-only write access
CREATE POLICY "Admin can upload sampler audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'sampler-audio'
    AND is_admin()
  );

CREATE POLICY "Admin can update sampler audio"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'sampler-audio'
    AND is_admin()
  );

CREATE POLICY "Admin can delete sampler audio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'sampler-audio'
    AND is_admin()
  );
