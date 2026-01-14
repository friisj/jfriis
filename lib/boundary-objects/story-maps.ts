/**
 * CRUD Operations for Story Maps
 *
 * Handles story maps, activities, user stories, and releases
 * Phase 4 of Boundary Objects Entity System
 *
 * NOTE: Type casts (as any, as unknown as T) are needed because these tables
 * are new and Supabase types need regeneration after migration is applied.
 * Run `npx supabase gen types typescript` after applying migrations to remove casts.
 */

import { supabase } from '@/lib/supabase'
import type {
  StoryMap,
  StoryMapInsert,
  StoryMapUpdate,
  Activity,
  ActivityInsert,
  ActivityUpdate,
  UserStory,
  UserStoryInsert,
  UserStoryUpdate,
  StoryRelease,
  StoryReleaseInsert,
  StoryReleaseUpdate,
  StoryMapWithActivities,
  ActivityWithStories,
  UserStoryWithRelations,
  StoryMapSummaryView,
  StoryMapFilters,
  UserStoryFilters,
  SortConfig,
  StoryMapSortField,
  UserStorySortField,
  PaginationParams,
  PaginatedResponse,
} from '@/lib/types/boundary-objects'
import { getLinkedEntities } from '@/lib/entity-links'

// ============================================================================
// STORY MAPS
// ============================================================================

export async function createStoryMap(data: StoryMapInsert): Promise<StoryMap> {
  const { data: storyMap, error } = await supabase
    .from('story_maps')
    .insert(data as any)
    .select()
    .single()

  if (error) throw error
  return storyMap as unknown as StoryMap
}

export async function getStoryMap(id: string): Promise<StoryMap> {
  const { data, error } = await supabase
    .from('story_maps')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as unknown as StoryMap
}

export async function getStoryMapBySlug(
  slug: string,
  projectId?: string
): Promise<StoryMap | null> {
  let query = supabase.from('story_maps').select('*').eq('slug', slug)

  if (projectId) {
    query = query.eq('studio_project_id', projectId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) throw error
  return data as unknown as StoryMap | null
}

export async function getStoryMapWithActivities(id: string): Promise<StoryMapWithActivities> {
  const { data: storyMap, error: storyMapError } = await supabase
    .from('story_maps')
    .select('*')
    .eq('id', id)
    .single()

  if (storyMapError) throw storyMapError

  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('*')
    .eq('story_map_id', id)
    .order('sequence', { ascending: true })

  if (activitiesError) throw activitiesError

  // Count total stories across all activities
  const activityIds = (activities || []).map(a => a.id)
  let storyCount = 0
  if (activityIds.length > 0) {
    const { count, error: countError } = await supabase
      .from('user_stories')
      .select('*', { count: 'exact', head: true })
      .in('activity_id', activityIds)
    if (countError) {
      // Log but don't fail - count is not critical
      console.warn('Failed to count user stories:', countError.message)
    }
    storyCount = count ?? 0
  }

  return {
    ...(storyMap as unknown as StoryMap),
    activities: (activities || []) as unknown as Activity[],
    activity_count: activities?.length || 0,
    story_count: storyCount,
  }
}

/**
 * List story maps with pagination and filtering
 */
export async function listStoryMaps(
  filters?: StoryMapFilters,
  sort?: SortConfig<StoryMapSortField>,
  pagination?: PaginationParams
): Promise<PaginatedResponse<StoryMap>> {
  const limit = pagination?.limit || 50

  let query = supabase
    .from('story_maps')
    .select('*')
    .limit(limit + 1)

  // Apply cursor
  if (pagination?.cursor) {
    query = query.gt('id', pagination.cursor)
  }

  // Apply filters
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  }
  if (filters?.validation_status && filters.validation_status.length > 0) {
    query = query.in('validation_status', filters.validation_status)
  }
  if (filters?.map_type && filters.map_type.length > 0) {
    query = query.in('map_type', filters.map_type)
  }
  if (filters?.studio_project_id) {
    query = query.eq('studio_project_id', filters.studio_project_id)
  }
  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags)
  }
  if (filters?.search) {
    // Sanitize search input: escape LIKE wildcards and filter syntax chars
    const sanitized = filters.search
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/%/g, '\\%')    // Escape LIKE wildcard %
      .replace(/_/g, '\\_')    // Escape LIKE wildcard _
      .replace(/,/g, '')       // Remove commas (filter separator)
      .replace(/\./g, '')      // Remove dots (operator separator)
      .slice(0, 100)           // Limit length to prevent abuse
    if (sanitized.trim()) {
      query = query.or(
        `name.ilike.%${sanitized}%,description.ilike.%${sanitized}%`
      )
    }
  }

  // Apply sorting
  if (sort) {
    query = query.order(sort.field, { ascending: sort.direction === 'asc' })
  } else {
    query = query.order('updated_at', { ascending: false })
  }

  const { data, error } = await query

  if (error) throw error

  const hasMore = (data?.length || 0) > limit
  const results = hasMore ? data!.slice(0, limit) : data || []
  const nextCursor = hasMore && results.length > 0 ? results[results.length - 1].id : undefined

  return {
    data: results as unknown as StoryMap[],
    nextCursor,
    hasMore,
  }
}

