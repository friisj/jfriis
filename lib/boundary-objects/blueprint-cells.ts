/**
 * Blueprint Cells Boundary Object
 *
 * Validation constants and functions for blueprint canvas cells.
 * Part of Canvas Views Expansion Phase 1.
 */

// ============================================================================
// Types
// ============================================================================

export type DataResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

export interface BlueprintCell {
  id: string
  step_id: string
  layer_type: LayerType
  content: string | null
  actors: string | null
  duration_estimate: string | null
  cost_implication: CostImplication | null
  failure_risk: FailureRisk | null
  sequence: number
  created_at: string
  updated_at: string
}

export interface BlueprintStep {
  id: string
  service_blueprint_id: string
  name: string
  description: string | null
  sequence: number
  cells?: BlueprintCell[]
}

export interface ServiceBlueprint {
  id: string
  slug: string
  name: string
  description: string | null
  blueprint_type: string | null
  status: string
  steps?: BlueprintStep[]
}

// ============================================================================
// Constants
// ============================================================================

export const LAYER_TYPES = [
  'customer_action',
  'frontstage',
  'backstage',
  'support_process',
] as const
export type LayerType = (typeof LAYER_TYPES)[number]

export const COST_IMPLICATIONS = ['none', 'low', 'medium', 'high'] as const
export type CostImplication = (typeof COST_IMPLICATIONS)[number]

export const FAILURE_RISKS = ['none', 'low', 'medium', 'high'] as const
export type FailureRisk = (typeof FAILURE_RISKS)[number]

// Display configuration for layers
export const LAYER_CONFIG: Record<
  LayerType,
  { name: string; color: string; description: string }
> = {
  customer_action: {
    name: 'Customer Actions',
    color: 'blue',
    description: 'What the customer does',
  },
  frontstage: {
    name: 'Frontstage',
    color: 'green',
    description: 'Visible employee actions',
  },
  backstage: {
    name: 'Backstage',
    color: 'orange',
    description: 'Hidden employee actions',
  },
  support_process: {
    name: 'Support Process',
    color: 'purple',
    description: 'Systems and infrastructure',
  },
}

// Line of visibility appears between frontstage and backstage
export const LINE_OF_VISIBILITY_POSITION = 2 // After frontstage (index 1)

// Length limits
export const CELL_CONTENT_MAX_LENGTH = 2000
export const STEP_NAME_MAX_LENGTH = 100
export const STEP_DESCRIPTION_MAX_LENGTH = 1000
export const ACTORS_MAX_LENGTH = 500
export const DURATION_MAX_LENGTH = 100

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates that a string is a valid layer type.
 *
 * @param layerType - String to validate against LAYER_TYPES
 * @returns DataResult with validated LayerType or error message
 */
export function validateLayerType(layerType: string): DataResult<LayerType> {
  if (!LAYER_TYPES.includes(layerType as LayerType)) {
    return { success: false, error: `Invalid layer type: ${layerType}` }
  }
  return { success: true, data: layerType as LayerType }
}

/**
 * Validates cell content length and checks for XSS patterns.
 * Returns null for empty content (treats as optional field).
 *
 * @param content - Content string to validate
 * @returns DataResult with trimmed content or null, or error if invalid
 */
export function validateCellContent(
  content: string | undefined | null
): DataResult<string | null> {
  if (!content) return { success: true, data: null }
  const trimmed = content.trim()
  if (trimmed.length > CELL_CONTENT_MAX_LENGTH) {
    return {
      success: false,
      error: `Content must be ${CELL_CONTENT_MAX_LENGTH} characters or less`,
    }
  }

  // XSS prevention - reject HTML tags
  const htmlPattern = /<[^>]*>/
  if (htmlPattern.test(trimmed)) {
    return { success: false, error: 'Content cannot contain HTML tags' }
  }

  // Check for common XSS patterns
  const xssPatterns = [/javascript:/i, /on\w+\s*=/i, /data:/i]
  for (const pattern of xssPatterns) {
    if (pattern.test(trimmed)) {
      return { success: false, error: 'Content contains invalid characters' }
    }
  }

  return { success: true, data: trimmed || null }
}

