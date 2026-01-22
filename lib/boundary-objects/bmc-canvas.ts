/**
 * Business Model Canvas Boundary Objects
 *
 * Types, validation, and utilities for the BMC canvas view.
 */

// ============================================================================
// Types
// ============================================================================

export type BMCBlockId =
  | 'key_partners'
  | 'key_activities'
  | 'key_resources'
  | 'value_propositions'
  | 'customer_relationships'
  | 'channels'
  | 'customer_segments'
  | 'cost_structure'
  | 'revenue_streams'

export type ItemPriority = 'high' | 'medium' | 'low'

export interface BMCItem {
  id: string
  content: string
  priority?: ItemPriority
  created_at: string
  metadata?: {
    source?: string
    confidence?: 'low' | 'medium' | 'high'
    tags?: string[]
    [key: string]: unknown
  }
}

export interface BMCBlock {
  items: BMCItem[]
  assumptions?: unknown[]
  evidence?: unknown[]
  validation_status: 'untested' | 'testing' | 'validated' | 'invalidated'
  validated_at?: string
  notes?: string
}

export interface BMCCanvas {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  key_partners: BMCBlock
  key_activities: BMCBlock
  key_resources: BMCBlock
  value_propositions: BMCBlock
  customer_relationships: BMCBlock
  channels: BMCBlock
  customer_segments: BMCBlock
  cost_structure: BMCBlock
  revenue_streams: BMCBlock
  created_at: string
  updated_at: string
}

// ============================================================================
// Block Configuration
// ============================================================================

export const BMC_BLOCK_IDS: BMCBlockId[] = [
  'key_partners',
  'key_activities',
  'key_resources',
  'value_propositions',
  'customer_relationships',
  'channels',
  'customer_segments',
  'cost_structure',
  'revenue_streams',
]

export interface BMCBlockConfig {
  id: BMCBlockId
  name: string
  shortName: string
  description: string
  color: string
  bgClass: string
  gridArea: string
}

export const BMC_BLOCK_CONFIG: Record<BMCBlockId, BMCBlockConfig> = {
  key_partners: {
    id: 'key_partners',
    name: 'Key Partners',
    shortName: 'Partners',
    description: 'Strategic partnerships and supplier relationships',
    color: '#3B82F6', // Blue
    bgClass: 'bg-blue-50 border-blue-200',
    gridArea: 'partners',
  },
  key_activities: {
    id: 'key_activities',
    name: 'Key Activities',
    shortName: 'Activities',
    description: 'Core activities required to deliver value proposition',
    color: '#F97316', // Orange
    bgClass: 'bg-orange-50 border-orange-200',
    gridArea: 'activities',
  },
  key_resources: {
    id: 'key_resources',
    name: 'Key Resources',
    shortName: 'Resources',
    description: 'Essential assets to make business model work',
    color: '#F97316', // Orange
    bgClass: 'bg-orange-50 border-orange-200',
    gridArea: 'resources',
  },
  value_propositions: {
    id: 'value_propositions',
    name: 'Value Propositions',
    shortName: 'Value Props',
    description: 'Products and services that create value for customers',
    color: '#22C55E', // Green
    bgClass: 'bg-green-50 border-green-200',
    gridArea: 'value',
  },
  customer_relationships: {
    id: 'customer_relationships',
    name: 'Customer Relationships',
    shortName: 'Relationships',
    description: 'Types of relationships with customer segments',
    color: '#EC4899', // Pink
    bgClass: 'bg-pink-50 border-pink-200',
    gridArea: 'relationships',
  },
  channels: {
    id: 'channels',
    name: 'Channels',
    shortName: 'Channels',
    description: 'How you communicate and reach customer segments',
    color: '#EC4899', // Pink
    bgClass: 'bg-pink-50 border-pink-200',
    gridArea: 'channels',
  },
  customer_segments: {
    id: 'customer_segments',
    name: 'Customer Segments',
    shortName: 'Customers',
    description: 'Different groups of people or organizations you serve',
    color: '#EC4899', // Pink
    bgClass: 'bg-pink-50 border-pink-200',
    gridArea: 'segments',
  },
  cost_structure: {
    id: 'cost_structure',
    name: 'Cost Structure',
    shortName: 'Costs',
    description: 'Major costs incurred to operate the business model',
    color: '#6B7280', // Gray
    bgClass: 'bg-gray-50 border-gray-200',
    gridArea: 'costs',
  },
  revenue_streams: {
    id: 'revenue_streams',
    name: 'Revenue Streams',
    shortName: 'Revenue',
    description: 'How you generate income from each customer segment',
    color: '#6B7280', // Gray
    bgClass: 'bg-gray-50 border-gray-200',
    gridArea: 'revenue',
  },
}

