/**
 * Remote MCP HTTP endpoint
 * Handles JSON-RPC 2.0 requests for MCP tools
 *
 * Phase 1: No auth (will add in Phase 2)
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

// Create Supabase client for remote MCP
// Phase 1: Using service role (will switch to user token in Phase 2)
function getSupabaseClient() {
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

    // Get Supabase client
    const supabase = getSupabaseClient()

    // Execute tool
    let result: unknown

    switch (toolName) {
      case 'db_list_tables':
        result = await dbListTables()
        break

      case 'db_query':
        result = await dbQuery(supabase, toolArgs as DbQueryInput)
        break

      case 'db_get':
        result = await dbGet(supabase, toolArgs as DbGetInput)
        break

      case 'db_create':
        result = await dbCreate(supabase, toolArgs as DbCreateInput)
        break

      case 'db_update':
        result = await dbUpdate(supabase, toolArgs as DbUpdateInput)
        break

      case 'db_delete':
        result = await dbDelete(supabase, toolArgs as DbDeleteInput)
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
