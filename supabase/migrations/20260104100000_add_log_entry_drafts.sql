-- Add log_entry_drafts table for multi-draft support
-- Each log entry can have multiple drafts with one marked as primary

CREATE TABLE log_entry_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_entry_id UUID NOT NULL REFERENCES log_entries(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  label TEXT, -- optional user label like "formal", "casual", "short"

  -- Generation metadata (null if manually written)
  generation_instructions TEXT,
  generation_model TEXT,
  generation_temperature NUMERIC(3,2),
  generation_mode TEXT CHECK (generation_mode IN ('rewrite', 'additive')),
  source_draft_id UUID REFERENCES log_entry_drafts(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure only one primary draft per entry
CREATE UNIQUE INDEX log_entry_drafts_primary_unique
  ON log_entry_drafts (log_entry_id) WHERE is_primary = true;

-- Index for fetching drafts by entry
CREATE INDEX log_entry_drafts_entry_idx ON log_entry_drafts(log_entry_id);

-- Updated_at trigger
CREATE TRIGGER log_entry_drafts_updated_at
  BEFORE UPDATE ON log_entry_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE log_entry_drafts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage drafts
CREATE POLICY "Authenticated users can manage drafts"
  ON log_entry_drafts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Migrate existing content to drafts
INSERT INTO log_entry_drafts (log_entry_id, content, is_primary, created_at, updated_at)
SELECT
  id,
  COALESCE(content->>'markdown', ''),
  true,
  created_at,
  updated_at
FROM log_entries
WHERE content IS NOT NULL AND content->>'markdown' IS NOT NULL;

-- Add comment
COMMENT ON TABLE log_entry_drafts IS 'Multiple content drafts per log entry with LLM generation tracking';
COMMENT ON COLUMN log_entry_drafts.is_primary IS 'The draft shown on public pages';
COMMENT ON COLUMN log_entry_drafts.generation_mode IS 'rewrite = full rewrite, additive = append sections';
COMMENT ON COLUMN log_entry_drafts.source_draft_id IS 'Which draft was used as source for generation';
