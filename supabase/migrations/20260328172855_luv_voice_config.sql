-- Add voice configuration to heartbeat config
ALTER TABLE luv_heartbeat_config
  ADD COLUMN IF NOT EXISTS voice_config JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN luv_heartbeat_config.voice_config IS 'Voice synthesis config: voiceId, speed, stability, style overrides';
