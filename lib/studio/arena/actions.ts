'use server'

import { createClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { SkillState, ArenaAnnotation } from './types'

// Arena tables aren't in the generated Supabase types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function arenaClient(): Promise<SupabaseClient<any, 'public', any>> {
  return await createClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-|-$/g, '')
    .substring(0, 100)
}

// =============================================================================
// PROJECTS
// =============================================================================

export async function createProjectAction(formData: FormData) {
  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const figmaFileUrl = (formData.get('figma_file_url') as string) || null
  const figmaFileKey = (formData.get('figma_file_key') as string) || null

  if (!name?.trim()) throw new Error('Name is required')

  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_projects')
    .insert({
      name: name.trim(),
      slug: generateSlug(name),
      description,
      figma_file_url: figmaFileUrl,
      figma_file_key: figmaFileKey,
      metadata: {},
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath('/apps/arena')
  return data
}

export async function deleteProjectAction(id: string) {
  const supabase = await arenaClient()
  const { error } = await supabase.from('arena_projects').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/apps/arena')
}

// =============================================================================
// SKILLS — composite mutations
// =============================================================================

export async function saveImportedSkill(input: {
  name: string
  state: SkillState
  source: 'figma' | 'manual'
  project_id?: string
  parent_skill_id?: string
}) {
  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_skills')
    .insert({
      name: input.name,
      state: input.state as unknown as Record<string, unknown>,
      source: input.source,
      project_id: input.project_id ?? null,
      parent_skill_id: input.parent_skill_id ?? null,
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath('/apps/arena')
  return data
}

export async function deleteSkillAction(id: string) {
  const supabase = await arenaClient()
  const { error } = await supabase.from('arena_skills').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/apps/arena')
}

// =============================================================================
// SESSIONS — gym persistence
// =============================================================================

interface FeedbackItem {
  dimension: 'color' | 'typography' | 'spacing'
  decision_label: string
  action: 'approve' | 'adjust' | 'flag'
  new_value?: string
  reason?: string
}

export async function completeGymRound(input: {
  session_id: string
  round: number
  feedback: FeedbackItem[]
  annotations: ArenaAnnotation[]
  skill_state: SkillState
  ai_summary?: string
}) {
  const supabase = await arenaClient()

  // Insert feedback rows
  if (input.feedback.length > 0) {
    const feedbackRows = input.feedback.map((f) => ({
      session_id: input.session_id,
      round: input.round,
      dimension: f.dimension,
      decision_label: f.decision_label,
      action: f.action,
      new_value: f.new_value ?? null,
      reason: f.reason ?? null,
    }))
    const { error: fbError } = await supabase
      .from('arena_session_feedback')
      .insert(feedbackRows)
    if (fbError) throw fbError
  }

  // Insert annotation rows
  if (input.annotations.length > 0) {
    const annotationRows = input.annotations.map((a) => ({
      session_id: input.session_id,
      round: input.round,
      hat_key: a.hatKey,
      segments: a.segments,
    }))
    const { error: annError } = await supabase
      .from('arena_session_annotations')
      .insert(annotationRows)
    if (annError) throw annError
  }

  // Insert iteration snapshot
  const { error: itError } = await supabase
    .from('arena_session_iterations')
    .insert({
      session_id: input.session_id,
      round: input.round,
      skill_state: input.skill_state as unknown as Record<string, unknown>,
      ai_summary: input.ai_summary ?? null,
    })
  if (itError) throw itError

  // Update session round count
  const { error: sessError } = await supabase
    .from('arena_sessions')
    .update({ round_count: input.round })
    .eq('id', input.session_id)
  if (sessError) throw sessError

  revalidatePath('/apps/arena')
}

export async function acceptRefinement(input: {
  session_id: string
  final_skill_state: SkillState
  input_skill_name: string
}) {
  const supabase = await arenaClient()

  // Get the session to find input_skill_id
  const { data: session, error: sessErr } = await supabase
    .from('arena_sessions')
    .select('input_skill_id')
    .eq('id', input.session_id)
    .single()
  if (sessErr || !session) throw new Error('Session not found')

  // Create output skill
  const { data: outputSkill, error: skillErr } = await supabase
    .from('arena_skills')
    .insert({
      name: `${input.input_skill_name} (refined)`,
      state: input.final_skill_state as unknown as Record<string, unknown>,
      source: 'refined',
      parent_skill_id: session.input_skill_id,
    })
    .select()
    .single()
  if (skillErr) throw skillErr

  // Complete the session
  const { error: updateErr } = await supabase
    .from('arena_sessions')
    .update({
      output_skill_id: outputSkill.id,
      status: 'completed',
    })
    .eq('id', input.session_id)
  if (updateErr) throw updateErr

  revalidatePath('/apps/arena')
  return outputSkill
}

export async function abandonSession(sessionId: string) {
  const supabase = await arenaClient()
  const { error } = await supabase
    .from('arena_sessions')
    .update({ status: 'abandoned' })
    .eq('id', sessionId)
  if (error) throw error
  revalidatePath('/apps/arena')
}

export async function createSessionAction(input: {
  input_skill_id: string
  notes?: string
}) {
  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_sessions')
    .insert({
      input_skill_id: input.input_skill_id,
      status: 'active',
      round_count: 0,
      notes: input.notes ?? null,
    })
    .select()
    .single()
  if (error) throw error
  revalidatePath('/apps/arena')
  return data
}
