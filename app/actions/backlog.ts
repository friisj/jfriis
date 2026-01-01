'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function updateBacklogItemStatus(
  itemId: string,
  newStatus: 'inbox' | 'in-progress' | 'shaped' | 'archived'
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

  // 3. Update the backlog item
  const { error } = await supabase
    .from('backlog_items')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', itemId)

  if (error) {
    console.error('Error updating backlog item status:', error)
    throw new Error('Failed to update backlog item status')
  }

  revalidatePath('/admin/backlog')
  return { success: true }
}
