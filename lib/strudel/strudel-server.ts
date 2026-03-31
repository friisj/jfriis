/**
 * Strudel Agent: Server-side database operations
 * Conversations, messages, and track persistence
 */

import { createClient } from '../supabase-server'

// NOTE: strudel_* tables not in generated Supabase types — using type assertions

// ============================================================================
// Types
// ============================================================================

export type StrudelConversation = {
  id: string
  title: string | null
  model: string
  turn_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type StrudelMessage = {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  parts: object[] | null
  created_at: string
}

export type StrudelTrack = {
  id: string
  title: string
  code: string
  description: string | null
  tags: string[]
  parent_version_id: string | null
  conversation_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// Conversations
// ============================================================================

export async function createStrudelConversation(input: {
  title?: string
  model: string
}): Promise<StrudelConversation> {
  const client = await createClient()
  const { data, error } = await (client as any)
    .from('strudel_conversations')
    .insert({
      title: input.title || null,
      model: input.model,
    })
    .select()
    .single()

  if (error) throw error
  return data as StrudelConversation
}

export async function getStrudelConversation(
  id: string
): Promise<StrudelConversation> {
  const client = await createClient()
  const { data, error } = await (client as any)
    .from('strudel_conversations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as StrudelConversation
}

export async function getStrudelMessages(
  conversationId: string
): Promise<StrudelMessage[]> {
  const client = await createClient()
  const { data, error } = await (client as any)
    .from('strudel_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as StrudelMessage[]
}

export async function createStrudelMessage(input: {
  conversation_id: string
  role: string
  content: string
  parts?: object[]
}): Promise<StrudelMessage> {
  const client = await createClient()
  const row: Record<string, unknown> = {
    conversation_id: input.conversation_id,
    role: input.role,
    content: input.content,
  }
  if (input.parts) row.parts = input.parts

  const { data, error } = await (client as any)
    .from('strudel_messages')
    .insert(row)
    .select()
    .single()

  if (error) throw error
  return data as StrudelMessage
}

export async function incrementStrudelTurnCount(
  conversationId: string
): Promise<void> {
  const client = await createClient()
  const { data: conv, error: fetchErr } = await (client as any)
    .from('strudel_conversations')
    .select('turn_count')
    .eq('id', conversationId)
    .single()

  if (fetchErr) throw fetchErr

  const { error: updateErr } = await (client as any)
    .from('strudel_conversations')
    .update({ turn_count: (conv.turn_count ?? 0) + 1 })
    .eq('id', conversationId)

  if (updateErr) throw updateErr
}

// ============================================================================
// Tracks
// ============================================================================

export async function saveStrudelTrack(input: {
  title: string
  code: string
  description?: string
  tags?: string[]
  parent_version_id?: string
  conversation_id?: string
}): Promise<StrudelTrack> {
  const client = await createClient()
  const { data, error } = await (client as any)
    .from('strudel_tracks')
    .insert({
      title: input.title,
      code: input.code,
      description: input.description || null,
      tags: input.tags || [],
      parent_version_id: input.parent_version_id || null,
      conversation_id: input.conversation_id || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as StrudelTrack
}

export async function getStrudelTrack(
  id: string
): Promise<StrudelTrack | null> {
  const client = await createClient()
  const { data, error } = await (client as any)
    .from('strudel_tracks')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data as StrudelTrack | null
}

export async function listStrudelTracks(): Promise<StrudelTrack[]> {
  const client = await createClient()
  const { data, error } = await (client as any)
    .from('strudel_tracks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data as StrudelTrack[]
}
