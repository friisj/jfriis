-- Cue Tables Migration
-- Personal social intelligence tool: Pulse (RSS digest) and Brief (pre-meeting prep)
-- Prefix: cue_ (matching studio_/cog_/verbivore_ namespacing convention)
-- No user_id columns — jfriis is single-user with passkey auth

-- ============================================================================
-- TOPIC TAXONOMY
-- ============================================================================
-- Flat taxonomy with optional parent for hierarchy (e.g. "AI" > "LLMs")

CREATE TABLE cue_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES cue_topics(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cue_topics_slug ON cue_topics(slug);
CREATE INDEX idx_cue_topics_parent ON cue_topics(parent_id);

CREATE TRIGGER set_cue_topics_updated_at
  BEFORE UPDATE ON cue_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE cue_topics IS 'Topic taxonomy used for profile interests, source tagging, and contact overlap';

-- ============================================================================
-- INTEREST PROFILE
-- ============================================================================
-- Singleton — one row. topics JSONB is [{topic_id, weight}].

CREATE TABLE cue_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_cue_profile_updated_at
  BEFORE UPDATE ON cue_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE cue_profile IS 'Singleton interest profile: topic weights and source preferences';
COMMENT ON COLUMN cue_profile.topics IS 'JSONB array of {topic_id, weight (0-1)} objects';

-- ============================================================================
-- RSS/CONTENT SOURCES
-- ============================================================================

CREATE TABLE cue_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  topic_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  fetch_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cue_sources_is_active ON cue_sources(is_active);
CREATE INDEX idx_cue_sources_topic_ids ON cue_sources USING GIN(topic_ids);

CREATE TRIGGER set_cue_sources_updated_at
  BEFORE UPDATE ON cue_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE cue_sources IS 'RSS/content sources with topic tagging';
COMMENT ON COLUMN cue_sources.topic_ids IS 'Array of cue_topics IDs — which topics this source covers';

-- ============================================================================
-- PULSE RUNS
-- ============================================================================
-- Tracks each fetch run (manual or future scheduled)

CREATE TABLE cue_pulse_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  items_fetched INTEGER DEFAULT 0,
  items_scored INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  error TEXT
);

CREATE INDEX idx_cue_pulse_runs_started ON cue_pulse_runs(started_at DESC);
CREATE INDEX idx_cue_pulse_runs_status ON cue_pulse_runs(status);

COMMENT ON TABLE cue_pulse_runs IS 'Tracks each Pulse fetch run (manual or scheduled)';

-- ============================================================================
-- PULSE ITEMS
-- ============================================================================
-- Individual content items fetched and scored per run

CREATE TABLE cue_pulse_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES cue_pulse_runs(id) ON DELETE CASCADE,
  source_id UUID REFERENCES cue_sources(id) ON DELETE SET NULL,

  -- Content
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  summary TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Scoring
  topics TEXT[] DEFAULT '{}',
  relevance_score DECIMAL(4,3) CHECK (relevance_score >= 0 AND relevance_score <= 1),

  -- State
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_saved BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_cue_pulse_items_run ON cue_pulse_items(run_id);
CREATE INDEX idx_cue_pulse_items_source ON cue_pulse_items(source_id);
CREATE INDEX idx_cue_pulse_items_published ON cue_pulse_items(published_at DESC);
CREATE INDEX idx_cue_pulse_items_relevance ON cue_pulse_items(relevance_score DESC);
CREATE INDEX idx_cue_pulse_items_topics ON cue_pulse_items USING GIN(topics);
CREATE INDEX idx_cue_pulse_items_saved ON cue_pulse_items(is_saved) WHERE is_saved = true;

COMMENT ON TABLE cue_pulse_items IS 'Individual content items fetched and relevance-scored per run';
COMMENT ON COLUMN cue_pulse_items.topics IS 'Text array of topic slugs inferred by AI scoring';
COMMENT ON COLUMN cue_pulse_items.relevance_score IS '0-1 relevance score against interest profile';
COMMENT ON COLUMN cue_pulse_items.url IS 'Unique — deduplicates items across runs';

-- ============================================================================
-- CONTACTS
-- ============================================================================

CREATE TABLE cue_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  relationship TEXT,
  notes TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cue_contacts_name ON cue_contacts(name);
CREATE INDEX idx_cue_contacts_last_seen ON cue_contacts(last_seen_at DESC);

CREATE TRIGGER set_cue_contacts_updated_at
  BEFORE UPDATE ON cue_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE cue_contacts IS 'IRL contacts for Brief generation';

-- ============================================================================
-- CONTACT TOPICS
-- ============================================================================
-- What topics a contact cares about (for overlap computation)

CREATE TABLE cue_contact_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES cue_contacts(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  weight DECIMAL(4,3) NOT NULL DEFAULT 0.5
    CHECK (weight >= 0 AND weight <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(contact_id, topic)
);

CREATE INDEX idx_cue_contact_topics_contact ON cue_contact_topics(contact_id);
CREATE INDEX idx_cue_contact_topics_topic ON cue_contact_topics(topic);

COMMENT ON TABLE cue_contact_topics IS 'Contact interest profile — what topics they care about and how much';
COMMENT ON COLUMN cue_contact_topics.topic IS 'Topic slug — loosely coupled to cue_topics.slug';

-- ============================================================================
-- BRIEFS
-- ============================================================================
-- Saved AI-generated conversation briefs

CREATE TABLE cue_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES cue_contacts(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- AI output: { talking_points: [{topic, point, source_url?, source_title?, confidence}], overlap_summary: string }
  content JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Which pulse items informed this brief
  pulse_item_ids UUID[] DEFAULT '{}',

  -- Metadata
  model TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_cue_briefs_contact ON cue_briefs(contact_id);
CREATE INDEX idx_cue_briefs_generated ON cue_briefs(generated_at DESC);
CREATE INDEX idx_cue_briefs_pulse_items ON cue_briefs USING GIN(pulse_item_ids);

COMMENT ON TABLE cue_briefs IS 'Saved AI-generated conversation prep briefs';
COMMENT ON COLUMN cue_briefs.content IS 'JSONB: {talking_points: [{topic, point, source_url?, source_title?, confidence}], overlap_summary}';
COMMENT ON COLUMN cue_briefs.pulse_item_ids IS 'Array of cue_pulse_items IDs that informed this brief';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE cue_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cue_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE cue_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE cue_pulse_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cue_pulse_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cue_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cue_contact_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cue_briefs ENABLE ROW LEVEL SECURITY;

-- Admin-only access (private tool — no public read)
CREATE POLICY "Admins have full access to cue_topics"
  ON cue_topics FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to cue_profile"
  ON cue_profile FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to cue_sources"
  ON cue_sources FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to cue_pulse_runs"
  ON cue_pulse_runs FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to cue_pulse_items"
  ON cue_pulse_items FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to cue_contacts"
  ON cue_contacts FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to cue_contact_topics"
  ON cue_contact_topics FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to cue_briefs"
  ON cue_briefs FOR ALL USING (is_admin());
