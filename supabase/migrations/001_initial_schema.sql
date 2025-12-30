-- Initial Schema Migration
-- Creates the core tables for the portfolio site

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table (portfolio items and businesses)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Core fields
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  content JSONB, -- Rich content (markdown, blocks, etc.)

  -- Meta
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, archived, completed
  type TEXT, -- project, business, experiment, etc.
  start_date DATE,
  end_date DATE,

  -- Media
  featured_image TEXT,
  images JSONB, -- Array of image URLs

  -- Relationships (will be referenced by junction tables)
  tags TEXT[], -- Simple tags

  -- Metadata
  metadata JSONB, -- Flexible metadata storage

  -- SEO
  seo_title TEXT,
  seo_description TEXT,

  -- Visibility
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ
);

-- Log entries table (chronological record)
CREATE TABLE log_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Core fields
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content JSONB, -- Rich content

  -- Meta
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT, -- experiment, idea, research, update, etc.

  -- Media
  featured_image TEXT,
  images JSONB,

  -- Relationships
  tags TEXT[],

  -- Metadata
  metadata JSONB,

  -- SEO
  seo_title TEXT,
  seo_description TEXT,

  -- Visibility
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ
);

-- Specimens table (custom components with code, media, fonts)
CREATE TABLE specimens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Core fields
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Component code/config
  component_code TEXT, -- React/TS code
  component_props JSONB, -- Props/config
  theme_config JSONB, -- Theme settings (which theme, mode, custom colors)

  -- Assets
  media JSONB, -- Images, videos, etc.
  fonts JSONB, -- Custom fonts

  -- Styling
  custom_css TEXT,

  -- Meta
  type TEXT, -- ui-component, interactive, visual, etc.
  tags TEXT[],

  -- Metadata
  metadata JSONB,

  -- Visibility
  published BOOLEAN NOT NULL DEFAULT false
);

-- Gallery sequences (curated collections for gallery view)
CREATE TABLE gallery_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Core fields
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Ordering and presentation
  sequence_order INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  metadata JSONB,

  -- Visibility
  published BOOLEAN NOT NULL DEFAULT false
);

-- Landing pages (custom landing page configurations)
CREATE TABLE landing_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Core fields
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- e.g., 'investorX'
  content JSONB, -- Page content/layout

  -- Meta
  target_audience TEXT,

  -- Metadata
  metadata JSONB,

  -- SEO
  seo_title TEXT,
  seo_description TEXT,

  -- Visibility
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ
);

-- Backlog items (inbox for rough ideas)
CREATE TABLE backlog_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Core fields
  title TEXT,
  content TEXT,
  media JSONB, -- Sketches, images, etc.

  -- Status
  status TEXT NOT NULL DEFAULT 'inbox', -- inbox, in-progress, shaped, archived

  -- Conversion tracking
  converted_to TEXT, -- 'log_entry', 'specimen', 'project', etc.
  converted_id UUID, -- ID of the converted item

  -- Metadata
  metadata JSONB,
  tags TEXT[]
);

-- Junction table: specimens in gallery sequences
CREATE TABLE gallery_specimen_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gallery_sequence_id UUID NOT NULL REFERENCES gallery_sequences(id) ON DELETE CASCADE,
  specimen_id UUID NOT NULL REFERENCES specimens(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,

  -- Item-specific config
  display_config JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(gallery_sequence_id, specimen_id)
);

-- Junction table: specimens in log entries
CREATE TABLE log_entry_specimens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_entry_id UUID NOT NULL REFERENCES log_entries(id) ON DELETE CASCADE,
  specimen_id UUID NOT NULL REFERENCES specimens(id) ON DELETE CASCADE,
  position INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(log_entry_id, specimen_id)
);

-- Junction table: specimens in projects
CREATE TABLE project_specimens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  specimen_id UUID NOT NULL REFERENCES specimens(id) ON DELETE CASCADE,
  position INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(project_id, specimen_id)
);

-- Junction table: projects in log entries
CREATE TABLE log_entry_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_entry_id UUID NOT NULL REFERENCES log_entries(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(log_entry_id, project_id)
);

-- Indexes for performance
CREATE INDEX idx_projects_slug ON projects(slug);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_published ON projects(published);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

CREATE INDEX idx_log_entries_slug ON log_entries(slug);
CREATE INDEX idx_log_entries_published ON log_entries(published);
CREATE INDEX idx_log_entries_entry_date ON log_entries(entry_date DESC);

CREATE INDEX idx_specimens_slug ON specimens(slug);
CREATE INDEX idx_specimens_published ON specimens(published);

CREATE INDEX idx_gallery_sequences_slug ON gallery_sequences(slug);
CREATE INDEX idx_gallery_sequences_order ON gallery_sequences(sequence_order);

CREATE INDEX idx_landing_pages_slug ON landing_pages(slug);

CREATE INDEX idx_backlog_status ON backlog_items(status);
CREATE INDEX idx_backlog_created_at ON backlog_items(created_at DESC);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_log_entries_updated_at BEFORE UPDATE ON log_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_specimens_updated_at BEFORE UPDATE ON specimens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gallery_sequences_updated_at BEFORE UPDATE ON gallery_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_landing_pages_updated_at BEFORE UPDATE ON landing_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_backlog_items_updated_at BEFORE UPDATE ON backlog_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE projects IS 'Portfolio projects and businesses with metadata and relationships';
COMMENT ON TABLE log_entries IS 'Chronological log of ideas, experiments, research, and updates';
COMMENT ON TABLE specimens IS 'Custom components with code, media, fonts, and styling for reuse across the site';
COMMENT ON TABLE gallery_sequences IS 'Curated sequences of specimens for immersive gallery presentation';
COMMENT ON TABLE landing_pages IS 'Custom landing pages for different audiences';
COMMENT ON TABLE backlog_items IS 'Inbox for rough ideas, sketches, and content to be shaped later';
