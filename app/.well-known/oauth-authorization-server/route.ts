/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414)
 *
 * Provides metadata about the OAuth authorization server endpoints.
 * MCP clients use this to discover OAuth endpoints.
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.jonfriis.com'

export async function GET() {
  const metadata = {
    // Required fields
    issuer: BASE_URL,
    authorization_endpoint: `${BASE_URL}/authorize`,
    token_endpoint: `${BASE_URL}/api/oauth/token`,

    // Dynamic Client Registration
    registration_endpoint: `${BASE_URL}/register`,

    // Supported features
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],

    // PKCE is required
    code_challenge_methods_required: true,

    // Scopes (optional for MCP)
    scopes_supported: [''],
  }

  return Response.json(metadata, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  })
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
