'use server'

import { createClient } from '@/lib/supabase-server'
import type { CueContactInsert, CueContact, CueProfileTopicWeight, CueSourceInsert, CueSource } from './types'

// ============================================================================
// PROFILE
// ============================================================================

export async function upsertProfile(topics: CueProfileTopicWeight[], notes?: string) {
  const supabase = await createClient()

  // Check for existing profile
  const { data: existing } = await supabase
    .from('cue_profile')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('cue_profile')
      .update({ topics, notes: notes ?? null })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('cue_profile')
      .insert({ topics, notes: notes ?? null })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ============================================================================
// CONTACTS
// ============================================================================

export async function createContact(input: CueContactInsert): Promise<CueContact> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cue_contacts')
    .insert(input as never)
    .select()
    .single()
  if (error) throw error
  return data as unknown as CueContact
}

export async function updateContact(id: string, updates: Partial<CueContactInsert>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cue_contacts')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as unknown as CueContact
}

export async function deleteContact(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('cue_contacts').delete().eq('id', id)
  if (error) throw error
}

// ============================================================================
// CONTACT TOPICS
// ============================================================================

export async function setContactTopics(
  contactId: string,
  topics: { topic: string; weight: number }[]
) {
  const supabase = await createClient()

  // Replace all topics for this contact
  const { error: deleteError } = await supabase
    .from('cue_contact_topics')
    .delete()
    .eq('contact_id', contactId)
  if (deleteError) throw deleteError

  if (topics.length === 0) return

  const { error: insertError } = await supabase
    .from('cue_contact_topics')
    .insert(topics.map((t) => ({ contact_id: contactId, topic: t.topic, weight: t.weight })))
  if (insertError) throw insertError
}

// ============================================================================
// SOURCES
// ============================================================================

export async function createSource(input: CueSourceInsert): Promise<CueSource> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cue_sources')
    .insert(input as never)
    .select()
    .single()
  if (error) throw error
  return data as unknown as CueSource
}

export async function updateSource(id: string, updates: Partial<CueSourceInsert>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cue_sources')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as unknown as CueSource
}

export async function deleteSource(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('cue_sources').delete().eq('id', id)
  if (error) throw error
}

// ============================================================================
// PULSE ITEMS
// ============================================================================

export async function markItemRead(id: string, isRead: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('cue_pulse_items')
    .update({ is_read: isRead })
    .eq('id', id)
  if (error) throw error
}

export async function markItemSaved(id: string, isSaved: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('cue_pulse_items')
    .update({ is_saved: isSaved })
    .eq('id', id)
  if (error) throw error
}
