/**
 * MCP Server Manifest
 *
 * Discovery endpoint for Claude clients to learn about this MCP server.
 * Located at /.well-known/mcp.json per MCP specification.
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://jonfriis.com'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

export async function GET() {
  const manifest = {
    // Server identification
    name: 'jfriis',
    version: '1.0.0',
    description: 'Database CRUD tools for jonfriis.com',
    homepage: BASE_URL,

    // OAuth 2.1 authentication via Supabase
    authentication: {
      type: 'oauth2',
      // Supabase OAuth endpoints
      authorization_url: `${SUPABASE_URL}/auth/v1/authorize`,
      token_url: `${SUPABASE_URL}/auth/v1/token`,
      // PKCE required for public clients (Claude Mobile)
      pkce_required: true,
    },

    // MCP endpoints
    endpoints: {
      messages: `${BASE_URL}/api/mcp/v1/messages`,
    },

    // Available tools
    tools: [
      {
        name: 'db_list_tables',
        description: 'List all available database tables and their schemas',
      },
      {
        name: 'db_query',
        description: 'Query records from a table with filters, sorting, and pagination',
      },
      {
        name: 'db_get',
        description: 'Get a single record by ID or slug',
      },
      {
        name: 'db_create',
        description: 'Create a new record in a table',
      },
      {
        name: 'db_update',
        description: 'Update an existing record by ID',
      },
      {
        name: 'db_delete',
        description: 'Delete a record by ID',
      },
    ],

    // Rate limiting info
    rate_limits: {
      requests_per_minute: 60,
    },
  }

  return Response.json(manifest, {
    headers: {
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*',
    },
  })
}

// Handle CORS preflight
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
