-- Phase 4: Story Maps
-- User Story Mapping for product planning and feature organization
-- Part of Boundary Objects Entity System

-- ============================================================================
-- STORY MAPS
-- ============================================================================

CREATE TABLE story_maps (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Context
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,
  hypothesis_id UUID REFERENCES studio_hypotheses(id) ON DELETE SET NULL,

  -- Map Type
  map_type TEXT DEFAULT 'feature' CHECK (
    map_type IN ('feature', 'product', 'release', 'discovery')
  ),

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'active', 'validated', 'archived')
  ),
  version INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES story_maps(id) ON DELETE SET NULL,

  -- Validation
  validation_status TEXT DEFAULT 'untested' CHECK (
    validation_status IN ('untested', 'testing', 'validated', 'invalidated')
  ),
  validated_at TIMESTAMPTZ,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_story_map_slug_per_project UNIQUE (studio_project_id, slug)
);

-- Indexes
CREATE INDEX idx_story_maps_project ON story_maps(studio_project_id);
CREATE INDEX idx_story_maps_hypothesis ON story_maps(hypothesis_id);
CREATE INDEX idx_story_maps_status ON story_maps(status);
CREATE INDEX idx_story_maps_map_type ON story_maps(map_type);
CREATE INDEX idx_story_maps_validation_status ON story_maps(validation_status);
CREATE INDEX idx_story_maps_tags ON story_maps USING GIN (tags);

-- Updated_at trigger
CREATE TRIGGER update_story_maps_updated_at
  BEFORE UPDATE ON story_maps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ACTIVITIES (Backbone of Story Map)
-- ============================================================================

CREATE TABLE activities (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_map_id UUID NOT NULL REFERENCES story_maps(id) ON DELETE CASCADE,

  -- Activity Info
  name TEXT NOT NULL,
  description TEXT,
  sequence INTEGER NOT NULL,

  -- Activity Details
  user_goal TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_activity_sequence UNIQUE (story_map_id, sequence)
);

-- Indexes
CREATE INDEX idx_activities_story_map ON activities(story_map_id);
CREATE INDEX idx_activities_sequence ON activities(story_map_id, sequence);

-- Updated_at trigger
CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- USER STORIES
-- ============================================================================

CREATE TABLE user_stories (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,

  -- Story Info
  title TEXT NOT NULL,
  description TEXT,
  acceptance_criteria TEXT,

  -- Story Details
  story_type TEXT CHECK (
    story_type IN ('feature', 'enhancement', 'bug', 'tech_debt', 'spike')
  ),

  -- Priority & Effort
  priority TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  story_points INTEGER CHECK (story_points > 0),

  -- Status
  status TEXT DEFAULT 'backlog' CHECK (
    status IN ('backlog', 'ready', 'in_progress', 'review', 'done', 'archived')
  ),

  -- Vertical Position (for story map visualization)
  vertical_position INTEGER,

  -- Validation
  validation_status TEXT DEFAULT 'untested' CHECK (
    validation_status IN ('untested', 'testing', 'validated', 'invalidated')
  ),
  validated_at TIMESTAMPTZ,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_user_stories_activity ON user_stories(activity_id);
CREATE INDEX idx_user_stories_priority ON user_stories(priority);
CREATE INDEX idx_user_stories_status ON user_stories(status);
CREATE INDEX idx_user_stories_story_type ON user_stories(story_type);
CREATE INDEX idx_user_stories_validation_status ON user_stories(validation_status);
CREATE INDEX idx_user_stories_vertical_position ON user_stories(activity_id, vertical_position);
CREATE INDEX idx_user_stories_tags ON user_stories USING GIN (tags);

-- Updated_at trigger
CREATE TRIGGER update_user_stories_updated_at
  BEFORE UPDATE ON user_stories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STORY RELEASES
-- ============================================================================

CREATE TABLE story_releases (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_story_id UUID NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,

  -- Release Info
  release_name TEXT NOT NULL,
  release_date DATE,
  release_order INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_story_release UNIQUE (user_story_id, release_name)
);

-- Indexes
CREATE INDEX idx_story_releases_story ON story_releases(user_story_id);
CREATE INDEX idx_story_releases_name ON story_releases(release_name);
CREATE INDEX idx_story_releases_date ON story_releases(release_date);
CREATE INDEX idx_story_releases_order ON story_releases(release_order);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE story_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_releases ENABLE ROW LEVEL SECURITY;

-- Story Maps policies
CREATE POLICY "Anyone can read story maps"
  ON story_maps FOR SELECT
  USING (true);

CREATE POLICY "Admin users can create story maps"
  ON story_maps FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can update story maps"
  ON story_maps FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can delete story maps"
  ON story_maps FOR DELETE
  USING (is_admin());

-- Activities policies
CREATE POLICY "Anyone can read activities"
  ON activities FOR SELECT
  USING (true);

CREATE POLICY "Admin users can create activities"
  ON activities FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can update activities"
  ON activities FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can delete activities"
  ON activities FOR DELETE
  USING (is_admin());

-- User Stories policies
CREATE POLICY "Anyone can read user stories"
  ON user_stories FOR SELECT
  USING (true);

CREATE POLICY "Admin users can create user stories"
  ON user_stories FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can update user stories"
  ON user_stories FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can delete user stories"
  ON user_stories FOR DELETE
  USING (is_admin());

-- Story Releases policies
CREATE POLICY "Anyone can read story releases"
  ON story_releases FOR SELECT
  USING (true);

CREATE POLICY "Admin users can create story releases"
  ON story_releases FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can update story releases"
  ON story_releases FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can delete story releases"
  ON story_releases FOR DELETE
  USING (is_admin());

-- ============================================================================
-- ENTITY_LINKS CLEANUP TRIGGERS
-- ============================================================================

-- Cleanup entity_links when story_maps are deleted
CREATE OR REPLACE FUNCTION cleanup_story_map_entity_links()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM entity_links
  WHERE (source_type = 'story_map' AND source_id = OLD.id)
     OR (target_type = 'story_map' AND target_id = OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_story_map_links
  AFTER DELETE ON story_maps
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_story_map_entity_links();

-- Cleanup entity_links when activities are deleted
CREATE OR REPLACE FUNCTION cleanup_activity_entity_links()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM entity_links
  WHERE (source_type = 'activity' AND source_id = OLD.id)
     OR (target_type = 'activity' AND target_id = OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_activity_links
  AFTER DELETE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_activity_entity_links();

-- Cleanup entity_links when user_stories are deleted
CREATE OR REPLACE FUNCTION cleanup_user_story_entity_links()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM entity_links
  WHERE (source_type = 'user_story' AND source_id = OLD.id)
     OR (target_type = 'user_story' AND target_id = OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_user_story_links
  AFTER DELETE ON user_stories
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_user_story_entity_links();

-- Cleanup entity_links when story_releases are deleted
CREATE OR REPLACE FUNCTION cleanup_story_release_entity_links()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM entity_links
  WHERE (source_type = 'story_release' AND source_id = OLD.id)
     OR (target_type = 'story_release' AND target_id = OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_story_release_links
  AFTER DELETE ON story_releases
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_story_release_entity_links();
