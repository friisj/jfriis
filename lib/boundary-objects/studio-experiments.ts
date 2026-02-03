/**
 * Studio Experiments Boundary Objects
 *
 * Shared types, validation, and utilities for studio experiments.
 */

// ============================================================================
// RE-EXPORTS FROM MCP SCHEMAS
// ============================================================================

export {
  StudioExperimentSchema,
  StudioExperimentCreateSchema,
  StudioExperimentUpdateSchema,
  type StudioExperiment,
  type StudioExperimentCreate,
  type StudioExperimentUpdate,
} from '@/lib/mcp/schemas/studio'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Valid experiment types
 * Note: MCP schema has spike/experiment/prototype, but protocol also mentions
 * discovery_interviews and landing_page. Using the superset for flexibility.
 */
export type ExperimentType =
  | 'spike'
  | 'experiment'
  | 'prototype'
  | 'discovery_interviews'
  | 'landing_page'

/**
 * All valid experiment type values
 */
export const EXPERIMENT_TYPES: readonly ExperimentType[] = [
  'spike',
  'experiment',
  'prototype',
  'discovery_interviews',
  'landing_page',
] as const

/**
 * Experiment type display labels
 */
export const EXPERIMENT_TYPE_LABELS: Record<ExperimentType, string> = {
  spike: 'Spike',
  experiment: 'Experiment',
  prototype: 'Prototype',
  discovery_interviews: 'Discovery Interviews',
  landing_page: 'Landing Page',
}

/**
 * Experiment type descriptions
 */
export const EXPERIMENT_TYPE_DESCRIPTIONS: Record<ExperimentType, string> = {
  spike: 'Quick technical investigation to reduce uncertainty',
  experiment: 'Standard hypothesis test with measurable outcomes',
  prototype: 'Working code demonstration to validate concept',
  discovery_interviews: 'User research and interviews to gather insights',
  landing_page: 'Market validation via landing page metrics',
}

// ============================================================================
// STATUS DEFINITIONS
// ============================================================================

/**
 * Valid experiment statuses
 */
export type ExperimentStatus = 'planned' | 'in_progress' | 'completed' | 'abandoned'

/**
 * All valid experiment status values
 */
export const EXPERIMENT_STATUSES: readonly ExperimentStatus[] = [
  'planned',
  'in_progress',
  'completed',
  'abandoned',
] as const

/**
 * Status display labels
 */
export const EXPERIMENT_STATUS_LABELS: Record<ExperimentStatus, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  abandoned: 'Abandoned',
}

// ============================================================================
// OUTCOME DEFINITIONS
// ============================================================================

/**
 * Valid experiment outcomes
 * Note: MCP schema has success/failure/inconclusive, protocol also mentions pivoted.
 */
export type ExperimentOutcome = 'success' | 'failure' | 'inconclusive' | 'pivoted'

/**
 * All valid experiment outcome values
 */
export const EXPERIMENT_OUTCOMES: readonly ExperimentOutcome[] = [
  'success',
  'failure',
  'inconclusive',
  'pivoted',
] as const

/**
 * Outcome display labels
 */
export const EXPERIMENT_OUTCOME_LABELS: Record<ExperimentOutcome, string> = {
  success: 'Success',
  failure: 'Failure',
  inconclusive: 'Inconclusive',
  pivoted: 'Pivoted',
}

/**
 * Outcome colors for UI display
 */
export const EXPERIMENT_OUTCOME_COLORS: Record<ExperimentOutcome, string> = {
  success: 'green',
  failure: 'red',
  inconclusive: 'yellow',
  pivoted: 'blue',
}

// ============================================================================
// STATUS TRANSITIONS
// ============================================================================

/**
 * Valid status transitions for experiments.
 */
export const EXPERIMENT_STATUS_TRANSITIONS: Record<ExperimentStatus, readonly ExperimentStatus[]> = {
  planned: ['in_progress', 'abandoned'],
  in_progress: ['completed', 'abandoned'],
  completed: [], // Terminal state
  abandoned: ['planned'], // Can restart if revisiting
}

/**
 * Check if a status transition is valid
 */
export function isValidExperimentTransition(from: ExperimentStatus, to: ExperimentStatus): boolean {
  return EXPERIMENT_STATUS_TRANSITIONS[from].includes(to)
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
 * Validate an experiment slug
 */
export function validateExperimentSlug(slug: string): DataResult<string> {
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
 * Validate an experiment name
 */
export function validateExperimentName(name: string): DataResult<string> {
  if (!name || name.trim().length === 0) {
    return { success: false, error: 'Name is required' }
  }

  const trimmed = name.trim()

  if (trimmed.length > 200) {
    return { success: false, error: 'Name must be 200 characters or less' }
  }

  return { success: true, data: trimmed }
}

/**
 * Validate an experiment type
 */
export function validateExperimentType(type: string): DataResult<ExperimentType> {
  if (!type) {
    return { success: false, error: 'Type is required' }
  }

  if (!EXPERIMENT_TYPES.includes(type as ExperimentType)) {
    return {
      success: false,
      error: `Invalid type "${type}". Must be one of: ${EXPERIMENT_TYPES.join(', ')}`,
    }
  }

  return { success: true, data: type as ExperimentType }
}

/**
 * Validate an experiment status
 */
export function validateExperimentStatus(status: string): DataResult<ExperimentStatus> {
  if (!status) {
    return { success: false, error: 'Status is required' }
  }

  if (!EXPERIMENT_STATUSES.includes(status as ExperimentStatus)) {
    return {
      success: false,
      error: `Invalid status "${status}". Must be one of: ${EXPERIMENT_STATUSES.join(', ')}`,
    }
  }

  return { success: true, data: status as ExperimentStatus }
}

/**
 * Validate an experiment outcome
 */
export function validateExperimentOutcome(outcome: string): DataResult<ExperimentOutcome> {
  if (!outcome) {
    return { success: false, error: 'Outcome is required' }
  }

  if (!EXPERIMENT_OUTCOMES.includes(outcome as ExperimentOutcome)) {
    return {
      success: false,
      error: `Invalid outcome "${outcome}". Must be one of: ${EXPERIMENT_OUTCOMES.join(', ')}`,
    }
  }

  return { success: true, data: outcome as ExperimentOutcome }
}

/**
 * Validate an experiment status transition
 */
export function validateExperimentTransition(
  from: ExperimentStatus,
  to: ExperimentStatus
): DataResult<ExperimentStatus> {
  if (!isValidExperimentTransition(from, to)) {
    const allowed = EXPERIMENT_STATUS_TRANSITIONS[from]
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a slug from a name
 */
export function generateExperimentSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Check if an experiment is in progress
 */
export function isExperimentInProgress(experiment: { status: ExperimentStatus }): boolean {
  return experiment.status === 'in_progress'
}

/**
 * Check if an experiment is completed
 */
export function isExperimentCompleted(experiment: { status: ExperimentStatus }): boolean {
  return experiment.status === 'completed'
}

/**
 * Check if an experiment was successful
 */
export function isExperimentSuccessful(experiment: { outcome?: ExperimentOutcome | null }): boolean {
  return experiment.outcome === 'success'
}

/**
 * Check if an experiment is a prototype type
 */
export function isPrototypeExperiment(experiment: { type: ExperimentType }): boolean {
  return experiment.type === 'prototype'
}
