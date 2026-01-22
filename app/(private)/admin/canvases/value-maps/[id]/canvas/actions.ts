'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  validateValueMapBlockId,
  validateItemContent,
  validateEvidence,
  validateProductType,
  validateEffectiveness,
  createNewProductItem,
  createNewPainRelieverItem,
  createNewGainCreatorItem,
  normalizeProductsBlock,
  normalizePainRelieversBlock,
  normalizeGainCreatorsBlock,
  type ValueMapBlockId,
  type ValueMapItem,
  type ValueMapBlock,
  type ProductType,
  type EffectivenessLevel,
} from '@/lib/boundary-objects/value-map-canvas'
import { ActionErrorCode, type ActionResult } from '@/lib/types/action-result'

interface ProductItemData {
  content: string
  type?: ProductType | null
  evidence?: string | null
}

interface PainRelieverItemData {
  content: string
  effectiveness?: EffectivenessLevel | null
  linked_pain_id?: string | null
  evidence?: string | null
}

interface GainCreatorItemData {
  content: string
  effectiveness?: EffectivenessLevel | null
  linked_gain_id?: string | null
  evidence?: string | null
}

type ItemData = ProductItemData | PainRelieverItemData | GainCreatorItemData

// ============================================================================
// Helper Functions
// ============================================================================

function revalidateCanvasPage(valueMapId: string) {
  revalidatePath(`/admin/canvases/value-maps/${valueMapId}/canvas`)
  revalidatePath(`/admin/canvases/value-maps/${valueMapId}`)
}

// ============================================================================
// Authorization Helpers
// ============================================================================

async function verifyValueMapAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  valueMapId: string
): Promise<{ success: true; valueMapId: string } | { success: false; error: string; code: ActionErrorCode }> {
  const { data, error } = await supabase
    .from('value_maps')
    .select('id, status')
    .eq('id', valueMapId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: 'Value Map not found or access denied', code: ActionErrorCode.ACCESS_DENIED }
    }
    console.error('[verifyValueMapAccess] Database error:', error)
    return { success: false, error: 'Failed to verify access', code: ActionErrorCode.DATABASE_ERROR }
  }

  if (!data) {
    return { success: false, error: 'Value Map not found or access denied', code: ActionErrorCode.ACCESS_DENIED }
  }

  return { success: true, valueMapId: data.id }
}

// ============================================================================
// Block Operations
// ============================================================================

async function getBlockData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  valueMapId: string,
  blockId: ValueMapBlockId
): Promise<{ block: ValueMapBlock<ValueMapItem>; updatedAt: string } | null> {
  const { data, error } = await supabase
    .from('value_maps')
    .select(`${blockId}, updated_at`)
    .eq('id', valueMapId)
    .single()

  if (error || !data) return null

  const blockData = data[blockId as keyof typeof data]

  // Normalize block based on type
  let block: ValueMapBlock<ValueMapItem>
  switch (blockId) {
    case 'products_services':
      block = normalizeProductsBlock(blockData)
      break
    case 'pain_relievers':
      block = normalizePainRelieversBlock(blockData)
      break
    case 'gain_creators':
      block = normalizeGainCreatorsBlock(blockData)
      break
    default:
      block = { items: [] }
  }

  return { block, updatedAt: data.updated_at }
}

async function updateBlock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  valueMapId: string,
  blockId: ValueMapBlockId,
  block: ValueMapBlock<ValueMapItem>,
  expectedUpdatedAt: string
): Promise<{ error: Error | null; conflict: boolean }> {
  const { data, error } = await supabase
    .from('value_maps')
    .update({
      [blockId]: block,
      updated_at: new Date().toISOString(),
    })
    .eq('id', valueMapId)
    .eq('updated_at', expectedUpdatedAt)
    .select('id')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { error: new Error('Value Map was modified. Please refresh and try again.'), conflict: true }
    }
    return { error: new Error(error.message), conflict: false }
  }

  if (!data) {
    return { error: new Error('Value Map was modified. Please refresh and try again.'), conflict: true }
  }

  return { error: null, conflict: false }
}

// ============================================================================
// Item Actions
// ============================================================================

