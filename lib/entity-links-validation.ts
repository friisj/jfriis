/**
 * Entity Links Validation Rules
 *
 * Defines which link types are valid between different entity types.
 * Part of Entity Relationship Simplification (OJI-5)
 */

import type { LinkableEntityType, LinkType } from './types/entity-relationships'

/**
 * Defines which link types are valid from each source type to each target type.
 * If a source→target pair isn't listed, only 'related' and 'references' are allowed.
 */
const VALID_LINK_TYPES: Partial<Record<LinkableEntityType, Partial<Record<LinkableEntityType, LinkType[]>>>> = {
  // Log entries document work
  log_entry: {
    assumption: ['documents', 'related'],
    experiment: ['documents', 'related'],
    specimen: ['contains', 'related'],
    project: ['references', 'related'],
    hypothesis: ['documents', 'related'],
    canvas_item: ['documents', 'related'],
    studio_project: ['documents', 'related'],
  },

  // Specimens demonstrate concepts
  specimen: {
    assumption: ['demonstrates', 'validates'],
    project: ['related'],
    canvas_item: ['demonstrates', 'related'],
  },

  // Experiments test hypotheses and assumptions
  experiment: {
    hypothesis: ['tests', 'validates'],
    assumption: ['tests', 'validates'],
    canvas_item: ['validates', 'related'],
  },

  // Business Model Canvas relationships
  business_model_canvas: {
    value_proposition_canvas: ['related'],
    customer_profile: ['related'],
  },

  // Value Proposition Canvas relationships
  value_proposition_canvas: {
    business_model_canvas: ['related'],
    customer_profile: ['related'],
  },

  // Customer Profile relationships
  customer_profile: {
    business_model_canvas: ['related'],
    value_proposition_canvas: ['related'],
  },

  // User Journey relationships
  user_journey: {
    business_model_canvas: ['related'],
    value_proposition_canvas: ['related'],
    customer_profile: ['related'],
  },

  // Gallery contains specimens
  gallery_sequence: {
    specimen: ['contains'],
  },

  // Projects can contain specimens
  project: {
    specimen: ['contains', 'related'],
    log_entry: ['related'],
  },

  // Hypotheses link to assumptions
  hypothesis: {
    assumption: ['related', 'tests'],
    canvas_item: ['related'],
  },

  // Assumptions can link to many things
  assumption: {
    canvas_item: ['related'],
    experiment: ['related'],
    hypothesis: ['related'],
  },

  // Canvas items can link to various entities
  canvas_item: {
    assumption: ['related'],
    canvas_item: ['addresses_job', 'relieves_pain', 'creates_gain', 'related'],
  },
}

/**
 * Default allowed link types when no specific rule exists
 */
const DEFAULT_LINK_TYPES: LinkType[] = ['related', 'references']

/**
 * Check if a link type is valid between two entity types
 */
export function isValidLinkType(
  sourceType: LinkableEntityType,
  targetType: LinkableEntityType,
  linkType: LinkType
): boolean {
  // Always allow related and references
  if (DEFAULT_LINK_TYPES.includes(linkType)) {
    return true
  }

  const sourceRules = VALID_LINK_TYPES[sourceType]
  if (!sourceRules) {
    return false
  }

  const targetRules = sourceRules[targetType]
  if (!targetRules) {
    return false
  }

  return targetRules.includes(linkType)
}

/**
 * Get valid link types for a source→target pair
 */
export function getValidLinkTypes(
  sourceType: LinkableEntityType,
  targetType: LinkableEntityType
): LinkType[] {
  const sourceRules = VALID_LINK_TYPES[sourceType]
  if (!sourceRules || !sourceRules[targetType]) {
    return DEFAULT_LINK_TYPES
  }

  // Include default types plus specific ones
  const specificTypes = sourceRules[targetType] || []
  const allTypes = new Set([...DEFAULT_LINK_TYPES, ...specificTypes])
  return Array.from(allTypes)
}

/**
 * Validate a link and throw an error if invalid
 */
export function validateLink(
  sourceType: LinkableEntityType,
  targetType: LinkableEntityType,
  linkType: LinkType
): void {
  if (!isValidLinkType(sourceType, targetType, linkType)) {
    const validTypes = getValidLinkTypes(sourceType, targetType)
    throw new Error(
      `Invalid link type '${linkType}' from ${sourceType} to ${targetType}. ` +
      `Valid types: ${validTypes.join(', ')}`
    )
  }
}

/**
 * Get suggested link types for a source→target pair
 * Returns the specific types first (more relevant), then defaults
 */
export function getSuggestedLinkTypes(
  sourceType: LinkableEntityType,
  targetType: LinkableEntityType
): LinkType[] {
  const sourceRules = VALID_LINK_TYPES[sourceType]
  if (!sourceRules || !sourceRules[targetType]) {
    return DEFAULT_LINK_TYPES
  }

  // Return specific types first, then defaults
  const specificTypes = sourceRules[targetType] || []
  return [...specificTypes, ...DEFAULT_LINK_TYPES.filter(t => !specificTypes.includes(t))]
}

// ============================================================================
// UNCOMMON LINK WARNINGS
// ============================================================================

