/**
 * Studio Projects Boundary Objects
 *
 * Shared types, validation, and utilities for studio projects.
 */

// ============================================================================
// RE-EXPORTS FROM MCP SCHEMAS
// ============================================================================

export {
  StudioProjectSchema,
  StudioProjectCreateSchema,
  StudioProjectUpdateSchema,
  type StudioProject,
  type StudioProjectCreate,
  type StudioProjectUpdate,
} from '@/lib/mcp/schemas/studio'

// ============================================================================
// STATUS AND TYPE DEFINITIONS
// ============================================================================

/**
 * Valid project statuses
 */
export type ProjectStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'

/**
 * All valid project status values
 */
export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  'draft',
  'active',
  'paused',
  'completed',
  'archived',
] as const

/**
 * Status display labels
 */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  archived: 'Archived',
}

/**
 * Valid project temperatures
 */
export type ProjectTemperature = 'hot' | 'warm' | 'cold'

/**
 * All valid temperature values
 */
export const PROJECT_TEMPERATURES: readonly ProjectTemperature[] = [
  'hot',
  'warm',
  'cold',
] as const

/**
 * Temperature display labels
 */
export const PROJECT_TEMPERATURE_LABELS: Record<ProjectTemperature, string> = {
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
}

// ============================================================================
// STATUS TRANSITIONS
// ============================================================================

/**
 * Valid status transitions for studio projects.
 * Maps current status to allowed next statuses.
 */
export const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  draft: ['active', 'archived'],
  active: ['paused', 'completed', 'archived'],
  paused: ['active', 'archived'],
  completed: ['archived'],
  archived: [], // Terminal state
}

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return PROJECT_STATUS_TRANSITIONS[from].includes(to)
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
 * Validate a project slug
 */
export function validateProjectSlug(slug: string): DataResult<string> {
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
 * Validate a project status
 */
export function validateProjectStatus(status: string): DataResult<ProjectStatus> {
  if (!status) {
    return { success: false, error: 'Status is required' }
  }

  if (!PROJECT_STATUSES.includes(status as ProjectStatus)) {
    return {
      success: false,
      error: `Invalid status "${status}". Must be one of: ${PROJECT_STATUSES.join(', ')}`,
    }
  }

  return { success: true, data: status as ProjectStatus }
}

/**
 * Validate a status transition
 */
export function validateStatusTransition(
  from: ProjectStatus,
  to: ProjectStatus
): DataResult<ProjectStatus> {
  if (!isValidStatusTransition(from, to)) {
    const allowed = PROJECT_STATUS_TRANSITIONS[from]
    if (allowed.length === 0) {
      return {
        success: false,
        error: `Cannot transition from "${from}" - it is a terminal state`,
      }
    }
    return {
      success: false,
      error: `Cannot transition from "${from}" to "${to}". Allowed: ${allowed.join(', ')}`,
    }
  }

  return { success: true, data: to }
}

/**
 * Validate a project temperature
 */
export function validateProjectTemperature(temp: string): DataResult<ProjectTemperature> {
  if (!temp) {
    return { success: false, error: 'Temperature is required' }
  }

  if (!PROJECT_TEMPERATURES.includes(temp as ProjectTemperature)) {
    return {
      success: false,
      error: `Invalid temperature "${temp}". Must be one of: ${PROJECT_TEMPERATURES.join(', ')}`,
    }
  }

  return { success: true, data: temp as ProjectTemperature }
}

/**
 * Validate a project name
 */
export function validateProjectName(name: string): DataResult<string> {
  if (!name || name.trim().length === 0) {
    return { success: false, error: 'Name is required' }
  }

  const trimmed = name.trim()

  if (trimmed.length > 200) {
    return { success: false, error: 'Name must be 200 characters or less' }
  }

  return { success: true, data: trimmed }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a slug from a name
 */
export function generateProjectSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Check if a project is active (not draft, paused, completed, or archived)
 */
export function isProjectActive(project: { status: ProjectStatus }): boolean {
  return project.status === 'active'
}

/**
 * Check if a project is in a terminal state
 */
export function isProjectTerminal(project: { status: ProjectStatus }): boolean {
  return project.status === 'archived'
}

/**
 * Check if a project is hot (actively being worked on)
 */
export function isProjectHot(project: { temperature?: ProjectTemperature | null }): boolean {
  return project.temperature === 'hot'
}
