'use client'

import { useState, useCallback, useMemo, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CanvasViewLayout,
  CanvasHeader,
  CanvasSurface,
  type CanvasMode,
} from '@/components/admin/canvas'
import { VPCCanvas } from '@/components/admin/canvas/vpc-canvas'
import { FitScoreBadge, FitScoreDisplay, GapIndicator } from '@/components/admin/canvas/fit-score-display'
import {
  CustomerProfileItemDetailPanel,
  type ProfileItemDetailData,
} from '@/components/admin/canvas/customer-profile-item-detail-panel'
import {
  ValueMapItemDetailPanel,
  type ValueMapItemDetailData,
} from '@/components/admin/canvas/value-map-item-detail-panel'
import { AdminErrorBoundary, ErrorState } from '@/components/admin/error-boundary'
import {
  toggleAddressedAction,
  addProfileItemAction,
  updateProfileItemAction,
  deleteProfileItemAction,
  addValueMapItemAction,
  updateValueMapItemAction,
  deleteValueMapItemAction,
  ActionErrorCode,
} from './actions'
import type {
  ValuePropositionCanvasData,
  VPCFitAnalysis,
} from '@/lib/boundary-objects/vpc-canvas'
import { getVPCStats } from '@/lib/boundary-objects/vpc-canvas'
import type {
  CustomerProfileCanvas,
  ProfileBlockId,
  ProfileItem,
} from '@/lib/boundary-objects/customer-profile-canvas'
import {
  PROFILE_BLOCK_CONFIG,
  getCanvasBlock as getProfileBlock,
} from '@/lib/boundary-objects/customer-profile-canvas'
import type {
  ValueMapCanvas,
  ValueMapBlockId,
  ValueMapItem,
} from '@/lib/boundary-objects/value-map-canvas'
import {
  VALUE_MAP_BLOCK_CONFIG,
  getCanvasBlock as getValueMapBlock,
} from '@/lib/boundary-objects/value-map-canvas'

// ============================================================================
// Types
// ============================================================================

interface VPCCanvasViewProps {
  vpc: ValuePropositionCanvasData
  customerProfile: CustomerProfileCanvas
  valueMap: ValueMapCanvas
}

type SelectedSide = 'profile' | 'valueMap' | null

interface ProfileSelectionInfo {
  blockId: ProfileBlockId
  itemId: string | null
  item: ProfileItem | null
}

interface ValueMapSelectionInfo {
  blockId: ValueMapBlockId
  itemId: string | null
  item: ValueMapItem | null
}

// ============================================================================
// Component
// ============================================================================

