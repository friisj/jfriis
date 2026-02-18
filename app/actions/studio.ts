'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function updateStudioProjectStatus(
  projectId: string,
  newStatus: string
) {
  const supabase = await createClient()

  // 1. Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized: Authentication required')
  }

  // 2. Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Forbidden: Admin privileges required')
  }

  // 3. Update the studio project
  const { error } = await supabase
    .from('studio_projects')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', projectId)

  if (error) {
    console.error('Error updating studio project status:', error)
    throw new Error('Failed to update studio project status')
  }

  revalidatePath('/admin/studio')
  return { success: true }
}

async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized: Authentication required')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Forbidden: Admin privileges required')
  }

  return supabase
}

export async function updateExperimentStatus(
  experimentId: string,
  status: 'planned' | 'in_progress' | 'completed' | 'abandoned'
) {
  const supabase = await requireAdmin()

  const { error } = await supabase
    .from('studio_experiments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', experimentId)

  if (error) {
    console.error('Error updating experiment status:', error)
    throw new Error('Failed to update experiment status')
  }

  revalidatePath('/studio')
  return { success: true }
}

export async function updateExperimentOutcome(
  experimentId: string,
  outcome: 'success' | 'failure' | 'inconclusive' | null
) {
  const supabase = await requireAdmin()

  const { error } = await supabase
    .from('studio_experiments')
    .update({ outcome, updated_at: new Date().toISOString() })
    .eq('id', experimentId)

  if (error) {
    console.error('Error updating experiment outcome:', error)
    throw new Error('Failed to update experiment outcome')
  }

  revalidatePath('/studio')
  return { success: true }
}

export async function updateExperimentLearnings(
  experimentId: string,
  learnings: string
) {
  const supabase = await requireAdmin()

  const { error } = await supabase
    .from('studio_experiments')
    .update({ learnings, updated_at: new Date().toISOString() })
    .eq('id', experimentId)

  if (error) {
    console.error('Error updating experiment learnings:', error)
    throw new Error('Failed to update experiment learnings')
  }

  revalidatePath('/studio')
  return { success: true }
}
