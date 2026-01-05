'use server'

/**
 * Server Actions for Log Entry Drafts
 *
 * CRUD operations for draft management with auth checks.
 */

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type {
  LogEntryDraft,
  LogEntryDraftInsert,
  LogEntryDraftUpdate,
  LogEntryDraftGenerationMode,
} from '@/lib/types/database'

interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Get all drafts for a log entry
 */
export async function getDraftsForEntry(
  logEntryId: string
): Promise<ActionResult<LogEntryDraft[]>> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('log_entry_drafts')
      .select('*')
      .eq('log_entry_id', logEntryId)
      .order('created_at', { ascending: true })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as LogEntryDraft[] }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Create a new draft
 */
export async function createDraft(
  logEntryId: string,
  content: string,
  options?: {
    label?: string
    isPrimary?: boolean
    generationInstructions?: string
    generationModel?: string
    generationTemperature?: number
    generationMode?: LogEntryDraftGenerationMode
    sourceDraftId?: string
  }
): Promise<ActionResult<LogEntryDraft>> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // If setting as primary, unset other primary drafts first
    if (options?.isPrimary) {
      await supabase
        .from('log_entry_drafts')
        .update({ is_primary: false })
        .eq('log_entry_id', logEntryId)
        .eq('is_primary', true)
    }

    const insert: LogEntryDraftInsert = {
      log_entry_id: logEntryId,
      content,
      is_primary: options?.isPrimary ?? false,
      label: options?.label,
      generation_instructions: options?.generationInstructions,
      generation_model: options?.generationModel,
      generation_temperature: options?.generationTemperature,
      generation_mode: options?.generationMode,
      source_draft_id: options?.sourceDraftId,
    }

    const { data, error } = await supabase
      .from('log_entry_drafts')
      .insert(insert)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // If this is primary, update log_entries.content cache
    if (options?.isPrimary) {
      await supabase
        .from('log_entries')
        .update({ content: { markdown: content } })
        .eq('id', logEntryId)
    }

    revalidatePath(`/admin/log/${logEntryId}/edit`)
    return { success: true, data: data as LogEntryDraft }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Update a draft's content
 */
export async function updateDraft(
  draftId: string,
  updates: {
    content?: string
    label?: string
    generationInstructions?: string
    generationModel?: string
    generationTemperature?: number
    generationMode?: LogEntryDraftGenerationMode
    sourceDraftId?: string
  }
): Promise<ActionResult<LogEntryDraft>> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const update: LogEntryDraftUpdate = {}
    if (updates.content !== undefined) update.content = updates.content
    if (updates.label !== undefined) update.label = updates.label
    if (updates.generationInstructions !== undefined)
      update.generation_instructions = updates.generationInstructions
    if (updates.generationModel !== undefined)
      update.generation_model = updates.generationModel
    if (updates.generationTemperature !== undefined)
      update.generation_temperature = updates.generationTemperature
    if (updates.generationMode !== undefined)
      update.generation_mode = updates.generationMode
    if (updates.sourceDraftId !== undefined)
      update.source_draft_id = updates.sourceDraftId

    const { data, error } = await supabase
      .from('log_entry_drafts')
      .update(update)
      .eq('id', draftId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    const draft = data as LogEntryDraft

    // If this is the primary draft and content changed, update log_entries cache
    if (draft.is_primary && updates.content !== undefined) {
      await supabase
        .from('log_entries')
        .update({ content: { markdown: updates.content } })
        .eq('id', draft.log_entry_id)
    }

    revalidatePath(`/admin/log/${draft.log_entry_id}/edit`)
    return { success: true, data: draft }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Set a draft as primary
 */
export async function setDraftAsPrimary(
  draftId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get the draft to find log_entry_id
    const { data: draft, error: fetchError } = await supabase
      .from('log_entry_drafts')
      .select('log_entry_id, content')
      .eq('id', draftId)
      .single()

    if (fetchError || !draft) {
      return { success: false, error: 'Draft not found' }
    }

    // Unset current primary
    await supabase
      .from('log_entry_drafts')
      .update({ is_primary: false })
      .eq('log_entry_id', draft.log_entry_id)
      .eq('is_primary', true)

    // Set new primary
    const { error } = await supabase
      .from('log_entry_drafts')
      .update({ is_primary: true })
      .eq('id', draftId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Update log_entries.content cache
    await supabase
      .from('log_entries')
      .update({ content: { markdown: draft.content } })
      .eq('id', draft.log_entry_id)

    revalidatePath(`/admin/log/${draft.log_entry_id}/edit`)
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Delete a draft (cannot delete primary)
 */
export async function deleteDraft(draftId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if primary
    const { data: draft } = await supabase
      .from('log_entry_drafts')
      .select('is_primary, log_entry_id')
      .eq('id', draftId)
      .single()

    if (draft?.is_primary) {
      return { success: false, error: 'Cannot delete primary draft' }
    }

    const { error } = await supabase
      .from('log_entry_drafts')
      .delete()
      .eq('id', draftId)

    if (error) {
      return { success: false, error: error.message }
    }

    if (draft?.log_entry_id) {
      revalidatePath(`/admin/log/${draft.log_entry_id}/edit`)
    }
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Create initial draft for new log entry (when entry is first saved)
 */
export async function createInitialDraft(
  logEntryId: string,
  content: string
): Promise<ActionResult<LogEntryDraft>> {
  return createDraft(logEntryId, content, { isPrimary: true })
}
