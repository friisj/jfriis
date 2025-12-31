/**
 * Boundary Objects Type Definitions
 *
 * Types for user journeys, service blueprints, and story maps
 * Part of the three-layer cascade: Journey → Blueprint → Story Map
 */

import type { BaseRecord } from './database'

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type JourneyType = 'end_to_end' | 'sub_journey' | 'micro_moment'
export type StageType = 'pre_purchase' | 'purchase' | 'post_purchase' | 'ongoing'
export type ChannelType =
  | 'web'
  | 'mobile_app'
  | 'phone'
  | 'email'
  | 'in_person'
  | 'chat'
  | 'social'
  | 'physical_location'
  | 'mail'
  | 'other'
export type InteractionType =
  | 'browse'
  | 'search'
  | 'read'
  | 'watch'
  | 'listen'
  | 'form'
  | 'transaction'
  | 'conversation'
  | 'notification'
  | 'passive'
export type Importance = 'critical' | 'high' | 'medium' | 'low'
export type ExperienceQuality = 'poor' | 'fair' | 'good' | 'excellent' | 'unknown'
export type PainLevel = 'none' | 'minor' | 'moderate' | 'major' | 'critical'
export type DelightPotential = 'low' | 'medium' | 'high'
export type ValidationStatus = 'untested' | 'testing' | 'validated' | 'invalidated'
export type ValidationConfidence = 'low' | 'medium' | 'high'
export type Strength = 'weak' | 'moderate' | 'strong'
export type DropOffRisk = 'low' | 'medium' | 'high'

export type TouchpointMappingType =
  | 'addresses_job'
  | 'triggers_pain'
  | 'delivers_gain'
  | 'tests_assumption'
  | 'delivers_value_prop'

export type AssumptionRelationshipType = 'tests' | 'depends_on' | 'validates' | 'challenges'

export type EvidenceType =
  | 'user_test'
  | 'interview'
  | 'survey'
  | 'analytics'
  | 'observation'
  | 'prototype'
  | 'ab_test'
  | 'heuristic_eval'

// Common status type used across boundary objects
export type BoundaryObjectStatus = 'draft' | 'active' | 'validated' | 'archived'

// ============================================================================
// USER JOURNEY ENTITIES
// ============================================================================

export interface UserJourney extends BaseRecord {
  slug: string
  name: string
  description?: string
  studio_project_id?: string
  hypothesis_id?: string
  customer_profile_id?: string
  journey_type: JourneyType
  status: BoundaryObjectStatus
  version: number
  parent_version_id?: string
  goal?: string
  context: Record<string, any>
  duration_estimate?: string
  validation_status: ValidationStatus
  validated_at?: string
  validation_confidence?: ValidationConfidence
  related_value_proposition_ids: string[]
  related_business_model_ids: string[]
  tags: string[]
  metadata: Record<string, any>
}

export interface JourneyStage extends BaseRecord {
  user_journey_id: string
  name: string
  description?: string
  sequence: number
  stage_type?: StageType
  customer_emotion?: string
  customer_mindset?: string
  customer_goal?: string
  duration_estimate?: string
  drop_off_risk?: DropOffRisk
  validation_status: ValidationStatus
  metadata: Record<string, any>
}

export interface Touchpoint extends BaseRecord {
  journey_stage_id: string
  name: string
  description?: string
  sequence: number
  channel_type?: ChannelType
  interaction_type?: InteractionType
  importance?: Importance
  current_experience_quality?: ExperienceQuality
  pain_level?: PainLevel
  delight_potential?: DelightPotential
  user_actions: any[]
  system_response: Record<string, any>
  validation_status: ValidationStatus
  validated_at?: string
  metadata: Record<string, any>
}

export interface TouchpointMapping extends BaseRecord {
  touchpoint_id: string
  target_type: 'canvas_item' | 'customer_profile' | 'value_proposition_canvas'
  target_id: string
  mapping_type: TouchpointMappingType
  strength?: Strength
  validated: boolean
  notes?: string
  metadata: Record<string, any>
}

