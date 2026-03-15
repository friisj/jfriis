-- Fix WebAuthn public_key column encoding
--
-- The public_key column was BYTEA. The application stores and retrieves it as
-- a base64 string. PostgREST may return BYTEA in either base64 or hex (\x...)
-- format depending on the version, causing signature verification to fail.
--
-- Changing to TEXT ensures the base64 string is stored and retrieved as-is,
-- with no implicit encoding/decoding by PostgREST.
--
-- Existing data: BYTEA contains the actual binary COSE key bytes (PostgREST
-- decoded the base64 string on insert). encode(..., 'base64') converts them
-- back to the base64 representation the application expects to read.

ALTER TABLE webauthn_credentials
  ALTER COLUMN public_key TYPE TEXT
  USING encode(public_key, 'base64');

COMMENT ON COLUMN webauthn_credentials.public_key IS 'COSE public key, stored as base64-encoded text';