/**
 * List story maps for a specific project
 */
export async function listStoryMapsByProject(projectId: string): Promise<StoryMap[]> {
  const { data, error } = await supabase
    .from('story_maps')
    .select('*')
    .eq('studio_project_id', projectId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []) as unknown as StoryMap[]
}

export async function updateStoryMap(
  id: string,
  updates: StoryMapUpdate
): Promise<StoryMap> {
  const { data, error } = await supabase
    .from('story_maps')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as unknown as StoryMap
}

export async function deleteStoryMap(id: string): Promise<void> {
  const { error } = await supabase.from('story_maps').delete().eq('id', id)

  if (error) throw error
}

// ============================================================================
// ACTIVITIES
// ============================================================================

export async function createActivity(data: ActivityInsert): Promise<Activity> {
  const { data: activity, error } = await supabase
    .from('activities')
    .insert(data as any)
    .select()
    .single()

  if (error) throw error
  return activity as unknown as Activity
}

export async function getActivity(id: string): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as unknown as Activity
}

export async function getActivityWithStories(id: string): Promise<ActivityWithStories> {
  const { data: activity, error: activityError } = await supabase
    .from('activities')
    .select('*')
    .eq('id', id)
    .single()

  if (activityError) throw activityError

  const { data: stories, error: storiesError } = await supabase
    .from('user_stories')
    .select('*')
    .eq('activity_id', id)
    .order('vertical_position', { ascending: true })

  if (storiesError) throw storiesError

  return {
    ...(activity as unknown as Activity),
    stories: (stories || []) as unknown as UserStory[],
    story_count: stories?.length || 0,
  }
}

export async function listActivities(storyMapId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('story_map_id', storyMapId)
    .order('sequence', { ascending: true })

  if (error) throw error
  return (data || []) as unknown as Activity[]
}

export async function updateActivity(id: string, updates: ActivityUpdate): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as unknown as Activity
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase.from('activities').delete().eq('id', id)

  if (error) throw error
}

/**
 * Reorder activities within a story map
 *
 * Uses a two-phase approach to avoid sequence conflicts:
 * 1. Set all sequences to negative values (out of conflict range)
 * 2. Set final sequence values
 *
 * If phase 2 fails, attempts rollback to restore original sequences.
 */
export async function reorderActivities(storyMapId: string, activityIds: string[]): Promise<void> {
  if (activityIds.length === 0) return

  // Fetch original sequences for potential rollback
  const { data: originalActivities, error: fetchError } = await supabase
    .from('activities')
    .select('id, sequence')
    .in('id', activityIds)

  if (fetchError) throw fetchError

  // Phase 1: Move all activities to negative sequences
  const negativeUpdates = activityIds.map((id, index) => ({
    id,
    sequence: -(index + 1),
    story_map_id: storyMapId,
  }))

  const { error: negativeError } = await supabase
    .from('activities')
    .upsert(negativeUpdates as any)

  if (negativeError) throw negativeError

  // Phase 2: Set the actual sequence values
  const finalUpdates = activityIds.map((id, index) => ({
    id,
    sequence: index,
    story_map_id: storyMapId,
  }))

  const { error: finalError } = await supabase
    .from('activities')
    .upsert(finalUpdates as any)

  if (finalError) {
    // Attempt rollback to original sequences
    console.error('Phase 2 failed, attempting rollback:', finalError.message)
    const rollbackUpdates = (originalActivities || []).map(a => ({
      id: a.id,
      sequence: a.sequence,
      story_map_id: storyMapId,
    }))

    if (rollbackUpdates.length > 0) {
      await supabase.from('activities').upsert(rollbackUpdates as any)
    }

    throw finalError
  }
}

// ============================================================================
// USER STORIES
// ============================================================================

