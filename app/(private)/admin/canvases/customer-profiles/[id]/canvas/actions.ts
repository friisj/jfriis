'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  validateProfileBlockId,
  validateItemContent,
  validateEvidence,
  validateJobType,
  validateSeverity,
  validateImportance,
  createNewJobItem,
  createNewPainItem,
  createNewGainItem,
  normalizeJobsBlock,
  normalizePainsBlock,
  normalizeGainsBlock,
  type ProfileBlockId,
  type ProfileItem,
  type ProfileBlock,
  type JobType,
  type SeverityLevel,
  type ImportanceLevel,
} from '@/lib/boundary-objects/customer-profile-canvas'

// ============================================================================
// Error Codes
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

interface JobItemData {
  content: string
  type?: JobType | null
  importance?: ImportanceLevel | null
  evidence?: string | null
}

interface PainItemData {
  content: string
  severity?: SeverityLevel | null
  evidence?: string | null
}

interface GainItemData {
  content: string
  importance?: ImportanceLevel | null
  evidence?: string | null
}

type ItemData = JobItemData | PainItemData | GainItemData

// ============================================================================
// Helper Functions
// ============================================================================

function revalidateCanvasPage(profileId: string) {
  revalidatePath(`/admin/canvases/customer-profiles/${profileId}/canvas`)
  revalidatePath(`/admin/canvases/customer-profiles/${profileId}`)
}

// ============================================================================
// Authorization Helpers
// ============================================================================

async function verifyProfileAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string
): Promise<{ success: true; profileId: string } | { success: false; error: string; code: ActionErrorCode }> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .select('id, status')
    .eq('id', profileId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: 'Profile not found or access denied', code: ActionErrorCode.ACCESS_DENIED }
    }
    console.error('[verifyProfileAccess] Database error:', error)
    return { success: false, error: 'Failed to verify access', code: ActionErrorCode.DATABASE_ERROR }
  }

  if (!data) {
    return { success: false, error: 'Profile not found or access denied', code: ActionErrorCode.ACCESS_DENIED }
  }

  return { success: true, profileId: data.id }
}

// ============================================================================
// Block Operations
// ============================================================================

async function getBlockData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  blockId: ProfileBlockId
): Promise<{ block: ProfileBlock<ProfileItem>; updatedAt: string } | null> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .select(`${blockId}, updated_at`)
    .eq('id', profileId)
    .single()

  if (error || !data) return null

  const blockData = data[blockId as keyof typeof data]

  // Normalize block based on type
  let block: ProfileBlock<ProfileItem>
  switch (blockId) {
    case 'jobs':
      block = normalizeJobsBlock(blockData)
      break
    case 'pains':
      block = normalizePainsBlock(blockData)
      break
    case 'gains':
      block = normalizeGainsBlock(blockData)
      break
    default:
      block = { items: [] }
  }

  return { block, updatedAt: data.updated_at }
}

async function updateBlock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  blockId: ProfileBlockId,
  block: ProfileBlock<ProfileItem>,
  expectedUpdatedAt: string
): Promise<{ error: Error | null; conflict: boolean }> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .update({
      [blockId]: block,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)
    .eq('updated_at', expectedUpdatedAt)
    .select('id')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { error: new Error('Profile was modified. Please refresh and try again.'), conflict: true }
    }
    return { error: new Error(error.message), conflict: false }
  }

  if (!data) {
    return { error: new Error('Profile was modified. Please refresh and try again.'), conflict: true }
  }

  return { error: null, conflict: false }
}

// ============================================================================
// Item Actions
// ============================================================================

