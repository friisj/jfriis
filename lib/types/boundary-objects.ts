/**
 * Boundary Objects Type Definitions
 *
 * Types for user journeys, service blueprints, and story maps
 * Part of the three-layer cascade: Journey → Blueprint → Story Map
 *
 * Updated: 2025-12-31 - Fixed polymorphic refs, JSONB types, pagination
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

// Common status type used across boundary objects
export type BoundaryObjectStatus = 'draft' | 'active' | 'validated' | 'archived'

// ============================================================================
// STRUCTURED JSONB TYPES (Type Safety for JSONB fields)
// ============================================================================

/**
 * Journey context - situation and constraints around the journey
 */
export interface JourneyContext {
  environment?: 'web' | 'mobile' | 'in_person' | 'hybrid'
  device_types?: string[]
  time_constraints?: string
  location_constraints?: string
  triggers?: string[] // What initiates this journey
  [key: string]: unknown // Allow extensibility
}

/**
 * User action in a touchpoint
 */
export interface TouchpointUserAction {
  step: number
  action: string
  expected_outcome: string
  alternative_actions?: string[]
}

/**
 * System response at a touchpoint
 */
export interface TouchpointSystemResponse {
  ui_change?: string
  notification?: string
  data_update?: string
  next_state?: string
  error_handling?: string
  [key: string]: unknown
}

/**
 * Generic metadata with type safety
 */
export interface EntityMetadata {
  [key: string]: unknown
}

// ============================================================================
// USER JOURNEY ENTITIES
// ============================================================================

export interface UserJourney extends BaseRecord {
  slug: string
  name: string
  description?: string | null
  studio_project_id?: string | null
  hypothesis_id?: string | null
  customer_profile_id?: string | null
  journey_type: JourneyType | string | null
  status: BoundaryObjectStatus | string
  version: number
  parent_version_id?: string | null
  goal?: string | null
  context: JourneyContext | null
  duration_estimate?: string | null
  validation_status: ValidationStatus | string | null
  validated_at?: string | null
  validation_confidence?: ValidationConfidence | string | null
  tags: string[] | null
  metadata: EntityMetadata | null
}

export interface JourneyStage extends BaseRecord {
  user_journey_id: string
  name: string
  description?: string | null
  sequence: number
  stage_type?: StageType | string | null
  customer_emotion?: string | null
  customer_mindset?: string | null
  customer_goal?: string | null
  duration_estimate?: string | null
  drop_off_risk?: DropOffRisk | string | null
  validation_status: ValidationStatus | string | null
  metadata: EntityMetadata | null
}

export interface Touchpoint extends BaseRecord {
  journey_stage_id: string
  name: string
  description?: string | null
  sequence: number
  channel_type?: ChannelType | string | null
  interaction_type?: InteractionType | string | null
  importance?: Importance | string | null
  current_experience_quality?: ExperienceQuality | string | null
  pain_level?: PainLevel | string | null
  delight_potential?: DelightPotential | string | null
  user_actions: TouchpointUserAction[] | null
  system_response: TouchpointSystemResponse | null
  validation_status: ValidationStatus | string | null
  validated_at?: string | null
  metadata: EntityMetadata | null
}

// ============================================================================
// JUNCTION TABLE TYPES (Replaced polymorphic TouchpointMapping)
// ============================================================================

export type TouchpointMappingTargetType = 'canvas_item' | 'customer_profile' | 'value_proposition_canvas'

/**
 * Generic touchpoint mapping - polymorphic via target_type discriminator
 * Used when target_type varies at runtime (e.g., in touchpoint_mappings table)
 */
export interface TouchpointMapping extends BaseRecord {
  touchpoint_id: string
  target_type: TouchpointMappingTargetType | string
  target_id: string
  mapping_type: TouchpointMappingType | string
  strength?: Strength | string | null
  validated: boolean
  notes?: string | null
  metadata: EntityMetadata | null
}

/**
 * Base interface for all touchpoint mappings
 */
interface TouchpointMappingBase extends BaseRecord {
  touchpoint_id: string
  mapping_type: TouchpointMappingType | string
  strength?: Strength | string | null
  validated: boolean
  notes?: string | null
  metadata: EntityMetadata | null
}

/**
 * Link touchpoint to canvas item (job, pain, gain, etc.)
 */
export interface TouchpointCanvasItem extends TouchpointMappingBase {
  canvas_item_id: string
}

/**
 * Link touchpoint to customer profile
 */
export interface TouchpointCustomerProfile extends TouchpointMappingBase {
  customer_profile_id: string
}

/**
 * Link touchpoint to value proposition canvas
 */
export interface TouchpointValueProposition extends TouchpointMappingBase {
  value_proposition_canvas_id: string
}

/**
 * Link touchpoint to assumption (now extends BaseRecord for consistency)
 */
