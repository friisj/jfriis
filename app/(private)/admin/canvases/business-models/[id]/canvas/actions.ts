'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  validateBlockId,
  validateItemContent,
  validateItemPriority,
  createNewItem,
  normalizeBlock,
  type BMCBlockId,
  type BMCItem,
  type BMCBlock,
  type ItemPriority,
} from '@/lib/boundary-objects/bmc-canvas'

// ============================================================================
// Error Codes (MEDIUM 11: Standardized error codes)
// ============================================================================

export enum ActionErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
}

// ============================================================================
// Types
// ============================================================================

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: ActionErrorCode }

interface ItemData {
  content: string
  priority?: ItemPriority | null
}

// ============================================================================
// Helper Functions
// ============================================================================

function revalidateCanvasPage(canvasId: string) {
  revalidatePath(`/admin/canvases/business-models/${canvasId}/canvas`)
  revalidatePath(`/admin/canvases/business-models/${canvasId}`)
}

// ============================================================================
// Authorization Helpers
// ============================================================================

/**
 * Verify authenticated user has access to the canvas.
 * CRITICAL 1: RLS policies automatically filter queries based on authenticated user.
 * If query returns no data, user doesn't have access.
 */
async function verifyCanvasAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  canvasId: string
): Promise<{ success: true; canvasId: string } | { success: false; error: string; code: ActionErrorCode }> {
  // RLS policies will filter this query - if no result, user lacks access
  const { data, error } = await supabase
    .from('business_model_canvases')
    .select('id, status')
    .eq('id', canvasId)
    .single()

  if (error) {
    // PGRST116 = no rows returned (RLS blocked or doesn't exist)
    if (error.code === 'PGRST116') {
      return { success: false, error: 'Canvas not found or access denied', code: ActionErrorCode.ACCESS_DENIED }
    }
    console.error('[verifyCanvasAccess] Database error:', error)
    return { success: false, error: 'Failed to verify access', code: ActionErrorCode.DATABASE_ERROR }
  }

  if (!data) {
    return { success: false, error: 'Canvas not found or access denied', code: ActionErrorCode.ACCESS_DENIED }
  }

  return { success: true, canvasId: data.id }
}

// ============================================================================
// Block Operations
// ============================================================================

/**
 * Get block data from canvas with updated_at for optimistic locking
 * HIGH 7: Uses normalizeBlock for runtime validation
 */
async function getBlockData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  canvasId: string,
  blockId: BMCBlockId
): Promise<{ block: BMCBlock; updatedAt: string } | null> {
  const { data, error } = await supabase
    .from('business_model_canvases')
    .select(`${blockId}, updated_at`)
    .eq('id', canvasId)
    .single()

  if (error || !data) return null

  const blockData = data[blockId as keyof typeof data]
  // Use normalizeBlock for proper validation (HIGH 7)
  const block = normalizeBlock(blockData)

  return { block, updatedAt: data.updated_at }
}

/**
 * Update entire block with optimistic locking
 * CRITICAL 3: Uses updated_at check to prevent race conditions
 */
async function updateBlock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  canvasId: string,
  blockId: BMCBlockId,
  block: BMCBlock,
  expectedUpdatedAt: string
): Promise<{ error: Error | null; conflict: boolean }> {
  // Use optimistic locking - only update if updated_at matches
  const { data, error } = await supabase
    .from('business_model_canvases')
    .update({
      [blockId]: block,
      updated_at: new Date().toISOString(),
    })
    .eq('id', canvasId)
    .eq('updated_at', expectedUpdatedAt)
    .select('id')
    .single()

  if (error) {
    // PGRST116 = no rows updated (likely concurrent modification)
    if (error.code === 'PGRST116') {
      return { error: new Error('Canvas was modified. Please refresh and try again.'), conflict: true }
    }
    return { error: new Error(error.message), conflict: false }
  }

  if (!data) {
    return { error: new Error('Canvas was modified. Please refresh and try again.'), conflict: true }
  }

  return { error: null, conflict: false }
}

// ============================================================================
// Item Actions
// ============================================================================

/**
 * Add a new item to a block
 * CRITICAL 2: Uses collision detection for UUID generation
 * CRITICAL 3: Uses optimistic locking for race condition prevention
 */