export async function addItemAction(
  profileId: string,
  blockId: string,
  content: string,
  options?: {
    type?: string
    severity?: string
    importance?: string
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
  const accessCheck = await verifyProfileAccess(supabase, profileId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: accessCheck.code }
  }

  // Validate block ID
  const blockResult = validateProfileBlockId(blockId)
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
  const blockData = await getBlockData(supabase, profileId, blockResult.data)
  if (!blockData) {
    return { success: false, error: 'Failed to load block', code: ActionErrorCode.DATABASE_ERROR }
  }

  const { block, updatedAt } = blockData

  // Create new item based on block type
  const existingIds = new Set(block.items.map((item) => item.id))
  let newItem: ProfileItem

  switch (blockResult.data) {
    case 'jobs': {
      const typeResult = validateJobType(options?.type)
      if (!typeResult.success) {
        return { success: false, error: typeResult.error, code: ActionErrorCode.VALIDATION_ERROR }
      }
      const importanceResult = validateImportance(options?.importance)
      if (!importanceResult.success) {
        return { success: false, error: importanceResult.error, code: ActionErrorCode.VALIDATION_ERROR }
      }
      newItem = createNewJobItem(contentResult.data, {
        type: typeResult.data || undefined,
        importance: importanceResult.data || undefined,
        existingIds,
      })
      if (evidenceResult.data) {
        newItem.evidence = evidenceResult.data
      }
      break
    }
    case 'pains': {
      const severityResult = validateSeverity(options?.severity)
      if (!severityResult.success) {
        return { success: false, error: severityResult.error, code: ActionErrorCode.VALIDATION_ERROR }
      }
      newItem = createNewPainItem(contentResult.data, {
        severity: severityResult.data || undefined,
        existingIds,
      })
      if (evidenceResult.data) {
        newItem.evidence = evidenceResult.data
      }
      break
    }
    case 'gains': {
      const importanceResult = validateImportance(options?.importance)
      if (!importanceResult.success) {
        return { success: false, error: importanceResult.error, code: ActionErrorCode.VALIDATION_ERROR }
      }
      newItem = createNewGainItem(contentResult.data, {
        importance: importanceResult.data || undefined,
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
  const updatedBlock: ProfileBlock<ProfileItem> = {
    ...block,
    items: [...block.items, newItem],
  }

  const { error, conflict } = await updateBlock(supabase, profileId, blockResult.data, updatedBlock, updatedAt)
  if (error) {
    console.error('[addItemAction] Database error:', error.message)
    if (conflict) {
      return { success: false, error: error.message, code: ActionErrorCode.CONFLICT }
    }
    return { success: false, error: 'Failed to add item', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateCanvasPage(profileId)
  return { success: true, data: { itemId: newItem.id } }
}

export async function updateItemAction(
  profileId: string,
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
  const accessCheck = await verifyProfileAccess(supabase, profileId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: accessCheck.code }
  }

  // Validate block ID
  const blockResult = validateProfileBlockId(blockId)
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
  const blockData = await getBlockData(supabase, profileId, blockResult.data)
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
    case 'jobs': {
      const jobData = data as JobItemData
      const typeResult = validateJobType(jobData.type)
      if (!typeResult.success) {
        return { success: false, error: typeResult.error, code: ActionErrorCode.VALIDATION_ERROR }
      }
      const importanceResult = validateImportance(jobData.importance)
      if (!importanceResult.success) {
        return { success: false, error: importanceResult.error, code: ActionErrorCode.VALIDATION_ERROR }
      }
      updatedItems[itemIndex] = {
        ...existingItem,
        content: contentResult.data,
        type: typeResult.data || undefined,
        importance: importanceResult.data || undefined,
        evidence: evidenceResult.data || undefined,
      }
      break
    }
    case 'pains': {
      const painData = data as PainItemData
      const severityResult = validateSeverity(painData.severity)
      if (!severityResult.success) {
        return { success: false, error: severityResult.error, code: ActionErrorCode.VALIDATION_ERROR }
      }
      updatedItems[itemIndex] = {
        ...existingItem,
        content: contentResult.data,
        severity: severityResult.data || undefined,
        evidence: evidenceResult.data || undefined,
      }
      break
    }
    case 'gains': {
      const gainData = data as GainItemData
      const importanceResult = validateImportance(gainData.importance)
      if (!importanceResult.success) {
        return { success: false, error: importanceResult.error, code: ActionErrorCode.VALIDATION_ERROR }
      }
      updatedItems[itemIndex] = {
        ...existingItem,
        content: contentResult.data,
        importance: importanceResult.data || undefined,
        evidence: evidenceResult.data || undefined,
      }
      break
    }
  }

  const updatedBlock: ProfileBlock<ProfileItem> = {
    ...block,
    items: updatedItems,
  }

  const { error, conflict } = await updateBlock(supabase, profileId, blockResult.data, updatedBlock, updatedAt)
  if (error) {
    console.error('[updateItemAction] Database error:', error.message)
    if (conflict) {
      return { success: false, error: error.message, code: ActionErrorCode.CONFLICT }
    }
    return { success: false, error: 'Failed to update item', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateCanvasPage(profileId)
  return { success: true, data: undefined }
}

export async function deleteItemAction(
  profileId: string,
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
  const accessCheck = await verifyProfileAccess(supabase, profileId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: accessCheck.code }
  }

  // Validate block ID
  const blockResult = validateProfileBlockId(blockId)
  if (!blockResult.success) {
    return { success: false, error: blockResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Get current block with timestamp
  const blockData = await getBlockData(supabase, profileId, blockResult.data)
  if (!blockData) {
    return { success: false, error: 'Failed to load block', code: ActionErrorCode.DATABASE_ERROR }
  }

  const { block, updatedAt } = blockData

  // Filter out item
  const updatedItems = block.items.filter((item) => item.id !== itemId)
  if (updatedItems.length === block.items.length) {
    return { success: false, error: 'Item not found', code: ActionErrorCode.NOT_FOUND }
  }

  const updatedBlock: ProfileBlock<ProfileItem> = {
    ...block,
    items: updatedItems,
  }

  const { error, conflict } = await updateBlock(supabase, profileId, blockResult.data, updatedBlock, updatedAt)
  if (error) {
    console.error('[deleteItemAction] Database error:', error.message)
    if (conflict) {
      return { success: false, error: error.message, code: ActionErrorCode.CONFLICT }
    }
    return { success: false, error: 'Failed to delete item', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateCanvasPage(profileId)
  return { success: true, data: undefined }
}

export async function reorderItemsAction(
  profileId: string,
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
  const accessCheck = await verifyProfileAccess(supabase, profileId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: accessCheck.code }
  }

  // Validate block ID
  const blockResult = validateProfileBlockId(blockId)
  if (!blockResult.success) {
    return { success: false, error: blockResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Get current block with timestamp
  const blockData = await getBlockData(supabase, profileId, blockResult.data)
  if (!blockData) {
    return { success: false, error: 'Failed to load block', code: ActionErrorCode.DATABASE_ERROR }
  }

  const { block, updatedAt } = blockData

  // Reorder items
  const itemMap = new Map(block.items.map((item) => [item.id, item]))
  const reorderedItems: ProfileItem[] = []

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

  const updatedBlock: ProfileBlock<ProfileItem> = {
    ...block,
    items: reorderedItems,
  }

  const { error, conflict } = await updateBlock(supabase, profileId, blockResult.data, updatedBlock, updatedAt)
  if (error) {
    console.error('[reorderItemsAction] Database error:', error.message)
    if (conflict) {
      return { success: false, error: error.message, code: ActionErrorCode.CONFLICT }
    }
    return { success: false, error: 'Failed to reorder items', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateCanvasPage(profileId)
  return { success: true, data: undefined }
}
