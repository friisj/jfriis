/**
 * Entity Relationship Type Definitions
 *
 * Universal types for the evidence and entity_links tables.
 * Part of Entity Relationship Simplification (OJI-5)
 */

// ============================================================================
// BRANDED TYPES
// ============================================================================

/**
 * Branded type for confidence values (0.0 - 1.0)
 * Provides type safety to prevent accidentally using raw numbers
 */
declare const ConfidenceBrand: unique symbol
export type Confidence = number & { readonly [ConfidenceBrand]: typeof ConfidenceBrand }

/**
 * Create a Confidence value from a number.
 * Throws if value is outside valid range.
 */
export function confidence(value: number): Confidence {
  if (value < 0 || value > 1) {
    throw new Error(`Confidence must be between 0 and 1, got ${value}`)
  }
  return value as Confidence
}

/**
 * Safely parse a confidence value, returning undefined for invalid inputs
 */
export function parseConfidence(value: unknown): Confidence | undefined {
  if (typeof value !== 'number') return undefined
  if (value < 0 || value > 1) return undefined
  return value as Confidence
}

/**
 * Check if a number is a valid confidence value
 */
export function isValidConfidence(value: number): value is Confidence {
  return value >= 0 && value <= 1
}

// ============================================================================
// EVIDENCE TYPES
// ============================================================================

/**
 * Entity types that can have evidence attached
 */
export type EvidenceEntityType =
  | 'assumption'
  | 'canvas_item'
  | 'touchpoint'
  | 'hypothesis'
  | 'experiment'
  | 'user_journey'
  | 'journey_stage'
  | 'customer_profile'
  | 'value_proposition_canvas'
  | 'value_map'
  | 'business_model_canvas'

/**
 * Types of evidence that can be collected
 */
export type UniversalEvidenceType =
  // Research methods
  | 'interview'
  | 'survey'
  | 'observation'
  | 'research'
  // Quantitative
  | 'analytics'
  | 'metrics'
  | 'ab_test'
  // Validation
  | 'experiment'
  | 'prototype'
  | 'user_test'
  | 'heuristic_eval'
  // External
  | 'competitor'
  | 'expert'
  | 'market_research'
  // Internal
  | 'team_discussion'
  | 'stakeholder_feedback'

/**
 * Universal Evidence record
 */