/**
 * Validates step name is non-empty and within length limits.
 * Rejects HTML tags for XSS prevention.
 *
 * @param name - Step name to validate (required field)
 * @returns DataResult with trimmed name or error
 */
export function validateStepName(name: string): DataResult<string> {
  const trimmed = name.trim()
  if (!trimmed) {
    return { success: false, error: 'Step name is required' }
  }
  if (trimmed.length > STEP_NAME_MAX_LENGTH) {
    return {
      success: false,
      error: `Step name must be ${STEP_NAME_MAX_LENGTH} characters or less`,
    }
  }

  // XSS prevention
  const htmlPattern = /<[^>]*>/
  if (htmlPattern.test(trimmed)) {
    return { success: false, error: 'Name cannot contain HTML tags' }
  }

  return { success: true, data: trimmed }
}

/**
 * Validates step description length and checks for XSS patterns.
 * Returns null for empty description (optional field).
 *
 * @param description - Description to validate
 * @returns DataResult with trimmed description or null, or error if invalid
 */
export function validateStepDescription(
  description: string | undefined | null
): DataResult<string | null> {
  if (!description) return { success: true, data: null }
  const trimmed = description.trim()
  if (trimmed.length > STEP_DESCRIPTION_MAX_LENGTH) {
    return {
      success: false,
      error: `Description must be ${STEP_DESCRIPTION_MAX_LENGTH} characters or less`,
    }
  }

  // XSS prevention
  const htmlPattern = /<[^>]*>/
  if (htmlPattern.test(trimmed)) {
    return { success: false, error: 'Description cannot contain HTML tags' }
  }

  return { success: true, data: trimmed || null }
}

/**
 * Validates actors field length and checks for XSS patterns.
 * Returns null for empty actors (optional field).
 *
 * @param actors - Actors string to validate (comma-separated names)
 * @returns DataResult with trimmed actors or null, or error if invalid
 */
export function validateActors(
  actors: string | undefined | null
): DataResult<string | null> {
  if (!actors) return { success: true, data: null }
  const trimmed = actors.trim()
  if (trimmed.length > ACTORS_MAX_LENGTH) {
    return {
      success: false,
      error: `Actors must be ${ACTORS_MAX_LENGTH} characters or less`,
    }
  }

  // XSS prevention
  const htmlPattern = /<[^>]*>/
  if (htmlPattern.test(trimmed)) {
    return { success: false, error: 'Actors cannot contain HTML tags' }
  }

  return { success: true, data: trimmed || null }
}

/**
 * Validates duration estimate length and checks for XSS patterns.
 * Returns null for empty duration (optional field).
 *
 * @param duration - Duration estimate string (e.g., "5 minutes", "1-2 hours")
 * @returns DataResult with trimmed duration or null, or error if invalid
 */
export function validateDuration(
  duration: string | undefined | null
): DataResult<string | null> {
  if (!duration) return { success: true, data: null }
  const trimmed = duration.trim()
  if (trimmed.length > DURATION_MAX_LENGTH) {
    return {
      success: false,
      error: `Duration must be ${DURATION_MAX_LENGTH} characters or less`,
    }
  }

  // XSS prevention
  const htmlPattern = /<[^>]*>/
  if (htmlPattern.test(trimmed)) {
    return { success: false, error: 'Duration cannot contain HTML tags' }
  }

  return { success: true, data: trimmed || null }
}

/**
 * Validates cost implication is a valid enum value.
 * Returns null for empty cost (optional field).
 *
 * @param cost - Cost implication string ('none', 'low', 'medium', 'high')
 * @returns DataResult with validated CostImplication or null, or error if invalid
 */
export function validateCostImplication(
  cost: string | undefined | null
): DataResult<CostImplication | null> {
  if (!cost) return { success: true, data: null }
  if (!COST_IMPLICATIONS.includes(cost as CostImplication)) {
    return { success: false, error: `Invalid cost implication: ${cost}` }
  }
  return { success: true, data: cost as CostImplication }
}

/**
 * Validates failure risk is a valid enum value.
 * Returns null for empty risk (optional field).
 *
 * @param risk - Failure risk string ('none', 'low', 'medium', 'high')
 * @returns DataResult with validated FailureRisk or null, or error if invalid
 */
