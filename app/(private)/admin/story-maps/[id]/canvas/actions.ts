'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  validateLayerName,
  validateActivityName,
  validateActivityDescription,
  validateActivityGoal,
  LAYER_NAME_MAX_LENGTH,
  ACTIVITY_NAME_MAX_LENGTH,
  ACTIVITY_DESCRIPTION_MAX_LENGTH,
  ACTIVITY_GOAL_MAX_LENGTH,
} from '@/lib/boundary-objects/story-map-layers'

// ============================================================================
// Types
// ============================================================================

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

// ============================================================================
// Constants (P1-3: Extract validation constants)
// Note: Not exported because 'use server' only allows async function exports
// ============================================================================

const STORY_TITLE_MAX_LENGTH = 500
const STORY_DESCRIPTION_MAX_LENGTH = 5000
const STORY_ACCEPTANCE_CRITERIA_MAX_LENGTH = 5000

// ============================================================================
// Authorization Helpers (P0-1: Add proper authorization)
// ============================================================================

async function verifyStoryMapAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storyMapId: string
): Promise<{ success: true; storyMapId: string } | { success: false; error: string }> {
  // Verify story map exists and user has access via RLS
  const { data, error } = await supabase
    .from('story_maps')
    .select('id')
    .eq('id', storyMapId)
    .single()

  if (error || !data) {
    return { success: false, error: 'Story map not found or access denied' }
  }

  return { success: true, storyMapId: data.id }
}

async function verifyLayerAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  layerId: string
): Promise<{ success: true; storyMapId: string } | { success: false; error: string }> {
  // Get layer and verify access to parent story map
  const { data, error } = await supabase
    .from('story_map_layers')
    .select('id, story_map_id')
    .eq('id', layerId)
    .single()

  if (error || !data) {
    return { success: false, error: 'Layer not found or access denied' }
  }

  return { success: true, storyMapId: data.story_map_id }
}

async function verifyActivityAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  activityId: string
): Promise<{ success: true; storyMapId: string } | { success: false; error: string }> {
  // Get activity and verify access to parent story map
  const { data, error } = await supabase
    .from('activities')
    .select('id, story_map_id')
    .eq('id', activityId)
    .single()

  if (error || !data) {
    return { success: false, error: 'Activity not found or access denied' }
  }

  return { success: true, storyMapId: data.story_map_id }
}

async function verifyStoryAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storyId: string
): Promise<{ success: true; storyMapId: string } | { success: false; error: string }> {
  // Get story via activity and verify access to parent story map
  const { data, error } = await supabase
    .from('user_stories')
    .select('id, activity:activities(story_map_id)')
    .eq('id', storyId)
    .single()

  if (error || !data || !data.activity) {
    return { success: false, error: 'Story not found or access denied' }
  }

  const activity = data.activity as { story_map_id: string }
  return { success: true, storyMapId: activity.story_map_id }
}

// ============================================================================
// Validation Helpers (P1-2, P1-3: Centralized validation)
// ============================================================================

function validateStoryTitle(title: string): { success: true; data: string } | { success: false; error: string } {
  const trimmed = title.trim()
  if (!trimmed) {
    return { success: false, error: 'Story title is required' }
  }
  if (trimmed.length > STORY_TITLE_MAX_LENGTH) {
    return { success: false, error: `Story title must be ${STORY_TITLE_MAX_LENGTH} characters or less` }
  }
  return { success: true, data: trimmed }
}

// ============================================================================
// Revalidation Helper (P1-5: Fix revalidatePath)
// ============================================================================

function revalidateStoryMapCanvas(storyMapId: string) {
  // Revalidate the specific story map's canvas page
  revalidatePath(`/admin/story-maps/${storyMapId}/canvas`, 'page')
  // Also revalidate the layout to catch any related UI updates
  revalidatePath(`/admin/story-maps/${storyMapId}`, 'layout')
}

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
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // P0-1: Verify user has access to this layer's story map
  const accessCheck = await verifyLayerAccess(supabase, layerId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: 'ACCESS_DENIED' }
  }

  // Validate
  const nameResult = validateLayerName(name)
  if (!nameResult.success) {
    return { success: false, error: nameResult.error, code: 'VALIDATION_ERROR' }
  }

  const { error } = await supabase
    .from('story_map_layers')
    .update({ name: nameResult.data })
    .eq('id', layerId)

  if (error) {
    console.error('[updateLayerNameAction] Database error:', error.code, error.message)
    return { success: false, error: 'Failed to update layer name', code: 'DATABASE_ERROR' }
  }

  revalidateStoryMapCanvas(accessCheck.storyMapId)
  return { success: true, data: undefined }
}

