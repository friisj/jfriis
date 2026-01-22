'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CanvasViewLayout,
  CanvasHeader,
  CanvasSurface,
  type CanvasMode,
} from '@/components/admin/canvas'
import { BMCCanvas } from '@/components/admin/canvas/bmc-canvas'
import { BMCItemDetailPanel } from '@/components/admin/canvas/bmc-item-detail-panel'
import { AdminErrorBoundary, ErrorState } from '@/components/admin/error-boundary'
import {
  addItemAction,
  updateItemAction,
  deleteItemAction,
} from './actions'
import { ActionErrorCode } from '@/lib/types/action-result'
import type {
  BMCCanvas as BMCCanvasType,
  BMCBlockId,
  BMCItem,
  ItemPriority,
} from '@/lib/boundary-objects/bmc-canvas'
import {
  BMC_BLOCK_CONFIG,
  getCanvasBlock,
  countTotalItems,
} from '@/lib/boundary-objects/bmc-canvas'

// ============================================================================
// Types
// ============================================================================

interface BMCCanvasViewProps {
  canvas: BMCCanvasType
}

interface SelectedItemInfo {
  blockId: BMCBlockId
  itemId: string | null // null means new item
  item: BMCItem | null
}

// ============================================================================
// Component
// HIGH 8: Optimistic updates with loading states
// ============================================================================

