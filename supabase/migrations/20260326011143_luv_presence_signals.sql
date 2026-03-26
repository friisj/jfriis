-- Presence signals: real-time ephemeral indicators for Luv chat
-- Also adds presence_enabled toggle to heartbeat config

-- Presence signals table
CREATE TABLE IF NOT EXISTS luv_presence_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  conversation_id UUID REFERENCES luv_conversations(id),
  signal_type TEXT NOT NULL
    CHECK (signal_type IN ('reflecting', 'analyzing', 'suggesting', 'curious')),
  context JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 seconds')
);

COMMENT ON TABLE luv_presence_signals IS 'Ephemeral presence signals for real-time chat indicators';

-- Index for fetching active signals per conversation
CREATE INDEX IF NOT EXISTS idx_presence_signals_conversation
  ON luv_presence_signals (conversation_id, created_at DESC);

-- RLS policies
ALTER TABLE luv_presence_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own presence signals"
  ON luv_presence_signals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to presence signals"
  ON luv_presence_signals FOR ALL
  USING (auth.role() = 'service_role');

-- Enable Supabase Realtime on this table
ALTER PUBLICATION supabase_realtime ADD TABLE luv_presence_signals;

-- Add presence_enabled toggle to heartbeat config
ALTER TABLE luv_heartbeat_config
  ADD COLUMN IF NOT EXISTS presence_enabled BOOLEAN NOT NULL DEFAULT true;
