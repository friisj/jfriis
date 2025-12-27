// Shared MCP core - used by both local (stdio) and remote (HTTP) MCP servers

// Tools
export {
  dbListTables,
  dbQuery,
  dbGet,
  dbCreate,
  dbUpdate,
  dbDelete,
} from './tools-core'

// Tables
export {
  tables,
  getTableColumns,
  isValidTable,
  getTableDefinition,
  type TableDefinition,
} from './tables'

// Types
export type {
  Response,
  SuccessResponse,
  ErrorResponse,
  DbQueryInput,
  DbGetInput,
  DbCreateInput,
  DbUpdateInput,
  DbDeleteInput,
  SupabaseClientType,
} from './types'

// Schemas (re-export for convenience)
export * from './schemas'
