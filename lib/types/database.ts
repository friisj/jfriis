/**
 * Database Type Definitions
 *
 * TypeScript interfaces for all database tables
 */

import type {
  CanvasItem,
  CanvasItemInsert,
  CanvasItemUpdate,
  CanvasItemPlacement,
  CanvasItemPlacementInsert,
  CanvasItemPlacementUpdate,
  CanvasItemAssumption,
  CanvasItemAssumptionInsert,
  CanvasItemAssumptionUpdate,
  CanvasItemMapping,
  CanvasItemMappingInsert,
  CanvasItemMappingUpdate,
} from './canvas-items'

import type {
  UserJourney,
  UserJourneyInsert,
  UserJourneyUpdate,
  JourneyStage,
  JourneyStageInsert,
  JourneyStageUpdate,
  Touchpoint,
  TouchpointInsert,
  TouchpointUpdate,
  TouchpointMapping,
  TouchpointMappingInsert,
  TouchpointMappingUpdate,
  TouchpointAssumption,
  TouchpointAssumptionInsert,
  TouchpointAssumptionUpdate,
} from './boundary-objects'

// Re-export universal relationship types
export type {
  EvidenceEntityType,
  UniversalEvidenceType,
  UniversalEvidence,
  UniversalEvidenceInsert,
  UniversalEvidenceUpdate,
  PendingEvidence,
  LinkableEntityType,
  LinkType,
  LinkStrength,
  EntityLink,
  EntityLinkInsert,
  EntityLinkUpdate,
  PendingLink,
  LinkedEntity,
  EntityRef,
} from './entity-relationships'

export { ENTITY_TYPE_TABLE_MAP, getTableNameForType } from './entity-relationships'

// Re-export canvas item types for convenience
export type {
  CanvasItem,
  CanvasItemInsert,
  CanvasItemUpdate,
  CanvasItemPlacement,
  CanvasItemPlacementInsert,
  CanvasItemPlacementUpdate,
  CanvasItemAssumption,
  CanvasItemAssumptionInsert,
  CanvasItemAssumptionUpdate,
  CanvasItemMapping,
  CanvasItemMappingInsert,
  CanvasItemMappingUpdate,
  CanvasItemType,
  CanvasType,
  JobType,
  Intensity,
  Importance,
  ValidationStatus,
  Frequency,
  AssumptionRelationshipType,
  MappingType,
  FitStrength,
  ValidationMethod,
  EvidenceType,
  Confidence,
} from './canvas-items'

// Re-export boundary object types for convenience
export type {
  UserJourney,
  UserJourneyInsert,
  UserJourneyUpdate,
  JourneyStage,
  JourneyStageInsert,
  JourneyStageUpdate,
  Touchpoint,
  TouchpointInsert,
  TouchpointUpdate,
  TouchpointMapping,
  TouchpointMappingInsert,
  TouchpointMappingUpdate,
  TouchpointAssumption,
  TouchpointAssumptionInsert,
  TouchpointAssumptionUpdate,
  JourneyType,
  StageType,
  ChannelType,
  InteractionType,
  PainLevel,
  DelightPotential,
  ExperienceQuality,
  BoundaryObjectStatus,
  TouchpointMappingType,
} from './boundary-objects'

// Base fields present in most tables
export interface BaseRecord {
  id: string
  created_at: string
  updated_at: string
}

// Portfolio Management Types
export type PortfolioType = 'explore' | 'exploit'
export type Horizon = 'h1' | 'h2' | 'h3'
export type InnovationAmbition = 'core' | 'adjacent' | 'transformational'
export type ExploreStage = 'ideation' | 'discovery' | 'validation' | 'acceleration'
export type ExploitStage = 'launch' | 'sustaining' | 'efficiency' | 'mature' | 'declining' | 'renovation'
export type EvidenceStrength = 'none' | 'weak' | 'moderate' | 'strong'
export type ExpectedReturn = 'low' | 'medium' | 'high' | 'breakthrough'
export type Profitability = 'low' | 'medium' | 'high'
export type DisruptionRisk = 'protected' | 'moderate' | 'at_risk'
export type InnovationRisk = 'low' | 'medium' | 'high'

export interface PortfolioDecision {
  date: string
  decision: 'pivot' | 'persevere' | 'kill'
  rationale: string
  reviewer?: string
}

