-- Heartbeat system: event-driven nudges for Luv inter-turn awareness
-- Phase 1: config + events tables only (presence signals deferred)

-- Per-user heartbeat configuration
CREATE TABLE IF NOT EXISTS luv_heartbeat_config (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  enabled BOOLEAN NOT NULL DEFAULT true,
  event_triggers JSONB NOT NULL DEFAULT '{
    "chassis_change": {"enabled": true, "delay_ms": 2000, "cooldown_ms": 60000, "max_per_session": 5},
    "trait_adjustment": {"enabled": true, "delay_ms": 3000, "cooldown_ms": 60000, "max_per_session": 3},
    "generation_complete": {"enabled": true, "delay_ms": 1000, "cooldown_ms": 30000, "max_per_session": 10},
    "hypothesis_logged": {"enabled": true, "delay_ms": 5000, "cooldown_ms": 120000, "max_per_session": 3},
    "memory_pattern": {"enabled": true, "delay_ms": 10000, "cooldown_ms": 300000, "max_per_session": 2}
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE luv_heartbeat_config IS 'Per-user heartbeat configuration with trigger-level enable/disable and timing';

-- Heartbeat event log
CREATE TABLE IF NOT EXISTS luv_heartbeat_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  conversation_id UUID REFERENCES luv_conversations(id),
  trigger_type TEXT NOT NULL,
  trigger_context JSONB NOT NULL DEFAULT '{}',
  action_type TEXT NOT NULL DEFAULT 'nudge_message',
  action_payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'delivered', 'acknowledged', 'dismissed', 'expired')),
  fired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE luv_heartbeat_events IS 'Log of heartbeat triggers and their delivery status';

-- Index for fetching pending nudges for a conversation
CREATE INDEX IF NOT EXISTS idx_heartbeat_events_pending
  ON luv_heartbeat_events (conversation_id, status)
  WHERE status = 'pending';

-- Index for cooldown checks
CREATE INDEX IF NOT EXISTS idx_heartbeat_events_cooldown
  ON luv_heartbeat_events (user_id, trigger_type, fired_at DESC);

-- RLS policies
ALTER TABLE luv_heartbeat_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE luv_heartbeat_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own heartbeat config"
  ON luv_heartbeat_config FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own heartbeat events"
  ON luv_heartbeat_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own heartbeat events"
  ON luv_heartbeat_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own heartbeat events"
  ON luv_heartbeat_events FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role bypass for server-side operations
CREATE POLICY "Service role full access to heartbeat config"
  ON luv_heartbeat_config FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to heartbeat events"
  ON luv_heartbeat_events FOR ALL
  USING (auth.role() = 'service_role');
