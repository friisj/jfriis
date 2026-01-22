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
import { CustomerProfileCanvas } from '@/components/admin/canvas/customer-profile-canvas'
import {
  CustomerProfileItemDetailPanel,
  type ProfileItemDetailData,
} from '@/components/admin/canvas/customer-profile-item-detail-panel'
import { AdminErrorBoundary, ErrorState } from '@/components/admin/error-boundary'
import {
  addItemAction,
  updateItemAction,
  deleteItemAction,
  ActionErrorCode,
} from './actions'
import type {
  CustomerProfileCanvas as CustomerProfileCanvasType,
  ProfileBlockId,
  ProfileItem,
} from '@/lib/boundary-objects/customer-profile-canvas'
import {
  PROFILE_BLOCK_CONFIG,
  getCanvasBlock,
  countTotalItems,
} from '@/lib/boundary-objects/customer-profile-canvas'

// ============================================================================
// Types
// ============================================================================

interface CustomerProfileCanvasViewProps {
  profile: CustomerProfileCanvasType
}

interface SelectedItemInfo {
  blockId: ProfileBlockId
  itemId: string | null
  item: ProfileItem | null
}

// ============================================================================
// Component
// ============================================================================

export function CustomerProfileCanvasView({ profile }: CustomerProfileCanvasViewProps) {
  const router = useRouter()
  const [mode, setMode] = useState<CanvasMode>('structured')
  const [selectedBlockId, setSelectedBlockId] = useState<ProfileBlockId | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Get selected item info
  const selectedItemInfo = useMemo((): SelectedItemInfo | null => {
    if (!selectedBlockId) return null

    const block = getCanvasBlock(profile, selectedBlockId)
    const item = selectedItemId
      ? block.items.find((i) => i.id === selectedItemId) || null
      : null

    return {
      blockId: selectedBlockId,
      itemId: selectedItemId,
      item,
    }
  }, [profile, selectedBlockId, selectedItemId])

  // Show detail panel when item is selected or adding new
  const showDetailPanel = selectedBlockId !== null && (selectedItemId !== null || isAddingNew)

  const handleRefresh = useCallback(() => {
    router.refresh()
  }, [router])

  // Handle block click
  const handleBlockClick = useCallback((blockId: ProfileBlockId) => {
    if (mode === 'structured') {
      setSelectedBlockId(blockId)
      setSelectedItemId(null)
      setIsAddingNew(true)
    }
  }, [mode])

  // Handle item click
  const handleItemClick = useCallback((itemId: string, blockId: ProfileBlockId) => {
    setSelectedBlockId(blockId)
    setSelectedItemId(itemId)
    setIsAddingNew(false)
  }, [])

  // Handle add button click
  const handleAddItem = useCallback((blockId: ProfileBlockId) => {
    setSelectedBlockId(blockId)
    setSelectedItemId(null)
    setIsAddingNew(true)
  }, [])

  // Handle background click
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

  // Handle save
  const handleSave = useCallback(
    async (data: ProfileItemDetailData) => {
      if (!selectedBlockId) return

      setIsLoading(true)

      try {
        if (isAddingNew) {
          const result = await addItemAction(
            profile.id,
            selectedBlockId,
            data.content,
            {
              type: data.type || undefined,
              severity: data.severity || undefined,
              importance: data.importance || undefined,
              evidence: data.evidence || undefined,
            }
          )

          if (!result.success) {
            if (result.code === ActionErrorCode.CONFLICT) {
              toast.error('Profile was modified by another user. Refreshing...')
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
          const result = await updateItemAction(profile.id, selectedBlockId, selectedItemId, {
            content: data.content,
            type: data.type,
            severity: data.severity,
            importance: data.importance,
            evidence: data.evidence,
          })
          if (!result.success) {
            if (result.code === ActionErrorCode.CONFLICT) {
              toast.error('Profile was modified by another user. Refreshing...')
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
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [profile.id, selectedBlockId, selectedItemId, isAddingNew, handleRefresh]
  )

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!selectedBlockId || !selectedItemId) return

    setIsLoading(true)

    try {
      const result = await deleteItemAction(profile.id, selectedBlockId, selectedItemId)
      if (!result.success) {
        if (result.code === ActionErrorCode.CONFLICT) {
          toast.error('Profile was modified by another user. Refreshing...')
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
  }, [profile.id, selectedBlockId, selectedItemId, handlePanelClose, handleRefresh])

  // Stats
  const totalItems = countTotalItems(profile)

  return (
    <AdminErrorBoundary
      fallback={
        <ErrorState
          title="Canvas Error"
          message="Failed to render the Customer Profile Canvas. Please try refreshing."
          onRetry={handleRefresh}
        />
      }
    >
      <CanvasViewLayout
        header={
          <CanvasHeader
            title={profile.name}
            backHref={`/admin/canvases/customer-profiles/${profile.id}/edit`}
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
                {totalItems} item{totalItems !== 1 ? 's' : ''} across 3 blocks
              </span>
              {selectedBlockId && (
                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                  {PROFILE_BLOCK_CONFIG[selectedBlockId].name}
                </span>
              )}
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
          <CustomerProfileCanvas
            canvas={profile}
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
          <CustomerProfileItemDetailPanel
            item={selectedItemInfo?.item || null}
            blockId={selectedBlockId}
            blockConfig={PROFILE_BLOCK_CONFIG[selectedBlockId]}
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
