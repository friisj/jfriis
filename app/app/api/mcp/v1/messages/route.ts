/**
 * Remote MCP HTTP endpoint
 * Handles JSON-RPC 2.0 requests for MCP tools
 *
 * Phase 3: Role-based permissions (admin/editor)
 */
import { createClient } from '@supabase/supabase-js'
import {
  dbListTables,
  dbQuery,
  dbGet,
  dbCreate,
  dbUpdate,
  dbDelete,
} from '@/lib/mcp/tools-core'
import type {
  DbQueryInput,
  DbGetInput,
  DbCreateInput,
  DbUpdateInput,
  DbDeleteInput,
} from '@/lib/mcp/types'
import {
  canAccess,
  getOperationType,
  extractProjectId,
  permissionDeniedError,
  type McpUser,
  type Role,
} from '@/lib/mcp/permissions'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/mcp/rate-limit'

// Create Supabase client with service role for database operations
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Create Supabase client for token validation (anon key)
function getAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Validate Bearer token and return user
async function validateToken(request: Request): Promise<{ user: { id: string; email?: string } } | { error: string }> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid Authorization header' }
  }

  const token = authHeader.slice(7)

  if (!token) {
    return { error: 'Empty token' }
  }

  const authClient = getAuthClient()
  const { data: { user }, error } = await authClient.auth.getUser(token)

  if (error || !user) {
    return { error: error?.message || 'Invalid token' }
  }

  return { user: { id: user.id, email: user.email } }
}

// JSON-RPC 2.0 error codes
const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
}

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number | null
  method: string
  params?: {
    name: string
    arguments?: Record<string, unknown>
  }
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

function jsonRpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message, data },
  }
}

function jsonRpcSuccess(id: string | number | null, result: unknown): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result,
  }
}

export async function POST(request: Request) {
  let requestId: string | number | null = null

  try {
    // Validate authentication first
    const authResult = await validateToken(request)
    if ('error' in authResult) {
      return Response.json(
        { error: authResult.error },
        { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
      )
    }

    // Get Supabase client for DB operations and profile lookup
    const supabase = getServiceClient()

    // Fetch user profile to get role and assigned projects
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, assigned_projects')
      .eq('id', authResult.user.id)
      .single()

    // Build McpUser with profile data (default to editor if no profile)
    const mcpUser: McpUser = {
      id: authResult.user.id,
      email: authResult.user.email,
      role: (profile?.role as Role) || 'editor',
      assigned_projects: profile?.assigned_projects || [],
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(mcpUser.id)
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
      return Response.json(
        { error: 'Rate limit exceeded. Try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter > 0 ? retryAfter : 60),
            ...getRateLimitHeaders(rateLimitResult),
          },
        }
      )
    }

    // Parse request body
    let body: JsonRpcRequest
    try {
      body = await request.json()
      requestId = body.id ?? null
    } catch {
      return Response.json(
        jsonRpcError(null, JSON_RPC_ERRORS.PARSE_ERROR, 'Invalid JSON'),
        { status: 200 } // JSON-RPC always returns 200
      )
    }

    // Validate JSON-RPC format
    if (body.jsonrpc !== '2.0') {
      return Response.json(
        jsonRpcError(requestId, JSON_RPC_ERRORS.INVALID_REQUEST, 'Invalid JSON-RPC version'),
        { status: 200 }
      )
    }

    // Only support tools/call method
    if (body.method !== 'tools/call') {
      return Response.json(
        jsonRpcError(requestId, JSON_RPC_ERRORS.METHOD_NOT_FOUND, `Method not found: ${body.method}`),
        { status: 200 }
      )
    }

    // Extract tool name and arguments
    const { name: toolName, arguments: toolArgs = {} } = body.params ?? {}

    if (!toolName) {
      return Response.json(
        jsonRpcError(requestId, JSON_RPC_ERRORS.INVALID_PARAMS, 'Missing tool name'),
        { status: 200 }
      )
    }

    // Check permissions before executing tool
    const operation = getOperationType(toolName)
    const tableName = (toolArgs as { table?: string }).table || ''

    // For write operations, we need to check project-level access
    if (operation !== 'read') {
      let projectId = extractProjectId(toolName, toolArgs as Record<string, unknown>)

      // For update/delete, we may need to look up the existing record's project_id
      if ((toolName === 'db_update' || toolName === 'db_delete') && !projectId && tableName) {
        const recordId = (toolArgs as { id?: string }).id
        if (recordId) {
          const { data: existingRecord } = await supabase
            .from(tableName)
            .select('project_id')
            .eq('id', recordId)
            .single()
          projectId = existingRecord?.project_id
        }
      }

      if (!canAccess(mcpUser, operation, tableName, projectId)) {
        const error = permissionDeniedError(operation, tableName)
        return Response.json(
          jsonRpcError(requestId, error.code, error.message),
          { status: 200 }
        )
      }
    }

    // Execute tool
    let result: unknown

    switch (toolName) {
      case 'db_list_tables':
        result = await dbListTables()
        break

      case 'db_query':
        result = await dbQuery(supabase, toolArgs as unknown as DbQueryInput)
        break

      case 'db_get':
        result = await dbGet(supabase, toolArgs as unknown as DbGetInput)
        break

      case 'db_create':
        result = await dbCreate(supabase, toolArgs as unknown as DbCreateInput)
        break

      case 'db_update':
        result = await dbUpdate(supabase, toolArgs as unknown as DbUpdateInput)
        break

      case 'db_delete':
        result = await dbDelete(supabase, toolArgs as unknown as DbDeleteInput)
        break

      default:
        return Response.json(
          jsonRpcError(requestId, JSON_RPC_ERRORS.METHOD_NOT_FOUND, `Unknown tool: ${toolName}`),
          { status: 200 }
        )
    }

    // Return result in MCP format
    return Response.json(
      jsonRpcSuccess(requestId, {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('MCP endpoint error:', error)
    return Response.json(
      jsonRpcError(
        requestId,
        JSON_RPC_ERRORS.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Internal error'
      ),
      { status: 200 }
    )
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // Will restrict in Phase 2
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
