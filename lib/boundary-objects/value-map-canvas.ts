/**
 * Value Map Canvas Boundary Objects
 *
 * Types, validation, and utilities for the Value Map canvas view.
 * Follows the same patterns as BMC canvas (Phase 3).
 */

// ============================================================================
// Types
// ============================================================================

export const VALUE_MAP_BLOCK_IDS = ['products_services', 'pain_relievers', 'gain_creators'] as const
export type ValueMapBlockId = (typeof VALUE_MAP_BLOCK_IDS)[number]

export const PRODUCT_TYPES = ['product', 'service', 'feature'] as const
export type ProductType = (typeof PRODUCT_TYPES)[number]

export const EFFECTIVENESS_LEVELS = ['low', 'medium', 'high'] as const
export type EffectivenessLevel = (typeof EFFECTIVENESS_LEVELS)[number]

export interface ProductItem {
  id: string
  content: string
  type?: ProductType
  evidence?: string
  created_at: string
  metadata?: {
    source?: string
    confidence?: 'low' | 'medium' | 'high'
    [key: string]: unknown
  }
}

export interface PainRelieverItem {
  id: string
  content: string
  effectiveness?: EffectivenessLevel
  linked_pain_id?: string // Optional link to Customer Profile pain
  evidence?: string
  created_at: string
  metadata?: {
    source?: string
    confidence?: 'low' | 'medium' | 'high'
    [key: string]: unknown
  }
}

export interface GainCreatorItem {
  id: string
  content: string
  effectiveness?: EffectivenessLevel
  linked_gain_id?: string // Optional link to Customer Profile gain
  evidence?: string
  created_at: string
  metadata?: {
    source?: string
    confidence?: 'low' | 'medium' | 'high'
    [key: string]: unknown
  }
}

export type ValueMapItem = ProductItem | PainRelieverItem | GainCreatorItem

export interface ValueMapBlock<T extends ValueMapItem = ValueMapItem> {
  items: T[]
  notes?: string
}

export interface ValueMapCanvas {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  products_services: ValueMapBlock<ProductItem>
  pain_relievers: ValueMapBlock<PainRelieverItem>
  gain_creators: ValueMapBlock<GainCreatorItem>
  created_at: string
  updated_at: string
}

// ============================================================================
// Block Configuration
// ============================================================================

export interface ValueMapBlockConfig {
  id: ValueMapBlockId
  name: string
  shortName: string
  description: string
  color: string
  bgClass: string
}

export const VALUE_MAP_BLOCK_CONFIG: Record<ValueMapBlockId, ValueMapBlockConfig> = {
  products_services: {
    id: 'products_services',
    name: 'Products & Services',
    shortName: 'Products',
    description: 'What you offer to customers',
    color: '#3B82F6', // Blue
    bgClass: 'bg-blue-50 border-blue-200',
  },
  pain_relievers: {
    id: 'pain_relievers',
    name: 'Pain Relievers',
    shortName: 'Relievers',
    description: 'How your offering addresses customer pains',
    color: '#F97316', // Orange
    bgClass: 'bg-orange-50 border-orange-200',
  },
  gain_creators: {
    id: 'gain_creators',
    name: 'Gain Creators',
    shortName: 'Creators',
    description: 'How your offering creates customer gains',
    color: '#22C55E', // Green
    bgClass: 'bg-green-50 border-green-200',
  },
}

/**
 * CSS Grid layout for Value Map Canvas
 *
 * Layout visualization:
 * ┌─────────────┬─────────────┬─────────────┐
 * │  Products   │  Relievers  │  Creators   │
 * │  & Services │             │             │
 * └─────────────┴─────────────┴─────────────┘
 */
export const VALUE_MAP_GRID_TEMPLATE = `"products_services pain_relievers gain_creators"`

export const VALUE_MAP_GRID_COLUMNS = '1fr 1fr 1fr'

export const VALUE_MAP_GRID_ROWS = '1fr'

// ============================================================================
// Validation
// ============================================================================

export type DataResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export const ITEM_CONTENT_MAX_LENGTH = 500
export const ITEM_CONTENT_MIN_LENGTH = 1

/**
 * Validate that a string is a valid Value Map block ID
 */
