'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  validateJourneyLayerType,
  validateCellContent,
  validateStageName,
  validateStageDescription,
  validateEmotionScore,
  validateChannelType,
  validateTouchpointName,
  validateTouchpointDescription,
  type JourneyLayerType,
} from '@/lib/boundary-objects/journey-cells'
import { ActionErrorCode, type ActionResult } from '@/lib/types/action-result'

interface CellUpdateData {
  content?: string | null
  emotion_score?: number | null
  channel_type?: string | null
}

interface StageUpdateData {
  name?: string
  description?: string | null
}

// Constants
const TEMP_SEQUENCE_BASE = -10000

// ============================================================================
// Helper Functions
// ============================================================================

function revalidateJourneyCanvas(journeyId: string) {
  revalidatePath(`/admin/journeys/${journeyId}/canvas`)
  revalidatePath(`/admin/journeys/${journeyId}`)
}

// ============================================================================
// Authorization Helpers
// ============================================================================

/**
 * Verify the current user has access to a journey.
 * For MVP, we just verify the journey exists since we use permissive RLS.
 */
async function verifyJourneyAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  journeyId: string
): Promise<{ success: true; journeyId: string } | { success: false; error: string }> {
  const { data: journey, error } = await supabase
    .from('user_journeys')
    .select('id')
    .eq('id', journeyId)
    .single()

  if (error || !journey) {
    return { success: false, error: 'Journey not found' }
  }

  return { success: true, journeyId: journey.id }
}

/**
 * Verify access via stage - returns the parent journey ID.
 */
async function verifyStageAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  stageId: string
): Promise<{ success: true; journeyId: string } | { success: false; error: string }> {
  const { data: stage, error } = await supabase
    .from('journey_stages')
    .select('id, user_journey_id')
    .eq('id', stageId)
    .single()

  if (error || !stage) {
    return { success: false, error: 'Stage not found' }
  }

  return { success: true, journeyId: stage.user_journey_id }
}

/**
 * Verify access via cell - returns the parent journey ID.
 */
async function verifyCellAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cellId: string
): Promise<{ success: true; journeyId: string } | { success: false; error: string }> {
  // Note: Type assertion needed until Supabase types are regenerated with journey_cells table
  const { data: cell, error } = await (supabase
    .from('journey_cells' as any)
    .select('id, stage_id')
    .eq('id', cellId)
    .single() as any)

  if (error || !cell) {
    return { success: false, error: 'Cell not found' }
  }

  // Get journey ID via stage
  const stageResult = await verifyStageAccess(supabase, cell.stage_id)
  if (!stageResult.success) {
    return stageResult
  }

  return { success: true, journeyId: stageResult.journeyId }
}

// ============================================================================
// Cell Actions
// ============================================================================

/**
 * Create or update a cell at the intersection of stage and layer.
 * Uses upsert to handle the UNIQUE constraint on (stage_id, layer_type).
 */
