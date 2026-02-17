-- Verbivore Tables Migration
-- Creates all tables for the Verbivore studio project (AI-assisted glossary publishing)
-- Prefix: verbivore_ (matching studio_/cog_ namespacing convention)
-- No user_id columns — jfriis is single-user with passkey auth

-- ============================================================================
-- CATEGORIES
-- ============================================================================

CREATE TABLE verbivore_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_verbivore_categories_updated_at
  BEFORE UPDATE ON verbivore_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE verbivore_categories IS 'Glossary entry categories for organizing content by topic';

-- ============================================================================
-- ENTRIES
-- ============================================================================

CREATE TABLE verbivore_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES verbivore_categories(id) ON DELETE SET NULL,

  -- Content
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,

  -- SEO
  seo_title VARCHAR(255),
  seo_description TEXT,

  -- Publishing
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'live', 'archived')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,

  -- Media
  cover_image_url TEXT,
  thumbnail_image_url TEXT,

  -- Metadata
  view_count INTEGER NOT NULL DEFAULT 0,
  reading_time INTEGER NOT NULL DEFAULT 0,
  complexity_score INTEGER NOT NULL DEFAULT 5
    CHECK (complexity_score >= 1 AND complexity_score <= 10),
  word_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verbivore_entries_status ON verbivore_entries(status);
CREATE INDEX idx_verbivore_entries_category ON verbivore_entries(category_id);
CREATE INDEX idx_verbivore_entries_slug ON verbivore_entries(slug);
CREATE INDEX idx_verbivore_entries_featured ON verbivore_entries(featured);
CREATE INDEX idx_verbivore_entries_published_at ON verbivore_entries(published_at);

CREATE TRIGGER set_verbivore_entries_updated_at
  BEFORE UPDATE ON verbivore_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE verbivore_entries IS 'Glossary entries — long-form content pieces that contain and contextualize terms';

-- ============================================================================
-- TERMS
-- ============================================================================

CREATE TABLE verbivore_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  term VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  definition TEXT NOT NULL,
  pronunciation VARCHAR(255),

  tags TEXT[] DEFAULT '{}',
  difficulty_level VARCHAR(20)
    CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),

  origin TEXT,
  etymology_source TEXT,
  usage_examples TEXT[] DEFAULT '{}',
  synonyms TEXT[] DEFAULT '{}',

  image_url TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verbivore_terms_term ON verbivore_terms(term);
CREATE INDEX idx_verbivore_terms_slug ON verbivore_terms(slug);
CREATE INDEX idx_verbivore_terms_tags ON verbivore_terms USING GIN(tags);

CREATE TRIGGER set_verbivore_terms_updated_at
  BEFORE UPDATE ON verbivore_terms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE verbivore_terms IS 'Individual glossary terms with definitions, etymology, and usage data';

-- ============================================================================
-- ENTRY-TERM JUNCTION
-- ============================================================================