export async function deleteLayerAction(layerId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // P0-1: Verify user has access to this layer's story map
  const accessCheck = await verifyLayerAccess(supabase, layerId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: 'ACCESS_DENIED' }
  }

  const { error } = await supabase
    .from('story_map_layers')
    .delete()
    .eq('id', layerId)

  if (error) {
    console.error('[deleteLayerAction] Database error:', error.code, error.message)
    return { success: false, error: 'Failed to delete layer', code: 'DATABASE_ERROR' }
  }

  revalidateStoryMapCanvas(accessCheck.storyMapId)
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
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // P0-1: Verify user has access to this story map
  const accessCheck = await verifyStoryMapAccess(supabase, storyMapId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: 'ACCESS_DENIED' }
  }

  // Validate
  const nameResult = validateLayerName(name)
  if (!nameResult.success) {
    return { success: false, error: nameResult.error, code: 'VALIDATION_ERROR' }
  }

  const { error } = await supabase.from('story_map_layers').insert({
    story_map_id: storyMapId,
    name: nameResult.data,
    sequence,
  })

  if (error) {
    console.error('[createLayerAction] Database error:', error.code, error.message)
    if (error.code === '23505') {
      return { success: false, error: 'A layer with this position already exists', code: 'DUPLICATE_ERROR' }
    }
    return { success: false, error: 'Failed to create layer', code: 'DATABASE_ERROR' }
  }

  revalidateStoryMapCanvas(storyMapId)
  return { success: true, data: undefined }
}

// ============================================================================
// Activity Actions
// ============================================================================

export async function createActivityAction(
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
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // P0-1: Verify user has access to this story map
  const accessCheck = await verifyStoryMapAccess(supabase, storyMapId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: 'ACCESS_DENIED' }
  }

  // Validate
  const nameResult = validateActivityName(name)
  if (!nameResult.success) {
    return { success: false, error: nameResult.error, code: 'VALIDATION_ERROR' }
  }

  const { error } = await supabase.from('activities').insert({
    story_map_id: storyMapId,
    name: nameResult.data,
    sequence,
  })

  if (error) {
    console.error('[createActivityAction] Database error:', error.code, error.message)
    if (error.code === '23505') {
      return { success: false, error: 'An activity with this position already exists', code: 'DUPLICATE_ERROR' }
    }
    return { success: false, error: 'Failed to create activity', code: 'DATABASE_ERROR' }
  }

  revalidateStoryMapCanvas(storyMapId)
  return { success: true, data: undefined }
}

export async function updateActivityNameAction(
  activityId: string,
  name: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // P0-1: Verify user has access to this activity's story map
  const accessCheck = await verifyActivityAccess(supabase, activityId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: 'ACCESS_DENIED' }
  }

  // Validate
  const nameResult = validateActivityName(name)
  if (!nameResult.success) {
    return { success: false, error: nameResult.error, code: 'VALIDATION_ERROR' }
  }

  const { error } = await supabase
    .from('activities')
    .update({ name: nameResult.data })
    .eq('id', activityId)

  if (error) {
    console.error('[updateActivityNameAction] Database error:', error.code, error.message)
    return { success: false, error: 'Failed to update activity name', code: 'DATABASE_ERROR' }
  }

  revalidateStoryMapCanvas(accessCheck.storyMapId)
  return { success: true, data: undefined }
}

export async function deleteActivityAction(activityId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // P0-1: Verify user has access to this activity's story map
  const accessCheck = await verifyActivityAccess(supabase, activityId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: 'ACCESS_DENIED' }
  }

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', activityId)

  if (error) {
    console.error('[deleteActivityAction] Database error:', error.code, error.message)
    return { success: false, error: 'Failed to delete activity', code: 'DATABASE_ERROR' }
  }

  revalidateStoryMapCanvas(accessCheck.storyMapId)
  return { success: true, data: undefined }
}