export interface TargetMetrics {
  revenue_target?: number
  customer_target?: number
  validation_target?: string
  timeline_target?: string
}

// Ventures (Portfolio businesses/products/services)
export interface Venture extends BaseRecord {
  title: string
  slug: string
  description?: string
  content?: any // JSONB - can be markdown, blocks, etc.
  status: 'draft' | 'active' | 'archived' | 'completed'
  type?: string
  start_date?: string
  end_date?: string
  featured_image?: string
  images?: any[] // JSONB array of image data
  tags?: string[]
  metadata?: any // JSONB
  seo_title?: string
  seo_description?: string
  published: boolean
  published_at?: string

  // Link to studio infrastructure (FIXED: proper FK)
  studio_project_id?: string

  // Portfolio Management (Strategyzer Portfolio Map)
  portfolio_type?: PortfolioType
  horizon?: Horizon
  innovation_ambition?: InnovationAmbition

  // Explore Portfolio Dimensions
  explore_stage?: ExploreStage
  evidence_strength?: EvidenceStrength
  expected_return?: ExpectedReturn

  // Exploit Portfolio Dimensions
  exploit_stage?: ExploitStage
  profitability?: Profitability
  disruption_risk?: DisruptionRisk

  // Risk & Value
  innovation_risk?: InnovationRisk
  strategic_value_score?: number // 1-10
  market_size_estimate?: string

  // Investment & Resources
  current_investment?: number
  total_investment?: number
  allocated_fte?: number // Full-time equivalents

  // Lifecycle Tracking
  last_stage_transition_at?: string
  last_portfolio_review_at?: string
  next_review_due_at?: string

  // Decision History
  decision_history?: PortfolioDecision[]

  // Target Metrics
  target_metrics?: TargetMetrics
}

export type VentureInsert = Omit<Venture, keyof BaseRecord | 'published_at'>
export type VentureUpdate = Partial<VentureInsert>

// Backwards compatibility (deprecated, use Venture instead)
/** @deprecated Use Venture instead */
export type Project = Venture
/** @deprecated Use VentureInsert instead */
export type ProjectInsert = VentureInsert
/** @deprecated Use VentureUpdate instead */
export type ProjectUpdate = VentureUpdate

// Log Entries
export interface LogEntry extends BaseRecord {
  title: string
  slug: string
  content?: any // JSONB
  entry_date: string
  type?: string
  featured_image?: string
  images?: any[]
  tags?: string[]
  metadata?: any
  seo_title?: string
  seo_description?: string
  published: boolean
  published_at?: string
  studio_project_id?: string
  studio_experiment_id?: string
}

export type LogEntryInsert = Omit<LogEntry, keyof BaseRecord | 'published_at'>
export type LogEntryUpdate = Partial<LogEntryInsert>

// Specimens
export interface Specimen extends BaseRecord {
  title: string
  slug: string
  description?: string
  component_code?: string
  component_props?: any // JSONB
  theme_config?: {
    themeName?: string
    mode?: 'light' | 'dark'
    customColors?: any
  }
  media?: any[] // JSONB array
  fonts?: {
    display?: string
    body?: string
    mono?: string
  }
  custom_css?: string
  type?: string
  tags?: string[]
  metadata?: any
  published: boolean
  studio_project_id?: string
}

export type SpecimenInsert = Omit<Specimen, keyof BaseRecord>
export type SpecimenUpdate = Partial<SpecimenInsert>

// Gallery Sequences
export interface GallerySequence extends BaseRecord {
  title: string
  slug: string
  description?: string
  sequence_order: number
  metadata?: any
  published: boolean
}

export type GallerySequenceInsert = Omit<GallerySequence, keyof BaseRecord>
export type GallerySequenceUpdate = Partial<GallerySequenceInsert>

// Landing Pages
export interface LandingPage extends BaseRecord {
  title: string
  slug: string
  content?: any // JSONB - page layout/content
  target_audience?: string
  metadata?: any
  seo_title?: string
  seo_description?: string
  published: boolean
  published_at?: string
}

export type LandingPageInsert = Omit<LandingPage, keyof BaseRecord | 'published_at'>
export type LandingPageUpdate = Partial<LandingPageInsert>

