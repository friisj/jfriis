/**
 * Journey Cells Boundary Object
 *
 * Validation constants and functions for journey canvas cells.
 * Part of Canvas Views Expansion Phase 2.
 */

// ============================================================================
// Types
// ============================================================================

export type DataResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

export interface JourneyCell {
  id: string
  stage_id: string
  layer_type: JourneyLayerType
  content: string | null
  emotion_score: number | null
  channel_type: string | null
  sequence: number
  created_at: string
  updated_at: string
}

export interface Touchpoint {
  id: string
  journey_stage_id: string
  name: string
  description: string | null
  sequence: number
  channel_type: string | null
  interaction_type: string | null
  importance: string | null
  current_experience_quality: string | null
  pain_level: string | null
}

export interface JourneyStage {
  id: string
  user_journey_id: string
  name: string
  description: string | null
  sequence: number
  cells?: JourneyCell[]
}

export interface UserJourney {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  stages?: JourneyStage[]
}

// ============================================================================
// Constants
// ============================================================================

export const JOURNEY_LAYER_TYPES = [
  'touchpoint',
  'emotion',
  'pain_point',
  'channel',
  'opportunity',
] as const
export type JourneyLayerType = (typeof JOURNEY_LAYER_TYPES)[number]

export const EMOTION_SCORE_MIN = -5
export const EMOTION_SCORE_MAX = 5

export const CHANNEL_TYPES = [
  'email',
  'phone',
  'web',
  'mobile_app',
  'chat',
  'in_person',
  'social_media',
  'mail',
  'self_service',
  'other',
] as const
export type ChannelType = (typeof CHANNEL_TYPES)[number]

/**
 * Display configuration for journey layers.
 * Each layer represents a different perspective on the customer experience.
 */
export const JOURNEY_LAYER_CONFIG: Record<
  JourneyLayerType,
  { name: string; color: string; description: string }
> = {
  touchpoint: {
    name: 'Touchpoints',
    color: 'blue',
    description: 'Customer interaction points',
  },
  emotion: {
    name: 'Emotions',
    color: 'pink',
    description: 'Emotional state (-5 to +5)',
  },
  pain_point: {
    name: 'Pain Points',
    color: 'orange',
    description: 'Frustrations and problems',
  },
  channel: {
    name: 'Channels',
    color: 'green',
    description: 'Communication channels used',
  },
  opportunity: {
    name: 'Opportunities',
    color: 'purple',
    description: 'Improvement opportunities',
  },
}

// Length limits
export const CELL_CONTENT_MAX_LENGTH = 2000
export const STAGE_NAME_MAX_LENGTH = 100
export const STAGE_DESCRIPTION_MAX_LENGTH = 1000

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates that a string is a valid journey layer type.
 *
 * @param layerType - String to validate
 * @returns DataResult with validated LayerType or error
 */
export function validateJourneyLayerType(layerType: string): DataResult<JourneyLayerType> {
  if (!JOURNEY_LAYER_TYPES.includes(layerType as JourneyLayerType)) {
    return { success: false, error: `Invalid layer type: ${layerType}` }
  }
  return { success: true, data: layerType as JourneyLayerType }
}

/**
 * Validates cell content length and checks for XSS patterns.
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
 * Validates stage name.
 *
 * @param name - Stage name to validate
 * @returns DataResult with trimmed name or error
 */
