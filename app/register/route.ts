/**
 * OAuth 2.0 Dynamic Client Registration Endpoint
 *
 * Implements RFC 7591 for MCP clients to register themselves.
 * This allows Claude and other MCP clients to obtain client credentials
 * without manual registration.
 *
 * POST /register
 * Body: { client_name, redirect_uris, ... }
 * Returns: { client_id, client_name, redirect_uris, ... }
 */

import { randomUUID } from 'crypto'

interface ClientRegistrationRequest {
  client_name?: string
  redirect_uris?: string[]
  grant_types?: string[]
  response_types?: string[]
  token_endpoint_auth_method?: string
  scope?: string
}

interface ClientRegistrationResponse {
  client_id: string
  client_name?: string
  redirect_uris?: string[]
  grant_types?: string[]
  response_types?: string[]
  token_endpoint_auth_method?: string
  scope?: string
  client_id_issued_at?: number
}

// In-memory client registry (for MVP - production would use database)
// Note: This works for serverless since we're using stateless OAuth codes
const registeredClients = new Map<string, ClientRegistrationResponse>()

export async function POST(request: Request) {
  try {
    const body: ClientRegistrationRequest = await request.json()

    console.log('DCR: Registration request received:', JSON.stringify(body))

    // Generate a client_id
    const clientId = randomUUID()

    // Build response
    const clientResponse: ClientRegistrationResponse = {
      client_id: clientId,
      client_name: body.client_name || 'MCP Client',
      redirect_uris: body.redirect_uris || [],
      grant_types: body.grant_types || ['authorization_code'],
      response_types: body.response_types || ['code'],
      token_endpoint_auth_method: body.token_endpoint_auth_method || 'none',
      scope: body.scope || '',
      client_id_issued_at: Math.floor(Date.now() / 1000),
    }

    // Store client (in production, this would go to database)
    registeredClients.set(clientId, clientResponse)

    console.log('DCR: Client registered successfully:', clientId)

    return Response.json(clientResponse, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('DCR: Registration error:', error)
    return Response.json(
      {
        error: 'invalid_client_metadata',
        error_description: error instanceof Error ? error.message : 'Invalid request',
      },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        },
      }
    )
  }
}

// Handle CORS preflight
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
