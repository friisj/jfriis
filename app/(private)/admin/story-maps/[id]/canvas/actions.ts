'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  validateLayerName,
  LAYER_NAME_MAX_LENGTH,
} from '@/lib/boundary-objects/story-map-layers'

// ============================================================================
// Types
// ============================================================================

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// ============================================================================
// Layer Actions
// ============================================================================

export async function updateLayerNameAction(
  layerId: string,
  name: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate
  const nameResult = validateLayerName(name)
  if (!nameResult.success) {
    return { success: false, error: nameResult.error }
  }

  const { error } = await supabase
    .from('story_map_layers')
    .update({ name: nameResult.data })
    .eq('id', layerId)

  if (error) {
    console.error('Error updating layer name:', error)
    return { success: false, error: 'Failed to update layer name' }
  }

  revalidatePath('/admin/story-maps/[id]/canvas', 'page')
  return { success: true, data: undefined }
}

export async function deleteLayerAction(layerId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('story_map_layers')
    .delete()
    .eq('id', layerId)

  if (error) {
    console.error('Error deleting layer:', error)
    return { success: false, error: 'Failed to delete layer' }
  }

  revalidatePath('/admin/story-maps/[id]/canvas', 'page')
  return { success: true, data: undefined }
}

export async function createLayerAction(
  storyMapId: string,
  name: string,
  sequence: number
): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate
  const nameResult = validateLayerName(name)
  if (!nameResult.success) {
    return { success: false, error: nameResult.error }
  }

  const { error } = await supabase.from('story_map_layers').insert({
    story_map_id: storyMapId,
    name: nameResult.data,
    sequence,
  })

  if (error) {
    console.error('Error creating layer:', error)
    if (error.code === '23505') {
      return { success: false, error: 'A layer with this position already exists' }
    }
    return { success: false, error: 'Failed to create layer' }
  }

  revalidatePath('/admin/story-maps/[id]/canvas', 'page')
  return { success: true, data: undefined }
}

// ============================================================================
// Story Actions
// ============================================================================

export async function updateStoryAction(
  storyId: string,
  data: {
    title?: string
    description?: string | null
    acceptance_criteria?: string | null
    priority?: string | null
    status?: string
    story_type?: string | null
    story_points?: number | null
    activity_id?: string
    layer_id?: string | null
    vertical_position?: number
  }
): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate title if provided
  if (data.title !== undefined) {
    const trimmed = data.title.trim()
    if (!trimmed) {
      return { success: false, error: 'Title is required' }
    }
    if (trimmed.length > 500) {
      return { success: false, error: 'Title must be 500 characters or less' }
    }
    data.title = trimmed
  }

  const { error } = await supabase
    .from('user_stories')
    .update(data)
    .eq('id', storyId)

  if (error) {
    console.error('Error updating story:', error)
    return { success: false, error: 'Failed to update story' }
  }

  revalidatePath('/admin/story-maps/[id]/canvas', 'page')
  return { success: true, data: undefined }
}

export async function deleteStoryAction(storyId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { error } = await supabase.from('user_stories').delete().eq('id', storyId)

  if (error) {
    console.error('Error deleting story:', error)
    return { success: false, error: 'Failed to delete story' }
  }

  revalidatePath('/admin/story-maps/[id]/canvas', 'page')
  return { success: true, data: undefined }
}

export async function createStoryAction(data: {
  title: string
  description?: string | null
  activity_id: string
  layer_id?: string | null
  vertical_position?: number
  priority?: string | null
  status?: string
  story_type?: string | null
}): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate title
  const trimmedTitle = data.title.trim()
  if (!trimmedTitle) {
    return { success: false, error: 'Title is required' }
  }
  if (trimmedTitle.length > 500) {
    return { success: false, error: 'Title must be 500 characters or less' }
  }

  const { error } = await supabase.from('user_stories').insert({
    ...data,
    title: trimmedTitle,
    status: data.status || 'backlog',
  })

  if (error) {
    console.error('Error creating story:', error)
    return { success: false, error: 'Failed to create story' }
  }

  revalidatePath('/admin/story-maps/[id]/canvas', 'page')
  return { success: true, data: undefined }
}

export async function moveStoryAction(
  storyId: string,
  activityId: string,
  layerId: string,
  verticalPosition: number
): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('user_stories')
    .update({
      activity_id: activityId,
      layer_id: layerId,
      vertical_position: verticalPosition,
    })
    .eq('id', storyId)

  if (error) {
    console.error('Error moving story:', error)
    return { success: false, error: 'Failed to move story' }
  }

  revalidatePath('/admin/story-maps/[id]/canvas', 'page')
  return { success: true, data: undefined }
}
