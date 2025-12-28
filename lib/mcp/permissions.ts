/**
 * MCP Permissions Module
 *
 * Role-based access control for remote MCP.
 * - admin: Full access to everything
 * - editor: Read all, write only to assigned projects
 */

import { tables } from './tables'

export type Role = 'admin' | 'editor'
export type Operation = 'read' | 'create' | 'update' | 'delete'

export interface McpUser {
  id: string
  email?: string
  role: Role
  assigned_projects: string[]
}

/**
 * Check if a user can perform an operation on a table/record.
 *
 * @param user - The authenticated user with role and assigned projects
 * @param operation - The operation being performed
 * @param tableName - The table being accessed
 * @param projectId - The project_id of the record (if applicable)
 * @returns true if access is allowed
 */
export function canAccess(
  user: McpUser,
  operation: Operation,
  tableName: string,
  projectId?: string
): boolean {
  // Admins can do anything
  if (user.role === 'admin') {
    return true
  }

  // Everyone can read
  if (operation === 'read') {
    return true
  }

  // For write operations, check if table has project_id
  const tableDefinition = tables[tableName]

  if (!tableDefinition) {
    // Unknown table - deny by default
    return false
  }

  // If table doesn't have project_id, only admin can write
  if (!tableDefinition.hasProjectId) {
    return false
  }

  // If table has project_id, check if user is assigned to the project
  if (projectId && user.assigned_projects.includes(projectId)) {
    return true
  }

  return false
}

/**
 * Map tool name to operation type.
 */
export function getOperationType(toolName: string): Operation {
  if (toolName === 'db_query' || toolName === 'db_get' || toolName === 'db_list_tables') {
    return 'read'
  }
  if (toolName === 'db_create') {
    return 'create'
  }
  if (toolName === 'db_update') {
    return 'update'
  }
  if (toolName === 'db_delete') {
    return 'delete'
  }
  return 'read' // Default to read for unknown tools
}

/**
 * Extract project_id from tool arguments.
 *
 * For tables with direct project_id, it's in the data.
 * For junction tables, we may need to look it up.
 */
export function extractProjectId(
  toolName: string,
  args: Record<string, unknown>
): string | undefined {
  // For create operations, project_id is in the data
  if (toolName === 'db_create') {
    const data = args.data as Record<string, unknown> | undefined
    return data?.project_id as string | undefined
  }

  // For update/delete, we'd need to look up the existing record
  // For now, we'll handle this in the endpoint by fetching the record first
  return args.project_id as string | undefined
}

/**
 * Permission error response for JSON-RPC.
 */
export function permissionDeniedError(operation: Operation, tableName: string) {
  return {
    code: -32603,
    message: `Permission denied: ${operation} on ${tableName} requires admin role or project assignment`,
  }
}
