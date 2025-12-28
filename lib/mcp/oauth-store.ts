/**
 * OAuth Authorization Code Store
 *
 * In-memory storage for OAuth 2.0 authorization codes with PKCE support.
 * Codes are single-use and expire after 10 minutes.
 *
 * For production scale, consider migrating to Vercel KV or Redis.
 */

import { createHash, randomBytes } from 'crypto'

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

// In-memory store - survives within a single serverless instance
// For Vercel, this works for the token exchange since it happens quickly
const authCodes = new Map<string, OAuthRequest>()

// Code expiration time (10 minutes)
const CODE_EXPIRY_MS = 10 * 60 * 1000

/**
 * Validate a redirect URI against allowed list
 */
export function isValidRedirectUri(uri: string): boolean {
  return ALLOWED_REDIRECT_URIS.some(allowed => uri.startsWith(allowed))
}

/**
 * Generate a secure authorization code and store the OAuth request
 */
export function generateAuthCode(request: Omit<OAuthRequest, 'created_at'>): string {
  // Clean up expired codes first
  cleanupExpiredCodes()

  // Generate a secure random code
  const code = randomBytes(32).toString('base64url')

  // Store the request with timestamp
  authCodes.set(code, {
    ...request,
    created_at: Date.now(),
  })

  return code
}

/**
 * Consume an authorization code (single-use)
 * Returns the stored request if valid, null if invalid/expired/used
 */
export function consumeAuthCode(code: string): OAuthRequest | null {
  const request = authCodes.get(code)

  if (!request) {
    return null
  }

  // Delete immediately (single-use)
  authCodes.delete(code)

  // Check if expired
  if (Date.now() - request.created_at > CODE_EXPIRY_MS) {
    return null
  }

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
 * Clean up expired authorization codes
 */
function cleanupExpiredCodes(): void {
  const now = Date.now()

  for (const [code, request] of authCodes.entries()) {
    if (now - request.created_at > CODE_EXPIRY_MS) {
      authCodes.delete(code)
    }
  }
}

/**
 * Get the count of active codes (for debugging)
 */
export function getActiveCodeCount(): number {
  cleanupExpiredCodes()
  return authCodes.size
}