export async function createUserStory(data: UserStoryInsert): Promise<UserStory> {
  const { data: story, error } = await supabase
    .from('user_stories')
    .insert(data as any)
    .select()
    .single()

  if (error) throw error
  return story as unknown as UserStory
}

export async function getUserStory(id: string): Promise<UserStory> {
  const { data, error } = await supabase
    .from('user_stories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as unknown as UserStory
}

export async function getUserStoryWithRelations(id: string): Promise<UserStoryWithRelations> {
  const { data: story, error: storyError } = await supabase
    .from('user_stories')
    .select('*')
    .eq('id', id)
    .single()

  if (storyError) throw storyError

  // Get releases
  const { data: releases, error: releasesError } = await supabase
    .from('story_releases')
    .select('*')
    .eq('user_story_id', id)
    .order('release_order', { ascending: true })

  if (releasesError) throw releasesError

  // Count linked entities via entity_links
  const touchpointLinks = await getLinkedEntities(
    { type: 'user_story', id },
    { targetType: 'touchpoint' }
  )

  const blueprintStepLinks = await getLinkedEntities(
    { type: 'user_story', id },
    { targetType: 'blueprint_step' }
  )

  const assumptionLinks = await getLinkedEntities(
    { type: 'user_story', id },
    { targetType: 'assumption' }
  )

  return {
    ...(story as unknown as UserStory),
    releases: (releases || []) as unknown as StoryRelease[],
    touchpoint_count: touchpointLinks.length,
    blueprint_step_count: blueprintStepLinks.length,
    assumption_count: assumptionLinks.length,
  }
}

/**
 * List user stories with pagination and filtering
 */
export async function listUserStories(
  filters?: UserStoryFilters,
  sort?: SortConfig<UserStorySortField>,
  pagination?: PaginationParams
): Promise<PaginatedResponse<UserStory>> {
  const limit = pagination?.limit || 50

  let query = supabase
    .from('user_stories')
    .select('*')
    .limit(limit + 1)

  // Apply cursor
  if (pagination?.cursor) {
    query = query.gt('id', pagination.cursor)
  }

  // Apply filters
  if (filters?.activity_id) {
    query = query.eq('activity_id', filters.activity_id)
  }
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  }
  if (filters?.priority && filters.priority.length > 0) {
    query = query.in('priority', filters.priority)
  }
  if (filters?.story_type && filters.story_type.length > 0) {
    query = query.in('story_type', filters.story_type)
  }
  if (filters?.validation_status && filters.validation_status.length > 0) {
    query = query.in('validation_status', filters.validation_status)
  }
  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags)
  }
  if (filters?.search) {
    // Sanitize search input: escape LIKE wildcards and filter syntax chars
    const sanitized = filters.search
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/%/g, '\\%')    // Escape LIKE wildcard %
      .replace(/_/g, '\\_')    // Escape LIKE wildcard _
      .replace(/,/g, '')       // Remove commas (filter separator)
      .replace(/\./g, '')      // Remove dots (operator separator)
      .slice(0, 100)           // Limit length to prevent abuse
    if (sanitized.trim()) {
      query = query.or(
        `title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`
      )
    }
  }

  // Apply sorting
  if (sort) {
    query = query.order(sort.field, { ascending: sort.direction === 'asc' })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query

  if (error) throw error

  const hasMore = (data?.length || 0) > limit
  const results = hasMore ? data!.slice(0, limit) : data || []
  const nextCursor = hasMore && results.length > 0 ? results[results.length - 1].id : undefined

  return {
    data: results as unknown as UserStory[],
    nextCursor,
    hasMore,
  }
}

export async function listStoriesByActivity(activityId: string): Promise<UserStory[]> {
  const { data, error } = await supabase
    .from('user_stories')
    .select('*')
    .eq('activity_id', activityId)
    .order('vertical_position', { ascending: true })

  if (error) throw error
  return (data || []) as unknown as UserStory[]
}

export async function updateUserStory(id: string, updates: UserStoryUpdate): Promise<UserStory> {
  const { data, error } = await supabase
    .from('user_stories')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as unknown as UserStory
}

export async function deleteUserStory(id: string): Promise<void> {
  const { error } = await supabase.from('user_stories').delete().eq('id', id)

  if (error) throw error
}

// ============================================================================
// STORY RELEASES
// ============================================================================