/**
 * Common/expected entity relationship patterns.
 * Links outside these patterns will trigger a development warning.
 */
const COMMON_LINK_PATTERNS: Array<{
  source: LinkableEntityType
  target: LinkableEntityType
  description: string
}> = [
  // Documentation patterns
  { source: 'log_entry', target: 'project', description: 'Log entries reference projects' },
  { source: 'log_entry', target: 'experiment', description: 'Log entries document experiments' },
  { source: 'log_entry', target: 'assumption', description: 'Log entries document assumptions' },
  { source: 'log_entry', target: 'specimen', description: 'Log entries contain specimens' },
  { source: 'log_entry', target: 'studio_project', description: 'Log entries document studio projects' },

  // Validation patterns
  { source: 'experiment', target: 'hypothesis', description: 'Experiments test hypotheses' },
  { source: 'experiment', target: 'assumption', description: 'Experiments test assumptions' },
  { source: 'specimen', target: 'assumption', description: 'Specimens demonstrate assumptions' },

  // Canvas relationships
  { source: 'business_model_canvas', target: 'value_proposition_canvas', description: 'BMC relates to VPC' },
  { source: 'business_model_canvas', target: 'customer_profile', description: 'BMC relates to profiles' },
  { source: 'value_proposition_canvas', target: 'customer_profile', description: 'VPC relates to profiles' },
  { source: 'canvas_item', target: 'canvas_item', description: 'Canvas item FIT relationships' },
  { source: 'canvas_item', target: 'assumption', description: 'Canvas items relate to assumptions' },

  // Journey relationships
  { source: 'user_journey', target: 'customer_profile', description: 'Journeys relate to profiles' },
  { source: 'user_journey', target: 'value_proposition_canvas', description: 'Journeys relate to VPC' },

  // Collection patterns
  { source: 'gallery_sequence', target: 'specimen', description: 'Galleries contain specimens' },
  { source: 'project', target: 'specimen', description: 'Projects contain specimens' },

  // Hypothesis patterns
  { source: 'hypothesis', target: 'assumption', description: 'Hypotheses relate to assumptions' },
]

/**
 * Check if a link pattern is commonly used.
 * Both directions are checked for symmetric relationships.
 */
function isCommonPattern(
  sourceType: LinkableEntityType,
  targetType: LinkableEntityType
): boolean {
  return COMMON_LINK_PATTERNS.some(pattern =>
    (pattern.source === sourceType && pattern.target === targetType) ||
    (pattern.source === targetType && pattern.target === sourceType)
  )
}

/**
 * Validate a link and warn about uncommon patterns.
 * Use in development to catch potentially incorrect link usage.
 *
 * @param sourceType - The source entity type
 * @param targetType - The target entity type
 * @param linkType - The link type being created
 * @param context - Optional context string for better debugging
 * @returns Warning message if uncommon, undefined if common
 */
export function warnIfUncommonLink(
  sourceType: LinkableEntityType,
  targetType: LinkableEntityType,
  linkType: LinkType,
  context?: string
): string | undefined {
  // Only warn in development
  if (process.env.NODE_ENV !== 'development') {
    return undefined
  }

  // Skip if it's a common pattern
  if (isCommonPattern(sourceType, targetType)) {
    return undefined
  }

  // Skip self-referential links (often intentional)
  if (sourceType === targetType) {
    return undefined
  }

  const contextStr = context ? ` (${context})` : ''
  const warning = `[entity_links] Uncommon link pattern: ${sourceType} → ${targetType} (${linkType})${contextStr}. ` +
    `Consider documenting this pattern in COMMON_LINK_PATTERNS if intentional.`

  console.warn(warning)
  return warning
}

/**
 * Get information about why a link combination might be uncommon
 */
export function getLinkPatternInfo(
  sourceType: LinkableEntityType,
  targetType: LinkableEntityType
): {
  isCommon: boolean
  description?: string
  suggestions: string[]
} {
  const pattern = COMMON_LINK_PATTERNS.find(p =>
    (p.source === sourceType && p.target === targetType) ||
    (p.source === targetType && p.target === sourceType)
  )

  if (pattern) {
    return {
      isCommon: true,
      description: pattern.description,
      suggestions: [],
    }
  }

  // Generate suggestions for uncommon patterns
  const suggestions: string[] = []

  if (sourceType !== targetType) {
    // Suggest intermediate entities
    const sourceLinks = COMMON_LINK_PATTERNS.filter(p =>
      p.source === sourceType || p.target === sourceType
    )
    const targetLinks = COMMON_LINK_PATTERNS.filter(p =>
      p.source === targetType || p.target === targetType
    )

    // Find common intermediaries
    const sourceConnections = new Set(sourceLinks.flatMap(p => [p.source, p.target]))
    const targetConnections = new Set(targetLinks.flatMap(p => [p.source, p.target]))

    const intermediaries = Array.from(sourceConnections).filter(
      type => targetConnections.has(type) && type !== sourceType && type !== targetType
    )

    if (intermediaries.length > 0) {
      suggestions.push(
        `Consider linking through: ${intermediaries.slice(0, 3).join(', ')}`
      )
    }
  }

  return {
    isCommon: false,
    suggestions,
  }
}
