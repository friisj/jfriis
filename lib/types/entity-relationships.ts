/**
 * Entity Relationship Type Definitions
 *
 * Universal types for the evidence and entity_links tables.
 * Part of Entity Relationship Simplification (OJI-5)
 */

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
  | 'backlog_item'
  | 'specimen'
  // Studio
  | 'studio_project'
  | 'hypothesis'
  | 'experiment'
  // Canvases
  | 'business_model_canvas'
  | 'customer_profile'
  | 'value_proposition_canvas'
  | 'canvas_item'
  // Journeys
  | 'user_journey'
  | 'journey_stage'
  | 'touchpoint'
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
  | 'supports'       // Supports a claim
  | 'contradicts'    // Contradicts a claim
  // Composition
  | 'contains'       // Parent contains child
  | 'part_of'        // Child is part of parent
  // Canvas-specific
  | 'addresses_job'  // Value prop addresses customer job
  | 'relieves_pain'  // Pain reliever addresses pain
  | 'creates_gain'   // Gain creator delivers gain
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
// TABLE NAME MAPPING
// ============================================================================

/**
 * Maps entity types to their Supabase table names
 */
export const ENTITY_TYPE_TABLE_MAP: Record<LinkableEntityType, string> = {
  project: 'projects',
  log_entry: 'log_entries',
  backlog_item: 'backlog_items',
  specimen: 'specimens',
  studio_project: 'studio_projects',
  hypothesis: 'studio_hypotheses',
  experiment: 'studio_experiments',
  business_model_canvas: 'business_model_canvases',
  customer_profile: 'customer_profiles',
  value_proposition_canvas: 'value_proposition_canvases',
  canvas_item: 'canvas_items',
  user_journey: 'user_journeys',
  journey_stage: 'journey_stages',
  touchpoint: 'touchpoints',
  assumption: 'assumptions',
  gallery_sequence: 'gallery_sequences',
}

/**
 * Get the table name for an entity type
 */
export function getTableNameForType(type: LinkableEntityType): string {
  return ENTITY_TYPE_TABLE_MAP[type]
}
