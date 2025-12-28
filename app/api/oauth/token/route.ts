/**
 * OAuth 2.0 Token Endpoint
 *
 * Exchanges an authorization code for an access token.
 * Validates PKCE code_verifier against the stored code_challenge.
 *
 * POST /api/oauth/token
 * Body (application/json or application/x-www-form-urlencoded):
 *   - grant_type: Must be "authorization_code"
 *   - code: The authorization code
 *   - redirect_uri: Must match the original request
 *   - client_id: The client identifier
 *   - code_verifier: PKCE verifier
 */

import { consumeAuthCode, verifyPkce } from '@/lib/mcp/oauth-store'

export async function POST(request: Request) {
  try {
    // Parse request body (support both JSON and form-urlencoded)
    let body: Record<string, string>

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      body = await request.json()
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text()
      body = Object.fromEntries(new URLSearchParams(text))
    } else {
      // Try JSON by default
      body = await request.json()
    }

    const { grant_type, code, redirect_uri, client_id, code_verifier } = body

    // Validate grant_type
    if (grant_type !== 'authorization_code') {
      return errorResponse('unsupported_grant_type', 'grant_type must be "authorization_code"')
    }

    // Validate required parameters
    if (!code) {
      return errorResponse('invalid_request', 'Missing code parameter')
    }
    if (!redirect_uri) {
      return errorResponse('invalid_request', 'Missing redirect_uri parameter')
    }
    if (!client_id) {
      return errorResponse('invalid_request', 'Missing client_id parameter')
    }
    if (!code_verifier) {
      return errorResponse('invalid_request', 'Missing code_verifier parameter')
    }

    // Consume the authorization code (single-use)
    const storedRequest = consumeAuthCode(code)

    if (!storedRequest) {
      return errorResponse('invalid_grant', 'Invalid or expired authorization code')
    }

    // Validate client_id matches
    if (storedRequest.client_id !== client_id) {
      return errorResponse('invalid_grant', 'client_id mismatch')
    }

    // Validate redirect_uri matches
    if (storedRequest.redirect_uri !== redirect_uri) {
      return errorResponse('invalid_grant', 'redirect_uri mismatch')
    }

    // Verify PKCE
    const pkceValid = verifyPkce(
      code_verifier,
      storedRequest.code_challenge,
      storedRequest.code_challenge_method
    )

    if (!pkceValid) {
      return errorResponse('invalid_grant', 'Invalid code_verifier')
    }

    // Return the access token (the Supabase JWT we stored)
    return Response.json({
      access_token: storedRequest.access_token,
      token_type: 'Bearer',
      expires_in: storedRequest.expires_in,
      refresh_token: storedRequest.refresh_token,
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Token endpoint error:', error)
    return errorResponse('server_error', 'Internal server error', 500)
  }
}

function errorResponse(error: string, description: string, status = 400) {
  return Response.json(
    { error, error_description: description },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache',
      },
    }
  )
}

// Handle CORS for token endpoint
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