export async function reorderActivitiesAction(
  storyMapId: string,
  activityIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // P0-1: Verify user has access to this story map
  const accessCheck = await verifyStoryMapAccess(supabase, storyMapId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: 'ACCESS_DENIED' }
  }

  if (activityIds.length === 0) {
    return { success: true, data: undefined }
  }

  // P0-3: Verify all activities belong to this story map before reordering
  const { data: existingActivities, error: fetchError } = await supabase
    .from('activities')
    .select('id')
    .eq('story_map_id', storyMapId)
    .in('id', activityIds)

  if (fetchError) {
    console.error('[reorderActivitiesAction] Fetch error:', fetchError.code, fetchError.message)
    return { success: false, error: 'Failed to verify activities', code: 'DATABASE_ERROR' }
  }

  // Ensure all provided IDs are valid activities for this story map
  const existingIds = new Set(existingActivities?.map((a) => a.id) ?? [])
  const invalidIds = activityIds.filter((id) => !existingIds.has(id))
  if (invalidIds.length > 0) {
    return { success: false, error: 'Some activities do not belong to this story map', code: 'VALIDATION_ERROR' }
  }

  // P0-3: Use sequential updates with negative then positive values
  // Note: For production, consider creating an RPC function for atomic reordering
  // Phase 1: Set all to negative temporary values to release constraints
  for (let i = 0; i < activityIds.length; i++) {
    const { error } = await supabase
      .from('activities')
      .update({ sequence: -(i + 1) })
      .eq('id', activityIds[i])
      .eq('story_map_id', storyMapId) // Extra safety check

    if (error) {
      console.error('[reorderActivitiesAction] Phase 1 error:', error.code, error.message)
      return { success: false, error: 'Failed to reorder activities', code: 'DATABASE_ERROR' }
    }
  }

  // Phase 2: Set to final positive values
  for (let i = 0; i < activityIds.length; i++) {
    const { error } = await supabase
      .from('activities')
      .update({ sequence: i })
      .eq('id', activityIds[i])
      .eq('story_map_id', storyMapId) // Extra safety check

    if (error) {
      console.error('[reorderActivitiesAction] Phase 2 error:', error.code, error.message)
      return { success: false, error: 'Failed to reorder activities', code: 'DATABASE_ERROR' }
    }
  }

  revalidateStoryMapCanvas(storyMapId)
  return { success: true, data: undefined }
}

export async function bulkCreateActivitiesAction(
  storyMapId: string,
  activities: Array<{ name: string; description?: string; user_goal?: string }>
): Promise<ActionResult<{ count: number }>> {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // P0-1: Verify user has access to this story map
  const accessCheck = await verifyStoryMapAccess(supabase, storyMapId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: 'ACCESS_DENIED' }
  }

  if (activities.length === 0) {
    return { success: true, data: { count: 0 } }
  }

  // P0-2: Validate ALL items before any database operation
  const validationErrors: string[] = []
  const validatedActivities: Array<{
    name: string
    description: string | null
    user_goal: string | null
  }> = []

  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i]

    // Validate name
    const nameResult = validateActivityName(activity.name)
    if (!nameResult.success) {
      validationErrors.push(`Activity ${i + 1}: ${nameResult.error}`)
      continue
    }

    // P1-2: Validate description if provided
    let validatedDescription: string | null = null
    if (activity.description) {
      const descResult = validateActivityDescription(activity.description)
      if (!descResult.success) {
        validationErrors.push(`Activity ${i + 1}: ${descResult.error}`)
        continue
      }
      validatedDescription = descResult.data
    }

    // P1-2: Validate user_goal if provided
    let validatedGoal: string | null = null
    if (activity.user_goal) {
      const goalResult = validateActivityGoal(activity.user_goal)
      if (!goalResult.success) {
        validationErrors.push(`Activity ${i + 1}: ${goalResult.error}`)
        continue
      }
      validatedGoal = goalResult.data
    }

    validatedActivities.push({
      name: nameResult.data,
      description: validatedDescription,
      user_goal: validatedGoal,
    })
  }

  // P0-2: If any validation failed, return all errors
  if (validationErrors.length > 0) {
    return {
      success: false,
      error: validationErrors.join('; '),
      code: 'VALIDATION_ERROR'
    }
  }

  // Get current max sequence
  const { data: existing } = await supabase
    .from('activities')
    .select('sequence')
    .eq('story_map_id', storyMapId)
    .order('sequence', { ascending: false })
    .limit(1)

  const startSequence = (existing?.[0]?.sequence ?? -1) + 1

  // Prepare activities for insert
  const activitiesToInsert = validatedActivities.map((activity, index) => ({
    story_map_id: storyMapId,
    name: activity.name,
    description: activity.description,
    user_goal: activity.user_goal,
    sequence: startSequence + index,
  }))

  const { error } = await supabase.from('activities').insert(activitiesToInsert)

  if (error) {
    console.error('[bulkCreateActivitiesAction] Database error:', error.code, error.message)
    return { success: false, error: 'Failed to create activities', code: 'DATABASE_ERROR' }
  }

  revalidateStoryMapCanvas(storyMapId)
  return { success: true, data: { count: validatedActivities.length } }
}