export interface TouchpointAssumption extends BaseRecord {
  touchpoint_id: string
  assumption_id: string
  relationship_type?: AssumptionRelationshipType | string | null
  notes?: string | null
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

export type TouchpointCanvasItemInsert = Omit<TouchpointCanvasItem, keyof BaseRecord>
export type TouchpointCanvasItemUpdate = Partial<TouchpointCanvasItemInsert>

export type TouchpointCustomerProfileInsert = Omit<TouchpointCustomerProfile, keyof BaseRecord>
export type TouchpointCustomerProfileUpdate = Partial<TouchpointCustomerProfileInsert>

export type TouchpointValuePropositionInsert = Omit<TouchpointValueProposition, keyof BaseRecord>
export type TouchpointValuePropositionUpdate = Partial<TouchpointValuePropositionInsert>

export type TouchpointAssumptionInsert = Omit<TouchpointAssumption, keyof BaseRecord>
export type TouchpointAssumptionUpdate = Partial<TouchpointAssumptionInsert>

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
  canvas_items: TouchpointCanvasItem[]
  customer_profiles: TouchpointCustomerProfile[]
  value_propositions: TouchpointValueProposition[]
  assumptions: TouchpointAssumption[]
  mapping_count: number
  assumption_count: number
}

// ============================================================================
// DATABASE VIEW TYPES
// ============================================================================

/**
 * Journey summary from optimized database view
 * Eliminates N+1 query problem
 */
export interface JourneySummaryView {
  id: string
  slug: string
  name: string
  description?: string | null
  status: BoundaryObjectStatus | string | null
  validation_status: ValidationStatus | string | null
  journey_type: JourneyType | string | null
  goal?: string | null
  customer_profile_id?: string | null
  customer_profile_name?: string | null
  studio_project_id?: string | null
  studio_project_name?: string | null
  tags: string[] | null
  created_at: string | null
  updated_at: string | null
  stage_count: number | null
  touchpoint_count: number | null
  high_pain_count: number | null
}

// ============================================================================
// HELPER TYPES FOR TABLE VIEWS
// ============================================================================

/**
 * Flattened touchpoint for table views
 * Includes journey and stage context for filtering/sorting
 */