export async function addItemAction(
  valueMapId: string,
  blockId: string,
  content: string,
  options?: {
    type?: string
    effectiveness?: string
    linked_pain_id?: string
    linked_gain_id?: string
    evidence?: string
  }
): Promise<ActionResult<{ itemId: string }>> {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify access
  const accessCheck = await verifyValueMapAccess(supabase, valueMapId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: accessCheck.code }
  }

  // Validate block ID
  const blockResult = validateValueMapBlockId(blockId)
  if (!blockResult.success) {
    return { success: false, error: blockResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate content
  const contentResult = validateItemContent(content)
  if (!contentResult.success) {
    return { success: false, error: contentResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate evidence (optional field, but requires XSS protection)
  const evidenceResult = validateEvidence(options?.evidence)
  if (!evidenceResult.success) {
    return { success: false, error: evidenceResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Get current block with timestamp
  const blockData = await getBlockData(supabase, valueMapId, blockResult.data)
  if (!blockData) {
    return { success: false, error: 'Failed to load block', code: ActionErrorCode.DATABASE_ERROR }
  }

  const { block, updatedAt } = blockData

  // Create new item based on block type
  const existingIds = new Set(block.items.map((item) => item.id))
  let newItem: ValueMapItem

  switch (blockResult.data) {
    case 'products_services': {
      const typeResult = validateProductType(options?.type)
      if (!typeResult.success) {
        return { success: false, error: typeResult.error, code: ActionErrorCode.VALIDATION_ERROR }
      }
      newItem = createNewProductItem(contentResult.data, {
        type: typeResult.data || undefined,
        existingIds,
      })
      if (evidenceResult.data) {
        newItem.evidence = evidenceResult.data
      }
      break
    }
    case 'pain_relievers': {
      const effectivenessResult = validateEffectiveness(options?.effectiveness)
      if (!effectivenessResult.success) {
        return { success: false, error: effectivenessResult.error, code: ActionErrorCode.VALIDATION_ERROR }
      }
      newItem = createNewPainRelieverItem(contentResult.data, {
        effectiveness: effectivenessResult.data || undefined,
        linked_pain_id: options?.linked_pain_id,
        existingIds,
      })
      if (evidenceResult.data) {
        newItem.evidence = evidenceResult.data
      }
      break
    }
    case 'gain_creators': {
      const effectivenessResult = validateEffectiveness(options?.effectiveness)
      if (!effectivenessResult.success) {
        return { success: false, error: effectivenessResult.error, code: ActionErrorCode.VALIDATION_ERROR }
      }
      newItem = createNewGainCreatorItem(contentResult.data, {
        effectiveness: effectivenessResult.data || undefined,
        linked_gain_id: options?.linked_gain_id,
        existingIds,
      })
      if (evidenceResult.data) {
        newItem.evidence = evidenceResult.data
      }
      break
    }
    default:
      return { success: false, error: 'Invalid block type', code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Update block
  const updatedBlock: ValueMapBlock<ValueMapItem> = {
    ...block,
    items: [...block.items, newItem],
  }

  const { error, conflict } = await updateBlock(supabase, valueMapId, blockResult.data, updatedBlock, updatedAt)
  if (error) {
    console.error('[addItemAction] Database error:', error.message)
    if (conflict) {
      return { success: false, error: error.message, code: ActionErrorCode.CONFLICT }
    }
    return { success: false, error: 'Failed to add item', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateCanvasPage(valueMapId)
  return { success: true, data: { itemId: newItem.id } }
}

export async function updateItemAction(
  valueMapId: string,
  blockId: string,
  itemId: string,
  data: ItemData
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify access
  const accessCheck = await verifyValueMapAccess(supabase, valueMapId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: accessCheck.code }
  }

  // Validate block ID
  const blockResult = validateValueMapBlockId(blockId)
  if (!blockResult.success) {
    return { success: false, error: blockResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate content
  const contentResult = validateItemContent(data.content)
  if (!contentResult.success) {
    return { success: false, error: contentResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Validate evidence (optional field, but requires XSS protection)
  const evidenceResult = validateEvidence(data.evidence)
  if (!evidenceResult.success) {
    return { success: false, error: evidenceResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Get current block with timestamp
  const blockData = await getBlockData(supabase, valueMapId, blockResult.data)
  if (!blockData) {
    return { success: false, error: 'Failed to load block', code: ActionErrorCode.DATABASE_ERROR }
  }

  const { block, updatedAt } = blockData

  // Find item
  const itemIndex = block.items.findIndex((item) => item.id === itemId)
  if (itemIndex === -1) {
    return { success: false, error: 'Item not found', code: ActionErrorCode.NOT_FOUND }
  }

  // Update item based on block type
  const updatedItems = [...block.items]
  const existingItem = updatedItems[itemIndex]

  switch (blockResult.data) {
    case 'products_services': {
      const productData = data as ProductItemData
      const typeResult = validateProductType(productData.type)
      if (!typeResult.success) {
        return { success: false, error: typeResult.error, code: ActionErrorCode.VALIDATION_ERROR }
      }
      updatedItems[itemIndex] = {
        ...existingItem,
        content: contentResult.data,
        type: typeResult.data || undefined,
        evidence: evidenceResult.data || undefined,
      }
      break
    }
    case 'pain_relievers': {
      const relieverData = data as PainRelieverItemData
      const effectivenessResult = validateEffectiveness(relieverData.effectiveness)
      if (!effectivenessResult.success) {
        return { success: false, error: effectivenessResult.error, code: ActionErrorCode.VALIDATION_ERROR }
      }
      updatedItems[itemIndex] = {
        ...existingItem,
        content: contentResult.data,
        effectiveness: effectivenessResult.data || undefined,
        linked_pain_id: relieverData.linked_pain_id || undefined,
        evidence: evidenceResult.data || undefined,
      }
      break
    }
    case 'gain_creators': {
      const creatorData = data as GainCreatorItemData
      const effectivenessResult = validateEffectiveness(creatorData.effectiveness)
      if (!effectivenessResult.success) {
        return { success: false, error: effectivenessResult.error, code: ActionErrorCode.VALIDATION_ERROR }
      }
      updatedItems[itemIndex] = {
        ...existingItem,
        content: contentResult.data,
        effectiveness: effectivenessResult.data || undefined,
        linked_gain_id: creatorData.linked_gain_id || undefined,
        evidence: evidenceResult.data || undefined,
      }
      break
    }
  }

  const updatedBlock: ValueMapBlock<ValueMapItem> = {
    ...block,
    items: updatedItems,
  }

  const { error, conflict } = await updateBlock(supabase, valueMapId, blockResult.data, updatedBlock, updatedAt)
  if (error) {
    console.error('[updateItemAction] Database error:', error.message)
    if (conflict) {
      return { success: false, error: error.message, code: ActionErrorCode.CONFLICT }
    }
    return { success: false, error: 'Failed to update item', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateCanvasPage(valueMapId)
  return { success: true, data: undefined }
}

export async function deleteItemAction(
  valueMapId: string,
  blockId: string,
  itemId: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify access
  const accessCheck = await verifyValueMapAccess(supabase, valueMapId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: accessCheck.code }
  }

  // Validate block ID
  const blockResult = validateValueMapBlockId(blockId)
  if (!blockResult.success) {
    return { success: false, error: blockResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Get current block with timestamp
  const blockData = await getBlockData(supabase, valueMapId, blockResult.data)
  if (!blockData) {
    return { success: false, error: 'Failed to load block', code: ActionErrorCode.DATABASE_ERROR }
  }

  const { block, updatedAt } = blockData

  // Filter out item
  const updatedItems = block.items.filter((item) => item.id !== itemId)
  if (updatedItems.length === block.items.length) {
    return { success: false, error: 'Item not found', code: ActionErrorCode.NOT_FOUND }
  }

  const updatedBlock: ValueMapBlock<ValueMapItem> = {
    ...block,
    items: updatedItems,
  }

  const { error, conflict } = await updateBlock(supabase, valueMapId, blockResult.data, updatedBlock, updatedAt)
  if (error) {
    console.error('[deleteItemAction] Database error:', error.message)
    if (conflict) {
      return { success: false, error: error.message, code: ActionErrorCode.CONFLICT }
    }
    return { success: false, error: 'Failed to delete item', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateCanvasPage(valueMapId)
  return { success: true, data: undefined }
}

export async function reorderItemsAction(
  valueMapId: string,
  blockId: string,
  itemIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify access
  const accessCheck = await verifyValueMapAccess(supabase, valueMapId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: accessCheck.code }
  }

  // Validate block ID
  const blockResult = validateValueMapBlockId(blockId)
  if (!blockResult.success) {
    return { success: false, error: blockResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Get current block with timestamp
  const blockData = await getBlockData(supabase, valueMapId, blockResult.data)
  if (!blockData) {
    return { success: false, error: 'Failed to load block', code: ActionErrorCode.DATABASE_ERROR }
  }

  const { block, updatedAt } = blockData

  // Reorder items
  const itemMap = new Map(block.items.map((item) => [item.id, item]))
  const reorderedItems: ValueMapItem[] = []

  for (const itemId of itemIds) {
    const item = itemMap.get(itemId)
    if (item) {
      reorderedItems.push(item)
      itemMap.delete(itemId)
    }
  }

  // Add any remaining items
  for (const item of itemMap.values()) {
    reorderedItems.push(item)
  }

  const updatedBlock: ValueMapBlock<ValueMapItem> = {
    ...block,
    items: reorderedItems,
  }

  const { error, conflict } = await updateBlock(supabase, valueMapId, blockResult.data, updatedBlock, updatedAt)
  if (error) {
    console.error('[reorderItemsAction] Database error:', error.message)
    if (conflict) {
      return { success: false, error: error.message, code: ActionErrorCode.CONFLICT }
    }
    return { success: false, error: 'Failed to reorder items', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateCanvasPage(valueMapId)
  return { success: true, data: undefined }
}