export async function addItemAction(
  canvasId: string,
  blockId: string,
  content: string,
  priority?: string
): Promise<ActionResult<{ itemId: string }>> {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify access
  const accessCheck = await verifyCanvasAccess(supabase, canvasId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: accessCheck.code }
  }

  // Validate block ID
  const blockResult = validateBlockId(blockId)
  if (!blockResult.success) {
    return { success: false, error: blockResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate content (includes XSS prevention - CRITICAL 4)
  const contentResult = validateItemContent(content)
  if (!contentResult.success) {
    return { success: false, error: contentResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate priority
  const priorityResult = validateItemPriority(priority)
  if (!priorityResult.success) {
    return { success: false, error: priorityResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Get current block with timestamp for optimistic locking
  const blockData = await getBlockData(supabase, canvasId, blockResult.data)
  if (!blockData) {
    return { success: false, error: 'Failed to load block', code: ActionErrorCode.DATABASE_ERROR }
  }

  const { block, updatedAt } = blockData

  // CRITICAL 2: Create new item with collision detection
  const existingIds = new Set(block.items.map((item) => item.id))
  const newItem = createNewItem(contentResult.data, priorityResult.data || undefined, existingIds)

  // Update block with new item
  const updatedBlock: BMCBlock = {
    ...block,
    items: [...block.items, newItem],
  }

  // CRITICAL 3: Use optimistic locking
  const { error, conflict } = await updateBlock(supabase, canvasId, blockResult.data, updatedBlock, updatedAt)
  if (error) {
    console.error('[addItemAction] Database error:', error.message)
    if (conflict) {
      return { success: false, error: error.message, code: ActionErrorCode.CONFLICT }
    }
    return { success: false, error: 'Failed to add item', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateCanvasPage(canvasId)
  return { success: true, data: { itemId: newItem.id } }
}

/**
 * Update an existing item
 * CRITICAL 3: Uses optimistic locking for race condition prevention
 */
export async function updateItemAction(
  canvasId: string,
  blockId: string,
  itemId: string,
  data: ItemData
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify access
  const accessCheck = await verifyCanvasAccess(supabase, canvasId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: accessCheck.code }
  }

  // Validate block ID
  const blockResult = validateBlockId(blockId)
  if (!blockResult.success) {
    return { success: false, error: blockResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate content (includes XSS prevention - CRITICAL 4)
  const contentResult = validateItemContent(data.content)
  if (!contentResult.success) {
    return { success: false, error: contentResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate priority
  const priorityResult = validateItemPriority(data.priority)
  if (!priorityResult.success) {
    return { success: false, error: priorityResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Get current block with timestamp for optimistic locking
  const blockData = await getBlockData(supabase, canvasId, blockResult.data)
  if (!blockData) {
    return { success: false, error: 'Failed to load block', code: ActionErrorCode.DATABASE_ERROR }
  }

  const { block, updatedAt } = blockData

  // Find and update item
  const itemIndex = block.items.findIndex((item) => item.id === itemId)
  if (itemIndex === -1) {
    return { success: false, error: 'Item not found', code: ActionErrorCode.NOT_FOUND }
  }

  const updatedItems = [...block.items]
  updatedItems[itemIndex] = {
    ...updatedItems[itemIndex],
    content: contentResult.data,
    priority: priorityResult.data || undefined,
  }

  const updatedBlock: BMCBlock = {
    ...block,
    items: updatedItems,
  }

  // CRITICAL 3: Use optimistic locking
  const { error, conflict } = await updateBlock(supabase, canvasId, blockResult.data, updatedBlock, updatedAt)
  if (error) {
    console.error('[updateItemAction] Database error:', error.message)
    if (conflict) {
      return { success: false, error: error.message, code: ActionErrorCode.CONFLICT }
    }
    return { success: false, error: 'Failed to update item', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateCanvasPage(canvasId)
  return { success: true, data: undefined }
}

/**
 * Delete an item from a block
 * CRITICAL 3: Uses optimistic locking for race condition prevention
 */
export async function deleteItemAction(
  canvasId: string,
  blockId: string,
  itemId: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify access
  const accessCheck = await verifyCanvasAccess(supabase, canvasId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: accessCheck.code }
  }

  // Validate block ID
  const blockResult = validateBlockId(blockId)
  if (!blockResult.success) {
    return { success: false, error: blockResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Get current block with timestamp for optimistic locking
  const blockData = await getBlockData(supabase, canvasId, blockResult.data)
  if (!blockData) {
    return { success: false, error: 'Failed to load block', code: ActionErrorCode.DATABASE_ERROR }
  }

  const { block, updatedAt } = blockData

  // Filter out the item
  const updatedItems = block.items.filter((item) => item.id !== itemId)

  if (updatedItems.length === block.items.length) {
    return { success: false, error: 'Item not found', code: ActionErrorCode.NOT_FOUND }
  }

  const updatedBlock: BMCBlock = {
    ...block,
    items: updatedItems,
  }

  // CRITICAL 3: Use optimistic locking
  const { error, conflict } = await updateBlock(supabase, canvasId, blockResult.data, updatedBlock, updatedAt)
  if (error) {
    console.error('[deleteItemAction] Database error:', error.message)
    if (conflict) {
      return { success: false, error: error.message, code: ActionErrorCode.CONFLICT }
    }
    return { success: false, error: 'Failed to delete item', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateCanvasPage(canvasId)
  return { success: true, data: undefined }
}

/**
 * Reorder items within a block
 * CRITICAL 3: Uses optimistic locking for race condition prevention
 */
export async function reorderItemsAction(
  canvasId: string,
  blockId: string,
  itemIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify access
  const accessCheck = await verifyCanvasAccess(supabase, canvasId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: accessCheck.code }
  }

  // Validate block ID
  const blockResult = validateBlockId(blockId)
  if (!blockResult.success) {
    return { success: false, error: blockResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Get current block with timestamp for optimistic locking
  const blockData = await getBlockData(supabase, canvasId, blockResult.data)
  if (!blockData) {
    return { success: false, error: 'Failed to load block', code: ActionErrorCode.DATABASE_ERROR }
  }

  const { block, updatedAt } = blockData

  // Reorder items based on provided IDs
  const itemMap = new Map(block.items.map((item) => [item.id, item]))
  const reorderedItems: BMCItem[] = []

  for (const itemId of itemIds) {
    const item = itemMap.get(itemId)
    if (item) {
      reorderedItems.push(item)
      itemMap.delete(itemId)
    }
  }

  // Add any items not in the provided order (shouldn't happen, but safe)
  for (const item of itemMap.values()) {
    reorderedItems.push(item)
  }

  const updatedBlock: BMCBlock = {
    ...block,
    items: reorderedItems,
  }

  // CRITICAL 3: Use optimistic locking
  const { error, conflict } = await updateBlock(supabase, canvasId, blockResult.data, updatedBlock, updatedAt)
  if (error) {
    console.error('[reorderItemsAction] Database error:', error.message)
    if (conflict) {
      return { success: false, error: error.message, code: ActionErrorCode.CONFLICT }
    }
    return { success: false, error: 'Failed to reorder items', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateCanvasPage(canvasId)
  return { success: true, data: undefined }
}

// ============================================================================
// Bulk Actions (for AI generation)
// ============================================================================

/**
 * Add multiple items to a block at once
 * CRITICAL 2: Uses collision detection for UUID generation
 * CRITICAL 3: Uses optimistic locking for race condition prevention
 */
export async function bulkAddItemsAction(
  canvasId: string,
  blockId: string,
  items: Array<{ content: string; priority?: string }>
): Promise<ActionResult<{ count: number }>> {
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify access
  const accessCheck = await verifyCanvasAccess(supabase, canvasId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: accessCheck.code }
  }

  // Validate block ID
  const blockResult = validateBlockId(blockId)
  if (!blockResult.success) {
    return { success: false, error: blockResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Get current block with timestamp for optimistic locking
  const blockData = await getBlockData(supabase, canvasId, blockResult.data)
  if (!blockData) {
    return { success: false, error: 'Failed to load block', code: ActionErrorCode.DATABASE_ERROR }
  }

  const { block, updatedAt } = blockData

  // CRITICAL 2: Build set of existing IDs for collision detection
  const existingIds = new Set(block.items.map((item) => item.id))

  // Validate all items and create with collision detection
  const validatedItems: BMCItem[] = []
  for (const item of items) {
    // Validate content (includes XSS prevention - CRITICAL 4)
    const contentResult = validateItemContent(item.content)
    if (!contentResult.success) {
      return { success: false, error: contentResult.error, code: ActionErrorCode.VALIDATION_ERROR }
    }

    const priorityResult = validateItemPriority(item.priority)
    if (!priorityResult.success) {
      return { success: false, error: priorityResult.error, code: ActionErrorCode.VALIDATION_ERROR }
    }

    // Create item with collision detection
    const newItem = createNewItem(contentResult.data, priorityResult.data || undefined, existingIds)
    validatedItems.push(newItem)
    // Add new ID to set to prevent collision with other items in this batch
    existingIds.add(newItem.id)
  }

  // Add all items
  const updatedBlock: BMCBlock = {
    ...block,
    items: [...block.items, ...validatedItems],
  }

  // CRITICAL 3: Use optimistic locking
  const { error, conflict } = await updateBlock(supabase, canvasId, blockResult.data, updatedBlock, updatedAt)
  if (error) {
    console.error('[bulkAddItemsAction] Database error:', error.message)
    if (conflict) {
      return { success: false, error: error.message, code: ActionErrorCode.CONFLICT }
    }
    return { success: false, error: 'Failed to add items', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateCanvasPage(canvasId)
  return { success: true, data: { count: validatedItems.length } }
}
