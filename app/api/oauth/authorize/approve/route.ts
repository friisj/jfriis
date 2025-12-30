/**
 * OAuth Authorization Approval Endpoint
 *
 * Called when user approves the authorization request.
 * Generates an authorization code and returns the redirect URL.
 *
 * POST /api/oauth/authorize/approve
 */

import { cookies } from 'next/headers'
import { generateAuthCode, isValidRedirectUri } from '@/lib/mcp/oauth-store'

const OAUTH_COOKIE_NAME = 'oauth_request'

interface ApproveRequest {
  oauth_request: {
    client_id: string
    redirect_uri: string
    state: string
    code_challenge: string
    code_challenge_method: 'S256' | 'plain'
  }
  access_token: string
  refresh_token?: string
  expires_in: number
  user_id: string
}

export async function POST(request: Request) {
  try {
    const body: ApproveRequest = await request.json()

    const { oauth_request, access_token, refresh_token, expires_in, user_id } = body

    // Validate required fields
    if (!oauth_request || !access_token || !user_id) {
      return Response.json(
        { error: 'invalid_request', error_description: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate redirect URI
    if (!isValidRedirectUri(oauth_request.redirect_uri)) {
      return Response.json(
        { error: 'invalid_request', error_description: 'Invalid redirect_uri' },
        { status: 400 }
      )
    }

    // Generate authorization code
    const code = generateAuthCode({
      client_id: oauth_request.client_id,
      redirect_uri: oauth_request.redirect_uri,
      state: oauth_request.state,
      code_challenge: oauth_request.code_challenge,
      code_challenge_method: oauth_request.code_challenge_method,
      user_id,
      access_token,
      refresh_token,
      expires_in,
    })

    // Clear the OAuth cookie
    const cookieStore = await cookies()
    cookieStore.delete(OAUTH_COOKIE_NAME)

    // Build redirect URL with authorization code
    const redirectUrl = new URL(oauth_request.redirect_uri)
    redirectUrl.searchParams.set('code', code)
    if (oauth_request.state) {
      redirectUrl.searchParams.set('state', oauth_request.state)
    }

    return Response.json({
      redirect_url: redirectUrl.toString(),
    })
  } catch (error) {
    console.error('OAuth approve error:', error)
    return Response.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    )
  }
}
