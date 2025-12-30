import { supabase } from '@/lib/supabase'
import type { CanvasType } from '@/lib/types/canvas-items'

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

/**
 * Syncs canvas item placements for a saved canvas
 *
 * This function:
 * 1. Deletes existing placements for each block
 * 2. Creates new placements with position indices
 * 3. Maintains order from the item_ids array
 *
 * @param options - Configuration for syncing placements
 * @returns Promise that resolves when all placements are synced
 */
export async function syncCanvasPlacements({
  canvasId,
  canvasType,
  blockKeys,
  formData,
}: SyncPlacementsOptions): Promise<void> {
  for (const blockKey of blockKeys) {
    const block = formData[blockKey]
    const itemIds = block?.item_ids || []

    // Delete existing placements for this block
    await supabase
      .from('canvas_item_placements')
      .delete()
      .eq('canvas_id', canvasId)
      .eq('canvas_type', canvasType)
      .eq('block_name', blockKey)

    // Create new placements if there are items
    if (itemIds.length > 0) {
      const placements = itemIds.map((itemId, index) => ({
        canvas_item_id: itemId,
        canvas_type: canvasType,
        canvas_id: canvasId,
        block_name: blockKey,
        position: index,
      }))

      const { error } = await supabase
        .from('canvas_item_placements')
        .insert(placements)

      if (error) {
        console.error(`Error syncing placements for ${blockKey}:`, error)
        // Don't throw - continue with other blocks
      }
    }
  }
}