// Backlog Items
export interface BacklogItem extends BaseRecord {
  title?: string
  content?: string
  media?: any[] // JSONB
  status: 'inbox' | 'in-progress' | 'shaped' | 'archived'
  converted_to?: string
  converted_id?: string
  metadata?: any
  tags?: string[]
}

export type BacklogItemInsert = Omit<BacklogItem, keyof BaseRecord>
export type BacklogItemUpdate = Partial<BacklogItemInsert>

// Channels
export interface Channel extends BaseRecord {
  name: string
  display_name: string
  type: string
  config?: any // JSONB
  enabled: boolean
  metadata?: any
}

export type ChannelInsert = Omit<Channel, keyof BaseRecord>
export type ChannelUpdate = Partial<ChannelInsert>

// Distribution Posts
export interface DistributionPost extends BaseRecord {
  channel_id: string
  content_type: string
  content_id: string
  title?: string
  body?: string
  url?: string
  external_id?: string
  status: 'draft' | 'scheduled' | 'posted' | 'failed'
  scheduled_for?: string
  posted_at?: string
  views: number
  engagement?: any // JSONB
  error_message?: string
  metadata?: any
}

export type DistributionPostInsert = Omit<DistributionPost, keyof BaseRecord>
export type DistributionPostUpdate = Partial<DistributionPostInsert>

// Distribution Queue
export interface DistributionQueueItem extends BaseRecord {
  channel_id: string
  content_type: string
  content_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  priority: number
  attempts: number
  max_attempts: number
  process_after?: string
  processed_at?: string
  last_error?: string
  metadata?: any
}

export type DistributionQueueItemInsert = Omit<DistributionQueueItem, keyof BaseRecord>
export type DistributionQueueItemUpdate = Partial<DistributionQueueItemInsert>

// Profiles
export interface Profile extends BaseRecord {
  id: string // References auth.users.id
  display_name?: string
  avatar_url?: string
  is_admin: boolean
  metadata?: any
}

export type ProfileInsert = Omit<Profile, keyof BaseRecord>
export type ProfileUpdate = Partial<ProfileInsert>

// Studio Projects
export interface StudioProject extends BaseRecord {
  slug: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  temperature?: 'hot' | 'warm' | 'cold'
  current_focus?: string
  problem_statement?: string
  success_criteria?: string
  scope_out?: string
  path?: string
  scaffolded_at?: string
}

export type StudioProjectInsert = Omit<StudioProject, keyof BaseRecord>
export type StudioProjectUpdate = Partial<StudioProjectInsert>

// Studio Hypotheses
export interface StudioHypothesis extends BaseRecord {
  project_id: string
  statement: string
  validation_criteria?: string
  sequence: number
  status: 'proposed' | 'testing' | 'validated' | 'invalidated'
}

export type StudioHypothesisInsert = Omit<StudioHypothesis, keyof BaseRecord>
export type StudioHypothesisUpdate = Partial<StudioHypothesisInsert>

// Studio Experiments
export type StudioExperimentType = 'experiment' | 'prototype' | 'discovery_interviews' | 'landing_page'

export interface StudioExperiment extends BaseRecord {
  project_id: string
  hypothesis_id?: string
  slug: string
  name: string
  description?: string
  type: StudioExperimentType
  status: 'planned' | 'in_progress' | 'completed' | 'abandoned'
  outcome?: 'success' | 'failure' | 'inconclusive'
  learnings?: string
}

export type StudioExperimentInsert = Omit<StudioExperiment, keyof BaseRecord>
export type StudioExperimentUpdate = Partial<StudioExperimentInsert>

// Strategyzer Canvas - Shared Types
export interface CanvasBlockItem {
  id: string
  content: string
  priority?: 'high' | 'medium' | 'low'
  created_at: string
  metadata?: {
    source?: string
    confidence?: 'low' | 'medium' | 'high'
    tags?: string[]
    [key: string]: any
  }
}

export interface Assumption {
  id: string
  statement: string
  criticality: 'high' | 'medium' | 'low'
  tested: boolean
  hypothesis_id?: string
}

export interface Evidence {
  id: string
  type: 'interview' | 'survey' | 'analytics' | 'experiment' | 'observation'
  reference: string
  summary: string
  confidence: 'low' | 'medium' | 'high'
  date: string
}

