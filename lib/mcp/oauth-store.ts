/**
 * OAuth Authorization Code Store
 *
 * Uses encrypted codes that contain all OAuth data, avoiding the need for
 * server-side storage. This works on serverless platforms where in-memory
 * state doesn't persist across function invocations.
 *
 * The authorization code IS the encrypted payload - no database needed.
 */

import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto'

// Allowed redirect URIs for security
const ALLOWED_REDIRECT_URIS = [
  'https://claude.ai/api/mcp/auth_callback',
  'https://claude.com/api/mcp/auth_callback',
]

export interface OAuthRequest {
  client_id: string
  redirect_uri: string
  state: string
  code_challenge: string
  code_challenge_method: 'S256' | 'plain'
  user_id: string
  access_token: string
  refresh_token?: string
  expires_in: number
  created_at: number
}

// Code expiration time (10 minutes)
const CODE_EXPIRY_MS = 10 * 60 * 1000

// Track used codes to prevent replay (short-lived, in-memory is OK for this)
// Note: In serverless, this only prevents replay within the same instance
// The expiry check provides the main protection
const usedCodes = new Set<string>()

/**
 * Get encryption key from environment
 * Uses SUPABASE_SERVICE_ROLE_KEY as the secret (hashed to 32 bytes for AES-256)
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for OAuth code encryption')
  }
  // Hash to get consistent 32-byte key for AES-256
  return createHash('sha256').update(secret).digest()
}

/**
 * Encrypt data using AES-256-GCM
 */
function encrypt(data: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(data, 'utf8', 'base64url')
  encrypted += cipher.final('base64url')

  const authTag = cipher.getAuthTag()

  // Combine: iv (12 bytes) + authTag (16 bytes) + encrypted data
  const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'base64url')])
  return combined.toString('base64url')
}

/**
 * Decrypt data using AES-256-GCM
 */
function decrypt(encryptedData: string): string | null {
  try {
    const key = getEncryptionKey()
    const combined = Buffer.from(encryptedData, 'base64url')

    // Extract: iv (12 bytes) + authTag (16 bytes) + encrypted data
    const iv = combined.subarray(0, 12)
    const authTag = combined.subarray(12, 28)
    const encrypted = combined.subarray(28)

    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted.toString('base64url'), 'base64url', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch {
    return null
  }
}

/**
 * Validate a redirect URI against allowed list
 */
export function isValidRedirectUri(uri: string): boolean {
  return ALLOWED_REDIRECT_URIS.some(allowed => uri.startsWith(allowed))
}

/**
 * Generate an encrypted authorization code containing all OAuth request data
 */
export function generateAuthCode(request: Omit<OAuthRequest, 'created_at'>): string {
  const fullRequest: OAuthRequest = {
    ...request,
    created_at: Date.now(),
  }

  // Encrypt the entire request as the authorization code
  const code = encrypt(JSON.stringify(fullRequest))
  return code
}

/**
 * Consume an authorization code (single-use)
 * Decrypts the code to get the stored request.
 * Returns the stored request if valid, null if invalid/expired/used
 */
export function consumeAuthCode(code: string): OAuthRequest | null {
  // Check if code was already used (replay protection)
  const codeHash = createHash('sha256').update(code).digest('hex').substring(0, 16)
  if (usedCodes.has(codeHash)) {
    return null
  }

  // Decrypt the code
  const decrypted = decrypt(code)
  if (!decrypted) {
    return null
  }

  let request: OAuthRequest
  try {
    request = JSON.parse(decrypted)
  } catch {
    return null
  }

  // Check if expired
  if (Date.now() - request.created_at > CODE_EXPIRY_MS) {
    return null
  }

  // Mark as used (single-use)
  usedCodes.add(codeHash)

  return request
}

/**
 * Verify PKCE code_verifier against stored code_challenge
 *
 * For S256: BASE64URL(SHA256(code_verifier)) === code_challenge
 * For plain: code_verifier === code_challenge (not recommended)
 */
export function verifyPkce(
  codeVerifier: string,
  codeChallenge: string,
  method: 'S256' | 'plain'
): boolean {
  if (method === 'plain') {
    return codeVerifier === codeChallenge
  }

  // S256 method
  const hash = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')

  return hash === codeChallenge
}

/**
 * Get the count of used codes (for debugging)
 */
export function getUsedCodeCount(): number {
  return usedCodes.size
}
