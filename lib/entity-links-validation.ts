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
  // Backlog items can link to various entities
  backlog_item: {
    assumption: ['inspired_by', 'related'],
    canvas_item: ['evolved_from', 'related'],
    log_entry: ['related', 'references'],
    hypothesis: ['inspired_by', 'related'],
  },

  // Log entries document work
  log_entry: {
    assumption: ['documents', 'related'],
    experiment: ['documents', 'related'],
    specimen: ['contains', 'related'],
    project: ['references', 'related'],
    hypothesis: ['documents', 'related'],
    canvas_item: ['documents', 'related'],
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