CREATE TABLE verbivore_entry_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES verbivore_entries(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES verbivore_terms(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(entry_id, term_id)
);

CREATE INDEX idx_verbivore_entry_terms_entry ON verbivore_entry_terms(entry_id);
CREATE INDEX idx_verbivore_entry_terms_term ON verbivore_entry_terms(term_id);

COMMENT ON TABLE verbivore_entry_terms IS 'Links terms to entries with ordering and primary designation';

-- ============================================================================
-- TERM RELATIONSHIPS
-- ============================================================================

CREATE TABLE verbivore_term_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES verbivore_terms(id) ON DELETE CASCADE,
  related_term_id UUID NOT NULL REFERENCES verbivore_terms(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL DEFAULT 'related'
    CHECK (relationship_type IN ('synonym', 'antonym', 'related', 'broader', 'narrower')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (term_id != related_term_id),
  UNIQUE(term_id, related_term_id, relationship_type)
);

CREATE INDEX idx_verbivore_term_rels_term ON verbivore_term_relationships(term_id);
CREATE INDEX idx_verbivore_term_rels_related ON verbivore_term_relationships(related_term_id);

COMMENT ON TABLE verbivore_term_relationships IS 'Semantic relationships between terms (synonym, antonym, broader, narrower)';

-- ============================================================================
-- SOURCES
-- ============================================================================

CREATE TABLE verbivore_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  url TEXT,
  author VARCHAR(255),
  publication_date DATE,
  source_type VARCHAR(50)
    CHECK (source_type IN ('book', 'article', 'website', 'dictionary', 'paper')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE verbivore_sources IS 'Citation sources for term definitions and etymology';

-- ============================================================================
-- TERM-SOURCE JUNCTION
-- ============================================================================

CREATE TABLE verbivore_term_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES verbivore_terms(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES verbivore_sources(id) ON DELETE CASCADE,
  page_number VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(term_id, source_id)
);

CREATE INDEX idx_verbivore_term_sources_term ON verbivore_term_sources(term_id);
CREATE INDEX idx_verbivore_term_sources_source ON verbivore_term_sources(source_id);

COMMENT ON TABLE verbivore_term_sources IS 'Links terms to their citation sources';

-- ============================================================================
-- STYLE GUIDES
-- ============================================================================

CREATE TABLE verbivore_style_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  prompt TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verbivore_style_guides_slug ON verbivore_style_guides(slug);
CREATE INDEX idx_verbivore_style_guides_active ON verbivore_style_guides(is_active);

CREATE TRIGGER set_verbivore_style_guides_updated_at
  BEFORE UPDATE ON verbivore_style_guides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE verbivore_style_guides IS 'Customizable AI prompt templates for content generation style';

-- ============================================================================
-- ENTRY RELATIONSHIPS
-- ============================================================================

CREATE TABLE verbivore_entry_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_entry_id UUID NOT NULL REFERENCES verbivore_entries(id) ON DELETE CASCADE,
  child_entry_id UUID NOT NULL REFERENCES verbivore_entries(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL DEFAULT 'split_from'
    CHECK (relationship_type IN ('split_from', 'sequel', 'prequel', 'related', 'cross_reference')),
  sequence_order INTEGER NOT NULL DEFAULT 0,
  split_strategy JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (parent_entry_id != child_entry_id),
  UNIQUE(parent_entry_id, child_entry_id, relationship_type)
);

CREATE INDEX idx_verbivore_entry_rels_parent ON verbivore_entry_relationships(parent_entry_id);
CREATE INDEX idx_verbivore_entry_rels_child ON verbivore_entry_relationships(child_entry_id);

COMMENT ON TABLE verbivore_entry_relationships IS 'Tracks splits, sequences, and cross-references between entries';

-- ============================================================================
-- SPLITTING SESSIONS
-- ============================================================================

CREATE TABLE verbivore_splitting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES verbivore_entries(id) ON DELETE CASCADE,
  analysis_result JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'analyzing'
    CHECK (status IN ('analyzing', 'ready', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verbivore_splitting_entry ON verbivore_splitting_sessions(entry_id);
CREATE INDEX idx_verbivore_splitting_status ON verbivore_splitting_sessions(status);

CREATE TRIGGER set_verbivore_splitting_sessions_updated_at
  BEFORE UPDATE ON verbivore_splitting_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE verbivore_splitting_sessions IS 'Tracks AI-assisted entry splitting analysis and execution';

-- ============================================================================
-- VIEWS
-- ============================================================================

CREATE VIEW verbivore_public_entries AS
SELECT
  e.id,
  e.title,
  e.slug,
  e.excerpt,
  e.content,
  e.cover_image_url,
  e.thumbnail_image_url,
  e.published_at,
  e.view_count,
  e.featured,
  e.reading_time,
  e.word_count,
  c.name AS category_name,
  c.slug AS category_slug,
  c.color AS category_color,
  array_agg(
    json_build_object(
      'id', t.id,
      'term', t.term,
      'slug', t.slug,
      'definition', t.definition,
      'is_primary', et.is_primary
    ) ORDER BY et.display_order, et.is_primary DESC
  ) AS terms
FROM verbivore_entries e
LEFT JOIN verbivore_categories c ON e.category_id = c.id
LEFT JOIN verbivore_entry_terms et ON e.id = et.entry_id
LEFT JOIN verbivore_terms t ON et.term_id = t.id
WHERE e.status = 'live'
GROUP BY e.id, c.name, c.slug, c.color
ORDER BY e.published_at DESC;

CREATE VIEW verbivore_public_terms AS
SELECT
  t.id,
  t.term,
  t.slug,
  t.definition,
  t.pronunciation,
  t.tags,
  t.difficulty_level,
  t.origin,
  t.usage_examples,
  t.synonyms,
  t.image_url,
  t.view_count,
  array_agg(DISTINCT e.title) FILTER (WHERE e.title IS NOT NULL) AS entry_titles
FROM verbivore_terms t
JOIN verbivore_entry_terms et ON t.id = et.term_id
JOIN verbivore_entries e ON et.entry_id = e.id AND e.status = 'live'
GROUP BY t.id
ORDER BY t.term;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE verbivore_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE verbivore_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE verbivore_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE verbivore_entry_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE verbivore_term_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE verbivore_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE verbivore_term_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE verbivore_style_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE verbivore_entry_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE verbivore_splitting_sessions ENABLE ROW LEVEL SECURITY;

-- Public read for categories (always visible)
CREATE POLICY "Anyone can view verbivore categories"
  ON verbivore_categories FOR SELECT USING (true);

-- Public read for live entries
CREATE POLICY "Anyone can view live verbivore entries"
  ON verbivore_entries FOR SELECT USING (status = 'live');

-- Public read for terms in live entries
CREATE POLICY "Anyone can view terms in live entries"
  ON verbivore_terms FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM verbivore_entry_terms et
      JOIN verbivore_entries e ON et.entry_id = e.id
      WHERE et.term_id = verbivore_terms.id AND e.status = 'live'
    )
  );

-- Public read for entry-term links of live entries
CREATE POLICY "Anyone can view entry_terms for live entries"
  ON verbivore_entry_terms FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM verbivore_entries WHERE id = entry_id AND status = 'live'
    )
  );

-- Public read for term relationships of public terms
CREATE POLICY "Anyone can view relationships for public terms"
  ON verbivore_term_relationships FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM verbivore_terms t
      JOIN verbivore_entry_terms et ON t.id = et.term_id
      JOIN verbivore_entries e ON et.entry_id = e.id
      WHERE t.id = term_id AND e.status = 'live'
    )
  );

-- Public read for sources (always visible)
CREATE POLICY "Anyone can view verbivore sources"
  ON verbivore_sources FOR SELECT USING (true);

-- Public read for term-source links of public terms
CREATE POLICY "Anyone can view term_sources for public terms"
  ON verbivore_term_sources FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM verbivore_terms t
      JOIN verbivore_entry_terms et ON t.id = et.term_id
      JOIN verbivore_entries e ON et.entry_id = e.id
      WHERE t.id = term_id AND e.status = 'live'
    )
  );

-- Admin full access on all tables
CREATE POLICY "Admins have full access to verbivore categories"
  ON verbivore_categories FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to verbivore entries"
  ON verbivore_entries FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to verbivore terms"
  ON verbivore_terms FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to verbivore entry_terms"
  ON verbivore_entry_terms FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to verbivore term_relationships"
  ON verbivore_term_relationships FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to verbivore sources"
  ON verbivore_sources FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to verbivore term_sources"
  ON verbivore_term_sources FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to verbivore style_guides"
  ON verbivore_style_guides FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to verbivore entry_relationships"
  ON verbivore_entry_relationships FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to verbivore splitting_sessions"
  ON verbivore_splitting_sessions FOR ALL USING (is_admin());
