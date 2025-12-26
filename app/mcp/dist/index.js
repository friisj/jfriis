#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { dbListTables, dbQuery, dbGet, dbCreate, dbUpdate, dbDelete, } from './tools.js';
// Create server instance
const server = new Server({
    name: 'jfriis-mcp',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'db_list_tables',
                description: 'List all registered tables and their schemas',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: [],
                },
            },
            {
                name: 'db_query',
                description: 'Query records from a table with filtering, ordering, and pagination',
                inputSchema: {
                    type: 'object',
                    properties: {
                        table: {
                            type: 'string',
                            description: 'Table name',
                        },
                        select: {
                            type: 'string',
                            description: 'Columns to select (default: "*")',
                        },
                        filter: {
                            type: 'object',
                            description: 'Equality filters as key-value pairs',
                        },
                        filter_in: {
                            type: 'object',
                            description: 'IN filters as key-array pairs',
                        },
                        filter_like: {
                            type: 'object',
                            description: 'ILIKE filters as key-pattern pairs',
                        },
                        order_by: {
                            type: 'object',
                            properties: {
                                column: { type: 'string' },
                                ascending: { type: 'boolean' },
                            },
                            required: ['column'],
                            description: 'Order by column',
                        },
                        limit: {
                            type: 'number',
                            description: 'Max records to return (default: 100, max: 1000)',
                        },
                        offset: {
                            type: 'number',
                            description: 'Records to skip (default: 0)',
                        },
                    },
                    required: ['table'],
                },
            },
            {
                name: 'db_get',
                description: 'Fetch a single record by ID or slug',
                inputSchema: {
                    type: 'object',
                    properties: {
                        table: {
                            type: 'string',
                            description: 'Table name',
                        },
                        id: {
                            type: 'string',
                            description: 'UUID of the record',
                        },
                        slug: {
                            type: 'string',
                            description: 'URL-friendly identifier',
                        },
                    },
                    required: ['table'],
                },
            },
            {
                name: 'db_create',
                description: 'Insert a new record. Validates against table schema.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        table: {
                            type: 'string',
                            description: 'Table name',
                        },
                        data: {
                            type: 'object',
                            description: 'Record data to insert',
                        },
                    },
                    required: ['table', 'data'],
                },
            },
            {
                name: 'db_update',
                description: 'Update an existing record by ID. Validates against table schema.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        table: {
                            type: 'string',
                            description: 'Table name',
                        },
                        id: {
                            type: 'string',
                            description: 'UUID of the record to update',
                        },
                        data: {
                            type: 'object',
                            description: 'Fields to update',
                        },
                    },
                    required: ['table', 'id', 'data'],
                },
            },
            {
                name: 'db_delete',
                description: 'Delete a record by ID',
                inputSchema: {
                    type: 'object',
                    properties: {
                        table: {
                            type: 'string',
                            description: 'Table name',
                        },
                        id: {
                            type: 'string',
                            description: 'UUID of the record to delete',
                        },
                    },
                    required: ['table', 'id'],
                },
            },
        ],
    };
});
// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        let result;
        switch (name) {
            case 'db_list_tables':
                result = await dbListTables();
                break;
            case 'db_query':
                result = await dbQuery(args);
                break;
            case 'db_get':
                result = await dbGet(args);
                break;
            case 'db_create':
                result = await dbCreate(args);
                break;
            case 'db_update':
                result = await dbUpdate(args);
                break;
            case 'db_delete':
                result = await dbDelete(args);
                break;
            default:
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ error: `Unknown tool: ${name}` }),
                        },
                    ],
                    isError: true,
                };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
            isError: result.error !== undefined,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({ error: message }),
                },
            ],
            isError: true,
        };
    }
});
// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('jfriis-mcp server running on stdio');
}
main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
