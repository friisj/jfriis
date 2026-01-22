/**
 * Customer Profile Canvas Boundary Objects
 *
 * Types, validation, and utilities for the Customer Profile canvas view.
 * Follows the same patterns as BMC canvas (Phase 3).
 */

// ============================================================================
// Types
// ============================================================================

export const PROFILE_BLOCK_IDS = ['jobs', 'pains', 'gains'] as const
export type ProfileBlockId = (typeof PROFILE_BLOCK_IDS)[number]

export const JOB_TYPES = ['functional', 'social', 'emotional'] as const
export type JobType = (typeof JOB_TYPES)[number]

export const IMPORTANCE_LEVELS = ['nice_to_have', 'important', 'critical'] as const
export type ImportanceLevel = (typeof IMPORTANCE_LEVELS)[number]

export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'extreme'] as const
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number]

export interface JobItem {
  id: string
  content: string
  type?: JobType
  importance?: ImportanceLevel
  evidence?: string
  created_at: string
  metadata?: {
    source?: string
    confidence?: 'low' | 'medium' | 'high'
    [key: string]: unknown
  }
}

export interface PainItem {
  id: string
  content: string
  severity?: SeverityLevel
  evidence?: string
  created_at: string
  metadata?: {
    source?: string
    confidence?: 'low' | 'medium' | 'high'
    [key: string]: unknown
  }
}

export interface GainItem {
  id: string
  content: string
  importance?: ImportanceLevel
  evidence?: string
  created_at: string
  metadata?: {
    source?: string
    confidence?: 'low' | 'medium' | 'high'
    [key: string]: unknown
  }
}

export type ProfileItem = JobItem | PainItem | GainItem

export interface ProfileBlock<T extends ProfileItem = ProfileItem> {
  items: T[]
  notes?: string
}

export interface CustomerProfileCanvas {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  jobs: ProfileBlock<JobItem>
  pains: ProfileBlock<PainItem>
  gains: ProfileBlock<GainItem>
  created_at: string
  updated_at: string
}

// ============================================================================
// Block Configuration
// ============================================================================

export interface ProfileBlockConfig {
  id: ProfileBlockId
  name: string
  shortName: string
  description: string
  color: string
  bgClass: string
}

export const PROFILE_BLOCK_CONFIG: Record<ProfileBlockId, ProfileBlockConfig> = {
  jobs: {
    id: 'jobs',
    name: 'Customer Jobs',
    shortName: 'Jobs',
    description: 'Tasks customers are trying to accomplish',
    color: '#3B82F6', // Blue
    bgClass: 'bg-blue-50 border-blue-200',
  },
  pains: {
    id: 'pains',
    name: 'Pains',
    shortName: 'Pains',
    description: 'Frustrations, risks, and obstacles',
    color: '#EF4444', // Red
    bgClass: 'bg-red-50 border-red-200',
  },
  gains: {
    id: 'gains',
    name: 'Gains',
    shortName: 'Gains',
    description: 'Benefits and outcomes customers want',
    color: '#22C55E', // Green
    bgClass: 'bg-green-50 border-green-200',
  },
}

/**
 * CSS Grid layout for Customer Profile Canvas
 *
 * Layout visualization:
 * ┌─────────────┬─────────────┬─────────────┐
 * │    Jobs     │    Pains    │    Gains    │
 * │             │             │             │
 * └─────────────┴─────────────┴─────────────┘
 */
export const PROFILE_GRID_TEMPLATE = `"jobs pains gains"`

export const PROFILE_GRID_COLUMNS = '1fr 1fr 1fr'

export const PROFILE_GRID_ROWS = '1fr'

// ============================================================================
// Validation
// ============================================================================

export type DataResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export const ITEM_CONTENT_MAX_LENGTH = 500
export const ITEM_CONTENT_MIN_LENGTH = 1

/**
 * Validate that a string is a valid Profile block ID
 */