export function validateValueMapBlockId(blockId: string): DataResult<ValueMapBlockId> {
  if (!VALUE_MAP_BLOCK_IDS.includes(blockId as ValueMapBlockId)) {
    return { success: false, error: `Invalid block ID: ${blockId}` }
  }
  return { success: true, data: blockId as ValueMapBlockId }
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

  // CRITICAL: XSS prevention - reject HTML-like patterns
  const htmlPattern = /<[^>]*>/
  if (htmlPattern.test(trimmed)) {
    return { success: false, error: 'Content cannot contain HTML tags' }
  }

  // Also check for common XSS patterns
  const xssPatterns = [
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
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
 * Evidence field max length
 */
export const EVIDENCE_MAX_LENGTH = 1000

/**
 * Validate evidence content - optional field with XSS protection
 * CRITICAL: Rejects HTML-like patterns to prevent XSS attacks
 */
export function validateEvidence(
  evidence: string | null | undefined
): DataResult<string | null> {
  if (evidence === null || evidence === undefined || evidence === '') {
    return { success: true, data: null }
  }

  const trimmed = evidence.trim()
  if (trimmed.length > EVIDENCE_MAX_LENGTH) {
    return {
      success: false,
      error: `Evidence must be ${EVIDENCE_MAX_LENGTH} characters or less`,
    }
  }

  // CRITICAL: XSS prevention - reject HTML-like patterns
  const htmlPattern = /<[^>]*>/
  if (htmlPattern.test(trimmed)) {
    return { success: false, error: 'Evidence cannot contain HTML tags' }
  }

  // Also check for common XSS patterns
  const xssPatterns = [
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /data:/i,
  ]
  for (const pattern of xssPatterns) {
    if (pattern.test(trimmed)) {
      return { success: false, error: 'Evidence contains invalid characters' }
    }
  }

  return { success: true, data: trimmed }
}

/**
 * Validate product type
 */
export function validateProductType(
  type: string | null | undefined
): DataResult<ProductType | null> {
  if (type === null || type === undefined || type === '') {
    return { success: true, data: null }
  }

  if (!PRODUCT_TYPES.includes(type as ProductType)) {
    return { success: false, error: `Invalid product type: ${type}` }
  }
  return { success: true, data: type as ProductType }
}

/**
 * Validate effectiveness level
 */
export function validateEffectiveness(
  effectiveness: string | null | undefined
): DataResult<EffectivenessLevel | null> {
  if (effectiveness === null || effectiveness === undefined || effectiveness === '') {
    return { success: true, data: null }
  }

  if (!EFFECTIVENESS_LEVELS.includes(effectiveness as EffectivenessLevel)) {
    return { success: false, error: `Invalid effectiveness level: ${effectiveness}` }
  }
  return { success: true, data: effectiveness as EffectivenessLevel }
}

// ============================================================================
// JSONB Runtime Validation
// ============================================================================

/**
 * Validate a base value map item structure
 * Validates id, content, and created_at (must be valid ISO 8601 date)
 */
function isValidBaseItem(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false
  const i = item as Record<string, unknown>

  // Validate created_at is a valid ISO 8601 date string
  const isValidDate =
    typeof i.created_at === 'string' && !isNaN(Date.parse(i.created_at))

  return (
    typeof i.id === 'string' &&
    i.id.length > 0 &&
    typeof i.content === 'string' &&
    isValidDate
  )
}

/**
 * Type guard: check if item is a ProductItem
 * Use this instead of unsafe type assertions
 */
export function isProductItem(item: ValueMapItem): item is ProductItem {
  // Products have 'type' field (product/service/feature)
  return 'type' in item
}

/**
 * Type guard: check if item is a PainRelieverItem
 * Use this instead of unsafe type assertions
 */
export function isPainRelieverItem(item: ValueMapItem): item is PainRelieverItem {
  // Pain relievers have 'linked_pain_id' field
  return 'linked_pain_id' in item
}

/**
 * Type guard: check if item is a GainCreatorItem
 * Use this instead of unsafe type assertions
 */
export function isGainCreatorItem(item: ValueMapItem): item is GainCreatorItem {
  // Gain creators have 'linked_gain_id' field
  return 'linked_gain_id' in item
}

/**
 * Validate a ProductItem structure (for JSONB runtime validation)
 */
function isValidProductItem(item: unknown): item is ProductItem {
  if (!isValidBaseItem(item)) return false
  const i = item as Record<string, unknown>
  return i.type === undefined || PRODUCT_TYPES.includes(i.type as ProductType)
}

/**
 * Validate a PainRelieverItem structure (for JSONB runtime validation)
 */
function isValidPainRelieverItem(item: unknown): item is PainRelieverItem {
  if (!isValidBaseItem(item)) return false
  const i = item as Record<string, unknown>
  return (
    (i.effectiveness === undefined ||
      EFFECTIVENESS_LEVELS.includes(i.effectiveness as EffectivenessLevel)) &&
    (i.linked_pain_id === undefined || typeof i.linked_pain_id === 'string')
  )
}

/**
 * Validate a GainCreatorItem structure (for JSONB runtime validation)
 */
function isValidGainCreatorItem(item: unknown): item is GainCreatorItem {
  if (!isValidBaseItem(item)) return false
  const i = item as Record<string, unknown>
  return (
    (i.effectiveness === undefined ||
      EFFECTIVENESS_LEVELS.includes(i.effectiveness as EffectivenessLevel)) &&
    (i.linked_gain_id === undefined || typeof i.linked_gain_id === 'string')
  )
}

/**
 * Validate a ValueMapBlock structure
 */
function isValidValueMapBlock<T extends ValueMapItem>(
  block: unknown,
  itemValidator: (item: unknown) => item is T
): block is ValueMapBlock<T> {
  if (!block || typeof block !== 'object') return false
  const b = block as Record<string, unknown>

  if (!Array.isArray(b.items)) return false

  for (const item of b.items) {
    if (!itemValidator(item)) return false
  }

  return true
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create an empty value map block with default values
 */
export function createEmptyBlock<T extends ValueMapItem = ValueMapItem>(): ValueMapBlock<T> {
  return {
    items: [],
  }
}

/**
 * Normalize a products_services block from database
 */
export function normalizeProductsBlock(block: unknown): ValueMapBlock<ProductItem> {
  if (!block || typeof block !== 'object') {
    return createEmptyBlock<ProductItem>()
  }

  const b = block as Record<string, unknown>

  let items: ProductItem[] = []
  if (Array.isArray(b.items)) {
    items = b.items.filter((item): item is ProductItem => {
      const isValid = isValidProductItem(item)
      if (!isValid) {
        console.warn('[normalizeProductsBlock] Skipping invalid item:', item)
      }
      return isValid
    })
  }

  return {
    items,
    notes: typeof b.notes === 'string' ? b.notes : undefined,
  }
}

/**
 * Normalize a pain_relievers block from database
 */
export function normalizePainRelieversBlock(block: unknown): ValueMapBlock<PainRelieverItem> {
  if (!block || typeof block !== 'object') {
    return createEmptyBlock<PainRelieverItem>()
  }

  const b = block as Record<string, unknown>

  let items: PainRelieverItem[] = []
  if (Array.isArray(b.items)) {
    items = b.items.filter((item): item is PainRelieverItem => {
      const isValid = isValidPainRelieverItem(item)
      if (!isValid) {
        console.warn('[normalizePainRelieversBlock] Skipping invalid item:', item)
      }
      return isValid
    })
  }

  return {
    items,
    notes: typeof b.notes === 'string' ? b.notes : undefined,
  }
}

/**
 * Normalize a gain_creators block from database
 */
export function normalizeGainCreatorsBlock(block: unknown): ValueMapBlock<GainCreatorItem> {
  if (!block || typeof block !== 'object') {
    return createEmptyBlock<GainCreatorItem>()
  }

  const b = block as Record<string, unknown>

  let items: GainCreatorItem[] = []
  if (Array.isArray(b.items)) {
    items = b.items.filter((item): item is GainCreatorItem => {
      const isValid = isValidGainCreatorItem(item)
      if (!isValid) {
        console.warn('[normalizeGainCreatorsBlock] Skipping invalid item:', item)
      }
      return isValid
    })
  }

  return {
    items,
    notes: typeof b.notes === 'string' ? b.notes : undefined,
  }
}

/**
 * Get a block from a canvas by ID
 */
export function getCanvasBlock(
  canvas: ValueMapCanvas,
  blockId: ValueMapBlockId
): ValueMapBlock<ValueMapItem> {
  switch (blockId) {
    case 'products_services':
      return normalizeProductsBlock(canvas.products_services)
    case 'pain_relievers':
      return normalizePainRelieversBlock(canvas.pain_relievers)
    case 'gain_creators':
      return normalizeGainCreatorsBlock(canvas.gain_creators)
    default:
      return createEmptyBlock()
  }
}

/**
 * Get all blocks from a canvas as an array with their IDs
 */
export function getAllBlocks(
  canvas: ValueMapCanvas
): Array<{ blockId: ValueMapBlockId; block: ValueMapBlock<ValueMapItem>; config: ValueMapBlockConfig }> {
  return VALUE_MAP_BLOCK_IDS.map((blockId) => ({
    blockId,
    block: getCanvasBlock(canvas, blockId),
    config: VALUE_MAP_BLOCK_CONFIG[blockId],
  }))
}

/**
 * Count total items across all blocks
 */
export function countTotalItems(canvas: ValueMapCanvas): number {
  return VALUE_MAP_BLOCK_IDS.reduce((total, blockId) => {
    const block = getCanvasBlock(canvas, blockId)
    return total + block.items.length
  }, 0)
}

// ============================================================================
// Badge Styling
// ============================================================================

/**
 * Get product type badge styling
 */
export function getProductTypeBadgeClass(type: ProductType | undefined): string {
  switch (type) {
    case 'product':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'service':
      return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'feature':
      return 'bg-cyan-100 text-cyan-700 border-cyan-200'
    default:
      return ''
  }
}

/**
 * Get effectiveness badge styling
 */
export function getEffectivenessBadgeClass(effectiveness: EffectivenessLevel | undefined): string {
  switch (effectiveness) {
    case 'high':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'low':
      return 'bg-gray-100 text-gray-600 border-gray-200'
    default:
      return ''
  }
}

// ============================================================================
// Item Creation
// ============================================================================

/**
 * Create a new product item with generated ID
 * CRITICAL: Includes collision detection
 */
export function createNewProductItem(
  content: string,
  options?: {
    type?: ProductType
    existingIds?: Set<string>
    maxRetries?: number
  }
): ProductItem {
  const { type, existingIds, maxRetries = 3 } = options || {}

  let id = crypto.randomUUID()
  let retries = 0

  if (existingIds) {
    while (existingIds.has(id) && retries < maxRetries) {
      console.warn(`[createNewProductItem] UUID collision detected, retrying (attempt ${retries + 1})`)
      id = crypto.randomUUID()
      retries++
    }
    if (existingIds.has(id)) {
      console.error(`[createNewProductItem] UUID collision persisted after ${maxRetries} retries`)
      id = `${crypto.randomUUID()}-${Date.now()}`
    }
  }

  return {
    id,
    content,
    type,
    created_at: new Date().toISOString(),
  }
}

/**
 * Create a new pain reliever item with generated ID
 * CRITICAL: Includes collision detection
 */
export function createNewPainRelieverItem(
  content: string,
  options?: {
    effectiveness?: EffectivenessLevel
    linked_pain_id?: string
    existingIds?: Set<string>
    maxRetries?: number
  }
): PainRelieverItem {
  const { effectiveness, linked_pain_id, existingIds, maxRetries = 3 } = options || {}

  let id = crypto.randomUUID()
  let retries = 0

  if (existingIds) {
    while (existingIds.has(id) && retries < maxRetries) {
      console.warn(`[createNewPainRelieverItem] UUID collision detected, retrying (attempt ${retries + 1})`)
      id = crypto.randomUUID()
      retries++
    }
    if (existingIds.has(id)) {
      console.error(`[createNewPainRelieverItem] UUID collision persisted after ${maxRetries} retries`)
      id = `${crypto.randomUUID()}-${Date.now()}`
    }
  }

  return {
    id,
    content,
    effectiveness,
    linked_pain_id,
    created_at: new Date().toISOString(),
  }
}

/**
 * Create a new gain creator item with generated ID
 * CRITICAL: Includes collision detection
 */
export function createNewGainCreatorItem(
  content: string,
  options?: {
    effectiveness?: EffectivenessLevel
    linked_gain_id?: string
    existingIds?: Set<string>
    maxRetries?: number
  }
): GainCreatorItem {
  const { effectiveness, linked_gain_id, existingIds, maxRetries = 3 } = options || {}

  let id = crypto.randomUUID()
  let retries = 0

  if (existingIds) {
    while (existingIds.has(id) && retries < maxRetries) {
      console.warn(`[createNewGainCreatorItem] UUID collision detected, retrying (attempt ${retries + 1})`)
      id = crypto.randomUUID()
      retries++
    }
    if (existingIds.has(id)) {
      console.error(`[createNewGainCreatorItem] UUID collision persisted after ${maxRetries} retries`)
      id = `${crypto.randomUUID()}-${Date.now()}`
    }
  }

  return {
    id,
    content,
    effectiveness,
    linked_gain_id,
    created_at: new Date().toISOString(),
  }
}
