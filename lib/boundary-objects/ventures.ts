/**
 * Ventures Boundary Objects
 *
 * Shared types, validation, and utilities for ventures (portfolio projects).
 * Note: The database table is called 'projects' but the entity is 'venture' going forward.
 */

// ============================================================================
// RE-EXPORTS FROM MCP SCHEMAS
// ============================================================================

export {
  VentureSchema,
  VentureCreateSchema,
  VentureUpdateSchema,
  type Venture,
  type VentureCreate,
  type VentureUpdate,
} from '@/lib/mcp/schemas/ventures'

// ============================================================================
// STATUS AND TYPE DEFINITIONS
// ============================================================================

/**
 * Valid venture statuses
 */
export type VentureStatus = 'draft' | 'active' | 'archived' | 'completed'

/**
 * All valid venture status values
 */
export const VENTURE_STATUSES: readonly VentureStatus[] = [
  'draft',
  'active',
  'archived',
  'completed',
] as const

/**
 * Status display labels
 */
export const VENTURE_STATUS_LABELS: Record<VentureStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
  completed: 'Completed',
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Result type for validation functions
 */
export type DataResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Validate a venture slug
 * - Must be lowercase
 * - Must be kebab-case (letters, numbers, hyphens only)
 * - Must not start or end with a hyphen
 * - Must be at least 1 character
 */
export function validateVentureSlug(slug: string): DataResult<string> {
  if (!slug || slug.length === 0) {
    return { success: false, error: 'Slug is required' }
  }

  const trimmed = slug.trim().toLowerCase()

  if (trimmed !== slug) {
    return { success: false, error: 'Slug must be lowercase with no leading/trailing whitespace' }
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { success: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' }
  }

  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { success: false, error: 'Slug cannot start or end with a hyphen' }
  }

  if (slug.includes('--')) {
    return { success: false, error: 'Slug cannot contain consecutive hyphens' }
  }

  return { success: true, data: slug }
}

/**
 * Validate a venture status
 */
export function validateVentureStatus(status: string): DataResult<VentureStatus> {
  if (!status) {
    return { success: false, error: 'Status is required' }
  }

  if (!VENTURE_STATUSES.includes(status as VentureStatus)) {
    return {
      success: false,
      error: `Invalid status "${status}". Must be one of: ${VENTURE_STATUSES.join(', ')}`,
    }
  }

  return { success: true, data: status as VentureStatus }
}

/**
 * Validate a venture title
 */
export function validateVentureTitle(title: string): DataResult<string> {
  if (!title || title.trim().length === 0) {
    return { success: false, error: 'Title is required' }
  }

  const trimmed = title.trim()

  if (trimmed.length > 200) {
    return { success: false, error: 'Title must be 200 characters or less' }
  }

  return { success: true, data: trimmed }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a slug from a title
 */
export function generateVentureSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Replace multiple hyphens with single
    .replace(/^-|-$/g, '')         // Remove leading/trailing hyphens
}

/**
 * Check if a venture is published
 */
export function isVenturePublished(venture: { published?: boolean; published_at?: string | null }): boolean {
  return venture.published === true && venture.published_at !== null
}

/**
 * Check if a venture is active (not archived or completed)
 */
export function isVentureActive(venture: { status: VentureStatus }): boolean {
  return venture.status === 'active'
}
