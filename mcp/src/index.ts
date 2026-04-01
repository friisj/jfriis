#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server'

import {
  dbListTables,
  dbQuery,
  dbGet,
  dbCreate,
  dbUpdate,
  dbDelete,
  type DbQueryInput,
  type DbGetInput,
  type DbCreateInput,
  type DbUpdateInput,
  type DbDeleteInput,
} from './tools.js'

// Import HTML as text (esbuild --loader:.html=text)
import appHtml from './app.html'

// Create server instance using high-level McpServer API
const server = new McpServer(
  {
    name: 'jfriis-mcp',
    version: '1.1.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
)

// ---------------------------------------------------------------------------
// UI Resource — the MCP App HTML
// ---------------------------------------------------------------------------

registerAppResource(
  server,
  'jfriis Dashboard',
  'ui://jfriis/dashboard',
  {
    description: 'Interactive dashboard for jfriis.com database — browse tables, query data, inspect records.',
  },
  async () => ({
    contents: [
      {
        uri: 'ui://jfriis/dashboard',
        mimeType: RESOURCE_MIME_TYPE,
        text: appHtml,
      },
    ],
  })
)

// ---------------------------------------------------------------------------
// Tools — existing db_* tools, now registered via McpServer API
// Each tool linked to the dashboard UI resource via _meta.ui
// ---------------------------------------------------------------------------

const UI_META = {
  ui: { resourceUri: 'ui://jfriis/dashboard' },
}

// db_list_tables — model + app visible (default)
registerAppTool(
  server,
  'db_list_tables',
  {
    description: 'List all registered tables and their schemas',
    _meta: UI_META,
  },
  async () => {
    const result = await dbListTables()
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      isError: result.error !== undefined,
    }
  }
)

// db_query
registerAppTool(
  server,
  'db_query',
  {
    description: 'Query records from a table with filtering, ordering, and pagination',
    inputSchema: {
      table: z.string().describe('Table name'),
      select: z.string().optional().describe('Columns to select (default: "*")'),
      filter: z.record(z.unknown()).optional().describe('Equality filters as key-value pairs'),
      filter_in: z.record(z.array(z.unknown())).optional().describe('IN filters as key-array pairs'),
      filter_like: z.record(z.string()).optional().describe('ILIKE filters as key-pattern pairs'),
      order_by: z.object({
        column: z.string(),
        ascending: z.boolean().optional(),
      }).optional().describe('Order by column'),
      limit: z.number().optional().describe('Max records to return (default: 100, max: 1000)'),
      offset: z.number().optional().describe('Records to skip (default: 0)'),
    },
    _meta: UI_META,
  },
  async (args) => {
    const result = await dbQuery(args as unknown as DbQueryInput)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      isError: result.error !== undefined,
    }
  }
)

// db_get
registerAppTool(
  server,
  'db_get',
  {
    description: 'Fetch a single record by ID or slug',
    inputSchema: {
      table: z.string().describe('Table name'),
      id: z.string().optional().describe('UUID of the record'),
      slug: z.string().optional().describe('URL-friendly identifier'),
    },
    _meta: UI_META,
  },
  async (args) => {
    const result = await dbGet(args as unknown as DbGetInput)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      isError: result.error !== undefined,
    }
  }
)

// db_create
registerAppTool(
  server,
  'db_create',
  {
    description: 'Insert a new record. Validates against table schema.',
    inputSchema: {
      table: z.string().describe('Table name'),
      data: z.record(z.unknown()).describe('Record data to insert'),
    },
    _meta: UI_META,
  },
  async (args) => {
    const result = await dbCreate(args as unknown as DbCreateInput)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      isError: result.error !== undefined,
    }
  }
)

// db_update
registerAppTool(
  server,
  'db_update',
  {
    description: 'Update an existing record by ID. Validates against table schema.',
    inputSchema: {
      table: z.string().describe('Table name'),
      id: z.string().describe('UUID of the record to update'),
      data: z.record(z.unknown()).describe('Fields to update'),
    },
    _meta: UI_META,
  },
  async (args) => {
    const result = await dbUpdate(args as unknown as DbUpdateInput)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      isError: result.error !== undefined,
    }
  }
)

// db_delete
registerAppTool(
  server,
  'db_delete',
  {
    description: 'Delete a record by ID',
    inputSchema: {
      table: z.string().describe('Table name'),
      id: z.string().describe('UUID of the record to delete'),
    },
    _meta: UI_META,
  },
  async (args) => {
    const result = await dbDelete(args as unknown as DbDeleteInput)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      isError: result.error !== undefined,
    }
  }
)

// ---------------------------------------------------------------------------
// App-only tool — only callable by the UI, invisible to the model
// For testing bidirectional communication
// ---------------------------------------------------------------------------

registerAppTool(
  server,
  'app_status',
  {
    description: 'Returns app connection status and server metadata. App-only — not visible to the model.',
    _meta: {
      ui: {
        resourceUri: 'ui://jfriis/dashboard',
        visibility: ['app'],
      },
    },
  },
  async () => {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          server: 'jfriis-mcp',
          version: '1.1.0',
          uptime_s: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
          node_version: process.version,
        }, null, 2),
      }],
    }
  }
)

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('jfriis-mcp server v1.1.0 running on stdio (MCP Apps enabled)')
}

main().catch((error) => {
  console.error('Server error:', error)
  process.exit(1)
})
