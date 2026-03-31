-- Strudel Agent: conversations, messages, and track persistence
-- Supports AI-powered music production with chat-based DAW control

-- ============================================================================
-- Conversations
-- ============================================================================

CREATE TABLE strudel_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  model TEXT NOT NULL DEFAULT 'claude-sonnet',
  turn_count INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_strudel_conversations_created_at ON strudel_conversations(created_at DESC);

CREATE TRIGGER set_strudel_conversations_updated_at
  BEFORE UPDATE ON strudel_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE strudel_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to strudel_conversations"
  ON strudel_conversations FOR ALL
  USING (is_admin());

-- ============================================================================
-- Messages
-- ============================================================================

CREATE TABLE strudel_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES strudel_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  parts JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_strudel_messages_conversation ON strudel_messages(conversation_id, created_at ASC);

ALTER TABLE strudel_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to strudel_messages"
  ON strudel_messages FOR ALL
  USING (is_admin());

-- ============================================================================
-- Tracks (saved patterns with version lineage)
-- ============================================================================

CREATE TABLE strudel_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  parent_version_id UUID REFERENCES strudel_tracks(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES strudel_conversations(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_strudel_tracks_created_at ON strudel_tracks(created_at DESC);
CREATE INDEX idx_strudel_tracks_tags ON strudel_tracks USING GIN (tags);
CREATE INDEX idx_strudel_tracks_conversation ON strudel_tracks(conversation_id);

CREATE TRIGGER set_strudel_tracks_updated_at
  BEFORE UPDATE ON strudel_tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE strudel_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to strudel_tracks"
  ON strudel_tracks FOR ALL
  USING (is_admin());
