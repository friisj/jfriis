/**
 * Studio Hypotheses Boundary Objects
 *
 * Shared types, validation, and utilities for studio hypotheses.
 */

// ============================================================================
// RE-EXPORTS FROM MCP SCHEMAS
// ============================================================================

export {
  StudioHypothesisSchema,
  StudioHypothesisCreateSchema,
  StudioHypothesisUpdateSchema,
  type StudioHypothesis,
  type StudioHypothesisCreate,
  type StudioHypothesisUpdate,
} from '@/lib/mcp/schemas/studio'

// ============================================================================
// STATUS DEFINITIONS
// ============================================================================

/**
 * Valid hypothesis statuses
 */
export type HypothesisStatus = 'proposed' | 'testing' | 'validated' | 'invalidated'

/**
 * All valid hypothesis status values
 */
export const HYPOTHESIS_STATUSES: readonly HypothesisStatus[] = [
  'proposed',
  'testing',
  'validated',
  'invalidated',
] as const

/**
 * Status display labels
 */
export const HYPOTHESIS_STATUS_LABELS: Record<HypothesisStatus, string> = {
  proposed: 'Proposed',
  testing: 'Testing',
  validated: 'Validated',
  invalidated: 'Invalidated',
}

/**
 * Status colors for UI display
 */
export const HYPOTHESIS_STATUS_COLORS: Record<HypothesisStatus, string> = {
  proposed: 'gray',
  testing: 'blue',
  validated: 'green',
  invalidated: 'red',
}

// ============================================================================
// STATUS TRANSITIONS
// ============================================================================

/**
 * Valid status transitions for hypotheses.
 * Maps current status to allowed next statuses.
 */
export const HYPOTHESIS_STATUS_TRANSITIONS: Record<HypothesisStatus, readonly HypothesisStatus[]> = {
  proposed: ['testing'],
  testing: ['validated', 'invalidated', 'proposed'], // Can go back to proposed if pivoting
  validated: [], // Terminal state (but could reopen if needed)
  invalidated: ['proposed'], // Can revisit with new approach
}

/**
 * Check if a status transition is valid
 */
export function isValidHypothesisTransition(from: HypothesisStatus, to: HypothesisStatus): boolean {
  return HYPOTHESIS_STATUS_TRANSITIONS[from].includes(to)
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

/** Maximum length for hypothesis statement */
export const HYPOTHESIS_STATEMENT_MAX_LENGTH = 500

/** Maximum length for validation criteria */
export const VALIDATION_CRITERIA_MAX_LENGTH = 1000

/**
 * Validate a hypothesis statement
 */
export function validateHypothesisStatement(statement: string): DataResult<string> {
  if (!statement || statement.trim().length === 0) {
    return { success: false, error: 'Hypothesis statement is required' }
  }

  const trimmed = statement.trim()

  if (trimmed.length > HYPOTHESIS_STATEMENT_MAX_LENGTH) {
    return {
      success: false,
      error: `Statement must be ${HYPOTHESIS_STATEMENT_MAX_LENGTH} characters or less`,
    }
  }

  return { success: true, data: trimmed }
}

/**
 * Validate validation criteria
 */
export function validateValidationCriteria(criteria: string): DataResult<string> {
  if (!criteria || criteria.trim().length === 0) {
    return { success: false, error: 'Validation criteria is required' }
  }

  const trimmed = criteria.trim()

  if (trimmed.length > VALIDATION_CRITERIA_MAX_LENGTH) {
    return {
      success: false,
      error: `Criteria must be ${VALIDATION_CRITERIA_MAX_LENGTH} characters or less`,
    }
  }

  return { success: true, data: trimmed }
}

/**
 * Validate a hypothesis status
 */
export function validateHypothesisStatus(status: string): DataResult<HypothesisStatus> {
  if (!status) {
    return { success: false, error: 'Status is required' }
  }

  if (!HYPOTHESIS_STATUSES.includes(status as HypothesisStatus)) {
    return {
      success: false,
      error: `Invalid status "${status}". Must be one of: ${HYPOTHESIS_STATUSES.join(', ')}`,
    }
  }

  return { success: true, data: status as HypothesisStatus }
}

/**
 * Validate a hypothesis status transition
 */
export function validateHypothesisTransition(
  from: HypothesisStatus,
  to: HypothesisStatus
): DataResult<HypothesisStatus> {
  if (!isValidHypothesisTransition(from, to)) {
    const allowed = HYPOTHESIS_STATUS_TRANSITIONS[from]
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
 * Check if a hypothesis is actively being tested
 */
export function isHypothesisTesting(hypothesis: { status: HypothesisStatus }): boolean {
  return hypothesis.status === 'testing'
}

/**
 * Check if a hypothesis has been resolved (validated or invalidated)
 */
export function isHypothesisResolved(hypothesis: { status: HypothesisStatus }): boolean {
  return hypothesis.status === 'validated' || hypothesis.status === 'invalidated'
}

/**
 * Check if a hypothesis was validated
 */
export function isHypothesisValidated(hypothesis: { status: HypothesisStatus }): boolean {
  return hypothesis.status === 'validated'
}

/**
 * Check if a hypothesis was invalidated (still valuable learning!)
 */
export function isHypothesisInvalidated(hypothesis: { status: HypothesisStatus }): boolean {
  return hypothesis.status === 'invalidated'
}
