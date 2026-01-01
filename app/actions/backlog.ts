'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateBacklogItemStatus(
  itemId: string,
  newStatus: 'inbox' | 'in-progress' | 'shaped' | 'archived'
) {
  const supabase = await createClient()

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