export async function createCellAction(
  stageId: string,
  layerType: string,
  data: CellUpdateData
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify stage access
  const accessCheck = await verifyStageAccess(supabase, stageId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  // Validate layer type
  const layerTypeResult = validateJourneyLayerType(layerType)
  if (!layerTypeResult.success) {
    return { success: false, error: layerTypeResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate content
  const contentResult = validateCellContent(data.content)
  if (!contentResult.success) {
    return { success: false, error: contentResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate emotion score
  const emotionResult = validateEmotionScore(data.emotion_score)
  if (!emotionResult.success) {
    return { success: false, error: emotionResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate channel type
  const channelResult = validateChannelType(data.channel_type)
  if (!channelResult.success) {
    return { success: false, error: channelResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Upsert cell (handles UNIQUE constraint)
  // Note: Type assertion needed until Supabase types are regenerated with journey_cells table
  const { data: cell, error } = await (supabase
    .from('journey_cells' as any)
    .upsert(
      {
        stage_id: stageId,
        layer_type: layerTypeResult.data,
        content: contentResult.data,
        emotion_score: emotionResult.data,
        channel_type: channelResult.data,
      },
      {
        onConflict: 'stage_id,layer_type',
      }
    )
    .select('id')
    .single() as any)

  if (error) {
    console.error('[createCellAction] Error:', error.code, error.message)
    return { success: false, error: 'Failed to create cell', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateJourneyCanvas(accessCheck.journeyId)
  return { success: true, data: { id: cell.id } }
}

/**
 * Update an existing cell's content and metadata.
 */
export async function updateCellAction(
  cellId: string,
  data: CellUpdateData
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify cell access
  const accessCheck = await verifyCellAccess(supabase, cellId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  // Validate content
  const contentResult = validateCellContent(data.content)
  if (!contentResult.success) {
    return { success: false, error: contentResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate emotion score
  const emotionResult = validateEmotionScore(data.emotion_score)
  if (!emotionResult.success) {
    return { success: false, error: emotionResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate channel type
  const channelResult = validateChannelType(data.channel_type)
  if (!channelResult.success) {
    return { success: false, error: channelResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Update cell
  // Note: Type assertion needed until Supabase types are regenerated with journey_cells table
  const { error } = await (supabase
    .from('journey_cells' as any)
    .update({
      content: contentResult.data,
      emotion_score: emotionResult.data,
      channel_type: channelResult.data,
    })
    .eq('id', cellId) as any)

  if (error) {
    console.error('[updateCellAction] Error:', error.code, error.message)
    return { success: false, error: 'Failed to update cell', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateJourneyCanvas(accessCheck.journeyId)
  return { success: true, data: undefined }
}

/**
 * Delete a cell and its content.
 */
export async function deleteCellAction(cellId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify cell access (and get journey ID for revalidation)
  const accessCheck = await verifyCellAccess(supabase, cellId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  // Delete cell
  // Note: Type assertion needed until Supabase types are regenerated with journey_cells table
  const { error } = await (supabase.from('journey_cells' as any).delete().eq('id', cellId) as any)

  if (error) {
    console.error('[deleteCellAction] Error:', error.code, error.message)
    return { success: false, error: 'Failed to delete cell', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateJourneyCanvas(accessCheck.journeyId)
  return { success: true, data: undefined }
}

// ============================================================================
// Stage Actions
// ============================================================================

/**
 * Create a new stage in a journey.
 */
export async function createStageAction(
  journeyId: string,
  name: string,
  sequence: number
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify journey access
  const accessCheck = await verifyJourneyAccess(supabase, journeyId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  // Validate name
  const nameResult = validateStageName(name)
  if (!nameResult.success) {
    return { success: false, error: nameResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Get current max sequence for inserting at end
  const { data: existingStages } = await supabase
    .from('journey_stages')
    .select('sequence')
    .eq('user_journey_id', journeyId)
    .order('sequence', { ascending: false })
    .limit(1)

  const nextSequence =
    existingStages && existingStages.length > 0
      ? existingStages[0].sequence + 1
      : 0

  // Insert stage
  const { data: stage, error } = await supabase
    .from('journey_stages')
    .insert({
      user_journey_id: journeyId,
      name: nameResult.data,
      sequence: sequence >= 0 ? sequence : nextSequence,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createStageAction] Error:', error.code, error.message)
    return { success: false, error: 'Failed to create stage', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateJourneyCanvas(journeyId)
  return { success: true, data: { id: stage.id } }
}

/**
 * Update a stage's name or description.
 */
export async function updateStageAction(
  stageId: string,
  data: StageUpdateData
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify stage access
  const accessCheck = await verifyStageAccess(supabase, stageId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  // Build update object
  const updateData: Record<string, unknown> = {}

  if (data.name !== undefined) {
    const nameResult = validateStageName(data.name)
    if (!nameResult.success) {
      return { success: false, error: nameResult.error, code: ActionErrorCode.VALIDATION_ERROR }
    }
    updateData.name = nameResult.data
  }

  if (data.description !== undefined) {
    const descResult = validateStageDescription(data.description)
    if (!descResult.success) {
      return { success: false, error: descResult.error, code: ActionErrorCode.VALIDATION_ERROR }
    }
    updateData.description = descResult.data
  }

  if (Object.keys(updateData).length === 0) {
    return { success: true, data: undefined } // Nothing to update
  }

  // Update stage
  const { error } = await supabase
    .from('journey_stages')
    .update(updateData)
    .eq('id', stageId)

  if (error) {
    console.error('[updateStageAction] Error:', error.code, error.message)
    return { success: false, error: 'Failed to update stage', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateJourneyCanvas(accessCheck.journeyId)
  return { success: true, data: undefined }
}

/**
 * Delete a stage and all its cells.
 */
export async function deleteStageAction(stageId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify stage access (and get journey ID for revalidation)
  const accessCheck = await verifyStageAccess(supabase, stageId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  // Delete stage (cells cascade automatically)
  const { error } = await supabase.from('journey_stages').delete().eq('id', stageId)

  if (error) {
    console.error('[deleteStageAction] Error:', error.code, error.message)
    return { success: false, error: 'Failed to delete stage', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateJourneyCanvas(accessCheck.journeyId)
  return { success: true, data: undefined }
}

/**
 * Reorder stages using atomic database function.
 */
export async function reorderStagesAction(
  journeyId: string,
  stageIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify journey access
  const accessCheck = await verifyJourneyAccess(supabase, journeyId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  if (stageIds.length === 0) {
    return { success: true, data: undefined }
  }

  // Use atomic database function for reordering
  // Note: Type cast needed until Supabase types are regenerated with the new function
  const { error } = await (supabase.rpc as any)(
    'reorder_journey_stages',
    {
      p_journey_id: journeyId,
      p_stage_ids: stageIds,
    }
  )

  if (error) {
    console.error('[reorderStagesAction] RPC error:', error.code, error.message)

    // Handle specific error cases
    if (error.code === '23503' || error.message?.includes('do not belong')) {
      return {
        success: false,
        error: 'Some stages do not belong to this journey',
        code: ActionErrorCode.VALIDATION_ERROR,
      }
    }

    return { success: false, error: 'Failed to reorder stages', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateJourneyCanvas(journeyId)
  return { success: true, data: undefined }
}

/**
 * Move a stage left or right in the sequence.
 */
export async function moveStageAction(
  stageId: string,
  direction: 'left' | 'right'
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Get stage and verify access
  const { data: stage, error: stageError } = await supabase
    .from('journey_stages')
    .select('id, user_journey_id, sequence')
    .eq('id', stageId)
    .single()

  if (stageError || !stage) {
    return { success: false, error: 'Stage not found', code: ActionErrorCode.NOT_FOUND }
  }

  // Get all stages for this journey
  const { data: allStages, error: allError } = await supabase
    .from('journey_stages')
    .select('id, sequence')
    .eq('user_journey_id', stage.user_journey_id)
    .order('sequence', { ascending: true })

  if (allError || !allStages) {
    return {
      success: false,
      error: 'Failed to fetch stages',
      code: ActionErrorCode.DATABASE_ERROR,
    }
  }

  // Find current index and swap
  const currentIndex = allStages.findIndex((s) => s.id === stageId)
  const newIndex =
    direction === 'left' ? currentIndex - 1 : currentIndex + 1

  if (newIndex < 0 || newIndex >= allStages.length) {
    return {
      success: false,
      error: `Cannot move stage ${direction}`,
      code: ActionErrorCode.VALIDATION_ERROR,
    }
  }

  // Create new order
  const newOrder = [...allStages]
  ;[newOrder[currentIndex], newOrder[newIndex]] = [
    newOrder[newIndex],
    newOrder[currentIndex],
  ]

  // Use reorder action
  return reorderStagesAction(
    stage.user_journey_id,
    newOrder.map((s) => s.id)
  )
}

// ============================================================================
// Touchpoint Actions
// ============================================================================

interface TouchpointCreateData {
  name: string
  description?: string | null
  channel_type?: string | null
  sequence: number
}

interface TouchpointUpdateData {
  name?: string
  description?: string | null
  channel_type?: string | null
}

/**
 * Verify access via touchpoint - returns the parent journey ID.
 */
async function verifyTouchpointAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  touchpointId: string
): Promise<{ success: true; journeyId: string } | { success: false; error: string }> {
  const { data: touchpoint, error } = await supabase
    .from('touchpoints')
    .select('id, journey_stage_id')
    .eq('id', touchpointId)
    .single()

  if (error || !touchpoint) {
    return { success: false, error: 'Touchpoint not found' }
  }

  // Get journey ID via stage
  const stageResult = await verifyStageAccess(supabase, touchpoint.journey_stage_id)
  if (!stageResult.success) {
    return stageResult
  }

  return { success: true, journeyId: stageResult.journeyId }
}

/**
 * Create a new touchpoint in a journey stage.
 */
export async function createTouchpointAction(
  stageId: string,
  data: TouchpointCreateData
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify stage access
  const accessCheck = await verifyStageAccess(supabase, stageId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  // Validate name
  const nameResult = validateTouchpointName(data.name)
  if (!nameResult.success) {
    return { success: false, error: nameResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate description
  const descResult = validateTouchpointDescription(data.description)
  if (!descResult.success) {
    return { success: false, error: descResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate channel type
  const channelResult = validateChannelType(data.channel_type)
  if (!channelResult.success) {
    return { success: false, error: channelResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Insert touchpoint
  const { data: touchpoint, error } = await supabase
    .from('touchpoints')
    .insert({
      journey_stage_id: stageId,
      name: nameResult.data,
      description: descResult.data,
      channel_type: channelResult.data,
      sequence: data.sequence,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createTouchpointAction] Error:', error.code, error.message)
    return { success: false, error: 'Failed to create touchpoint', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateJourneyCanvas(accessCheck.journeyId)
  return { success: true, data: { id: touchpoint.id } }
}

/**
 * Update an existing touchpoint.
 */
export async function updateTouchpointAction(
  touchpointId: string,
  data: TouchpointUpdateData
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify touchpoint access
  const accessCheck = await verifyTouchpointAccess(supabase, touchpointId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  // Build update object
  const updateData: Record<string, unknown> = {}

  if (data.name !== undefined) {
    const nameResult = validateTouchpointName(data.name)
    if (!nameResult.success) {
      return { success: false, error: nameResult.error, code: ActionErrorCode.VALIDATION_ERROR }
    }
    updateData.name = nameResult.data
  }

  if (data.description !== undefined) {
    const descResult = validateTouchpointDescription(data.description)
    if (!descResult.success) {
      return { success: false, error: descResult.error, code: ActionErrorCode.VALIDATION_ERROR }
    }
    updateData.description = descResult.data
  }

  if (data.channel_type !== undefined) {
    const channelResult = validateChannelType(data.channel_type)
    if (!channelResult.success) {
      return { success: false, error: channelResult.error, code: ActionErrorCode.VALIDATION_ERROR }
    }
    updateData.channel_type = channelResult.data
  }

  if (Object.keys(updateData).length === 0) {
    return { success: true, data: undefined } // Nothing to update
  }

  // Update touchpoint
  const { error } = await supabase
    .from('touchpoints')
    .update(updateData)
    .eq('id', touchpointId)

  if (error) {
    console.error('[updateTouchpointAction] Error:', error.code, error.message)
    return { success: false, error: 'Failed to update touchpoint', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateJourneyCanvas(accessCheck.journeyId)
  return { success: true, data: undefined }
}

/**
 * Delete a touchpoint.
 */
export async function deleteTouchpointAction(touchpointId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify touchpoint access (and get journey ID for revalidation)
  const accessCheck = await verifyTouchpointAccess(supabase, touchpointId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  // Delete touchpoint
  const { error } = await supabase.from('touchpoints').delete().eq('id', touchpointId)

  if (error) {
    console.error('[deleteTouchpointAction] Error:', error.code, error.message)
    return { success: false, error: 'Failed to delete touchpoint', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateJourneyCanvas(accessCheck.journeyId)
  return { success: true, data: undefined }
}

// ============================================================================
// Bulk Actions
// ============================================================================

/**
 * Create multiple cells at once (for AI generation).
 */
export async function bulkCreateCellsAction(
  stageId: string,
  cells: Array<{ layer_type: string } & CellUpdateData>
): Promise<ActionResult<{ count: number }>> {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify stage access
  const accessCheck = await verifyStageAccess(supabase, stageId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  // Validate and prepare cells
  const validatedCells: Array<{
    stage_id: string
    layer_type: JourneyLayerType
    content: string | null
    emotion_score: number | null
    channel_type: string | null
  }> = []

  for (const cell of cells) {
    const layerResult = validateJourneyLayerType(cell.layer_type)
    if (!layerResult.success) {
      return { success: false, error: layerResult.error, code: ActionErrorCode.VALIDATION_ERROR }
    }

    const contentResult = validateCellContent(cell.content)
    if (!contentResult.success) {
      return { success: false, error: contentResult.error, code: ActionErrorCode.VALIDATION_ERROR }
    }

    const emotionResult = validateEmotionScore(cell.emotion_score)
    if (!emotionResult.success) {
      return { success: false, error: emotionResult.error, code: ActionErrorCode.VALIDATION_ERROR }
    }

    const channelResult = validateChannelType(cell.channel_type)
    if (!channelResult.success) {
      return { success: false, error: channelResult.error, code: ActionErrorCode.VALIDATION_ERROR }
    }

    validatedCells.push({
      stage_id: stageId,
      layer_type: layerResult.data,
      content: contentResult.data,
      emotion_score: emotionResult.data,
      channel_type: channelResult.data,
    })
  }

  // Upsert all cells
  // Note: Type assertion needed until Supabase types are regenerated with journey_cells table
  const { error } = await (supabase
    .from('journey_cells' as any)
    .upsert(validatedCells, { onConflict: 'stage_id,layer_type' }) as any)

  if (error) {
    console.error('[bulkCreateCellsAction] Error:', error.code, error.message)
    return { success: false, error: 'Failed to create cells', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateJourneyCanvas(accessCheck.journeyId)
  return { success: true, data: { count: validatedCells.length } }
}

/**
 * Create multiple stages at once (for AI generation).
 */
export async function bulkCreateStagesAction(
  journeyId: string,
  stages: Array<{ name: string; description?: string }>
): Promise<ActionResult<{ count: number; ids: string[] }>> {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify journey access
  const accessCheck = await verifyJourneyAccess(supabase, journeyId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  // Get current max sequence
  const { data: existingStages } = await supabase
    .from('journey_stages')
    .select('sequence')
    .eq('user_journey_id', journeyId)
    .order('sequence', { ascending: false })
    .limit(1)

  let nextSequence =
    existingStages && existingStages.length > 0
      ? existingStages[0].sequence + 1
      : 0

  // Validate and prepare stages
  const validatedStages: Array<{
    user_journey_id: string
    name: string
    description: string | null
    sequence: number
  }> = []

  for (const stage of stages) {
    const nameResult = validateStageName(stage.name)
    if (!nameResult.success) {
      return { success: false, error: nameResult.error, code: ActionErrorCode.VALIDATION_ERROR }
    }

    const descResult = validateStageDescription(stage.description)
    if (!descResult.success) {
      return { success: false, error: descResult.error, code: ActionErrorCode.VALIDATION_ERROR }
    }

    validatedStages.push({
      user_journey_id: journeyId,
      name: nameResult.data,
      description: descResult.data,
      sequence: nextSequence++,
    })
  }

  // Insert all stages
  const { data: insertedStages, error } = await supabase
    .from('journey_stages')
    .insert(validatedStages)
    .select('id')

  if (error) {
    console.error('[bulkCreateStagesAction] Error:', error.code, error.message)
    return { success: false, error: 'Failed to create stages', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateJourneyCanvas(journeyId)
  return {
    success: true,
    data: {
      count: insertedStages?.length || 0,
      ids: insertedStages?.map((s) => s.id) || [],
    },
  }
}
