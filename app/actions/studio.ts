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