export interface CanvasBlock {
  items: CanvasBlockItem[]
  assumptions: Assumption[]
  evidence?: Evidence[]
  validation_status: 'untested' | 'testing' | 'validated' | 'invalidated'
  validated_at?: string
  notes?: string
}

interface BaseCanvas extends BaseRecord {
  slug: string
  name: string
  description?: string
  studio_project_id?: string
  hypothesis_id?: string
  status: 'draft' | 'active' | 'validated' | 'archived'
  version: number
  parent_version_id?: string
  tags: string[]
  metadata: any
}

// Business Model Canvas
export interface BusinessModelCanvas extends BaseCanvas {
  key_partners: CanvasBlock
  key_activities: CanvasBlock
  key_resources: CanvasBlock
  value_propositions: CanvasBlock
  customer_segments: CanvasBlock
  customer_relationships: CanvasBlock
  channels: CanvasBlock
  cost_structure: CanvasBlock
  revenue_streams: CanvasBlock
  related_value_proposition_ids: string[]
  related_customer_profile_ids: string[]
}

export type BusinessModelCanvasInsert = Omit<BusinessModelCanvas, keyof BaseRecord>
export type BusinessModelCanvasUpdate = Partial<BusinessModelCanvasInsert>

// Value Map (the "square" side - what you offer)
export interface ValueMap extends BaseCanvas {
  products_services: CanvasBlock
  pain_relievers: CanvasBlock
  gain_creators: CanvasBlock
  business_model_canvas_id?: string
}

export type ValueMapInsert = Omit<ValueMap, keyof BaseRecord>
export type ValueMapUpdate = Partial<ValueMapInsert>

// Value Proposition Canvas (FIT analysis between Value Map + Customer Profile)
export interface ValuePropositionCanvas extends BaseRecord {
  slug: string
  name: string
  description?: string
  studio_project_id?: string
  hypothesis_id?: string
  value_map_id: string
  customer_profile_id: string
  status: 'draft' | 'active' | 'validated' | 'archived'
  fit_score?: number
  fit_analysis: any // JSONB
  addressed_jobs: { items: string[]; coverage?: number }
  addressed_pains: { items: string[]; coverage?: number }
  addressed_gains: { items: string[]; coverage?: number }
  assumptions: { items: Assumption[] }
  evidence: { items: Evidence[] }
  validation_status: 'untested' | 'testing' | 'validated' | 'invalidated'
  last_validated_at?: string
  tags: string[]
  metadata: any
}

export type ValuePropositionCanvasInsert = Omit<ValuePropositionCanvas, keyof BaseRecord>
export type ValuePropositionCanvasUpdate = Partial<ValuePropositionCanvasInsert>

// Customer Profile
export interface CustomerProfile extends BaseCanvas {
  profile_type?: 'persona' | 'segment' | 'archetype' | 'icp'
  demographics: any
  psychographics: any
  behaviors: any
  jobs: CanvasBlock
  pains: CanvasBlock & { severity?: Record<string, 'high' | 'medium' | 'low'> }
  gains: CanvasBlock & { importance?: Record<string, 'high' | 'medium' | 'low'> }
  environment: any
  journey_stages: { items: any[] }
  market_size_estimate?: string
  addressable_percentage?: number
  evidence_sources: { items: Evidence[] }
  validation_confidence?: 'low' | 'medium' | 'high'
  last_validated_at?: string
  related_business_model_ids: string[]
  related_value_proposition_ids: string[]
}

export type CustomerProfileInsert = Omit<CustomerProfile, keyof BaseRecord>
export type CustomerProfileUpdate = Partial<CustomerProfileInsert>

// Assumptions (first-class entities for hypothesis testing)
export type AssumptionCategory = 'desirability' | 'viability' | 'feasibility' | 'usability' | 'ethical'
export type AssumptionImportance = 'critical' | 'high' | 'medium' | 'low'
export type AssumptionEvidenceLevel = 'none' | 'weak' | 'moderate' | 'strong'
export type AssumptionStatus = 'identified' | 'prioritized' | 'testing' | 'validated' | 'invalidated' | 'archived'
export type AssumptionSourceType = 'business_model_canvas' | 'value_map' | 'customer_profile' | 'value_proposition_canvas' | 'opportunity' | 'solution' | 'manual'

