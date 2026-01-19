'use client'

import { useMemo, useCallback } from 'react'
import { TimelineCanvas } from './timeline-canvas'
import { JourneyStageHeader, AddStageButton } from './journey-stage-header'
import { JourneyLaneHeader } from './journey-lane-header'
import { JourneyCell } from './journey-cell'
import { CanvasMode } from './canvas-header'
import {
  getOrderedJourneyLayers,
  buildJourneyCellsMap,
  JOURNEY_LAYER_CONFIG,
  type JourneyStage,
  type JourneyCell as CellType,
  type JourneyLayerType,
} from '@/lib/boundary-objects/journey-cells'

// Layer definition for TimelineCanvas
interface LayerDefinition {
  id: JourneyLayerType
  name: string
  type: JourneyLayerType
}

interface JourneyCanvasProps {
  journeyId: string
  stages: JourneyStage[]
  cells: CellType[]
  mode: CanvasMode
  selectedCellKey: string | null
  onCellSelect: (stageId: string, layerType: JourneyLayerType) => void
  onStageUpdate: (stageId: string, name: string) => Promise<void>
  onStageDelete: (stageId: string) => Promise<void>
  onStageAdd: () => Promise<void>
  onStageMove: (stageId: string, direction: 'left' | 'right') => Promise<void>
  onRefresh: () => void
}

/**
 * Journey Canvas - Customer Journey visualization
 *
 * Wraps TimelineCanvas with journey-specific:
 * - 5 layers (touchpoint, emotion, pain_point, channel, opportunity)
 * - Stage headers with inline editing
 * - Cell rendering with layer-specific content
 */
export function JourneyCanvas({
  journeyId,
  stages,
  cells,
  mode,
  selectedCellKey,
  onCellSelect,
  onStageUpdate,
  onStageDelete,
  onStageAdd,
  onStageMove,
  onRefresh,
}: JourneyCanvasProps) {
  // Build layers from fixed layer types
  const layers: LayerDefinition[] = useMemo(() => {
    return getOrderedJourneyLayers().map((type) => ({
      id: type,
      name: JOURNEY_LAYER_CONFIG[type].name,
      type,
    }))
  }, [])

  // Build cells map for efficient lookup
  const cellsMap = useMemo(() => buildJourneyCellsMap(cells), [cells])

  // Get cell for a specific stage and layer
  const getCell = useCallback(
    (stageId: string, layerType: JourneyLayerType): CellType | null => {
      return cellsMap.get(stageId)?.get(layerType) || null
    },
    [cellsMap]
  )

  // Sort stages by sequence
  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.sequence - b.sequence),
    [stages]
  )

  // Render cell content
  const renderCell = useCallback(
    (stage: JourneyStage, layer: LayerDefinition) => {
      const cell = getCell(stage.id, layer.type)
      const cellKey = `${stage.id}:${layer.type}`
      const isSelected = selectedCellKey === cellKey

      return (
        <JourneyCell
          cell={cell}
          stageId={stage.id}
          layerType={layer.type}
          isSelected={isSelected}
          onClick={() => onCellSelect(stage.id, layer.type)}
        />
      )
    },
    [getCell, selectedCellKey, onCellSelect]
  )

  // Render stage header
  const renderStageHeader = useCallback(
    (stage: JourneyStage, index: number) => {
      return (
        <JourneyStageHeader
          stage={stage}
          index={index}
          totalStages={sortedStages.length}
          onUpdate={(name) => onStageUpdate(stage.id, name)}
          onDelete={() => onStageDelete(stage.id)}
          onMoveLeft={
            index > 0 ? () => onStageMove(stage.id, 'left') : undefined
          }
          onMoveRight={
            index < sortedStages.length - 1
              ? () => onStageMove(stage.id, 'right')
              : undefined
          }
        />
      )
    },
    [sortedStages.length, onStageUpdate, onStageDelete, onStageMove]
  )

  // Render lane header
  const renderLaneHeader = useCallback((layer: LayerDefinition) => {
    return <JourneyLaneHeader layerType={layer.type} />
  }, [])

  // Render add stage button
  const renderAddStage = useCallback(() => {
    return <AddStageButton onAdd={onStageAdd} />
  }, [onStageAdd])

  // Handle cell click
  const handleCellClick = useCallback(
    (stageId: string, layerId: string) => {
      onCellSelect(stageId, layerId as JourneyLayerType)
    },
    [onCellSelect]
  )

  return (
    <TimelineCanvas
      steps={sortedStages}
      layers={layers}
      mode={mode}
      getStepId={(stage) => stage.id}
      getStepName={(stage) => stage.name}
      getStepSequence={(stage) => stage.sequence}
      getLayerId={(layer) => layer.id}
      getLayerName={(layer) => layer.name}
      renderCell={renderCell}
      renderStepHeader={renderStageHeader}
      renderLaneHeader={renderLaneHeader}
      renderAddStep={renderAddStage}
      emptyStateMessage='No stages defined. Click "+ Add Stage" to create your first stage.'
      onCellClick={handleCellClick}
      onBackgroundClick={() => {}}
    />
  )
}
