'use server'

/**
 * Server Actions for Entity Generator
 *
 * Handles database mutations for generated entities with proper auth.
 * Addresses CRITICAL-3: Security - move DB mutations to server.
 */

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

// Type for pending entity (without internal fields)
interface PendingEntityData {
  [key: string]: unknown
}

/**
 * Flush pending hypotheses to database
 */
export async function flushPendingHypotheses(
  projectId: string,
  hypotheses: PendingEntityData[],
  startSequence: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    if (hypotheses.length === 0) {
      return { success: true }
    }

    // Prepare batch insert (CRITICAL-2: batch instead of loop)
    const inserts = hypotheses.map((h, index) => {
      // Remove internal fields
      const { _pendingId, _createdAt, _isPending, ...data } = h as Record<string, unknown>
      return {
        ...data,
        project_id: projectId,
        sequence: startSequence + index,
      }
    })

    const { error } = await supabase
      .from('studio_hypotheses')
      .insert(inserts)

    if (error) {
      console.error('[flushPendingHypotheses] Insert error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/admin/studio/${projectId}/edit`)
    return { success: true }
  } catch (err) {
    console.error('[flushPendingHypotheses] Unexpected error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }
  }
}

/**
 * Flush pending experiments to database
 */
export async function flushPendingExperiments(
  projectId: string,
  experiments: PendingEntityData[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    if (experiments.length === 0) {
      return { success: true }
    }

    // Prepare batch insert
    const inserts = experiments.map((e) => {
      // Remove internal fields
      const { _pendingId, _createdAt, _isPending, ...data } = e as Record<string, unknown>
      return {
        ...data,
        project_id: projectId,
      }
    })

    const { error } = await supabase
      .from('studio_experiments')
      .insert(inserts)

    if (error) {
      console.error('[flushPendingExperiments] Insert error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/admin/studio/${projectId}/edit`)
    return { success: true }
  } catch (err) {
    console.error('[flushPendingExperiments] Unexpected error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }
  }
}

/**
 * Delete a hypothesis
 */
export async function deleteHypothesis(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('studio_hypotheses')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[deleteHypothesis] Delete error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/studio')
    return { success: true }
  } catch (err) {
    console.error('[deleteHypothesis] Unexpected error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }
  }
}

/**
 * Delete an experiment
 */
export async function deleteExperiment(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('studio_experiments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[deleteExperiment] Delete error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/studio')
    return { success: true }
  } catch (err) {
    console.error('[deleteExperiment] Unexpected error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }
  }
}