export function validateFailureRisk(
  risk: string | undefined | null
): DataResult<FailureRisk | null> {
  if (!risk) return { success: true, data: null }
  if (!FAILURE_RISKS.includes(risk as FailureRisk)) {
    return { success: false, error: `Invalid failure risk: ${risk}` }
  }
  return { success: true, data: risk as FailureRisk }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the ordered list of layer types for display.
 * Returns layers in the standard Service Blueprint order:
 * Customer Actions → Frontstage → Backstage → Support Process
 *
 * @returns Array of layer types in display order
 * @example
 * const layers = getOrderedLayers()
 * // ['customer_action', 'frontstage', 'backstage', 'support_process']
 */
export function getOrderedLayers(): LayerType[] {
  return [...LAYER_TYPES]
}

/**
 * Check if the line of visibility separator should appear after this layer.
 * The line of visibility separates frontstage (visible to customer) from
 * backstage (hidden from customer) actions.
 *
 * @param layerIndex - Zero-based index of the layer in the display order
 * @returns true if the line of visibility should be rendered after this layer
 * @example
 * showLineOfVisibilityAfter(0) // false (customer_action)
 * showLineOfVisibilityAfter(1) // true (frontstage - line appears after)
 * showLineOfVisibilityAfter(2) // false (backstage)
 */
export function showLineOfVisibilityAfter(layerIndex: number): boolean {
  return layerIndex === LINE_OF_VISIBILITY_POSITION - 1 // After frontstage (index 1)
}

/**
 * Find a specific cell by step ID and layer type from a list of cells.
 * Returns undefined if no cell exists for that combination.
 *
 * @param cells - Array of blueprint cells to search
 * @param stepId - UUID of the step
 * @param layerType - Type of layer ('customer_action', 'frontstage', etc.)
 * @returns The matching cell or undefined if not found
 */
export function getCellForStepLayer(
  cells: BlueprintCell[],
  stepId: string,
  layerType: LayerType
): BlueprintCell | undefined {
  return cells.find(
    (cell) => cell.step_id === stepId && cell.layer_type === layerType
  )
}

/**
 * Build a nested Map for efficient cell lookups by step and layer.
 * Use this when rendering the canvas grid to avoid repeated array searches.
 *
 * @param cells - Array of blueprint cells
 * @returns Map<stepId, Map<layerType, cell>> for O(1) lookups
 * @example
 * const cellsMap = buildCellsMap(cells)
 * const cell = cellsMap.get(stepId)?.get('frontstage')
 */
export function buildCellsMap(
  cells: BlueprintCell[]
): Map<string, Map<LayerType, BlueprintCell>> {
  const map = new Map<string, Map<LayerType, BlueprintCell>>()

  for (const cell of cells) {
    if (!map.has(cell.step_id)) {
      map.set(cell.step_id, new Map())
    }
    map.get(cell.step_id)!.set(cell.layer_type, cell)
  }

  return map
}

/**
 * Sort steps by their sequence number in ascending order.
 * Returns a new array, does not mutate the input.
 *
 * @param steps - Array of steps with sequence property
 * @returns New array sorted by sequence
 */
export function sortStepsBySequence<T extends { sequence: number }>(steps: T[]): T[] {
  return [...steps].sort((a, b) => a.sequence - b.sequence)
}

/**
 * Create a unique cell key from step ID and layer type.
 * Use for React keys and selection state tracking.
 *
 * @param stepId - UUID of the step
 * @param layerType - Type of layer
 * @returns Unique key string in format "stepId:layerType"
 */
export function createCellKey(stepId: string, layerType: LayerType): string {
  return `${stepId}:${layerType}`
}

/**
 * Parse a cell key back into step ID and layer type.
 * Returns null if the key format is invalid.
 *
 * @param key - Cell key to parse (format: "stepId:layerType")
 * @returns Parsed components or null if invalid
 */
export function parseCellKey(key: string): { stepId: string; layerType: LayerType } | null {
  const [stepId, layerType] = key.split(':')
  if (!stepId || !layerType) return null
  if (!LAYER_TYPES.includes(layerType as LayerType)) return null
  return { stepId, layerType: layerType as LayerType }
}
