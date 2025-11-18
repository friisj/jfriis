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
    }
  }
}