/**
 * CSS Grid layout for standard Business Model Canvas
 * LOW 20: Grid areas documentation
 *
 * Layout visualization:
 * ┌──────────┬──────────┬──────────┬──────────┬──────────┐
 * │ partners │activities│  value   │relations │ segments │
 * │          ├──────────┤          ├──────────┤          │
 * │          │resources │          │ channels │          │
 * ├──────────┴──────────┼──────────┴──────────┴──────────┤
 * │      costs          │         revenue                │
 * └─────────────────────┴────────────────────────────────┘
 *
 * Row 1: Partners | Activities | Value Props | Relationships | Segments
 * Row 2: Partners | Resources  | Value Props | Channels      | Segments
 * Row 3: Costs (colspan 2)     | Revenue (colspan 3)
 *
 * The grid uses named areas that correspond to BMCBlockConfig.gridArea values.
 */
export const BMC_GRID_TEMPLATE = `
  "partners activities value relationships segments"
  "partners resources value channels segments"
  "costs costs revenue revenue revenue"
`

/** 5 equal-width columns for the BMC grid */
export const BMC_GRID_COLUMNS = '1fr 1fr 1fr 1fr 1fr'

/** Row heights: 2 flexible rows for main content, 1 auto row for financials */
export const BMC_GRID_ROWS = '1fr 1fr auto'

// ============================================================================
// Validation
// ============================================================================

export type DataResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export const ITEM_CONTENT_MAX_LENGTH = 500
export const ITEM_CONTENT_MIN_LENGTH = 1

/**
 * Validate that a string is a valid BMC block ID
 *
 * @param blockId - The block ID to validate
 * @returns DataResult with validated BMCBlockId or error message
 *
 * @example
 * const result = validateBlockId('key_partners')
 * if (result.success) {
 *   // result.data is typed as BMCBlockId
 * }
 */
export function validateBlockId(blockId: string): DataResult<BMCBlockId> {
  if (!BMC_BLOCK_IDS.includes(blockId as BMCBlockId)) {
    return { success: false, error: `Invalid block ID: ${blockId}` }
  }
  return { success: true, data: blockId as BMCBlockId }
}

/**
 * Validate item content - checks for required content, length limits, and XSS patterns
 * CRITICAL: Rejects HTML-like patterns to prevent XSS attacks
 */
export function validateItemContent(
  content: string | null | undefined
): DataResult<string> {
  if (content === null || content === undefined) {
    return { success: false, error: 'Item content is required' }
  }

  const trimmed = content.trim()
  if (trimmed.length < ITEM_CONTENT_MIN_LENGTH) {
    return { success: false, error: 'Item content is required' }
  }
  if (trimmed.length > ITEM_CONTENT_MAX_LENGTH) {
    return {
      success: false,
      error: `Content must be ${ITEM_CONTENT_MAX_LENGTH} characters or less`,
    }
  }

  // CRITICAL 4: XSS prevention - reject HTML-like patterns
  // Matches any HTML tags including self-closing, attributes, and event handlers
  const htmlPattern = /<[^>]*>/
  if (htmlPattern.test(trimmed)) {
    return { success: false, error: 'Content cannot contain HTML tags' }
  }

  // Also check for common XSS patterns that might bypass simple tag detection
  const xssPatterns = [
    /javascript:/i,
    /on\w+\s*=/i,  // onclick=, onerror=, etc.
    /data:/i,
  ]
  for (const pattern of xssPatterns) {
    if (pattern.test(trimmed)) {
      return { success: false, error: 'Content contains invalid characters' }
    }
  }

  return { success: true, data: trimmed }
}

/**
 * Validate item priority level
 *
 * @param priority - The priority to validate (can be null/undefined for no priority)
 * @returns DataResult with validated ItemPriority or null, or error message
 *
 * @example
 * validateItemPriority('high')     // { success: true, data: 'high' }
 * validateItemPriority(null)       // { success: true, data: null }
 * validateItemPriority('invalid')  // { success: false, error: '...' }
 */