export function VPCCanvasView({ vpc, customerProfile, valueMap }: VPCCanvasViewProps) {
  const router = useRouter()
  const [mode, setMode] = useState<CanvasMode>('structured')
  const [isLoading, setIsLoading] = useState(false)

  // Profile selection state
  const [selectedProfileBlockId, setSelectedProfileBlockId] = useState<ProfileBlockId | null>(null)
  const [selectedProfileItemId, setSelectedProfileItemId] = useState<string | null>(null)
  const [isAddingProfileItem, setIsAddingProfileItem] = useState(false)

  // Value Map selection state
  const [selectedValueMapBlockId, setSelectedValueMapBlockId] = useState<ValueMapBlockId | null>(null)
  const [selectedValueMapItemId, setSelectedValueMapItemId] = useState<string | null>(null)
  const [isAddingValueMapItem, setIsAddingValueMapItem] = useState(false)

  // Determine which side is selected
  const selectedSide = useMemo((): SelectedSide => {
    if (selectedProfileBlockId !== null) return 'profile'
    if (selectedValueMapBlockId !== null) return 'valueMap'
    return null
  }, [selectedProfileBlockId, selectedValueMapBlockId])

  // Get selected profile item info
  const profileSelectionInfo = useMemo((): ProfileSelectionInfo | null => {
    if (!selectedProfileBlockId) return null

    const block = getProfileBlock(customerProfile, selectedProfileBlockId)
    const item = selectedProfileItemId
      ? block.items.find((i) => i.id === selectedProfileItemId) || null
      : null

    return {
      blockId: selectedProfileBlockId,
      itemId: selectedProfileItemId,
      item,
    }
  }, [customerProfile, selectedProfileBlockId, selectedProfileItemId])

  // Get selected value map item info
  const valueMapSelectionInfo = useMemo((): ValueMapSelectionInfo | null => {
    if (!selectedValueMapBlockId) return null

    const block = getValueMapBlock(valueMap, selectedValueMapBlockId)
    const item = selectedValueMapItemId
      ? block.items.find((i) => i.id === selectedValueMapItemId) || null
      : null

    return {
      blockId: selectedValueMapBlockId,
      itemId: selectedValueMapItemId,
      item,
    }
  }, [valueMap, selectedValueMapBlockId, selectedValueMapItemId])

  // Show detail panels
  const showProfilePanel =
    selectedProfileBlockId !== null && (selectedProfileItemId !== null || isAddingProfileItem)
  const showValueMapPanel =
    selectedValueMapBlockId !== null && (selectedValueMapItemId !== null || isAddingValueMapItem)

  const handleRefresh = useCallback(() => {
    router.refresh()
  }, [router])

  // ========== Clear selection helpers ==========
  const clearProfileSelection = useCallback(() => {
    setSelectedProfileBlockId(null)
    setSelectedProfileItemId(null)
    setIsAddingProfileItem(false)
  }, [])

  const clearValueMapSelection = useCallback(() => {
    setSelectedValueMapBlockId(null)
    setSelectedValueMapItemId(null)
    setIsAddingValueMapItem(false)
  }, [])

  const clearAllSelection = useCallback(() => {
    clearProfileSelection()
    clearValueMapSelection()
  }, [clearProfileSelection, clearValueMapSelection])

  // ========== Profile handlers ==========
  // Use startTransition for atomic state updates to prevent race conditions
  const handleProfileBlockClick = useCallback(
    (blockId: ProfileBlockId) => {
      if (mode === 'structured') {
        startTransition(() => {
          setSelectedValueMapBlockId(null)
          setSelectedValueMapItemId(null)
          setIsAddingValueMapItem(false)
          setSelectedProfileBlockId(blockId)
          setSelectedProfileItemId(null)
          setIsAddingProfileItem(true)
        })
      }
    },
    [mode]
  )

  const handleProfileItemClick = useCallback(
    (itemId: string, blockId: ProfileBlockId) => {
      startTransition(() => {
        setSelectedValueMapBlockId(null)
        setSelectedValueMapItemId(null)
        setIsAddingValueMapItem(false)
        setSelectedProfileBlockId(blockId)
        setSelectedProfileItemId(itemId)
        setIsAddingProfileItem(false)
      })
    },
    []
  )

  const handleAddProfileItem = useCallback(
    (blockId: ProfileBlockId) => {
      startTransition(() => {
        setSelectedValueMapBlockId(null)
        setSelectedValueMapItemId(null)
        setIsAddingValueMapItem(false)
        setSelectedProfileBlockId(blockId)
        setSelectedProfileItemId(null)
        setIsAddingProfileItem(true)
      })
    },
    []
  )

  // ========== Value Map handlers ==========
  const handleValueMapBlockClick = useCallback(
    (blockId: ValueMapBlockId) => {
      if (mode === 'structured') {
        startTransition(() => {
          setSelectedProfileBlockId(null)
          setSelectedProfileItemId(null)
          setIsAddingProfileItem(false)
          setSelectedValueMapBlockId(blockId)
          setSelectedValueMapItemId(null)
          setIsAddingValueMapItem(true)
        })
      }
    },
    [mode]
  )

  const handleValueMapItemClick = useCallback(
    (itemId: string, blockId: ValueMapBlockId) => {
      startTransition(() => {
        setSelectedProfileBlockId(null)
        setSelectedProfileItemId(null)
        setIsAddingProfileItem(false)
        setSelectedValueMapBlockId(blockId)
        setSelectedValueMapItemId(itemId)
        setIsAddingValueMapItem(false)
      })
    },
    []
  )

  const handleAddValueMapItem = useCallback(
    (blockId: ValueMapBlockId) => {
      startTransition(() => {
        setSelectedProfileBlockId(null)
        setSelectedProfileItemId(null)
        setIsAddingProfileItem(false)
        setSelectedValueMapBlockId(blockId)
        setSelectedValueMapItemId(null)
        setIsAddingValueMapItem(true)
      })
    },
    []
  )

  // ========== Toggle addressed handler ==========
  // Optimistic update: don't block UI, fire request in background
  const handleToggleAddressed = useCallback(
    (blockType: 'pains' | 'gains' | 'jobs', itemId: string) => {
      // Show immediate visual feedback (the VPCCanvas already handles UI state)
      // Fire the request without blocking
      toggleAddressedAction(vpc.id, blockType, itemId)
        .then((result) => {
          if (!result.success) {
            toast.error(result.error || 'Failed to toggle addressed status')
            // Refresh to restore correct state on error
            handleRefresh()
          } else {
            toast.success('Fit mapping updated')
            // Refresh to get updated fit score from server
            handleRefresh()
          }
        })
        .catch((error) => {
          console.error('Failed to toggle addressed:', error)
          toast.error('Failed to update fit mapping')
          handleRefresh()
        })
    },
    [vpc.id, handleRefresh]
  )

  // ========== Profile save/delete handlers ==========
  const handleProfileSave = useCallback(
    async (data: ProfileItemDetailData) => {
      if (!selectedProfileBlockId) return

      setIsLoading(true)

      try {
        if (isAddingProfileItem) {
          const result = await addProfileItemAction(customerProfile.id, selectedProfileBlockId, data.content, {
            type: data.type || undefined,
            severity: data.severity || undefined,
            importance: data.importance || undefined,
            evidence: data.evidence || undefined,
          })

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
          setSelectedProfileItemId(result.data.itemId)
          setIsAddingProfileItem(false)
        } else if (selectedProfileItemId) {
          const result = await updateProfileItemAction(
            customerProfile.id,
            selectedProfileBlockId,
            selectedProfileItemId,
            {
              content: data.content,
              type: data.type,
              severity: data.severity,
              importance: data.importance,
              evidence: data.evidence,
            }
          )
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
        console.error('Failed to save profile item:', error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [customerProfile.id, selectedProfileBlockId, selectedProfileItemId, isAddingProfileItem, handleRefresh]
  )

  const handleProfileDelete = useCallback(async () => {
    if (!selectedProfileBlockId || !selectedProfileItemId) return

    setIsLoading(true)

    try {
      const result = await deleteProfileItemAction(
        customerProfile.id,
        selectedProfileBlockId,
        selectedProfileItemId
      )
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
      clearProfileSelection()
      handleRefresh()
    } catch (error) {
      console.error('Failed to delete profile item:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [customerProfile.id, selectedProfileBlockId, selectedProfileItemId, clearProfileSelection, handleRefresh])

  // ========== Value Map save/delete handlers ==========
  const handleValueMapSave = useCallback(
    async (data: ValueMapItemDetailData) => {
      if (!selectedValueMapBlockId) return

      setIsLoading(true)

      try {
        if (isAddingValueMapItem) {
          const result = await addValueMapItemAction(valueMap.id, selectedValueMapBlockId, data.content, {
            type: data.type || undefined,
            effectiveness: data.effectiveness || undefined,
            linked_pain_id: data.linked_pain_id || undefined,
            linked_gain_id: data.linked_gain_id || undefined,
            evidence: data.evidence || undefined,
          })

          if (!result.success) {
            if (result.code === ActionErrorCode.CONFLICT) {
              toast.error('Value Map was modified by another user. Refreshing...')
              handleRefresh()
            } else {
              toast.error(result.error || 'Failed to add item')
            }
            throw new Error(result.error)
          }
          toast.success('Item added')
          setSelectedValueMapItemId(result.data.itemId)
          setIsAddingValueMapItem(false)
        } else if (selectedValueMapItemId) {
          const result = await updateValueMapItemAction(
            valueMap.id,
            selectedValueMapBlockId,
            selectedValueMapItemId,
            {
              content: data.content,
              type: data.type,
              effectiveness: data.effectiveness,
              linked_pain_id: data.linked_pain_id,
              linked_gain_id: data.linked_gain_id,
              evidence: data.evidence,
            }
          )
          if (!result.success) {
            if (result.code === ActionErrorCode.CONFLICT) {
              toast.error('Value Map was modified by another user. Refreshing...')
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
        console.error('Failed to save value map item:', error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [valueMap.id, selectedValueMapBlockId, selectedValueMapItemId, isAddingValueMapItem, handleRefresh]
  )

  const handleValueMapDelete = useCallback(async () => {
    if (!selectedValueMapBlockId || !selectedValueMapItemId) return

    setIsLoading(true)

    try {
      const result = await deleteValueMapItemAction(valueMap.id, selectedValueMapBlockId, selectedValueMapItemId)
      if (!result.success) {
        if (result.code === ActionErrorCode.CONFLICT) {
          toast.error('Value Map was modified by another user. Refreshing...')
          handleRefresh()
        } else {
          toast.error(result.error || 'Failed to delete item')
        }
        throw new Error(result.error)
      }
      toast.success('Item deleted')
      clearValueMapSelection()
      handleRefresh()
    } catch (error) {
      console.error('Failed to delete value map item:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [valueMap.id, selectedValueMapBlockId, selectedValueMapItemId, clearValueMapSelection, handleRefresh])

  // ========== Stats ==========
  const stats = useMemo(
    () =>
      getVPCStats(customerProfile, valueMap, vpc.addressed_pains, vpc.addressed_gains, vpc.addressed_jobs),
    [customerProfile, valueMap, vpc.addressed_pains, vpc.addressed_gains, vpc.addressed_jobs]
  )

  // Gap calculation
  const unaddressedPains =
    (customerProfile.pains?.items?.length || 0) - vpc.addressed_pains.items.length
  const unaddressedGains =
    (customerProfile.gains?.items?.length || 0) - vpc.addressed_gains.items.length
  const unaddressedJobs = (customerProfile.jobs?.items?.length || 0) - vpc.addressed_jobs.items.length

  return (
    <AdminErrorBoundary
      fallback={
        <ErrorState
          title="Canvas Error"
          message="Failed to render the Value Proposition Canvas. Please try refreshing."
          onRetry={handleRefresh}
        />
      }
    >
      <CanvasViewLayout
        header={
          <CanvasHeader
            title={vpc.name}
            backHref={`/admin/canvases/value-propositions/${vpc.id}/edit`}
            mode={mode}
            onModeChange={setMode}
            actions={
              <div className="flex items-center gap-3">
                <FitScoreBadge score={vpc.fit_score || 0} />
                <button
                  onClick={handleRefresh}
                  className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
                >
                  Refresh
                </button>
              </div>
            }
          />
        }
        toolbar={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {stats.profileItems} profile items, {stats.valueMapItems} value map items
              </span>
              <GapIndicator
                unaddressedPains={Math.max(0, unaddressedPains)}
                unaddressedGains={Math.max(0, unaddressedGains)}
                unaddressedJobs={Math.max(0, unaddressedJobs)}
              />
              {selectedSide === 'profile' && selectedProfileBlockId && (
                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                  Profile: {PROFILE_BLOCK_CONFIG[selectedProfileBlockId].name}
                </span>
              )}
              {selectedSide === 'valueMap' && selectedValueMapBlockId && (
                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                  Value Map: {VALUE_MAP_BLOCK_CONFIG[selectedValueMapBlockId].name}
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
            {/* Fit score details on right */}
            <FitScoreDisplay
              score={vpc.fit_score || 0}
              analysis={vpc.fit_analysis}
              showDetails
              size="sm"
            />
          </div>
        }
      >
        <CanvasSurface onBackgroundClick={clearAllSelection}>
          <VPCCanvas
            customerProfile={customerProfile}
            valueMap={valueMap}
            addressedJobs={vpc.addressed_jobs}
            addressedPains={vpc.addressed_pains}
            addressedGains={vpc.addressed_gains}
            mode={mode}
            selectedProfileBlockId={selectedProfileBlockId}
            selectedProfileItemId={selectedProfileItemId}
            onProfileBlockClick={handleProfileBlockClick}
            onProfileItemClick={handleProfileItemClick}
            onAddProfileItem={handleAddProfileItem}
            selectedValueMapBlockId={selectedValueMapBlockId}
            selectedValueMapItemId={selectedValueMapItemId}
            onValueMapBlockClick={handleValueMapBlockClick}
            onValueMapItemClick={handleValueMapItemClick}
            onAddValueMapItem={handleAddValueMapItem}
            onToggleAddressed={handleToggleAddressed}
            onBackgroundClick={clearAllSelection}
          />
        </CanvasSurface>

        {/* Profile detail panel */}
        {showProfilePanel && selectedProfileBlockId && (
          <CustomerProfileItemDetailPanel
            item={profileSelectionInfo?.item || null}
            blockId={selectedProfileBlockId}
            blockConfig={PROFILE_BLOCK_CONFIG[selectedProfileBlockId]}
            onSave={handleProfileSave}
            onDelete={selectedProfileItemId ? handleProfileDelete : undefined}
            onClose={clearProfileSelection}
            isNew={isAddingProfileItem}
          />
        )}

        {/* Value Map detail panel */}
        {showValueMapPanel && selectedValueMapBlockId && (
          <ValueMapItemDetailPanel
            item={valueMapSelectionInfo?.item || null}
            blockId={selectedValueMapBlockId}
            blockConfig={VALUE_MAP_BLOCK_CONFIG[selectedValueMapBlockId]}
            onSave={handleValueMapSave}
            onDelete={selectedValueMapItemId ? handleValueMapDelete : undefined}
            onClose={clearValueMapSelection}
            isNew={isAddingValueMapItem}
          />
        )}
      </CanvasViewLayout>
    </AdminErrorBoundary>
  )
}
