-- WebAuthn Passkey Support
-- Adds tables for credential storage and challenge management

-- WebAuthn credential storage
CREATE TABLE webauthn_credentials (
  id TEXT PRIMARY KEY,                -- credential ID (base64url encoded)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  public_key BYTEA NOT NULL,          -- COSE public key
  counter BIGINT NOT NULL DEFAULT 0,  -- signature counter (replay protection)
  device_type TEXT NOT NULL,           -- 'singleDevice' | 'multiDevice'
  backed_up BOOLEAN NOT NULL DEFAULT false,
  transports TEXT[],                   -- 'internal', 'usb', 'ble', 'nfc', 'hybrid'
  name TEXT,                           -- user-assigned friendly name
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_webauthn_credentials_user ON webauthn_credentials(user_id);

ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage passkeys"
  ON webauthn_credentials FOR ALL
  USING (is_admin());

-- Temporary challenge storage for WebAuthn ceremonies
CREATE TABLE webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge TEXT NOT NULL,             -- base64url encoded challenge
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webauthn_challenges_expires ON webauthn_challenges(expires_at);

ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage challenges"
  ON webauthn_challenges FOR ALL
  USING (is_admin());

-- Cleanup function for expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_webauthn_challenges()
RETURNS void AS $$
BEGIN
  DELETE FROM webauthn_challenges WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE webauthn_credentials IS 'WebAuthn passkey credentials for passwordless authentication';
COMMENT ON TABLE webauthn_challenges IS 'Temporary WebAuthn challenge storage for registration/authentication ceremonies';
