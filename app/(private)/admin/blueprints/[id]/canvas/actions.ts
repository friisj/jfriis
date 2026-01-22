'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  validateCellContent,
  validateStepName,
  validateStepDescription,
  validateLayerType,
  validateActors,
  validateDuration,
  validateCostImplication,
  validateFailureRisk,
  type LayerType,
  type CostImplication,
  type FailureRisk,
} from '@/lib/boundary-objects/blueprint-cells'
import { ActionErrorCode, type ActionResult } from '@/lib/types/action-result'
import { logActionError, getDatabaseErrorMessage } from '@/lib/logging'

interface CellUpdateData {
  content?: string | null
  actors?: string | null
  duration_estimate?: string | null
  // Accept strings for cost/risk since validation handles type coercion
  cost_implication?: string | null
  failure_risk?: string | null
  // For optimistic locking - if provided, update will fail if cell was modified
  expectedUpdatedAt?: string
}

interface StepUpdateData {
  name?: string
  description?: string | null
}

// ============================================================================
// Authorization Helpers
// ============================================================================

async function verifyBlueprintAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  blueprintId: string
): Promise<{ success: true; blueprintId: string } | { success: false; error: string }> {
  const { data, error } = await supabase
    .from('service_blueprints')
    .select('id')
    .eq('id', blueprintId)
    .single()

  if (error || !data) {
    return { success: false, error: 'Blueprint not found or access denied' }
  }
  return { success: true, blueprintId: data.id }
}

async function verifyStepAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  stepId: string
): Promise<{ success: true; blueprintId: string } | { success: false; error: string }> {
  const { data, error } = await supabase
    .from('blueprint_steps')
    .select('id, service_blueprint_id')
    .eq('id', stepId)
    .single()

  if (error || !data) {
    return { success: false, error: 'Step not found or access denied' }
  }
  return { success: true, blueprintId: data.service_blueprint_id }
}

async function verifyCellAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cellId: string
): Promise<{ success: true; blueprintId: string } | { success: false; error: string }> {
  // Note: Type assertion needed until Supabase types are regenerated with blueprint_cells table
  const { data, error } = await (supabase
    .from('blueprint_cells' as any)
    .select('id, step:blueprint_steps!inner(service_blueprint_id)')
    .eq('id', cellId)
    .single() as any)

  if (error || !data) {
    return { success: false, error: 'Cell not found or access denied' }
  }

  // Validate the structure before accessing
  const step = data.step
  if (!step || typeof step !== 'object' || !('service_blueprint_id' in step)) {
    return { success: false, error: 'Invalid cell data structure' }
  }

  const typedStep = step as { service_blueprint_id: string }
  return { success: true, blueprintId: typedStep.service_blueprint_id }
}

// ============================================================================
// Revalidation Helper
// ============================================================================

function revalidateBlueprintCanvas(blueprintId: string) {
  revalidatePath(`/admin/blueprints/${blueprintId}/canvas`, 'page')
  revalidatePath(`/admin/blueprints/${blueprintId}`, 'layout')
}

// ============================================================================
// Cell Actions
// ============================================================================

/**
 * Create or update a cell (upsert for UNIQUE constraint handling)
 */