export async function bulkCreateStoriesAction(
  activityId: string,
  layerId: string,
  stories: Array<{
    title: string
    description?: string
    acceptance_criteria?: string
    story_type?: string
  }>
): Promise<ActionResult<{ count: number }>> {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // P0-1: Verify user has access via activity's story map
  const accessCheck = await verifyActivityAccess(supabase, activityId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: 'ACCESS_DENIED' }
  }

  // Verify layer belongs to same story map
  const layerCheck = await verifyLayerAccess(supabase, layerId)
  if (!layerCheck.success) {
    return { success: false, error: layerCheck.error, code: 'ACCESS_DENIED' }
  }
  if (layerCheck.storyMapId !== accessCheck.storyMapId) {
    return { success: false, error: 'Layer does not belong to the same story map', code: 'VALIDATION_ERROR' }
  }

  if (stories.length === 0) {
    return { success: true, data: { count: 0 } }
  }

  // P0-2: Validate ALL items before any database operation
  const validationErrors: string[] = []
  const validatedStories: Array<{
    title: string
    description: string | null
    acceptance_criteria: string | null
    story_type: string
  }> = []

  for (let i = 0; i < stories.length; i++) {
    const story = stories[i]

    // P1-3: Use centralized title validation
    const titleResult = validateStoryTitle(story.title)
    if (!titleResult.success) {
      validationErrors.push(`Story ${i + 1}: ${titleResult.error}`)
      continue
    }

    // Validate description length if provided
    let validatedDescription: string | null = null
    if (story.description) {
      const trimmed = story.description.trim()
      if (trimmed.length > STORY_DESCRIPTION_MAX_LENGTH) {
        validationErrors.push(`Story ${i + 1}: Description must be ${STORY_DESCRIPTION_MAX_LENGTH} characters or less`)
        continue
      }
      validatedDescription = trimmed || null
    }

    // Validate acceptance_criteria length if provided
    let validatedCriteria: string | null = null
    if (story.acceptance_criteria) {
      const trimmed = story.acceptance_criteria.trim()
      if (trimmed.length > STORY_ACCEPTANCE_CRITERIA_MAX_LENGTH) {
        validationErrors.push(`Story ${i + 1}: Acceptance criteria must be ${STORY_ACCEPTANCE_CRITERIA_MAX_LENGTH} characters or less`)
        continue
      }
      validatedCriteria = trimmed || null
    }

    validatedStories.push({
      title: titleResult.data,
      description: validatedDescription,
      acceptance_criteria: validatedCriteria,
      story_type: story.story_type || 'feature',
    })
  }

  // P0-2: If any validation failed, return all errors
  if (validationErrors.length > 0) {
    return {
      success: false,
      error: validationErrors.join('; '),
      code: 'VALIDATION_ERROR'
    }
  }

  // Prepare stories for insert
  const storiesToInsert = validatedStories.map((story) => ({
    activity_id: activityId,
    layer_id: layerId,
    title: story.title,
    description: story.description,
    acceptance_criteria: story.acceptance_criteria,
    story_type: story.story_type,
    status: 'backlog',
  }))

  const { error } = await supabase.from('user_stories').insert(storiesToInsert)

  if (error) {
    console.error('[bulkCreateStoriesAction] Database error:', error.code, error.message)
    return { success: false, error: 'Failed to create stories', code: 'DATABASE_ERROR' }
  }

  revalidateStoryMapCanvas(accessCheck.storyMapId)
  return { success: true, data: { count: validatedStories.length } }
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
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // P0-1: Verify user has access to this story's story map
  const accessCheck = await verifyStoryAccess(supabase, storyId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: 'ACCESS_DENIED' }
  }

  // P1-3: Validate title if provided using centralized function
  if (data.title !== undefined) {
    const titleResult = validateStoryTitle(data.title)
    if (!titleResult.success) {
      return { success: false, error: titleResult.error, code: 'VALIDATION_ERROR' }
    }
    data.title = titleResult.data
  }

  // Validate description if provided
  if (data.description !== undefined && data.description !== null) {
    const trimmed = data.description.trim()
    if (trimmed.length > STORY_DESCRIPTION_MAX_LENGTH) {
      return { success: false, error: `Description must be ${STORY_DESCRIPTION_MAX_LENGTH} characters or less`, code: 'VALIDATION_ERROR' }
    }
    data.description = trimmed || null
  }

  // Validate acceptance_criteria if provided
  if (data.acceptance_criteria !== undefined && data.acceptance_criteria !== null) {
    const trimmed = data.acceptance_criteria.trim()
    if (trimmed.length > STORY_ACCEPTANCE_CRITERIA_MAX_LENGTH) {
      return { success: false, error: `Acceptance criteria must be ${STORY_ACCEPTANCE_CRITERIA_MAX_LENGTH} characters or less`, code: 'VALIDATION_ERROR' }
    }
    data.acceptance_criteria = trimmed || null
  }

  // P2-7: Handle null priority explicitly
  if (data.priority === '') {
    data.priority = null
  }

  const { error } = await supabase
    .from('user_stories')
    .update(data)
    .eq('id', storyId)

  if (error) {
    console.error('[updateStoryAction] Database error:', error.code, error.message)
    return { success: false, error: 'Failed to update story', code: 'DATABASE_ERROR' }
  }

  revalidateStoryMapCanvas(accessCheck.storyMapId)
  return { success: true, data: undefined }
}