export async function createStoryRelease(data: StoryReleaseInsert): Promise<StoryRelease> {
  const { data: release, error } = await supabase
    .from('story_releases')
    .insert(data as any)
    .select()
    .single()

  if (error) throw error
  return release as unknown as StoryRelease
}

export async function getStoryRelease(id: string): Promise<StoryRelease> {
  const { data, error } = await supabase
    .from('story_releases')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as unknown as StoryRelease
}

export async function listReleasesByStory(storyId: string): Promise<StoryRelease[]> {
  const { data, error } = await supabase
    .from('story_releases')
    .select('*')
    .eq('user_story_id', storyId)
    .order('release_order', { ascending: true })

  if (error) throw error
  return (data || []) as unknown as StoryRelease[]
}

export async function listStoriesByRelease(releaseName: string): Promise<UserStory[]> {
  const { data, error } = await supabase
    .from('story_releases')
    .select(`
      user_story_id,
      user_stories!inner (*)
    `)
    .eq('release_name', releaseName)
    .order('release_order', { ascending: true })

  if (error) throw error
  return (data || []).map((r: any) => r.user_stories) as unknown as UserStory[]
}

export async function updateStoryRelease(id: string, updates: StoryReleaseUpdate): Promise<StoryRelease> {
  const { data, error } = await supabase
    .from('story_releases')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as unknown as StoryRelease
}

export async function deleteStoryRelease(id: string): Promise<void> {
  const { error } = await supabase.from('story_releases').delete().eq('id', id)

  if (error) throw error
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export async function createStoryMapWithActivities(
  storyMap: StoryMapInsert,
  activities: Omit<ActivityInsert, 'story_map_id'>[]
): Promise<StoryMapWithActivities> {
  // Create story map
  const createdStoryMap = await createStoryMap(storyMap)

  // Create activities with story map ID
  const activitiesWithStoryMapId = activities.map((activity, index) => ({
    ...activity,
    story_map_id: createdStoryMap.id,
    sequence: activity.sequence ?? index,
  }))

  if (activitiesWithStoryMapId.length > 0) {
    const { data: createdActivities, error: activitiesError } = await supabase
      .from('activities')
      .insert(activitiesWithStoryMapId as any)
      .select()

    if (activitiesError) throw activitiesError

    return {
      ...createdStoryMap,
      activities: (createdActivities || []) as unknown as Activity[],
      activity_count: createdActivities?.length || 0,
      story_count: 0,
    }
  }

  return {
    ...createdStoryMap,
    activities: [],
    activity_count: 0,
    story_count: 0,
  }
}

/**
 * Duplicate a story map with all its activities and stories
 */
export async function duplicateStoryMap(
  id: string,
  newSlug: string,
  newName?: string
): Promise<StoryMapWithActivities> {
  const existing = await getStoryMapWithActivities(id)

  // Create new story map
  const newStoryMap: StoryMapInsert = {
    slug: newSlug,
    name: newName || `${existing.name} (copy)`,
    description: existing.description,
    studio_project_id: existing.studio_project_id,
    hypothesis_id: existing.hypothesis_id,
    map_type: existing.map_type,
    status: 'draft',
    version: 1,
    validation_status: 'untested',
    tags: existing.tags,
    metadata: existing.metadata,
  }

  // Copy activities without IDs
  const newActivities = existing.activities.map(activity => ({
    name: activity.name,
    description: activity.description,
    sequence: activity.sequence,
    user_goal: activity.user_goal,
    metadata: activity.metadata,
  }))

  return createStoryMapWithActivities(newStoryMap, newActivities)
}

/**
 * Get all releases for a story map
 */
export async function listReleasesByStoryMap(storyMapId: string): Promise<string[]> {
  // Step 1: Get activity IDs for this story map
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('id')
    .eq('story_map_id', storyMapId)

  if (activitiesError) throw activitiesError
  if (!activities || activities.length === 0) return []

  const activityIds = activities.map(a => a.id)

  // Step 2: Get user story IDs for these activities
  const { data: stories, error: storiesError } = await supabase
    .from('user_stories')
    .select('id')
    .in('activity_id', activityIds)

  if (storiesError) throw storiesError
  if (!stories || stories.length === 0) return []

  const storyIds = stories.map(s => s.id)

  // Step 3: Get release names for these stories
  const { data: releases, error: releasesError } = await supabase
    .from('story_releases')
    .select('release_name')
    .in('user_story_id', storyIds)

  if (releasesError) throw releasesError

  // Get unique release names
  const uniqueReleases = [...new Set((releases || []).map(r => r.release_name))]
  return uniqueReleases
}
