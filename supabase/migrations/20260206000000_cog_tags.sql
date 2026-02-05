-- Cog Image Tagging System
-- Creates tables for tag groups, tags, series-tag assignments, and image-tag assignments

-- Tag groups for organization (e.g., "Quality", "Subject", "Mood")
CREATE TABLE cog_tag_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT,  -- hex color
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags (global when series_id is NULL, otherwise series-local)
CREATE TABLE cog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES cog_series(id) ON DELETE CASCADE,
  group_id UUID REFERENCES cog_tag_groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  shortcut TEXT,  -- single key: '1', '2', 'a', 'b', etc.
  color TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unique constraint that treats NULL series_id as distinct (global tags)
  UNIQUE NULLS NOT DISTINCT (series_id, name)
);

-- Which global tags are enabled for each series
CREATE TABLE cog_series_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES cog_series(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES cog_tags(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(series_id, tag_id)
);

-- Which tags are applied to each image
CREATE TABLE cog_image_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES cog_images(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES cog_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(image_id, tag_id)
);

-- Indexes for common queries
CREATE INDEX idx_cog_tags_series_id ON cog_tags(series_id);
CREATE INDEX idx_cog_tags_group_id ON cog_tags(group_id);
CREATE INDEX idx_cog_series_tags_series_id ON cog_series_tags(series_id);
CREATE INDEX idx_cog_series_tags_tag_id ON cog_series_tags(tag_id);
CREATE INDEX idx_cog_image_tags_image_id ON cog_image_tags(image_id);
CREATE INDEX idx_cog_image_tags_tag_id ON cog_image_tags(tag_id);

-- RLS Policies (same pattern as other cog tables - admin only)
ALTER TABLE cog_tag_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE cog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE cog_series_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE cog_image_tags ENABLE ROW LEVEL SECURITY;

-- Tag groups policies
CREATE POLICY "cog_tag_groups_select" ON cog_tag_groups
  FOR SELECT USING (true);

CREATE POLICY "cog_tag_groups_insert" ON cog_tag_groups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "cog_tag_groups_update" ON cog_tag_groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "cog_tag_groups_delete" ON cog_tag_groups
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Tags policies
CREATE POLICY "cog_tags_select" ON cog_tags
  FOR SELECT USING (true);

CREATE POLICY "cog_tags_insert" ON cog_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "cog_tags_update" ON cog_tags
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "cog_tags_delete" ON cog_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Series tags policies
CREATE POLICY "cog_series_tags_select" ON cog_series_tags
  FOR SELECT USING (true);

CREATE POLICY "cog_series_tags_insert" ON cog_series_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "cog_series_tags_update" ON cog_series_tags
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "cog_series_tags_delete" ON cog_series_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Image tags policies
CREATE POLICY "cog_image_tags_select" ON cog_image_tags
  FOR SELECT USING (true);

CREATE POLICY "cog_image_tags_insert" ON cog_image_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "cog_image_tags_update" ON cog_image_tags
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "cog_image_tags_delete" ON cog_image_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