export function validateStageName(name: string): DataResult<string> {
  const trimmed = name.trim()
  if (!trimmed) {
    return { success: false, error: 'Stage name is required' }
  }
  if (trimmed.length > STAGE_NAME_MAX_LENGTH) {
    return {
      success: false,
      error: `Stage name must be ${STAGE_NAME_MAX_LENGTH} characters or less`,
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
 * Validates stage description length and checks for XSS patterns.
 *
 * @param description - Description to validate
 * @returns DataResult with trimmed description or null, or error if invalid
 */
export function validateStageDescription(
  description: string | undefined | null
): DataResult<string | null> {
  if (!description) return { success: true, data: null }
  const trimmed = description.trim()
  if (trimmed.length > STAGE_DESCRIPTION_MAX_LENGTH) {
    return {
      success: false,
      error: `Description must be ${STAGE_DESCRIPTION_MAX_LENGTH} characters or less`,
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
 * Validates emotion score is within valid range (-5 to +5).
 *
 * @param score - Emotion score to validate
 * @returns DataResult with validated score or null, or error if out of range
 */
export function validateEmotionScore(
  score: number | undefined | null
): DataResult<number | null> {
  if (score === undefined || score === null) return { success: true, data: null }
  if (!Number.isInteger(score)) {
    return { success: false, error: 'Emotion score must be a whole number' }
  }
  if (score < EMOTION_SCORE_MIN || score > EMOTION_SCORE_MAX) {
    return {
      success: false,
      error: `Emotion score must be between ${EMOTION_SCORE_MIN} and ${EMOTION_SCORE_MAX}`,
    }
  }
  return { success: true, data: score }
}

/**
 * Validates channel type.
 *
 * @param channelType - Channel type to validate
 * @returns DataResult with validated channel type or null, or error if invalid
 */
export function validateChannelType(
  channelType: string | undefined | null
): DataResult<string | null> {
  if (!channelType) return { success: true, data: null }
  // Accept any non-empty string for flexibility (not just predefined types)
  const trimmed = channelType.trim()
  if (trimmed.length > 50) {
    return { success: false, error: 'Channel type must be 50 characters or less' }
  }

  // XSS prevention
  const htmlPattern = /<[^>]*>/
  if (htmlPattern.test(trimmed)) {
    return { success: false, error: 'Channel type cannot contain HTML tags' }
  }

  return { success: true, data: trimmed || null }
}

// ============================================================================
// Touchpoint Validation
// ============================================================================

export const TOUCHPOINT_NAME_MAX_LENGTH = 200
export const TOUCHPOINT_DESCRIPTION_MAX_LENGTH = 1000

/**
 * Validates touchpoint name.
 *
 * @param name - Touchpoint name to validate
 * @returns DataResult with trimmed name or error
 */
export function validateTouchpointName(
  name: string | undefined | null
): DataResult<string> {
  if (!name) {
    return { success: false, error: 'Touchpoint name is required' }
  }
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return { success: false, error: 'Touchpoint name is required' }
  }
  if (trimmed.length > TOUCHPOINT_NAME_MAX_LENGTH) {
    return {
      success: false,
      error: `Touchpoint name must be ${TOUCHPOINT_NAME_MAX_LENGTH} characters or less`,
    }
  }

  // XSS prevention
  const htmlPattern = /<[^>]*>/
  if (htmlPattern.test(trimmed)) {
    return { success: false, error: 'Name cannot contain HTML tags' }
  }

  const xssPatterns = [/javascript:/i, /on\w+\s*=/i, /data:/i]
  for (const pattern of xssPatterns) {
    if (pattern.test(trimmed)) {
      return { success: false, error: 'Name contains invalid characters' }
    }
  }

  return { success: true, data: trimmed }
}

/**
 * Validates touchpoint description.
 *
 * @param description - Description to validate
 * @returns DataResult with trimmed description or null, or error if invalid
 */
export function validateTouchpointDescription(
  description: string | undefined | null
): DataResult<string | null> {
  if (!description) return { success: true, data: null }
  const trimmed = description.trim()
  if (trimmed.length > TOUCHPOINT_DESCRIPTION_MAX_LENGTH) {
    return {
      success: false,
      error: `Description must be ${TOUCHPOINT_DESCRIPTION_MAX_LENGTH} characters or less`,
    }
  }

  // XSS prevention
  const htmlPattern = /<[^>]*>/
  if (htmlPattern.test(trimmed)) {
    return { success: false, error: 'Description cannot contain HTML tags' }
  }

  const xssPatterns = [/javascript:/i, /on\w+\s*=/i, /data:/i]
  for (const pattern of xssPatterns) {
    if (pattern.test(trimmed)) {
      return { success: false, error: 'Description contains invalid characters' }
    }
  }

  return { success: true, data: trimmed || null }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the ordered list of journey layer types for display.
 * Returns layers in the standard journey mapping order:
 * Touchpoints → Emotions → Pain Points → Channels → Opportunities
 *
 * @returns Array of layer types in display order
 */
export function getOrderedJourneyLayers(): JourneyLayerType[] {
  return [...JOURNEY_LAYER_TYPES]
}

/**
 * Find a specific cell by stage ID and layer type from a list of cells.
 * Returns undefined if no cell exists for that combination.
 *
 * @param cells - Array of journey cells to search
 * @param stageId - UUID of the stage
 * @param layerType - Type of layer
 * @returns The matching cell or undefined if not found
 */
export function getCellForStageLayer(
  cells: JourneyCell[],
  stageId: string,
  layerType: JourneyLayerType
): JourneyCell | undefined {
  return cells.find(
    (cell) => cell.stage_id === stageId && cell.layer_type === layerType
  )
}

/**
 * Build a nested Map for efficient cell lookups by stage and layer.
 * Use this when rendering the canvas grid to avoid repeated array searches.
 *
 * @param cells - Array of journey cells
 * @returns Map<stageId, Map<layerType, cell>> for O(1) lookups
 */
export function buildJourneyCellsMap(
  cells: JourneyCell[]
): Map<string, Map<JourneyLayerType, JourneyCell>> {
  const map = new Map<string, Map<JourneyLayerType, JourneyCell>>()

  for (const cell of cells) {
    if (!map.has(cell.stage_id)) {
      map.set(cell.stage_id, new Map())
    }
    map.get(cell.stage_id)!.set(cell.layer_type, cell)
  }

  return map
}

/**
 * Get emoji representation of an emotion score.
 * Used for visual display in emotion layer cells.
 *
 * @param score - Emotion score (-5 to +5)
 * @returns Emoji string representing the emotion
 */
export function getEmotionEmoji(score: number | null): string {
  if (score === null) return '😐'
  if (score >= 4) return '😄'
  if (score >= 2) return '🙂'
  if (score >= -1) return '😐'
  if (score >= -3) return '😟'
  return '😢'
}

/**
 * Get background color class for emotion score.
 * Returns Tailwind gradient class based on score.
 *
 * @param score - Emotion score (-5 to +5)
 * @returns Tailwind CSS class for background color
 */
export function getEmotionBgClass(score: number | null): string {
  if (score === null) return 'bg-gray-50'
  if (score >= 4) return 'bg-green-100'
  if (score >= 2) return 'bg-green-50'
  if (score >= -1) return 'bg-gray-50'
  if (score >= -3) return 'bg-orange-50'
  return 'bg-red-100'
}