export interface UniversalEvidence {
  id: string
  entity_type: EvidenceEntityType
  entity_id: string
  evidence_type: UniversalEvidenceType
  title?: string
  content?: string
  source_url?: string
  source_reference?: string
  confidence?: number // 0.0 - 1.0
  supports: boolean
  collected_at?: string
  collector_notes?: string
  tags: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type UniversalEvidenceInsert = Omit<UniversalEvidence, 'id' | 'created_at' | 'updated_at'>
export type UniversalEvidenceUpdate = Partial<UniversalEvidenceInsert>

/**
 * Pending evidence for create forms (before entity is saved)
 */
export interface PendingEvidence {
  evidence_type: UniversalEvidenceType
  title?: string
  displayLabel?: string // For UI display before save (auto-generated if not provided)
  content?: string
  source_url?: string
  confidence?: number
  supports: boolean
}

// ============================================================================
// ENTITY LINK TYPES
// ============================================================================

/**
 * Entity types that can be linked
 */
export type LinkableEntityType =
  // Portfolio
  | 'project'
  | 'log_entry'
  | 'specimen'
  // Studio
  | 'studio_project'
  | 'hypothesis'
  | 'experiment'
  // Canvases
  | 'business_model_canvas'
  | 'customer_profile'
  | 'value_proposition_canvas'
  | 'value_map'  // Value Map (customer side of VPC)
  | 'canvas_item'
  // Journeys
  | 'user_journey'
  | 'journey_stage'
  | 'touchpoint'
  // Service Blueprints
  | 'service_blueprint'
  | 'blueprint_step'
  // Story Maps
  | 'story_map'
  | 'activity'
  | 'user_story'
  | 'story_release'
  // Validation
  | 'assumption'
  // Galleries
  | 'gallery_sequence'

/**
 * Types of relationships between entities
 */
export type LinkType =
  // Generic associations
  | 'related'        // General relationship
  | 'references'     // One references another
  // Derivation/evolution
  | 'evolved_from'   // Backlog item became canvas item
  | 'inspired_by'    // One inspired another
  | 'derived_from'   // Direct derivation
  // Validation relationships
  | 'validates'      // Evidence validates assumption
  | 'tests'          // Experiment tests hypothesis
  | 'tested_by'      // Assumption tested by hypothesis
  | 'supports'       // Supports a claim
  | 'contradicts'    // Contradicts a claim
  | 'challenges'     // Challenges an assumption
  | 'depends_on'     // Depends on another entity
  // Composition
  | 'contains'       // Parent contains child
  | 'part_of'        // Child is part of parent
  // Canvas-specific
  | 'addresses_job'  // Value prop addresses customer job
  | 'relieves_pain'  // Pain reliever addresses pain
  | 'creates_gain'   // Gain creator delivers gain
  | 'triggers_pain'  // Touchpoint triggers customer pain
  | 'delivers_gain'  // Feature/story delivers customer gain
  // Journey-to-product relationships
  | 'enables'        // Story enables touchpoint/blueprint
  | 'improves'       // Story improves experience
  | 'fixes_pain'     // Story fixes customer pain
  | 'implements'     // Story/blueprint implements another entity
  | 'delivers'       // Blueprint step delivers touchpoint
  | 'maps_to'        // Activity maps to journey stage
  // Documentation
  | 'documents'      // Log entry documents work on entity
  | 'demonstrates'   // Specimen demonstrates assumption

/**
 * Relationship strength
 */
export type LinkStrength = 'strong' | 'moderate' | 'weak' | 'tentative'

/**
 * Entity Link record
 */
export interface EntityLink {
  id: string
  source_type: LinkableEntityType
  source_id: string
  target_type: LinkableEntityType
  target_id: string
  link_type: LinkType
  strength?: LinkStrength
  notes?: string
  metadata: Record<string, unknown>
  position?: number
  created_at: string
}

export type EntityLinkInsert = Omit<EntityLink, 'id' | 'created_at'>
export type EntityLinkUpdate = Partial<Omit<EntityLinkInsert, 'source_type' | 'source_id' | 'target_type' | 'target_id'>>

/**
 * Pending link for create forms (before entity is saved)
 */
export interface PendingLink {
  targetId: string
  targetLabel: string // For display before save
  linkType: LinkType
  position?: number
  notes?: string
}

/**
 * Linked entity with its full data (for display)
 */
export interface LinkedEntity<T = Record<string, unknown>> {
  link: EntityLink
  entity: T
}

/**
 * Entity reference (type + id pair)
 */
export interface EntityRef {
  type: LinkableEntityType
  id: string
}

// ============================================================================
// ENTITY TYPE CONSTANTS
// ============================================================================

/**
 * Entity type constants to avoid magic strings.
 * Use these instead of string literals for better type safety and autocomplete.
 *
 * @example
 * // Instead of:
 * linkEntities({ type: 'assumption', id }, ...)
 *
 * // Use:
 * linkEntities({ type: ENTITY_TYPES.ASSUMPTION, id }, ...)
 */
export const ENTITY_TYPES = {
  // Portfolio
  PROJECT: 'project' as const,
  LOG_ENTRY: 'log_entry' as const,
  SPECIMEN: 'specimen' as const,

  // Studio
  STUDIO_PROJECT: 'studio_project' as const,
  HYPOTHESIS: 'hypothesis' as const,
  EXPERIMENT: 'experiment' as const,

  // Canvases
  BUSINESS_MODEL_CANVAS: 'business_model_canvas' as const,
  CUSTOMER_PROFILE: 'customer_profile' as const,
  VALUE_PROPOSITION_CANVAS: 'value_proposition_canvas' as const,
  VALUE_MAP: 'value_map' as const,
  CANVAS_ITEM: 'canvas_item' as const,

  // Journeys
  USER_JOURNEY: 'user_journey' as const,
  JOURNEY_STAGE: 'journey_stage' as const,
  TOUCHPOINT: 'touchpoint' as const,

  // Service Blueprints
  SERVICE_BLUEPRINT: 'service_blueprint' as const,
  BLUEPRINT_STEP: 'blueprint_step' as const,

  // Story Maps
  STORY_MAP: 'story_map' as const,
  ACTIVITY: 'activity' as const,
  USER_STORY: 'user_story' as const,
  STORY_RELEASE: 'story_release' as const,

  // Validation
  ASSUMPTION: 'assumption' as const,

  // Galleries
  GALLERY_SEQUENCE: 'gallery_sequence' as const,
} as const

/**
 * Link type constants to avoid magic strings.
 */
export const LINK_TYPES = {
  // Generic associations
  RELATED: 'related' as const,
  REFERENCES: 'references' as const,

  // Derivation/evolution
  EVOLVED_FROM: 'evolved_from' as const,
  INSPIRED_BY: 'inspired_by' as const,
  DERIVED_FROM: 'derived_from' as const,

  // Validation relationships
  VALIDATES: 'validates' as const,
  TESTS: 'tests' as const,
  TESTED_BY: 'tested_by' as const,
  SUPPORTS: 'supports' as const,
  CONTRADICTS: 'contradicts' as const,
  CHALLENGES: 'challenges' as const,
  DEPENDS_ON: 'depends_on' as const,

  // Composition
  CONTAINS: 'contains' as const,
  PART_OF: 'part_of' as const,

  // Canvas-specific
  ADDRESSES_JOB: 'addresses_job' as const,
  RELIEVES_PAIN: 'relieves_pain' as const,
  CREATES_GAIN: 'creates_gain' as const,
  TRIGGERS_PAIN: 'triggers_pain' as const,
  DELIVERS_GAIN: 'delivers_gain' as const,

  // Journey-to-product relationships
  ENABLES: 'enables' as const,
  IMPROVES: 'improves' as const,
  FIXES_PAIN: 'fixes_pain' as const,
  IMPLEMENTS: 'implements' as const,
  DELIVERS: 'delivers' as const,
  MAPS_TO: 'maps_to' as const,

  // Documentation
  DOCUMENTS: 'documents' as const,
  DEMONSTRATES: 'demonstrates' as const,
} as const

// ============================================================================
// TABLE NAME MAPPING
// ============================================================================

/**
 * Maps entity types to their Supabase table names
 */
export const ENTITY_TYPE_TABLE_MAP: Record<LinkableEntityType, string> = {
  project: 'projects',
  log_entry: 'log_entries',
  specimen: 'specimens',
  studio_project: 'studio_projects',
  hypothesis: 'studio_hypotheses',
  experiment: 'studio_experiments',
  business_model_canvas: 'business_model_canvases',
  customer_profile: 'customer_profiles',
  value_proposition_canvas: 'value_proposition_canvases',
  value_map: 'value_maps',
  canvas_item: 'canvas_items',
  user_journey: 'user_journeys',
  journey_stage: 'journey_stages',
  touchpoint: 'touchpoints',
  service_blueprint: 'service_blueprints',
  blueprint_step: 'blueprint_steps',
  story_map: 'story_maps',
  activity: 'activities',
  user_story: 'user_stories',
  story_release: 'story_releases',
  assumption: 'assumptions',
  gallery_sequence: 'gallery_sequences',
}

/**
 * Entity types that have tables implemented
 * Phase 3-5 entity types (blueprints, story maps) are not yet implemented
 */
const IMPLEMENTED_ENTITY_TYPES = new Set<LinkableEntityType>([
  'project',
  'log_entry',
  'specimen',
  'studio_project',
  'hypothesis',
  'experiment',
  'business_model_canvas',
  'customer_profile',
  'value_proposition_canvas',
  'value_map',
  'canvas_item',
  'user_journey',
  'journey_stage',
  'touchpoint',
  'assumption',
  'gallery_sequence',
])

/**
 * Get the table name for an entity type
 * Throws if the entity type's table hasn't been implemented yet
 */
export function getTableNameForType(type: LinkableEntityType): string {
  const tableName = ENTITY_TYPE_TABLE_MAP[type]

  if (!IMPLEMENTED_ENTITY_TYPES.has(type)) {
    throw new Error(
      `Entity type "${type}" is defined but its table "${tableName}" has not been created yet. ` +
      `This entity type is part of Phase 3-5 and is not yet implemented.`
    )
  }

  return tableName
}

/**
 * Check if an entity type's table is implemented
 */
export function isEntityTypeImplemented(type: LinkableEntityType): boolean {
  return IMPLEMENTED_ENTITY_TYPES.has(type)
}
