// Verbivore table types matching the migration schema

export interface VerbivoreCategory {
  id: string
  name: string
  slug: string
  description: string | null
  color: string | null
  created_at: string
  updated_at: string
}

export interface VerbivoreEntry {
  id: string
  category_id: string | null
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  seo_title: string | null
  seo_description: string | null
  status: 'draft' | 'scheduled' | 'live' | 'archived'
  featured: boolean
  scheduled_at: string | null
  published_at: string | null
  cover_image_url: string | null
  thumbnail_image_url: string | null
  view_count: number
  reading_time: number
  complexity_score: number
  word_count: number
  created_at: string
  updated_at: string
}

export interface VerbivoreEntryWithCategory extends VerbivoreEntry {
  category?: VerbivoreCategory | null
}

export interface VerbivoreEntryWithTerms extends VerbivoreEntryWithCategory {
  terms?: (VerbivoreEntryTerm & { term: VerbivoreTerm })[]
}

export interface VerbivoreTerm {
  id: string
  term: string
  slug: string
  definition: string
  pronunciation: string | null
  tags: string[]
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | null
  origin: string | null
  etymology_source: string | null
  usage_examples: string[]
  synonyms: string[]
  image_url: string | null
  view_count: number
  created_at: string
  updated_at: string
}

export interface VerbivoreTermWithEntryCount extends VerbivoreTerm {
  entry_count: number
}

export interface VerbivoreEntryTerm {
  id: string
  entry_id: string
  term_id: string
  is_primary: boolean
  display_order: number
  created_at: string
}

export interface VerbivoreTermRelationship {
  id: string
  term_id: string
  related_term_id: string
  relationship_type: 'synonym' | 'antonym' | 'related' | 'broader' | 'narrower'
  created_at: string
}

export interface VerbivoreSource {
  id: string
  title: string
  url: string | null
  author: string | null
  publication_date: string | null
  source_type: 'book' | 'article' | 'website' | 'dictionary' | 'paper' | null
  created_at: string
}

export interface VerbivoreTermSource {
  id: string
  term_id: string
  source_id: string
  page_number: string | null
  notes: string | null
  created_at: string
}

export interface VerbivoreStyleGuide {
  id: string
  name: string
  slug: string
  description: string | null
  prompt: string
  is_default: boolean
  is_active: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export interface VerbivoreEntryRelationship {
  id: string
  parent_entry_id: string
  child_entry_id: string
  relationship_type: 'split_from' | 'sequel' | 'prequel' | 'related' | 'cross_reference'
  sequence_order: number
  split_strategy: Record<string, unknown> | null
  created_at: string
}

export interface VerbivoreEntryRelationshipWithEntry extends VerbivoreEntryRelationship {
  parent_entry?: VerbivoreEntry
  child_entry?: VerbivoreEntry
}

export interface VerbivoreSplittingSession {
  id: string
  entry_id: string
  analysis_result: Record<string, unknown> | null
  status: 'analyzing' | 'ready' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

// Insert types (omit auto-generated fields)
export type VerbivoreEntryInsert = Omit<VerbivoreEntry, 'id' | 'created_at' | 'updated_at' | 'view_count'> & {
  id?: string
  view_count?: number
}

export type VerbivoreTermInsert = Omit<VerbivoreTerm, 'id' | 'created_at' | 'updated_at' | 'view_count'> & {
  id?: string
  view_count?: number
}

export type VerbivoreStyleGuideInsert = Omit<VerbivoreStyleGuide, 'id' | 'created_at' | 'updated_at' | 'usage_count'> & {
  id?: string
  usage_count?: number
}

// Split analysis result shape (from AI)
export interface SplitAnalysisResult {
  strategy_type: 'thematic' | 'temporal' | 'complexity' | 'domain' | 'narrative'
  groups: SplitGroup[]
  sequence_rationale: string
  cross_reference_strategy: string
  original_entry_update: {
    new_role: string
    retained_terms: string[]
    updated_excerpt: string
  }
}

export interface SplitGroup {
  title: string
  theme: string
  excerpt: string
  terms: string[]
  rationale: string
  complexity: number
  estimated_word_count: number
}
