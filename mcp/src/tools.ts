/**
 * Local MCP tools - thin wrapper around shared lib/mcp/tools-core
 * Uses service role Supabase client for full database access
 */
import { supabase } from './supabase.js'
import {
  dbListTables as dbListTablesCore,
  dbQuery as dbQueryCore,
  dbGet as dbGetCore,
  dbCreate as dbCreateCore,
  dbUpdate as dbUpdateCore,
  dbDelete as dbDeleteCore,
} from '../../lib/mcp/tools-core.js'

// Re-export types
export type {
  DbQueryInput,
  DbGetInput,
  DbCreateInput,
  DbUpdateInput,
  DbDeleteInput,
} from '../../lib/mcp/types.js'

// Wrap each tool to inject the local supabase client
export async function dbListTables() {
  return dbListTablesCore()
}

export async function dbQuery(input: Parameters<typeof dbQueryCore>[1]) {
  return dbQueryCore(supabase, input)
}

export async function dbGet(input: Parameters<typeof dbGetCore>[1]) {
  return dbGetCore(supabase, input)
}

export async function dbCreate(input: Parameters<typeof dbCreateCore>[1]) {
  return dbCreateCore(supabase, input)
}

export async function dbUpdate(input: Parameters<typeof dbUpdateCore>[1]) {
  return dbUpdateCore(supabase, input)
}

export async function dbDelete(input: Parameters<typeof dbDeleteCore>[1]) {
  return dbDeleteCore(supabase, input)
}