export interface TouchpointTableRow extends Touchpoint {
  journey_name: string | null
  journey_slug: string | null
  stage_name: string | null
  stage_sequence: number | null
  mapping_count: number | null
  story_count?: number | null // Will be populated in later phases
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
  | 'high_pain_count'
  | 'updated_at'
  | 'created_at'

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

// ============================================================================
// SERVICE BLUEPRINT ENTITIES
// ============================================================================

export type BlueprintType = 'service' | 'product' | 'hybrid' | 'digital' | 'physical'
export type CostImplication = 'none' | 'low' | 'medium' | 'high'
export type ValueDelivery = 'none' | 'low' | 'medium' | 'high'
export type FailureRisk = 'low' | 'medium' | 'high' | 'critical'

/**
 * Blueprint layers - the core of service blueprint design
 */
export interface BlueprintLayers {
  customer_action?: string
  frontstage?: string
  backstage?: string
  support_process?: string
}

export interface ServiceBlueprint extends BaseRecord {
  slug: string
  name: string
  description?: string | null
  studio_project_id?: string | null
  hypothesis_id?: string | null
  blueprint_type: BlueprintType | string | null
  status: BoundaryObjectStatus | string
  version: number
  parent_version_id?: string | null
  service_scope?: string | null
  service_duration?: string | null
  validation_status: ValidationStatus | string | null
  validated_at?: string | null
  tags: string[] | null
  metadata: EntityMetadata | null
}

export interface BlueprintStep extends BaseRecord {
  service_blueprint_id: string
  name: string
  description?: string | null
  sequence: number
  layers: BlueprintLayers | null
  actors: Record<string, string> | null
  duration_estimate?: string | null
  cost_implication?: CostImplication | string | null
  customer_value_delivery?: ValueDelivery | string | null
  failure_risk?: FailureRisk | string | null
  failure_impact?: string | null
  validation_status: ValidationStatus | string | null
  metadata: EntityMetadata | null
}

// Insert/Update types for blueprints
export type ServiceBlueprintInsert = Omit<ServiceBlueprint, keyof BaseRecord>
export type ServiceBlueprintUpdate = Partial<ServiceBlueprintInsert>

export type BlueprintStepInsert = Omit<BlueprintStep, keyof BaseRecord>
export type BlueprintStepUpdate = Partial<BlueprintStepInsert>

// Extended views for blueprints
export interface BlueprintWithSteps extends ServiceBlueprint {
  steps: BlueprintStep[]
  step_count: number
  linked_journey_count: number
}

export interface BlueprintStepWithRelations extends BlueprintStep {
  touchpoint_count: number
  story_count: number
}

/**
 * Blueprint summary from optimized database view
 */
export interface BlueprintSummaryView {
  id: string
  slug: string
  name: string
  description?: string | null
  status: BoundaryObjectStatus | string | null
  validation_status: ValidationStatus | string | null
  blueprint_type: BlueprintType | string | null
  studio_project_id?: string | null
  studio_project_name?: string | null
  tags: string[] | null
  created_at: string | null
  updated_at: string | null
  step_count: number | null
  linked_journey_count: number | null
}

// Filter types for blueprints
export interface BlueprintFilters {
  status?: BoundaryObjectStatus[]
  validation_status?: ValidationStatus[]
  blueprint_type?: BlueprintType[]
  studio_project_id?: string
  tags?: string[]
  search?: string
}

export type BlueprintSortField =
  | 'name'
  | 'status'
  | 'validation_status'
  | 'step_count'
  | 'updated_at'
  | 'created_at'

// ============================================================================
// STORY MAP ENTITIES
// ============================================================================

export type StoryMapType = 'feature' | 'product' | 'release' | 'discovery'
export type StoryType = 'feature' | 'enhancement' | 'bug' | 'tech_debt' | 'spike'
export type StoryStatus = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'archived'

export interface StoryMap extends BaseRecord {
  slug: string
  name: string
  description?: string | null
  studio_project_id?: string | null
  hypothesis_id?: string | null
  map_type: StoryMapType | string | null
  status: BoundaryObjectStatus | string
  version: number
  parent_version_id?: string | null
  validation_status: ValidationStatus | string | null
  validated_at?: string | null
  tags: string[] | null
  metadata: EntityMetadata | null
}

export interface Activity extends BaseRecord {
  story_map_id: string
  name: string
  description?: string | null
  sequence: number
  user_goal?: string | null
  metadata: EntityMetadata | null
}

export interface UserStory extends BaseRecord {
  activity_id: string
  title: string
  description?: string | null
  acceptance_criteria?: string | null
  story_type?: StoryType | string | null
  priority?: Importance | string | null
  story_points?: number | null
  status: StoryStatus | string
  layer_id?: string | null // FK to story_map_layers - which row/actor this story belongs to
  vertical_position?: number | null // Deprecated: use layer_id, kept for backward compat
  validation_status: ValidationStatus | string | null
  validated_at?: string | null
  tags: string[] | null
  metadata: EntityMetadata | null
}

export interface StoryRelease extends BaseRecord {
  user_story_id: string
  release_name: string
  release_date?: string | null
  release_order?: number | null
  metadata: EntityMetadata | null
}

// Insert/Update types for story maps
export type StoryMapInsert = Omit<StoryMap, keyof BaseRecord>
export type StoryMapUpdate = Partial<StoryMapInsert>

export type ActivityInsert = Omit<Activity, keyof BaseRecord>
export type ActivityUpdate = Partial<ActivityInsert>

export type UserStoryInsert = Omit<UserStory, keyof BaseRecord>
export type UserStoryUpdate = Partial<UserStoryInsert>

export type StoryReleaseInsert = Omit<StoryRelease, keyof BaseRecord>
export type StoryReleaseUpdate = Partial<StoryReleaseInsert>

// Extended views for story maps
export interface StoryMapWithActivities extends StoryMap {
  activities: Activity[]
  activity_count: number
  story_count: number
}

export interface ActivityWithStories extends Activity {
  stories: UserStory[]
  story_count: number
}

export interface UserStoryWithRelations extends UserStory {
  releases: StoryRelease[]
  touchpoint_count: number
  blueprint_step_count: number
  assumption_count: number
}

/**
 * Story Map summary from optimized database view
 */
export interface StoryMapSummaryView {
  id: string
  slug: string
  name: string
  description?: string | null
  status: BoundaryObjectStatus | string | null
  validation_status: ValidationStatus | string | null
  map_type: StoryMapType | string | null
  studio_project_id?: string | null
  studio_project_name?: string | null
  tags: string[] | null
  created_at: string | null
  updated_at: string | null
  activity_count: number | null
  story_count: number | null
  done_story_count: number | null
}

// Filter types for story maps
export interface StoryMapFilters {
  status?: BoundaryObjectStatus[]
  validation_status?: ValidationStatus[]
  map_type?: StoryMapType[]
  studio_project_id?: string
  tags?: string[]
  search?: string
}

export interface UserStoryFilters {
  activity_id?: string
  layer_id?: string
  story_map_id?: string
  status?: StoryStatus[]
  priority?: Importance[]
  story_type?: StoryType[]
  validation_status?: ValidationStatus[]
  release_name?: string
  tags?: string[]
  search?: string
}

export type StoryMapSortField =
  | 'name'
  | 'status'
  | 'validation_status'
  | 'activity_count'
  | 'story_count'
  | 'updated_at'
  | 'created_at'

export type UserStorySortField =
  | 'title'
  | 'priority'
  | 'status'
  | 'story_points'
  | 'vertical_position'
  | 'created_at'
  | 'updated_at'

// ============================================================================
// PAGINATION TYPES
// ============================================================================

/**
 * Cursor-based pagination parameters
 */
export interface PaginationParams {
  limit?: number
  cursor?: string // ID of last item from previous page
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[]
  nextCursor?: string
  hasMore: boolean
  total?: number // Optional total count
}

/**
 * Page info for UI
 */
export interface PageInfo {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor?: string
  endCursor?: string
}