export function validateItemPriority(
  priority: string | null | undefined
): DataResult<ItemPriority | null> {
  if (priority === null || priority === undefined || priority === '') {
    return { success: true, data: null }
  }

  const validPriorities: ItemPriority[] = ['high', 'medium', 'low']
  if (!validPriorities.includes(priority as ItemPriority)) {
    return { success: false, error: `Invalid priority: ${priority}` }
  }
  return { success: true, data: priority as ItemPriority }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create an empty BMC block with default values
 *
 * @returns A new BMCBlock with empty items array and 'untested' validation status
 *
 * @example
 * const block = createEmptyBlock()
 * // { items: [], validation_status: 'untested' }
 */
export function createEmptyBlock(): BMCBlock {
  return {
    items: [],
    validation_status: 'untested',
  }
}

/**
 * Validate a BMCItem structure
 * HIGH 7: Runtime validation for JSONB data
 */
function isValidBMCItem(item: unknown): item is BMCItem {
  if (!item || typeof item !== 'object') return false
  const i = item as Record<string, unknown>
  return (
    typeof i.id === 'string' &&
    i.id.length > 0 &&
    typeof i.content === 'string' &&
    typeof i.created_at === 'string' &&
    (i.priority === undefined ||
      i.priority === 'high' ||
      i.priority === 'medium' ||
      i.priority === 'low')
  )
}

/**
 * Validate a BMCBlock structure
 * HIGH 7: Runtime validation for JSONB data
 */
function isValidBMCBlock(block: unknown): block is BMCBlock {
  if (!block || typeof block !== 'object') return false
  const b = block as Record<string, unknown>

  // Items must be an array (even if empty)
  if (!Array.isArray(b.items)) return false

  // All items must be valid
  for (const item of b.items) {
    if (!isValidBMCItem(item)) return false
  }

  // validation_status must be valid
  const validStatuses = ['untested', 'testing', 'validated', 'invalidated']
  if (b.validation_status && !validStatuses.includes(b.validation_status as string)) {
    return false
  }

  return true
}

/**
 * Normalize a block from database (ensure all required fields exist)
 * HIGH 7: Includes runtime validation - logs warnings for malformed data
 */
export function normalizeBlock(block: unknown): BMCBlock {
  if (!block || typeof block !== 'object') {
    return createEmptyBlock()
  }

  const b = block as Record<string, unknown>

  // Validate and filter items - only include valid items
  let items: BMCItem[] = []
  if (Array.isArray(b.items)) {
    items = b.items.filter((item): item is BMCItem => {
      const isValid = isValidBMCItem(item)
      if (!isValid) {
        console.warn('[normalizeBlock] Skipping invalid item:', item)
      }
      return isValid
    })
  }

  // Validate validation_status
  const validStatuses = ['untested', 'testing', 'validated', 'invalidated'] as const
  let validationStatus: BMCBlock['validation_status'] = 'untested'
  if (
    typeof b.validation_status === 'string' &&
    validStatuses.includes(b.validation_status as typeof validStatuses[number])
  ) {
    validationStatus = b.validation_status as BMCBlock['validation_status']
  }

  return {
    items,
    assumptions: Array.isArray(b.assumptions) ? b.assumptions : [],
    evidence: Array.isArray(b.evidence) ? b.evidence : [],
    validation_status: validationStatus,
    validated_at:
      typeof b.validated_at === 'string' ? b.validated_at : undefined,
    notes: typeof b.notes === 'string' ? b.notes : undefined,
  }
}

/**
 * Get a block from a canvas by ID
 */
export function getCanvasBlock(canvas: BMCCanvas, blockId: BMCBlockId): BMCBlock {
  return normalizeBlock(canvas[blockId])
}

/**
 * Get all blocks from a canvas as an array with their IDs
 */
export function getAllBlocks(
  canvas: BMCCanvas
): Array<{ blockId: BMCBlockId; block: BMCBlock; config: BMCBlockConfig }> {
  return BMC_BLOCK_IDS.map((blockId) => ({
    blockId,
    block: getCanvasBlock(canvas, blockId),
    config: BMC_BLOCK_CONFIG[blockId],
  }))
}

/**
 * Count total items across all blocks
 */
export function countTotalItems(canvas: BMCCanvas): number {
  return BMC_BLOCK_IDS.reduce((total, blockId) => {
    const block = getCanvasBlock(canvas, blockId)
    return total + block.items.length
  }, 0)
}

/**
 * Get priority badge styling
 */
export function getPriorityBadgeClass(priority: ItemPriority | undefined): string {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'low':
      return 'bg-gray-100 text-gray-600 border-gray-200'
    default:
      return ''
  }
}

/**
 * Create a new item with generated ID
 * CRITICAL 2: Includes collision detection - retries UUID generation if collision detected
 *
 * @param content - The item content (should be pre-validated)
 * @param priority - Optional priority level
 * @param existingIds - Optional set of existing IDs to check for collisions
 * @param maxRetries - Maximum number of retries for collision (default 3)
 */
export function createNewItem(
  content: string,
  priority?: ItemPriority,
  existingIds?: Set<string>,
  maxRetries = 3
): BMCItem {
  let id = crypto.randomUUID()
  let retries = 0

  // Check for collision if existingIds provided
  if (existingIds) {
    while (existingIds.has(id) && retries < maxRetries) {
      console.warn(`[createNewItem] UUID collision detected, retrying (attempt ${retries + 1})`)
      id = crypto.randomUUID()
      retries++
    }
    // If still colliding after max retries, append timestamp for uniqueness
    if (existingIds.has(id)) {
      console.error(`[createNewItem] UUID collision persisted after ${maxRetries} retries, appending timestamp`)
      id = `${crypto.randomUUID()}-${Date.now()}`
    }
  }

  return {
    id,
    content,
    priority,
    created_at: new Date().toISOString(),
  }
}