export function validateProfileBlockId(blockId: string): DataResult<ProfileBlockId> {
  if (!PROFILE_BLOCK_IDS.includes(blockId as ProfileBlockId)) {
    return { success: false, error: `Invalid block ID: ${blockId}` }
  }
  return { success: true, data: blockId as ProfileBlockId }
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
 * Validate job type
 */
export function validateJobType(
  type: string | null | undefined
): DataResult<JobType | null> {
  if (type === null || type === undefined || type === '') {
    return { success: true, data: null }
  }

  if (!JOB_TYPES.includes(type as JobType)) {
    return { success: false, error: `Invalid job type: ${type}` }
  }
  return { success: true, data: type as JobType }
}

/**
 * Validate importance level
 */
export function validateImportance(
  importance: string | null | undefined
): DataResult<ImportanceLevel | null> {
  if (importance === null || importance === undefined || importance === '') {
    return { success: true, data: null }
  }

  if (!IMPORTANCE_LEVELS.includes(importance as ImportanceLevel)) {
    return { success: false, error: `Invalid importance level: ${importance}` }
  }
  return { success: true, data: importance as ImportanceLevel }
}

/**
 * Validate severity level
 */
export function validateSeverity(
  severity: string | null | undefined
): DataResult<SeverityLevel | null> {
  if (severity === null || severity === undefined || severity === '') {
    return { success: true, data: null }
  }

  if (!SEVERITY_LEVELS.includes(severity as SeverityLevel)) {
    return { success: false, error: `Invalid severity level: ${severity}` }
  }
  return { success: true, data: severity as SeverityLevel }
}

// ============================================================================
// JSONB Runtime Validation
// ============================================================================

/**
 * Validate a base profile item structure
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
 * Type guard: check if item is a JobItem
 * Use this instead of unsafe type assertions
 */
export function isJobItem(item: ProfileItem): item is JobItem {
  // Jobs have 'type' field (functional/social/emotional) and may have 'importance'
  return 'type' in item || (!('severity' in item) && 'importance' in item)
}

/**
 * Type guard: check if item is a PainItem
 * Use this instead of unsafe type assertions
 */
export function isPainItem(item: ProfileItem): item is PainItem {
  // Pains have 'severity' field
  return 'severity' in item
}

/**
 * Type guard: check if item is a GainItem
 * Use this instead of unsafe type assertions
 */
export function isGainItem(item: ProfileItem): item is GainItem {
  // Gains only have 'importance' (no type, no severity)
  return !('type' in item) && !('severity' in item)
}

/**
 * Validate a JobItem structure (for JSONB runtime validation)
 */
function isValidJobItem(item: unknown): item is JobItem {
  if (!isValidBaseItem(item)) return false
  const i = item as Record<string, unknown>
  return (
    (i.type === undefined || JOB_TYPES.includes(i.type as JobType)) &&
    (i.importance === undefined || IMPORTANCE_LEVELS.includes(i.importance as ImportanceLevel))
  )
}

/**
 * Validate a PainItem structure (for JSONB runtime validation)
 */
function isValidPainItem(item: unknown): item is PainItem {
  if (!isValidBaseItem(item)) return false
  const i = item as Record<string, unknown>
  return i.severity === undefined || SEVERITY_LEVELS.includes(i.severity as SeverityLevel)
}

/**
 * Validate a GainItem structure (for JSONB runtime validation)
 */
function isValidGainItem(item: unknown): item is GainItem {
  if (!isValidBaseItem(item)) return false
  const i = item as Record<string, unknown>
  return i.importance === undefined || IMPORTANCE_LEVELS.includes(i.importance as ImportanceLevel)
}

/**
 * Validate a ProfileBlock structure
 */
function isValidProfileBlock<T extends ProfileItem>(
  block: unknown,
  itemValidator: (item: unknown) => item is T
): block is ProfileBlock<T> {
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
 * Create an empty profile block with default values
 */
export function createEmptyBlock<T extends ProfileItem = ProfileItem>(): ProfileBlock<T> {
  return {
    items: [],
  }
}

/**
 * Normalize a jobs block from database
 */
export function normalizeJobsBlock(block: unknown): ProfileBlock<JobItem> {
  if (!block || typeof block !== 'object') {
    return createEmptyBlock<JobItem>()
  }

  const b = block as Record<string, unknown>

  let items: JobItem[] = []
  if (Array.isArray(b.items)) {
    items = b.items.filter((item): item is JobItem => {
      const isValid = isValidJobItem(item)
      if (!isValid) {
        console.warn('[normalizeJobsBlock] Skipping invalid item:', item)
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
 * Normalize a pains block from database
 */
export function normalizePainsBlock(block: unknown): ProfileBlock<PainItem> {
  if (!block || typeof block !== 'object') {
    return createEmptyBlock<PainItem>()
  }

  const b = block as Record<string, unknown>

  let items: PainItem[] = []
  if (Array.isArray(b.items)) {
    items = b.items.filter((item): item is PainItem => {
      const isValid = isValidPainItem(item)
      if (!isValid) {
        console.warn('[normalizePainsBlock] Skipping invalid item:', item)
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
 * Normalize a gains block from database
 */
export function normalizeGainsBlock(block: unknown): ProfileBlock<GainItem> {
  if (!block || typeof block !== 'object') {
    return createEmptyBlock<GainItem>()
  }

  const b = block as Record<string, unknown>

  let items: GainItem[] = []
  if (Array.isArray(b.items)) {
    items = b.items.filter((item): item is GainItem => {
      const isValid = isValidGainItem(item)
      if (!isValid) {
        console.warn('[normalizeGainsBlock] Skipping invalid item:', item)
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
  canvas: CustomerProfileCanvas,
  blockId: ProfileBlockId
): ProfileBlock<ProfileItem> {
  switch (blockId) {
    case 'jobs':
      return normalizeJobsBlock(canvas.jobs)
    case 'pains':
      return normalizePainsBlock(canvas.pains)
    case 'gains':
      return normalizeGainsBlock(canvas.gains)
    default:
      return createEmptyBlock()
  }
}

/**
 * Get all blocks from a canvas as an array with their IDs
 */
export function getAllBlocks(
  canvas: CustomerProfileCanvas
): Array<{ blockId: ProfileBlockId; block: ProfileBlock<ProfileItem>; config: ProfileBlockConfig }> {
  return PROFILE_BLOCK_IDS.map((blockId) => ({
    blockId,
    block: getCanvasBlock(canvas, blockId),
    config: PROFILE_BLOCK_CONFIG[blockId],
  }))
}

/**
 * Count total items across all blocks
 */
export function countTotalItems(canvas: CustomerProfileCanvas): number {
  return PROFILE_BLOCK_IDS.reduce((total, blockId) => {
    const block = getCanvasBlock(canvas, blockId)
    return total + block.items.length
  }, 0)
}

// ============================================================================
// Badge Styling
// ============================================================================

/**
 * Get job type badge styling
 */
export function getJobTypeBadgeClass(type: JobType | undefined): string {
  switch (type) {
    case 'functional':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'social':
      return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'emotional':
      return 'bg-pink-100 text-pink-700 border-pink-200'
    default:
      return ''
  }
}

/**
 * Get severity badge styling
 */
export function getSeverityBadgeClass(severity: SeverityLevel | undefined): string {
  switch (severity) {
    case 'extreme':
      return 'bg-red-200 text-red-800 border-red-300'
    case 'high':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'medium':
      return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'low':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    default:
      return ''
  }
}

/**
 * Get importance badge styling
 */
export function getImportanceBadgeClass(importance: ImportanceLevel | undefined): string {
  switch (importance) {
    case 'critical':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'important':
      return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'nice_to_have':
      return 'bg-gray-100 text-gray-600 border-gray-200'
    default:
      return ''
  }
}

// ============================================================================
// Item Creation
// ============================================================================

/**
 * Create a new job item with generated ID
 * CRITICAL: Includes collision detection
 */
export function createNewJobItem(
  content: string,
  options?: {
    type?: JobType
    importance?: ImportanceLevel
    existingIds?: Set<string>
    maxRetries?: number
  }
): JobItem {
  const { type, importance, existingIds, maxRetries = 3 } = options || {}

  let id = crypto.randomUUID()
  let retries = 0

  if (existingIds) {
    while (existingIds.has(id) && retries < maxRetries) {
      console.warn(`[createNewJobItem] UUID collision detected, retrying (attempt ${retries + 1})`)
      id = crypto.randomUUID()
      retries++
    }
    if (existingIds.has(id)) {
      console.error(`[createNewJobItem] UUID collision persisted after ${maxRetries} retries`)
      id = `${crypto.randomUUID()}-${Date.now()}`
    }
  }

  return {
    id,
    content,
    type,
    importance,
    created_at: new Date().toISOString(),
  }
}

/**
 * Create a new pain item with generated ID
 * CRITICAL: Includes collision detection
 */
export function createNewPainItem(
  content: string,
  options?: {
    severity?: SeverityLevel
    existingIds?: Set<string>
    maxRetries?: number
  }
): PainItem {
  const { severity, existingIds, maxRetries = 3 } = options || {}

  let id = crypto.randomUUID()
  let retries = 0

  if (existingIds) {
    while (existingIds.has(id) && retries < maxRetries) {
      console.warn(`[createNewPainItem] UUID collision detected, retrying (attempt ${retries + 1})`)
      id = crypto.randomUUID()
      retries++
    }
    if (existingIds.has(id)) {
      console.error(`[createNewPainItem] UUID collision persisted after ${maxRetries} retries`)
      id = `${crypto.randomUUID()}-${Date.now()}`
    }
  }

  return {
    id,
    content,
    severity,
    created_at: new Date().toISOString(),
  }
}

/**
 * Create a new gain item with generated ID
 * CRITICAL: Includes collision detection
 */
export function createNewGainItem(
  content: string,
  options?: {
    importance?: ImportanceLevel
    existingIds?: Set<string>
    maxRetries?: number
  }
): GainItem {
  const { importance, existingIds, maxRetries = 3 } = options || {}

  let id = crypto.randomUUID()
  let retries = 0

  if (existingIds) {
    while (existingIds.has(id) && retries < maxRetries) {
      console.warn(`[createNewGainItem] UUID collision detected, retrying (attempt ${retries + 1})`)
      id = crypto.randomUUID()
      retries++
    }
    if (existingIds.has(id)) {
      console.error(`[createNewGainItem] UUID collision persisted after ${maxRetries} retries`)
      id = `${crypto.randomUUID()}-${Date.now()}`
    }
  }

  return {
    id,
    content,
    importance,
    created_at: new Date().toISOString(),
  }
}
