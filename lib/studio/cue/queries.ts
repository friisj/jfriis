import { createClient } from '@/lib/supabase-server'
import type {
  CueTopic,
  CueProfile,
  CueSource,
  CuePulseRun,
  CuePulseItemWithSource,
  CueContact,
  CueContactWithTopics,
  CueContactTopic,
  CueBrief,
  CueBriefWithContact,
} from './types'

// ============================================================================
// TOPICS
// ============================================================================

export async function getTopics(): Promise<CueTopic[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cue_topics')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

// ============================================================================
// PROFILE
// ============================================================================

export async function getProfile(): Promise<CueProfile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cue_profile')
    .select('*')
    .limit(1)
    .single()
  if (error) return null
  return data as unknown as CueProfile
}

// ============================================================================
// SOURCES
// ============================================================================

export async function getSources(): Promise<CueSource[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cue_sources')
    .select('*')
    .order('name')
  if (error) throw error
  return (data ?? []) as unknown as CueSource[]
}

export async function getActiveSources(): Promise<CueSource[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cue_sources')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return (data ?? []) as unknown as CueSource[]
}

// ============================================================================
// PULSE RUNS
// ============================================================================

export async function getLatestPulseRun(): Promise<CuePulseRun | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cue_pulse_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .single()
  if (error) return null
  return data as unknown as CuePulseRun
}

// ============================================================================
// PULSE ITEMS
// ============================================================================

export async function getPulseItems(opts?: {
  limit?: number
  savedOnly?: boolean
  unreadOnly?: boolean
  topic?: string
}): Promise<CuePulseItemWithSource[]> {
  const supabase = await createClient()
  let query = supabase
    .from('cue_pulse_items')
    .select('*, cue_sources(id, name, url)')
    .order('relevance_score', { ascending: false })
    .order('published_at', { ascending: false })

  if (opts?.savedOnly) query = query.eq('is_saved', true)
  if (opts?.unreadOnly) query = query.eq('is_read', false)
  if (opts?.topic) query = query.contains('topics', [opts.topic])
  if (opts?.limit) query = query.limit(opts.limit)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    source: row.cue_sources ?? null,
  })) as unknown as CuePulseItemWithSource[]
}

// ============================================================================
// CONTACTS
// ============================================================================

export async function getContacts(): Promise<CueContact[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cue_contacts')
    .select('*')
    .order('name')
  if (error) throw error
  return (data ?? []) as unknown as CueContact[]
}

export async function getContact(id: string): Promise<CueContactWithTopics | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cue_contacts')
    .select('*, cue_contact_topics(*)')
    .eq('id', id)
    .single()
  if (error) return null
  return {
    ...data,
    topics: (data.cue_contact_topics ?? []) as unknown as CueContactTopic[],
  } as unknown as CueContactWithTopics
}

// ============================================================================
// BRIEFS
// ============================================================================

export async function getBriefs(contactId?: string): Promise<CueBriefWithContact[]> {
  const supabase = await createClient()
  let query = supabase
    .from('cue_briefs')
    .select('*, cue_contacts(id, name, relationship)')
    .eq('is_archived', false)
    .order('generated_at', { ascending: false })

  if (contactId) query = query.eq('contact_id', contactId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    contact: row.cue_contacts ?? null,
  })) as unknown as CueBriefWithContact[]
}

export async function getBrief(id: string): Promise<CueBriefWithContact | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cue_briefs')
    .select('*, cue_contacts(id, name, relationship)')
    .eq('id', id)
    .single()
  if (error) return null
  return {
    ...data,
    contact: data.cue_contacts ?? null,
  } as unknown as CueBriefWithContact
}

export async function getRecentBriefs(limit = 5): Promise<CueBriefWithContact[]> {
  return getBriefs().then((briefs) => briefs.slice(0, limit))
}