export interface TouchpointAssumption {
  id: string
  touchpoint_id: string
  assumption_id: string
  relationship_type: AssumptionRelationshipType
  notes?: string
  created_at: string
}

export interface TouchpointEvidence extends BaseRecord {
  touchpoint_id: string
  evidence_type: EvidenceType
  title: string
  summary?: string
  url?: string
  supports_design?: boolean
  confidence?: ValidationConfidence
  collected_at?: string
  metadata: Record<string, any>
}

// ============================================================================
// INSERT/UPDATE TYPES
// ============================================================================

export type UserJourneyInsert = Omit<UserJourney, keyof BaseRecord>
export type UserJourneyUpdate = Partial<UserJourneyInsert>

export type JourneyStageInsert = Omit<JourneyStage, keyof BaseRecord>
export type JourneyStageUpdate = Partial<JourneyStageInsert>

export type TouchpointInsert = Omit<Touchpoint, keyof BaseRecord>
export type TouchpointUpdate = Partial<TouchpointInsert>

export type TouchpointMappingInsert = Omit<TouchpointMapping, keyof BaseRecord>
export type TouchpointMappingUpdate = Partial<TouchpointMappingInsert>

export type TouchpointAssumptionInsert = Omit<TouchpointAssumption, 'id' | 'created_at'>
export type TouchpointAssumptionUpdate = Partial<TouchpointAssumptionInsert>

export type TouchpointEvidenceInsert = Omit<TouchpointEvidence, keyof BaseRecord>
export type TouchpointEvidenceUpdate = Partial<TouchpointEvidenceInsert>

// ============================================================================
// EXTENDED VIEWS (with relationships)
// ============================================================================

export interface JourneyWithStages extends UserJourney {
  stages: JourneyStage[]
  stage_count: number
  touchpoint_count: number
}

export interface StageWithTouchpoints extends JourneyStage {
  touchpoints: Touchpoint[]
  touchpoint_count: number
}

export interface TouchpointWithRelations extends Touchpoint {
  mappings: TouchpointMapping[]
  assumptions: TouchpointAssumption[]
  evidence: TouchpointEvidence[]
  mapping_count: number
  assumption_count: number
  evidence_count: number
}

// ============================================================================
// HELPER TYPES FOR TABLE VIEWS
// ============================================================================

/**
 * Flattened touchpoint for table views
 * Includes journey and stage context for filtering/sorting
 */
export interface TouchpointTableRow extends Touchpoint {
  journey_name: string
  journey_slug: string
  stage_name: string
  stage_sequence: number
  mapping_count: number
  story_count?: number // Will be populated in later phases
}

/**
 * Journey summary for list views
 */
export interface JourneySummary {
  id: string
  slug: string
  name: string
  status: BoundaryObjectStatus
  validation_status: ValidationStatus
  customer_profile_id?: string
  customer_profile_name?: string
  stage_count: number
  touchpoint_count: number
  high_pain_count: number // Count of touchpoints with pain_level 'major' or 'critical'
  updated_at: string
  tags: string[]
}

// ============================================================================
// FILTER & SORT TYPES FOR TABLE VIEWS
// ============================================================================

export interface JourneyFilters {
  status?: BoundaryObjectStatus[]
  validation_status?: ValidationStatus[]
  customer_profile_id?: string
  journey_type?: JourneyType[]
  tags?: string[]
  search?: string // Search in name, description, goal
}

export interface TouchpointFilters {
  journey_id?: string
  stage_id?: string
  channel_type?: ChannelType[]
  pain_level?: PainLevel[]
  importance?: Importance[]
  validation_status?: ValidationStatus[]
  search?: string
}

export type JourneySortField =
  | 'name'
  | 'status'
  | 'validation_status'
  | 'stage_count'
  | 'touchpoint_count'
  | 'updated_at'

export type TouchpointSortField =
  | 'name'
  | 'sequence'
  | 'pain_level'
  | 'importance'
  | 'channel_type'
  | 'validation_status'

export interface SortConfig<T = string> {
  field: T
  direction: 'asc' | 'desc'
}
