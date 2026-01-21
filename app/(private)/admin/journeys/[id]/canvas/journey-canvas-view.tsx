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
import { JourneyCanvas } from '@/components/admin/canvas/journey-canvas'
import { JourneyCellDetailPanel } from '@/components/admin/canvas/journey-cell-detail-panel'
import {
  createCellAction,
  updateCellAction,
  createStageAction,
  updateStageAction,
  deleteStageAction,
  moveStageAction,
} from './actions'
import {
  JOURNEY_LAYER_CONFIG,
  buildJourneyCellsMap,
  type JourneyStage,
  type JourneyCell,
  type JourneyLayerType,
  type UserJourney,
  type Touchpoint,
} from '@/lib/boundary-objects/journey-cells'
import { TouchpointDetailPanel } from '@/components/admin/canvas/touchpoint-detail-panel'

interface CellUpdateData {
  content?: string | null
  emotion_score?: number | null
  channel_type?: string | null
}

interface JourneyCanvasViewProps {
  journey: UserJourney
  stages: JourneyStage[]
  cells: JourneyCell[]
  touchpoints: Touchpoint[]
}

export function JourneyCanvasView({
  journey,
  stages,
  cells,
  touchpoints,
}: JourneyCanvasViewProps) {
  const router = useRouter()
  const [mode, setMode] = useState<CanvasMode>('structured')
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null)

  // Sort stages by sequence
  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.sequence - b.sequence),
    [stages]
  )

  // Build cells map for efficient lookup
  const cellsMap = useMemo(() => buildJourneyCellsMap(cells), [cells])

  // Build touchpoints map per stage for efficient lookup
  const touchpointsMap = useMemo(() => {
    const map = new Map<string, Touchpoint[]>()
    for (const tp of touchpoints) {
      const existing = map.get(tp.journey_stage_id) || []
      existing.push(tp)
      map.set(tp.journey_stage_id, existing)
    }
    // Sort each stage's touchpoints by sequence
    for (const [stageId, tps] of map) {
      map.set(stageId, tps.sort((a, b) => a.sequence - b.sequence))
    }
    return map
  }, [touchpoints])

  // Parse selected cell info
  const selectedCell = useMemo(() => {
    if (!selectedCellKey) return null
    const [stageId, layerType] = selectedCellKey.split(':')
    const stage = sortedStages.find((s) => s.id === stageId)
    if (!stage) return null
    const cell = cellsMap.get(stageId)?.get(layerType as JourneyLayerType) || null
    const stageTouchpoints = touchpointsMap.get(stageId) || []
    return {
      stageId,
      stageName: stage.name,
      layerType: layerType as JourneyLayerType,
      cell,
      touchpoints: stageTouchpoints,
    }
  }, [selectedCellKey, sortedStages, cellsMap, touchpointsMap])

  const handleRefresh = useCallback(() => {
    router.refresh()
  }, [router])

  // Handle cell selection
  const handleCellSelect = useCallback(
    (stageId: string, layerType: JourneyLayerType) => {
      if (mode === 'structured') {
        const key = `${stageId}:${layerType}`
        setSelectedCellKey((prev) => (prev === key ? null : key))
      }
    },
    [mode]
  )

  const handleCellClose = useCallback(() => {
    setSelectedCellKey(null)
  }, [])

  // Handle cell save (create or update)
  const handleCellSave = useCallback(
    async (data: CellUpdateData) => {
      if (!selectedCell) return

      const { stageId, layerType, cell } = selectedCell

      try {
        if (cell) {
          // Update existing cell
          const result = await updateCellAction(cell.id, data)
          if (!result.success) {
            toast.error(result.error || 'Failed to update cell')
            throw new Error(result.error)
          }
          toast.success('Cell updated')
        } else {
          // Create new cell
          const result = await createCellAction(stageId, layerType, data)
          if (!result.success) {
            toast.error(result.error || 'Failed to create cell')
            throw new Error(result.error)
          }
          toast.success('Cell created')
        }

        handleRefresh()
      } catch (error) {
        console.error('Failed to save cell:', error)
        throw error
      }
    },
    [selectedCell, handleRefresh]
  )

  // Stage management handlers
  const handleStageUpdate = useCallback(
    async (stageId: string, name: string) => {
      const result = await updateStageAction(stageId, { name })
      if (!result.success) {
        toast.error(result.error || 'Failed to update stage')
        throw new Error(result.error)
      }
      toast.success('Stage updated')
      handleRefresh()
    },
    [handleRefresh]
  )

  const handleStageDelete = useCallback(
    async (stageId: string) => {
      const result = await deleteStageAction(stageId)
      if (!result.success) {
        toast.error(result.error || 'Failed to delete stage')
        throw new Error(result.error)
      }
      toast.success('Stage deleted')
      // Clear selection if deleted stage was selected
      if (selectedCellKey?.startsWith(stageId)) {
        setSelectedCellKey(null)
      }
      handleRefresh()
    },
    [selectedCellKey, handleRefresh]
  )

  const handleStageAdd = useCallback(async () => {
    const result = await createStageAction(
      journey.id,
      `Stage ${sortedStages.length + 1}`,
      sortedStages.length
    )
    if (!result.success) {
      toast.error(result.error || 'Failed to create stage')
      throw new Error(result.error)
    }
    toast.success('Stage created')
    handleRefresh()
  }, [journey.id, sortedStages.length, handleRefresh])

  const handleStageMove = useCallback(
    async (stageId: string, direction: 'left' | 'right') => {
      const result = await moveStageAction(stageId, direction)
      if (!result.success) {
        toast.error(result.error || 'Failed to move stage')
        throw new Error(result.error)
      }
      handleRefresh()
    },
    [handleRefresh]
  )

  return (
    <CanvasViewLayout
      header={
        <CanvasHeader
          title={journey.name}
          backHref={`/admin/journeys/${journey.id}`}
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
              {sortedStages.length} stage{sortedStages.length !== 1 ? 's' : ''},{' '}
              {cells.length} cell{cells.length !== 1 ? 's' : ''}
            </span>
            {selectedCell && (
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                {selectedCell.stageName} / {JOURNEY_LAYER_CONFIG[selectedCell.layerType].name}
              </span>
            )}
          </div>
        </div>
      }
    >
      <CanvasSurface onBackgroundClick={handleCellClose}>
        <JourneyCanvas
          journeyId={journey.id}
          stages={sortedStages}
          cells={cells}
          touchpointsMap={touchpointsMap}
          mode={mode}
          selectedCellKey={selectedCellKey}
          onCellSelect={handleCellSelect}
          onStageUpdate={handleStageUpdate}
          onStageDelete={handleStageDelete}
          onStageAdd={handleStageAdd}
          onStageMove={handleStageMove}
          onRefresh={handleRefresh}
        />
      </CanvasSurface>

      {/* Cell detail panel - different panel for touchpoint vs other layers */}
      {selectedCell && selectedCell.layerType === 'touchpoint' ? (
        <TouchpointDetailPanel
          stageId={selectedCell.stageId}
          stageName={selectedCell.stageName}
          touchpoints={selectedCell.touchpoints}
          onClose={handleCellClose}
          onRefresh={handleRefresh}
        />
      ) : selectedCell ? (
        <JourneyCellDetailPanel
          cell={selectedCell.cell}
          stageName={selectedCell.stageName}
          layerType={selectedCell.layerType}
          onSave={handleCellSave}
          onClose={handleCellClose}
        />
      ) : null}
    </CanvasViewLayout>
  )
}