export async function deleteStoryAction(storyId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // P0-1: Verify user has access to this story's story map
  const accessCheck = await verifyStoryAccess(supabase, storyId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: 'ACCESS_DENIED' }
  }

  const { error } = await supabase.from('user_stories').delete().eq('id', storyId)

  if (error) {
    console.error('[deleteStoryAction] Database error:', error.code, error.message)
    return { success: false, error: 'Failed to delete story', code: 'DATABASE_ERROR' }
  }

  revalidateStoryMapCanvas(accessCheck.storyMapId)
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
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // P0-1: Verify user has access via activity's story map
  const accessCheck = await verifyActivityAccess(supabase, data.activity_id)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: 'ACCESS_DENIED' }
  }

  // Verify layer belongs to same story map if provided
  if (data.layer_id) {
    const layerCheck = await verifyLayerAccess(supabase, data.layer_id)
    if (!layerCheck.success) {
      return { success: false, error: layerCheck.error, code: 'ACCESS_DENIED' }
    }
    if (layerCheck.storyMapId !== accessCheck.storyMapId) {
      return { success: false, error: 'Layer does not belong to the same story map', code: 'VALIDATION_ERROR' }
    }
  }

  // P1-3: Validate title using centralized function
  const titleResult = validateStoryTitle(data.title)
  if (!titleResult.success) {
    return { success: false, error: titleResult.error, code: 'VALIDATION_ERROR' }
  }

  const { error } = await supabase.from('user_stories').insert({
    ...data,
    title: titleResult.data,
    status: data.status || 'backlog',
  })

  if (error) {
    console.error('[createStoryAction] Database error:', error.code, error.message)
    return { success: false, error: 'Failed to create story', code: 'DATABASE_ERROR' }
  }

  revalidateStoryMapCanvas(accessCheck.storyMapId)
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
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // P0-1: Verify user has access to this story's story map
  const storyAccessCheck = await verifyStoryAccess(supabase, storyId)
  if (!storyAccessCheck.success) {
    return { success: false, error: storyAccessCheck.error, code: 'ACCESS_DENIED' }
  }

  // Verify target activity belongs to same story map
  const activityCheck = await verifyActivityAccess(supabase, activityId)
  if (!activityCheck.success) {
    return { success: false, error: activityCheck.error, code: 'ACCESS_DENIED' }
  }
  if (activityCheck.storyMapId !== storyAccessCheck.storyMapId) {
    return { success: false, error: 'Target activity does not belong to the same story map', code: 'VALIDATION_ERROR' }
  }

  // Verify target layer belongs to same story map
  const layerCheck = await verifyLayerAccess(supabase, layerId)
  if (!layerCheck.success) {
    return { success: false, error: layerCheck.error, code: 'ACCESS_DENIED' }
  }
  if (layerCheck.storyMapId !== storyAccessCheck.storyMapId) {
    return { success: false, error: 'Target layer does not belong to the same story map', code: 'VALIDATION_ERROR' }
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
    console.error('[moveStoryAction] Database error:', error.code, error.message)
    return { success: false, error: 'Failed to move story', code: 'DATABASE_ERROR' }
  }

  revalidateStoryMapCanvas(storyAccessCheck.storyMapId)
  return { success: true, data: undefined }
}
