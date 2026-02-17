-- Chalk: AI-powered lo-fi design tool
-- Tables for projects, boards (tldraw workspaces), versions (immutable snapshots), and chat messages
-- Migrated from standalone chalk repo; adapted to jfriis single-user pattern (no owner_id/created_by)

-- Projects table
CREATE TABLE chalk_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Boards table (tldraw workspaces)
CREATE TABLE chalk_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES chalk_projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Main Board',
  description TEXT,
  tldraw_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Versions table (immutable snapshots for version control)
CREATE TABLE chalk_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES chalk_boards(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES chalk_versions(id) ON DELETE SET NULL,
  name TEXT,
  fidelity_level INTEGER DEFAULT 1 CHECK (fidelity_level BETWEEN 1 AND 5),
  tldraw_snapshot JSONB NOT NULL,
  screenshot_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Chat messages table (context-aware AI conversations)
CREATE TABLE chalk_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES chalk_boards(id) ON DELETE CASCADE NOT NULL,
  context_type TEXT NOT NULL CHECK (context_type IN ('board', 'element')),
  context_id TEXT,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_chalk_boards_project ON chalk_boards(project_id);
CREATE INDEX idx_chalk_versions_board ON chalk_versions(board_id);
CREATE INDEX idx_chalk_versions_parent ON chalk_versions(parent_id);
CREATE INDEX idx_chalk_chat_board ON chalk_chat_messages(board_id);
CREATE INDEX idx_chalk_chat_context ON chalk_chat_messages(context_type, context_id);

-- RLS
ALTER TABLE chalk_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chalk_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE chalk_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chalk_chat_messages ENABLE ROW LEVEL SECURITY;

-- Public read, admin write
CREATE POLICY "chalk_projects_select" ON chalk_projects FOR SELECT USING (true);
CREATE POLICY "chalk_projects_admin" ON chalk_projects FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id)
);

CREATE POLICY "chalk_boards_select" ON chalk_boards FOR SELECT USING (true);
CREATE POLICY "chalk_boards_admin" ON chalk_boards FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id)
);

CREATE POLICY "chalk_versions_select" ON chalk_versions FOR SELECT USING (true);
CREATE POLICY "chalk_versions_admin" ON chalk_versions FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id)
);

CREATE POLICY "chalk_chat_messages_select" ON chalk_chat_messages FOR SELECT USING (true);
CREATE POLICY "chalk_chat_messages_admin" ON chalk_chat_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id)
);

-- Auto-update updated_at triggers (reuses existing update_updated_at_column function)
CREATE TRIGGER update_chalk_projects_updated_at
  BEFORE UPDATE ON chalk_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chalk_boards_updated_at
  BEFORE UPDATE ON chalk_boards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
