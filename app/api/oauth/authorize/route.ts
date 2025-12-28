/**
 * OAuth 2.0 Authorization Endpoint
 *
 * Handles the authorization request from OAuth clients (like Claude).
 * Validates params, stores in cookie, and redirects to login or consent.
 *
 * GET /api/oauth/authorize
 * Params:
 *   - client_id: Client identifier
 *   - redirect_uri: Where to send the user after authorization
 *   - response_type: Must be "code"
 *   - state: CSRF protection token
 *   - code_challenge: PKCE challenge
 *   - code_challenge_method: Must be "S256"
 */

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isValidRedirectUri } from '@/lib/mcp/oauth-store'

const OAUTH_COOKIE_NAME = 'oauth_request'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const params = url.searchParams

  // Extract OAuth parameters
  const client_id = params.get('client_id')
  const redirect_uri = params.get('redirect_uri')
  const response_type = params.get('response_type')
  const state = params.get('state')
  const code_challenge = params.get('code_challenge')
  const code_challenge_method = params.get('code_challenge_method')

  // Validate required parameters
  if (!client_id) {
    return errorResponse('invalid_request', 'Missing client_id')
  }
  if (!redirect_uri) {
    return errorResponse('invalid_request', 'Missing redirect_uri')
  }
  if (!response_type || response_type !== 'code') {
    return errorResponse('unsupported_response_type', 'response_type must be "code"')
  }
  if (!state) {
    return errorResponse('invalid_request', 'Missing state parameter')
  }
  if (!code_challenge) {
    return errorResponse('invalid_request', 'Missing code_challenge (PKCE required)')
  }
  if (!code_challenge_method || code_challenge_method !== 'S256') {
    return errorResponse('invalid_request', 'code_challenge_method must be "S256"')
  }

  // Validate redirect URI
  if (!isValidRedirectUri(redirect_uri)) {
    return errorResponse('invalid_request', 'Invalid redirect_uri')
  }

  // Store OAuth request in cookie for after login
  const oauthRequest = {
    client_id,
    redirect_uri,
    state,
    code_challenge,
    code_challenge_method,
  }

  const cookieStore = await cookies()
  cookieStore.set(OAUTH_COOKIE_NAME, JSON.stringify(oauthRequest), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })

  // Check if user is already authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // User is logged in, redirect to consent page
    redirect('/oauth/authorize')
  } else {
    // User needs to log in first
    redirect('/login?redirect=/oauth/authorize')
  }
}

function errorResponse(error: string, description: string) {
  return Response.json(
    { error, error_description: description },
    { status: 400 }
  )
}
