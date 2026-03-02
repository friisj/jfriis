// Cue table types matching the migration schema

export interface CueTopic {
  id: string
  name: string
  slug: string
  parent_id: string | null
  created_at: string
  updated_at: string
}

export interface CueProfileTopicWeight {
  topic_id: string
  weight: number
}

export interface CueProfile {
  id: string
  topics: CueProfileTopicWeight[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CueSource {
  id: string
  name: string
  url: string
  topic_ids: string[]
  is_active: boolean
  last_fetched_at: string | null
  fetch_error: string | null
  created_at: string
  updated_at: string
}

export interface CuePulseRun {
  id: string
  started_at: string
  completed_at: string | null
  items_fetched: number
  items_scored: number
  status: 'running' | 'completed' | 'failed'
  error: string | null
}

export interface CuePulseItem {
  id: string
  run_id: string | null
  source_id: string | null
  title: string
  url: string
  summary: string | null
  author: string | null
  published_at: string | null
  fetched_at: string
  topics: string[]
  relevance_score: number | null
  is_read: boolean
  is_saved: boolean
}

export interface CuePulseItemWithSource extends CuePulseItem {
  source?: CueSource | null
}

export interface CueContact {
  id: string
  name: string
  relationship: string | null
  notes: string | null
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

export interface CueContactTopic {
  id: string
  contact_id: string
  topic: string
  weight: number
  created_at: string
}

export interface CueContactWithTopics extends CueContact {
  topics?: CueContactTopic[]
}

export interface CueBriefTalkingPoint {
  topic: string
  point: string
  source_url: string | null
  source_title: string | null
  confidence: 'high' | 'medium' | 'low'
}

export interface CueBriefContent {
  overlap_summary: string
  talking_points: CueBriefTalkingPoint[]
}

export interface CueBrief {
  id: string
  contact_id: string
  generated_at: string
  content: CueBriefContent
  pulse_item_ids: string[]
  model: string | null
  is_archived: boolean
}

export interface CueBriefWithContact extends CueBrief {
  contact?: CueContact | null
}

// Insert types
export type CueContactInsert = Omit<CueContact, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}

export type CueSourceInsert = Omit<CueSource, 'id' | 'created_at' | 'updated_at' | 'last_fetched_at' | 'fetch_error'> & {
  id?: string
}
