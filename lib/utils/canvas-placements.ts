import { supabase } from '@/lib/supabase'
import type { CanvasType } from '@/lib/types/canvas-items'
import type { PostgrestError } from '@supabase/supabase-js'

interface CanvasBlockWithItems {
  item_ids?: string[]
  [key: string]: any
}

interface SyncPlacementsOptions {
  canvasId: string
  canvasType: CanvasType
  blockKeys: readonly string[]
  formData: Record<string, CanvasBlockWithItems>
}

interface PlacementError {
  blockKey: string
  error: PostgrestError
}

interface SyncPlacementsResult {
  success: boolean
  errors: PlacementError[]
  totalBlocks: number
  successfulBlocks: number
}

/**
 * Syncs canvas item placements for a saved canvas
 *
 * This function:
 * 1. Deletes existing placements for each block
 * 2. Creates new placements with position indices
 * 3. Maintains order from the item_ids array
 * 4. Collects and returns errors for failed blocks
 *
 * @param options - Configuration for syncing placements
 * @returns Result object with success status and any errors
 */
export async function syncCanvasPlacements({
  canvasId,
  canvasType,
  blockKeys,
  formData,
}: SyncPlacementsOptions): Promise<SyncPlacementsResult> {
  const errors: PlacementError[] = []
  let successfulBlocks = 0

  for (const blockKey of blockKeys) {
    const block = formData[blockKey]
    const itemIds = block?.item_ids || []

    try {
      // Delete existing placements for this block
      const { error: deleteError } = await supabase
        .from('canvas_item_placements')
        .delete()
        .eq('canvas_id', canvasId)
        .eq('canvas_type', canvasType)
        .eq('block_name', blockKey)

      if (deleteError) {
        console.error(`Error deleting placements for ${blockKey}:`, deleteError)
        errors.push({ blockKey, error: deleteError })
        continue
      }

      // Create new placements if there are items
      if (itemIds.length > 0) {
        const placements = itemIds.map((itemId, index) => ({
          canvas_item_id: itemId,
          canvas_type: canvasType,
          canvas_id: canvasId,
          block_name: blockKey,
          position: index,
        }))

        const { error: insertError } = await supabase
          .from('canvas_item_placements')
          .insert(placements)

        if (insertError) {
          console.error(`Error inserting placements for ${blockKey}:`, insertError)
          errors.push({ blockKey, error: insertError })
          continue
        }
      }

      successfulBlocks++
    } catch (err) {
      console.error(`Unexpected error syncing placements for ${blockKey}:`, err)
      errors.push({
        blockKey,
        error: {
          message: err instanceof Error ? err.message : 'Unknown error',
          details: '',
          hint: '',
          code: '',
        } as PostgrestError,
      })
    }
  }

  return {
    success: errors.length === 0,
    errors,
    totalBlocks: blockKeys.length,
    successfulBlocks,
  }
}
