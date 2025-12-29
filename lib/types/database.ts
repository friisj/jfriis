/**
 * Database Type Definitions
 *
 * TypeScript interfaces for all database tables
 */

// Base fields present in most tables
export interface BaseRecord {
  id: string
  created_at: string
  updated_at: string
}

// Projects
export interface Project extends BaseRecord {
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
}

export type ProjectInsert = Omit<Project, keyof BaseRecord | 'published_at'>
export type ProjectUpdate = Partial<ProjectInsert>

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

// Gallery Specimen Items (junction table)
export interface GallerySpecimenItem extends BaseRecord {
  gallery_sequence_id: string
  specimen_id: string
  position: number
  display_config?: any // JSONB
}

export type GallerySpecimenItemInsert = Omit<GallerySpecimenItem, keyof BaseRecord>

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

// Junction Tables
export interface LogEntrySpecimen {
  id: string
  log_entry_id: string
  specimen_id: string
  position?: number
  created_at: string
}

export interface ProjectSpecimen {
  id: string
  project_id: string
  specimen_id: string
  position?: number
  created_at: string
}

export interface LogEntryProject {
  id: string
  log_entry_id: string
  project_id: string
  created_at: string
}

// Studio Projects
export interface StudioProject extends BaseRecord {
  slug: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  temperature?: 'hot' | 'warm' | 'cold'
  current_focus?: string
  problem_statement?: string
  hypothesis?: string
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
export interface StudioExperiment extends BaseRecord {
  project_id: string
  hypothesis_id?: string
  slug: string
  name: string
  description?: string
  type: 'spike' | 'experiment' | 'prototype'
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

// Value Proposition Canvas
export interface ValuePropositionCanvas extends BaseCanvas {
  fit_score?: number
  customer_jobs: CanvasBlock
  pains: CanvasBlock
  gains: CanvasBlock
  products_services: CanvasBlock
  pain_relievers: CanvasBlock
  gain_creators: CanvasBlock
  business_model_canvas_id?: string
  customer_profile_id?: string
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

// Database schema (for type-safe table references)
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: Project
        Insert: ProjectInsert
        Update: ProjectUpdate
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
      gallery_specimen_items: {
        Row: GallerySpecimenItem
        Insert: GallerySpecimenItemInsert
        Update: Partial<GallerySpecimenItemInsert>
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
      log_entry_specimens: {
        Row: LogEntrySpecimen
        Insert: Omit<LogEntrySpecimen, 'id' | 'created_at'>
        Update: Partial<Omit<LogEntrySpecimen, 'id' | 'created_at'>>
      }
      project_specimens: {
        Row: ProjectSpecimen
        Insert: Omit<ProjectSpecimen, 'id' | 'created_at'>
        Update: Partial<Omit<ProjectSpecimen, 'id' | 'created_at'>>
      }
      log_entry_projects: {
        Row: LogEntryProject
        Insert: Omit<LogEntryProject, 'id' | 'created_at'>
        Update: Partial<Omit<LogEntryProject, 'id' | 'created_at'>>
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
    }
  }
}