export interface Assumption extends BaseRecord {
  slug: string
  statement: string
  category: AssumptionCategory
  importance: AssumptionImportance
  evidence_level: AssumptionEvidenceLevel
  status: AssumptionStatus
  is_leap_of_faith: boolean
  studio_project_id?: string
  hypothesis_id?: string
  source_type?: AssumptionSourceType
  source_id?: string
  source_block?: string
  validation_criteria?: string
  validated_at?: string
  invalidated_at?: string
  decision?: string
  decision_notes?: string
  notes?: string
  tags: string[]
  metadata: any
}

export type AssumptionInsert = Omit<Assumption, keyof BaseRecord | 'is_leap_of_faith'>
export type AssumptionUpdate = Partial<AssumptionInsert>

// Assumption-Experiment Junction
export type AssumptionExperimentResult = 'supports' | 'refutes' | 'inconclusive'

export interface AssumptionExperiment extends BaseRecord {
  assumption_id: string
  experiment_id: string
  result?: AssumptionExperimentResult
  confidence?: 'low' | 'medium' | 'high'
  notes?: string
}

export type AssumptionExperimentInsert = Omit<AssumptionExperiment, keyof BaseRecord>
export type AssumptionExperimentUpdate = Partial<AssumptionExperimentInsert>

// Portfolio Evidence Summary (from database view)
export type Sustainability = 'fragile' | 'stable' | 'resilient'

export interface PortfolioEvidenceSummary {
  venture_id: string
  slug: string
  title: string
  portfolio_type?: PortfolioType
  explore_stage?: ExploreStage
  exploit_stage?: ExploitStage
  manual_evidence_strength?: EvidenceStrength

  // Studio Project Link
  studio_project_id?: string
  studio_status?: string

  // Portfolio Management Fields
  horizon?: Horizon
  expected_return?: ExpectedReturn
  profitability?: Profitability
  sustainability?: Sustainability
  innovation_risk?: InnovationRisk
  strategic_value_score?: number
  total_investment?: number
  allocated_fte?: number
  current_phase?: string
  next_review_due_at?: string

  // Hypothesis Stats
  total_hypotheses: number
  validated_hypotheses: number
  invalidated_hypotheses: number
  testing_hypotheses: number
  proposed_hypotheses: number

  // Experiment Stats
  total_experiments: number
  successful_experiments: number
  failed_experiments: number
  inconclusive_experiments: number
  active_experiments: number
  completed_experiments: number

  // Canvas Stats
  total_business_models: number
  validated_business_models: number
  active_business_models: number
  total_value_propositions: number
  validated_value_propositions: number
  avg_bmc_fit_score?: number
  avg_vpc_fit_score?: number
  total_customer_profiles: number
  validated_customer_profiles: number

  // Log Entry Stats
  total_log_entries: number
  experiment_log_entries: number
  research_log_entries: number

  // Computed Evidence
  computed_evidence_score?: number // 0-100
  hypothesis_validation_rate?: number // percentage
  experiment_success_rate?: number // percentage
  last_evidence_activity_at?: string
  refreshed_at: string // When the materialized view was last refreshed
}

// Portfolio Metrics (from get_portfolio_metrics function)
export interface PortfolioMetrics {
  // Portfolio Balance
  explore_count: number
  exploit_count: number
  uncategorized_count: number
  total_count: number

  // Horizon Balance
  h1_count: number
  h2_count: number
  h3_count: number

  // Investment
  total_investment: number
  explore_investment: number
  exploit_investment: number

  // Risk Distribution
  low_risk_count: number
  medium_risk_count: number
  high_risk_count: number

  // Evidence Strength
  strong_evidence_count: number
  moderate_evidence_count: number
  weak_evidence_count: number
  no_evidence_count: number

  // Stage Distribution (Explore)
  ideation_count: number
  discovery_count: number
  validation_count: number
  acceleration_count: number

  // Stage Distribution (Exploit)
  launch_count: number
  sustaining_count: number
  mature_count: number
  declining_count: number

  // Projects Needing Attention
  needs_review_count: number
  stale_projects_count: number

  // Timestamp
  computed_at: string
}