export async function upsertCellAction(
  stepId: string,
  layerType: string,
  data: CellUpdateData
): Promise<ActionResult<{ cellId: string }>> {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify step access
  const accessCheck = await verifyStepAccess(supabase, stepId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  // Validate layer type
  const layerResult = validateLayerType(layerType)
  if (!layerResult.success) {
    return { success: false, error: layerResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate content
  const contentResult = validateCellContent(data.content)
  if (!contentResult.success) {
    return { success: false, error: contentResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate actors
  const actorsResult = validateActors(data.actors)
  if (!actorsResult.success) {
    return { success: false, error: actorsResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate duration
  const durationResult = validateDuration(data.duration_estimate)
  if (!durationResult.success) {
    return { success: false, error: durationResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate cost implication
  const costResult = validateCostImplication(data.cost_implication)
  if (!costResult.success) {
    return { success: false, error: costResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate failure risk
  const riskResult = validateFailureRisk(data.failure_risk)
  if (!riskResult.success) {
    return { success: false, error: riskResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Upsert cell (create if not exists, update if exists)
  // Note: Type assertion needed until Supabase types are regenerated with blueprint_cells table
  const { data: cell, error } = await (supabase
    .from('blueprint_cells' as any)
    .upsert(
      {
        step_id: stepId,
        layer_type: layerResult.data,
        content: contentResult.data,
        actors: actorsResult.data,
        duration_estimate: durationResult.data,
        cost_implication: costResult.data,
        failure_risk: riskResult.data,
      },
      { onConflict: 'step_id,layer_type' }
    )
    .select('id')
    .single() as any)

  if (error) {
    logActionError({ action: 'upsertCellAction', error, context: { stepId, layerType } })
    const message = getDatabaseErrorMessage(error.code, 'Failed to save cell. Please try again.')
    return { success: false, error: message, code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateBlueprintCanvas(accessCheck.blueprintId)
  return { success: true, data: { cellId: cell.id } }
}

/**
 * Update an existing cell.
 * Supports optimistic locking via expectedUpdatedAt parameter.
 */
export async function updateCellAction(
  cellId: string,
  data: CellUpdateData
): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify cell access
  const accessCheck = await verifyCellAccess(supabase, cellId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  // Validate all fields
  const contentResult = validateCellContent(data.content)
  if (!contentResult.success) {
    return { success: false, error: contentResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  const actorsResult = validateActors(data.actors)
  if (!actorsResult.success) {
    return { success: false, error: actorsResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  const durationResult = validateDuration(data.duration_estimate)
  if (!durationResult.success) {
    return { success: false, error: durationResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  const costResult = validateCostImplication(data.cost_implication)
  if (!costResult.success) {
    return { success: false, error: costResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  const riskResult = validateFailureRisk(data.failure_risk)
  if (!riskResult.success) {
    return { success: false, error: riskResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Build query with optional optimistic locking
  // Note: Type assertion needed until Supabase types are regenerated with blueprint_cells table
  let query = (supabase
    .from('blueprint_cells' as any)
    .update({
      content: contentResult.data,
      actors: actorsResult.data,
      duration_estimate: durationResult.data,
      cost_implication: costResult.data,
      failure_risk: riskResult.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cellId) as any)

  // Add optimistic locking constraint if expectedUpdatedAt is provided
  if (data.expectedUpdatedAt) {
    query = query.eq('updated_at', data.expectedUpdatedAt)
  }

  // Use select to check if row was updated
  const { data: updated, error } = await query.select('id').maybeSingle()

  if (error) {
    logActionError({ action: 'updateCellAction', error, context: { cellId } })
    const message = getDatabaseErrorMessage(error.code, 'Failed to update cell. Please try again.')
    return { success: false, error: message, code: ActionErrorCode.DATABASE_ERROR }
  }

  // If expectedUpdatedAt was provided but no row matched, it means concurrent modification
  if (data.expectedUpdatedAt && !updated) {
    return {
      success: false,
      error: 'Cell was modified by another user. Please refresh and try again.',
      code: ActionErrorCode.CONFLICT,
    }
  }

  revalidateBlueprintCanvas(accessCheck.blueprintId)
  return { success: true, data: undefined }
}

/**
 * Delete a cell
 */
export async function deleteCellAction(cellId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify cell access
  const accessCheck = await verifyCellAccess(supabase, cellId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  // Note: Type assertion needed until Supabase types are regenerated with blueprint_cells table
  const { error } = await (supabase
    .from('blueprint_cells' as any)
    .delete()
    .eq('id', cellId) as any)

  if (error) {
    console.error('[deleteCellAction] Database error:', error.code, error.message)
    return { success: false, error: 'Failed to delete cell', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateBlueprintCanvas(accessCheck.blueprintId)
  return { success: true, data: undefined }
}

// ============================================================================
// Step Actions
// ============================================================================

/**
 * Create a new step
 */
export async function createStepAction(
  blueprintId: string,
  name: string,
  sequence: number
): Promise<ActionResult<{ stepId: string }>> {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify blueprint access
  const accessCheck = await verifyBlueprintAccess(supabase, blueprintId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  // Validate name
  const nameResult = validateStepName(name)
  if (!nameResult.success) {
    return { success: false, error: nameResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  const { data: step, error } = await supabase
    .from('blueprint_steps')
    .insert({
      service_blueprint_id: blueprintId,
      name: nameResult.data,
      sequence,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createStepAction] Database error:', error.code, error.message)
    if (error.code === '23505') {
      return { success: false, error: 'A step with this position already exists', code: ActionErrorCode.CONFLICT }
    }
    return { success: false, error: 'Failed to create step', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateBlueprintCanvas(blueprintId)
  return { success: true, data: { stepId: step.id } }
}

/**
 * Update a step
 */
export async function updateStepAction(
  stepId: string,
  data: StepUpdateData
): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify step access
  const accessCheck = await verifyStepAccess(supabase, stepId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  // Build update data with validation
  const updateData: Record<string, unknown> = {}

  if (data.name !== undefined) {
    const nameResult = validateStepName(data.name)
    if (!nameResult.success) {
      return { success: false, error: nameResult.error, code: ActionErrorCode.VALIDATION_ERROR }
    }
    updateData.name = nameResult.data
  }

  if (data.description !== undefined) {
    const descResult = validateStepDescription(data.description)
    if (!descResult.success) {
      return { success: false, error: descResult.error, code: ActionErrorCode.VALIDATION_ERROR }
    }
    updateData.description = descResult.data
  }

  if (Object.keys(updateData).length === 0) {
    return { success: true, data: undefined }
  }

  const { error } = await supabase
    .from('blueprint_steps')
    .update(updateData)
    .eq('id', stepId)

  if (error) {
    console.error('[updateStepAction] Database error:', error.code, error.message)
    return { success: false, error: 'Failed to update step', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateBlueprintCanvas(accessCheck.blueprintId)
  return { success: true, data: undefined }
}

/**
 * Delete a step (cascades to cells)
 */
export async function deleteStepAction(stepId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify step access
  const accessCheck = await verifyStepAccess(supabase, stepId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  const { error } = await supabase
    .from('blueprint_steps')
    .delete()
    .eq('id', stepId)

  if (error) {
    console.error('[deleteStepAction] Database error:', error.code, error.message)
    return { success: false, error: 'Failed to delete step', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateBlueprintCanvas(accessCheck.blueprintId)
  return { success: true, data: undefined }
}

/**
 * Reorder steps atomically using database function.
 * Uses reorder_blueprint_steps() for transaction isolation.
 */
export async function reorderStepsAction(
  blueprintId: string,
  stepIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify blueprint access
  const accessCheck = await verifyBlueprintAccess(supabase, blueprintId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  if (stepIds.length === 0) {
    return { success: true, data: undefined }
  }

  // Use atomic database function for reordering
  // Note: Type cast needed until Supabase types are regenerated with the new function
  const { error } = await (supabase.rpc as any)(
    'reorder_blueprint_steps',
    {
      p_blueprint_id: blueprintId,
      p_step_ids: stepIds,
    }
  )

  if (error) {
    console.error('[reorderStepsAction] RPC error:', error.code, error.message)

    // Handle specific error cases
    if (error.code === '23503' || error.message?.includes('do not belong')) {
      return { success: false, error: 'Some steps do not belong to this blueprint', code: ActionErrorCode.VALIDATION_ERROR }
    }

    return { success: false, error: 'Failed to reorder steps', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateBlueprintCanvas(blueprintId)
  return { success: true, data: undefined }
}

/**
 * Move a step left or right.
 * Uses reorderStepsAction internally for atomic operation.
 */
export async function moveStepAction(
  stepId: string,
  direction: 'left' | 'right'
): Promise<ActionResult> {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Get step with its blueprint and sequence
  const { data: step, error: stepError } = await supabase
    .from('blueprint_steps')
    .select('id, service_blueprint_id, sequence')
    .eq('id', stepId)
    .single()

  if (stepError || !step) {
    return { success: false, error: 'Step not found or access denied', code: ActionErrorCode.NOT_FOUND }
  }

  // Get all steps for this blueprint
  const { data: allSteps, error: allError } = await supabase
    .from('blueprint_steps')
    .select('id, sequence')
    .eq('service_blueprint_id', step.service_blueprint_id)
    .order('sequence', { ascending: true })

  if (allError || !allSteps) {
    return { success: false, error: 'Failed to fetch steps', code: ActionErrorCode.DATABASE_ERROR }
  }

  // Find current index and calculate new index
  const currentIndex = allSteps.findIndex((s) => s.id === stepId)
  const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1

  if (newIndex < 0 || newIndex >= allSteps.length) {
    return { success: false, error: `Cannot move step ${direction}`, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Create new order by swapping positions
  const newOrder = [...allSteps]
  ;[newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]]

  // Use atomic reorder action
  return reorderStepsAction(
    step.service_blueprint_id,
    newOrder.map((s) => s.id)
  )
}

// ============================================================================
// Bulk Actions (for AI generation)
// ============================================================================

/**
 * Bulk create steps
 */
export async function bulkCreateStepsAction(
  blueprintId: string,
  steps: Array<{ name: string; description?: string }>
): Promise<ActionResult<{ count: number }>> {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify blueprint access
  const accessCheck = await verifyBlueprintAccess(supabase, blueprintId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  if (steps.length === 0) {
    return { success: true, data: { count: 0 } }
  }

  // Validate all items before any database operation
  const validationErrors: string[] = []
  const validatedSteps: Array<{ name: string; description: string | null }> = []

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]

    const nameResult = validateStepName(step.name)
    if (!nameResult.success) {
      validationErrors.push(`Step ${i + 1}: ${nameResult.error}`)
      continue
    }

    const descResult = validateStepDescription(step.description)
    if (!descResult.success) {
      validationErrors.push(`Step ${i + 1}: ${descResult.error}`)
      continue
    }

    validatedSteps.push({
      name: nameResult.data,
      description: descResult.data,
    })
  }

  if (validationErrors.length > 0) {
    return {
      success: false,
      error: validationErrors.join('; '),
      code: ActionErrorCode.VALIDATION_ERROR,
    }
  }

  // Get current max sequence
  const { data: existing } = await supabase
    .from('blueprint_steps')
    .select('sequence')
    .eq('service_blueprint_id', blueprintId)
    .order('sequence', { ascending: false })
    .limit(1)

  const startSequence = (existing?.[0]?.sequence ?? -1) + 1

  // Prepare steps for insert
  const stepsToInsert = validatedSteps.map((step, index) => ({
    service_blueprint_id: blueprintId,
    name: step.name,
    description: step.description,
    sequence: startSequence + index,
  }))

  const { error } = await supabase.from('blueprint_steps').insert(stepsToInsert)

  if (error) {
    console.error('[bulkCreateStepsAction] Database error:', error.code, error.message)
    return { success: false, error: 'Failed to create steps', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateBlueprintCanvas(blueprintId)
  return { success: true, data: { count: validatedSteps.length } }
}

/**
 * Bulk create cells for a step
 */
export async function bulkCreateCellsAction(
  stepId: string,
  cells: Array<{ layer_type: string; content: string }>
): Promise<ActionResult<{ count: number }>> {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify step access
  const accessCheck = await verifyStepAccess(supabase, stepId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: ActionErrorCode.ACCESS_DENIED }
  }

  if (cells.length === 0) {
    return { success: true, data: { count: 0 } }
  }

  // Validate all items before any database operation
  const validationErrors: string[] = []
  const validatedCells: Array<{ layer_type: LayerType; content: string | null }> = []

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]

    const layerResult = validateLayerType(cell.layer_type)
    if (!layerResult.success) {
      validationErrors.push(`Cell ${i + 1}: ${layerResult.error}`)
      continue
    }

    const contentResult = validateCellContent(cell.content)
    if (!contentResult.success) {
      validationErrors.push(`Cell ${i + 1}: ${contentResult.error}`)
      continue
    }

    validatedCells.push({
      layer_type: layerResult.data,
      content: contentResult.data,
    })
  }

  if (validationErrors.length > 0) {
    return {
      success: false,
      error: validationErrors.join('; '),
      code: ActionErrorCode.VALIDATION_ERROR,
    }
  }

  // Use upsert to handle existing cells
  const cellsToUpsert = validatedCells.map((cell) => ({
    step_id: stepId,
    layer_type: cell.layer_type,
    content: cell.content,
  }))

  // Note: Type assertion needed until Supabase types are regenerated with blueprint_cells table
  const { error } = await (supabase
    .from('blueprint_cells' as any)
    .upsert(cellsToUpsert, { onConflict: 'step_id,layer_type' }) as any)

  if (error) {
    console.error('[bulkCreateCellsAction] Database error:', error.code, error.message)
    return { success: false, error: 'Failed to create cells', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateBlueprintCanvas(accessCheck.blueprintId)
  return { success: true, data: { count: validatedCells.length } }
}
