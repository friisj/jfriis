'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateStudioProjectStatus(
  projectId: string,
  newStatus: string
) {
  const supabase = await createClient()

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