// Stage Transition Suggestion (from suggest_explore_stage_transition function)
export interface StageTransitionSuggestion {
  current_stage: ExploreStage
  suggested_stage: ExploreStage
  rationale: string
  confidence: 'low' | 'medium' | 'high'
  criteria_met?: string[]
  evidence_summary?: {
    hypotheses: string
    experiments: string
    vpc_fit_score?: number
    business_models: string
  }
  error?: string
}

// Database schema (for type-safe table references)
export interface Database {
  public: {
    Tables: {
      ventures: {
        Row: Venture
        Insert: VentureInsert
        Update: VentureUpdate
      }
      log_entries: {
        Row: LogEntry
        Insert: LogEntryInsert
        Update: LogEntryUpdate
      }
      specimens: {
        Row: Specimen
        Insert: SpecimenInsert
        Update: SpecimenUpdate
      }
      gallery_sequences: {
        Row: GallerySequence
        Insert: GallerySequenceInsert
        Update: GallerySequenceUpdate
      }
      landing_pages: {
        Row: LandingPage
        Insert: LandingPageInsert
        Update: LandingPageUpdate
      }
      backlog_items: {
        Row: BacklogItem
        Insert: BacklogItemInsert
        Update: BacklogItemUpdate
      }
      channels: {
        Row: Channel
        Insert: ChannelInsert
        Update: ChannelUpdate
      }
      distribution_posts: {
        Row: DistributionPost
        Insert: DistributionPostInsert
        Update: DistributionPostUpdate
      }
      distribution_queue: {
        Row: DistributionQueueItem
        Insert: DistributionQueueItemInsert
        Update: DistributionQueueItemUpdate
      }
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      studio_projects: {
        Row: StudioProject
        Insert: StudioProjectInsert
        Update: StudioProjectUpdate
      }
      studio_hypotheses: {
        Row: StudioHypothesis
        Insert: StudioHypothesisInsert
        Update: StudioHypothesisUpdate
      }
      studio_experiments: {
        Row: StudioExperiment
        Insert: StudioExperimentInsert
        Update: StudioExperimentUpdate
      }
      business_model_canvases: {
        Row: BusinessModelCanvas
        Insert: BusinessModelCanvasInsert
        Update: BusinessModelCanvasUpdate
      }
      value_maps: {
        Row: ValueMap
        Insert: ValueMapInsert
        Update: ValueMapUpdate
      }
      value_proposition_canvases: {
        Row: ValuePropositionCanvas
        Insert: ValuePropositionCanvasInsert
        Update: ValuePropositionCanvasUpdate
      }
      customer_profiles: {
        Row: CustomerProfile
        Insert: CustomerProfileInsert
        Update: CustomerProfileUpdate
      }
      assumptions: {
        Row: Assumption
        Insert: AssumptionInsert
        Update: AssumptionUpdate
      }
      assumption_experiments: {
        Row: AssumptionExperiment
        Insert: AssumptionExperimentInsert
        Update: AssumptionExperimentUpdate
      }
      canvas_items: {
        Row: CanvasItem
        Insert: CanvasItemInsert
        Update: CanvasItemUpdate
      }
      canvas_item_placements: {
        Row: CanvasItemPlacement
        Insert: CanvasItemPlacementInsert
        Update: CanvasItemPlacementUpdate
      }
      canvas_item_assumptions: {
        Row: CanvasItemAssumption
        Insert: CanvasItemAssumptionInsert
        Update: CanvasItemAssumptionUpdate
      }
      canvas_item_mappings: {
        Row: CanvasItemMapping
        Insert: CanvasItemMappingInsert
        Update: CanvasItemMappingUpdate
      }
      user_journeys: {
        Row: UserJourney
        Insert: UserJourneyInsert
        Update: UserJourneyUpdate
      }
      journey_stages: {
        Row: JourneyStage
        Insert: JourneyStageInsert
        Update: JourneyStageUpdate
      }
      touchpoints: {
        Row: Touchpoint
        Insert: TouchpointInsert
        Update: TouchpointUpdate
      }
      touchpoint_mappings: {
        Row: TouchpointMapping
        Insert: TouchpointMappingInsert
        Update: TouchpointMappingUpdate
      }
      touchpoint_assumptions: {
        Row: TouchpointAssumption
        Insert: TouchpointAssumptionInsert
        Update: TouchpointAssumptionUpdate
      }
    }
  }
}