export function BMCCanvasView({ canvas }: BMCCanvasViewProps) {
  const router = useRouter()
  const [mode, setMode] = useState<CanvasMode>('structured')
  const [selectedBlockId, setSelectedBlockId] = useState<BMCBlockId | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  // MEDIUM 12: Loading state for async operations
  const [isLoading, setIsLoading] = useState(false)
  // HIGH 8: Optimistic state for pending operations
  const [optimisticItem, setOptimisticItem] = useState<BMCItem | null>(null)

  // Get selected item info
  const selectedItemInfo = useMemo((): SelectedItemInfo | null => {
    if (!selectedBlockId) return null

    const block = getCanvasBlock(canvas, selectedBlockId)
    const item = selectedItemId
      ? block.items.find((i) => i.id === selectedItemId) || null
      : null

    return {
      blockId: selectedBlockId,
      itemId: selectedItemId,
      item,
    }
  }, [canvas, selectedBlockId, selectedItemId])

  // Show detail panel when item is selected or adding new
  const showDetailPanel = selectedBlockId !== null && (selectedItemId !== null || isAddingNew)

  const handleRefresh = useCallback(() => {
    router.refresh()
  }, [router])

  // Handle block click - open panel to add new item
  const handleBlockClick = useCallback((blockId: BMCBlockId) => {
    if (mode === 'structured') {
      setSelectedBlockId(blockId)
      setSelectedItemId(null)
      setIsAddingNew(true)
    }
  }, [mode])

  // Handle item click - open panel to edit item
  const handleItemClick = useCallback((itemId: string, blockId: BMCBlockId) => {
    setSelectedBlockId(blockId)
    setSelectedItemId(itemId)
    setIsAddingNew(false)
  }, [])

  // Handle add button click
  const handleAddItem = useCallback((blockId: BMCBlockId) => {
    setSelectedBlockId(blockId)
    setSelectedItemId(null)
    setIsAddingNew(true)
  }, [])

  // Handle background click - close panel
  const handleBackgroundClick = useCallback(() => {
    setSelectedBlockId(null)
    setSelectedItemId(null)
    setIsAddingNew(false)
  }, [])

  // Handle panel close
  const handlePanelClose = useCallback(() => {
    setSelectedBlockId(null)
    setSelectedItemId(null)
    setIsAddingNew(false)
  }, [])

  // Handle save (create or update)
  // HIGH 8: Includes optimistic updates
  // MEDIUM 12: Includes loading states
  const handleSave = useCallback(
    async (data: { content: string; priority: ItemPriority | null }) => {
      if (!selectedBlockId) return

      setIsLoading(true)

      try {
        if (isAddingNew) {
          // HIGH 8: Optimistic update - show item immediately
          const tempItem: BMCItem = {
            id: `temp-${Date.now()}`,
            content: data.content,
            priority: data.priority || undefined,
            created_at: new Date().toISOString(),
          }
          setOptimisticItem(tempItem)

          // Create new item
          const result = await addItemAction(
            canvas.id,
            selectedBlockId,
            data.content,
            data.priority || undefined
          )

          // Clear optimistic state
          setOptimisticItem(null)

          if (!result.success) {
            // Show specific error for conflicts
            if (result.code === ActionErrorCode.CONFLICT) {
              toast.error('Canvas was modified by another user. Refreshing...')
              handleRefresh()
            } else {
              toast.error(result.error || 'Failed to add item')
            }
            throw new Error(result.error)
          }
          toast.success('Item added')
          setSelectedItemId(result.data.itemId)
          setIsAddingNew(false)
        } else if (selectedItemId) {
          // Update existing item
          const result = await updateItemAction(canvas.id, selectedBlockId, selectedItemId, {
            content: data.content,
            priority: data.priority,
          })
          if (!result.success) {
            if (result.code === ActionErrorCode.CONFLICT) {
              toast.error('Canvas was modified by another user. Refreshing...')
              handleRefresh()
            } else {
              toast.error(result.error || 'Failed to update item')
            }
            throw new Error(result.error)
          }
          toast.success('Item updated')
        }

        handleRefresh()
      } catch (error) {
        console.error('Failed to save item:', error)
        // Ensure optimistic state is cleared on error
        setOptimisticItem(null)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [canvas.id, selectedBlockId, selectedItemId, isAddingNew, handleRefresh]
  )

  // Handle delete
  // MEDIUM 12: Includes loading states
  const handleDelete = useCallback(async () => {
    if (!selectedBlockId || !selectedItemId) return

    setIsLoading(true)

    try {
      const result = await deleteItemAction(canvas.id, selectedBlockId, selectedItemId)
      if (!result.success) {
        if (result.code === ActionErrorCode.CONFLICT) {
          toast.error('Canvas was modified by another user. Refreshing...')
          handleRefresh()
        } else {
          toast.error(result.error || 'Failed to delete item')
        }
        throw new Error(result.error)
      }
      toast.success('Item deleted')
      handlePanelClose()
      handleRefresh()
    } catch (error) {
      console.error('Failed to delete item:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [canvas.id, selectedBlockId, selectedItemId, handlePanelClose, handleRefresh])

  // Stats
  const totalItems = countTotalItems(canvas)

  // HIGH 5: Wrap in error boundary with recovery option
  return (
    <AdminErrorBoundary
      fallback={
        <ErrorState
          title="Canvas Error"
          message="Failed to render the Business Model Canvas. Please try refreshing."
          onRetry={handleRefresh}
        />
      }
    >
      <CanvasViewLayout
        header={
          <CanvasHeader
            title={canvas.name}
            backHref={`/admin/canvases/business-models/${canvas.id}`}
            mode={mode}
            onModeChange={setMode}
            actions={
              <button
                onClick={handleRefresh}
                className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
              >
                Refresh
              </button>
            }
          />
        }
        toolbar={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {totalItems} item{totalItems !== 1 ? 's' : ''} across 9 blocks
              </span>
              {selectedBlockId && (
                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                  {BMC_BLOCK_CONFIG[selectedBlockId].name}
                </span>
              )}
              {/* MEDIUM 12: Loading indicator */}
              {isLoading && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </span>
              )}
            </div>
          </div>
        }
      >
        <CanvasSurface onBackgroundClick={handleBackgroundClick}>
          <BMCCanvas
            canvas={canvas}
            mode={mode}
            selectedBlockId={selectedBlockId}
            selectedItemId={selectedItemId}
            onBlockClick={handleBlockClick}
            onItemClick={handleItemClick}
            onAddItem={handleAddItem}
            onBackgroundClick={handleBackgroundClick}
          />
        </CanvasSurface>

        {/* Item detail panel */}
        {showDetailPanel && selectedBlockId && (
          <BMCItemDetailPanel
            item={selectedItemInfo?.item || null}
            blockConfig={BMC_BLOCK_CONFIG[selectedBlockId]}
            onSave={handleSave}
            onDelete={selectedItemId ? handleDelete : undefined}
            onClose={handlePanelClose}
            isNew={isAddingNew}
          />
        )}
      </CanvasViewLayout>
    </AdminErrorBoundary>
  )
}
