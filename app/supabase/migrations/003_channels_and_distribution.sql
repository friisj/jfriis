-- Channels and Distribution Migration
-- Tables for managing distribution to HackerNews, social platforms, etc.

-- Channels table (distribution platforms)
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Core fields
  name TEXT NOT NULL UNIQUE, -- e.g., 'hackernews', 'twitter', 'linkedin'
  display_name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'social', 'news', 'blog', etc.

  -- Configuration
  config JSONB, -- API keys, settings, etc.
  enabled BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  metadata JSONB
);

-- Distribution posts table (track what's been posted where)
CREATE TABLE distribution_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Channel
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,

  -- Source content
  content_type TEXT NOT NULL, -- 'log_entry', 'project', 'specimen', etc.
  content_id UUID NOT NULL, -- ID of the source content

  -- Post details
  title TEXT,
  body TEXT,
  url TEXT, -- URL to the post on the platform
  external_id TEXT, -- Platform-specific post ID

  -- Status
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, posted, failed
  scheduled_for TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,

  -- Analytics
  views INTEGER DEFAULT 0,
  engagement JSONB, -- likes, shares, comments, etc.

  -- Error tracking
  error_message TEXT,

  -- Metadata
  metadata JSONB
);

-- Distribution queue (for agent processing)
CREATE TABLE distribution_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Target
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  priority INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,

  -- Scheduling
  process_after TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- Error handling
  last_error TEXT,

  -- Metadata
  metadata JSONB
);

-- Indexes
CREATE INDEX idx_channels_name ON channels(name);
CREATE INDEX idx_channels_enabled ON channels(enabled);

CREATE INDEX idx_distribution_posts_channel ON distribution_posts(channel_id);
CREATE INDEX idx_distribution_posts_content ON distribution_posts(content_type, content_id);
CREATE INDEX idx_distribution_posts_status ON distribution_posts(status);
CREATE INDEX idx_distribution_posts_posted_at ON distribution_posts(posted_at DESC);

CREATE INDEX idx_distribution_queue_status ON distribution_queue(status);
CREATE INDEX idx_distribution_queue_process_after ON distribution_queue(process_after);
CREATE INDEX idx_distribution_queue_channel ON distribution_queue(channel_id);

-- Triggers
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_distribution_posts_updated_at BEFORE UPDATE ON distribution_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_distribution_queue_updated_at BEFORE UPDATE ON distribution_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_queue ENABLE ROW LEVEL SECURITY;

-- Admin only for channels management
CREATE POLICY "Admin can do everything with channels"
  ON channels FOR ALL
  USING (is_admin());

CREATE POLICY "Admin can do everything with distribution posts"
  ON distribution_posts FOR ALL
  USING (is_admin());

CREATE POLICY "Admin can do everything with distribution queue"
  ON distribution_queue FOR ALL
  USING (is_admin());

-- Insert default channels
INSERT INTO channels (name, display_name, type, config) VALUES
  ('hackernews', 'Hacker News', 'news', '{"enabled": true}'::jsonb),
  ('twitter', 'Twitter/X', 'social', '{"enabled": false}'::jsonb),
  ('linkedin', 'LinkedIn', 'social', '{"enabled": false}'::jsonb);

COMMENT ON TABLE channels IS 'Distribution channels (HN, social platforms, etc.)';
COMMENT ON TABLE distribution_posts IS 'Track posts made to distribution channels';
COMMENT ON TABLE distribution_queue IS 'Queue for agent processing of distribution tasks';
