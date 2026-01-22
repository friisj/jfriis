import { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Types
// ============================================================================

export interface StoryMapLayer {
  id: string
  story_map_id: string
  name: string
  description: string | null
  sequence: number
  layer_type: string | null
  customer_profile_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreateLayerInput {
  story_map_id: string
  name: string
  description?: string
  sequence: number
  layer_type?: string
  customer_profile_id?: string
}

export interface UpdateLayerInput {
  name?: string
  description?: string
  sequence?: number
  layer_type?: string
  customer_profile_id?: string | null
}

// Consistent error handling result type
export type DataResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

// ============================================================================
// Constants
// ============================================================================

export const LAYER_NAME_MAX_LENGTH = 100
export const LAYER_DESCRIPTION_MAX_LENGTH = 500

export const ACTIVITY_NAME_MAX_LENGTH = 100
export const ACTIVITY_DESCRIPTION_MAX_LENGTH = 500
export const ACTIVITY_GOAL_MAX_LENGTH = 500

// Default layers to create when a story map has no layers
const DEFAULT_LAYERS = [
  { name: 'Customer', layer_type: 'customer', sequence: 0 },
  { name: 'Internal Agent', layer_type: 'internal_agent', sequence: 1 },
  { name: 'AI Agent', layer_type: 'ai_agent', sequence: 2 },
  { name: 'Platform', layer_type: 'platform', sequence: 3 },
]

// ============================================================================
// Validation
// ============================================================================

export function validateLayerName(name: string): DataResult<string> {
  const trimmed = name.trim()
  if (!trimmed) {
    return { success: false, error: 'Layer name is required' }
  }
  if (trimmed.length > LAYER_NAME_MAX_LENGTH) {
    return {
      success: false,
      error: `Layer name must be ${LAYER_NAME_MAX_LENGTH} characters or less`,
    }
  }
  return { success: true, data: trimmed }
}

export function validateLayerDescription(
  description: string | undefined
): DataResult<string | null> {
  if (!description) return { success: true, data: null }
  const trimmed = description.trim()
  if (trimmed.length > LAYER_DESCRIPTION_MAX_LENGTH) {
    return {
      success: false,
      error: `Description must be ${LAYER_DESCRIPTION_MAX_LENGTH} characters or less`,
    }
  }
  return { success: true, data: trimmed || null }
}

// ============================================================================
// Activity Validation
// ============================================================================

export function validateActivityName(name: string): DataResult<string> {
  const trimmed = name.trim()
  if (!trimmed) {
    return { success: false, error: 'Activity name is required' }
  }
  if (trimmed.length > ACTIVITY_NAME_MAX_LENGTH) {
    return {
      success: false,
      error: `Activity name must be ${ACTIVITY_NAME_MAX_LENGTH} characters or less`,
    }
  }
  return { success: true, data: trimmed }
}

export function validateActivityDescription(
  description: string | undefined
): DataResult<string | null> {
  if (!description) return { success: true, data: null }
  const trimmed = description.trim()
  if (trimmed.length > ACTIVITY_DESCRIPTION_MAX_LENGTH) {
    return {
      success: false,
      error: `Description must be ${ACTIVITY_DESCRIPTION_MAX_LENGTH} characters or less`,
    }
  }
  return { success: true, data: trimmed || null }
}

export function validateActivityGoal(
  goal: string | undefined
): DataResult<string | null> {
  if (!goal) return { success: true, data: null }
  const trimmed = goal.trim()
  if (trimmed.length > ACTIVITY_GOAL_MAX_LENGTH) {
    return {
      success: false,
      error: `User goal must be ${ACTIVITY_GOAL_MAX_LENGTH} characters or less`,
    }
  }
  return { success: true, data: trimmed || null }
}

// ============================================================================
// Data Operations
// ============================================================================

/**
 * Fetch layers for a story map
 */
export async function getLayersForStoryMap(
  supabase: SupabaseClient,
  storyMapId: string
): Promise<DataResult<StoryMapLayer[]>> {
  const { data, error } = await supabase
    .from('story_map_layers')
    .select('*')
    .eq('story_map_id', storyMapId)
    .order('sequence', { ascending: true })

  if (error) {
    console.error('Error fetching layers:', error)
    return { success: false, error: 'Failed to load layers', code: error.code }
  }

  return { success: true, data: data || [] }
}

/**
 * Create default layers for a story map if none exist
 */
export async function ensureDefaultLayers(
  supabase: SupabaseClient,
  storyMapId: string
): Promise<DataResult<StoryMapLayer[]>> {
  // Check if layers already exist
  const existingResult = await getLayersForStoryMap(supabase, storyMapId)
  if (!existingResult.success) {
    return existingResult
  }
  if (existingResult.data.length > 0) {
    return existingResult
  }

  // Create default layers
  const layersToCreate = DEFAULT_LAYERS.map((layer) => ({
    ...layer,
    story_map_id: storyMapId,
  }))

  const { data, error } = await supabase
    .from('story_map_layers')
    .insert(layersToCreate)
    .select()

  if (error) {
    console.error('Error creating default layers:', error)
    return {
      success: false,
      error: 'Failed to create default layers',
      code: error.code,
    }
  }

  const sorted = (data || []).sort((a, b) => a.sequence - b.sequence)
  return { success: true, data: sorted }
}

/**
 * Create a new layer with validation
 */
export async function createLayer(
  supabase: SupabaseClient,
  input: CreateLayerInput
): Promise<DataResult<StoryMapLayer>> {
  // Validate name
  const nameResult = validateLayerName(input.name)
  if (!nameResult.success) return nameResult

  // Validate description
  const descResult = validateLayerDescription(input.description)
  if (!descResult.success) return descResult

  const { data, error } = await supabase
    .from('story_map_layers')
    .insert({
      ...input,
      name: nameResult.data,
      description: descResult.data,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating layer:', error)
    if (error.code === '23505') {
      return {
        success: false,
        error: 'A layer with this sequence already exists',
        code: error.code,
      }
    }
    return { success: false, error: 'Failed to create layer', code: error.code }
  }

  return { success: true, data }
}

/**
 * Update a layer with validation
 */
export async function updateLayer(
  supabase: SupabaseClient,
  layerId: string,
  input: UpdateLayerInput
): Promise<DataResult<StoryMapLayer>> {
  // Validate name if provided
  if (input.name !== undefined) {
    const nameResult = validateLayerName(input.name)
    if (!nameResult.success) return nameResult
    input.name = nameResult.data
  }

  // Validate description if provided
  if (input.description !== undefined) {
    const descResult = validateLayerDescription(input.description)
    if (!descResult.success) return descResult
    input.description = descResult.data ?? undefined
  }

  const { data, error } = await supabase
    .from('story_map_layers')
    .update(input)
    .eq('id', layerId)
    .select()
    .single()

  if (error) {
    console.error('Error updating layer:', error)
    return { success: false, error: 'Failed to update layer', code: error.code }
  }

  return { success: true, data }
}

/**
 * Delete a layer
 */
export async function deleteLayer(
  supabase: SupabaseClient,
  layerId: string
): Promise<DataResult<void>> {
  const { error } = await supabase
    .from('story_map_layers')
    .delete()
    .eq('id', layerId)

  if (error) {
    console.error('Error deleting layer:', error)
    return { success: false, error: 'Failed to delete layer', code: error.code }
  }

  return { success: true, data: undefined }
}

/**
 * Reorder layers by updating their sequence values
 * Uses two-phase update to avoid unique constraint violations
 */
export async function reorderLayers(
  supabase: SupabaseClient,
  layerIds: string[]
): Promise<DataResult<void>> {
  if (layerIds.length === 0) {
    return { success: true, data: undefined }
  }

  // Phase 1: Set all to negative temporary values to release constraints
  // This avoids collisions when swapping positions
  const tempUpdates = layerIds.map((id, index) =>
    supabase
      .from('story_map_layers')
      .update({ sequence: -(index + 1) })
      .eq('id', id)
  )

  const tempResults = await Promise.all(tempUpdates)
  const tempError = tempResults.find((r) => r.error)
  if (tempError?.error) {
    console.error('Error in reorder phase 1:', tempError.error)
    return {
      success: false,
      error: 'Failed to reorder layers',
      code: tempError.error.code,
    }
  }

  // Phase 2: Set to final positive values
  const finalUpdates = layerIds.map((id, index) =>
    supabase
      .from('story_map_layers')
      .update({ sequence: index })
      .eq('id', id)
  )

  const finalResults = await Promise.all(finalUpdates)
  const finalError = finalResults.find((r) => r.error)
  if (finalError?.error) {
    console.error('Error in reorder phase 2:', finalError.error)
    return {
      success: false,
      error: 'Failed to reorder layers',
      code: finalError.error.code,
    }
  }

  return { success: true, data: undefined }
}

/**
 * Assign a story to a layer
 */
export async function assignStoryToLayer(
  supabase: SupabaseClient,
  storyId: string,
  layerId: string | null,
  verticalPosition?: number
): Promise<DataResult<void>> {
  const updateData: { layer_id: string | null; vertical_position?: number } = {
    layer_id: layerId,
  }
  if (verticalPosition !== undefined) {
    updateData.vertical_position = verticalPosition
  }

  const { error } = await supabase
    .from('user_stories')
    .update(updateData)
    .eq('id', storyId)

  if (error) {
    console.error('Error assigning story to layer:', error)
    return {
      success: false,
      error: 'Failed to assign story to layer',
      code: error.code,
    }
  }

  return { success: true, data: undefined }
}
