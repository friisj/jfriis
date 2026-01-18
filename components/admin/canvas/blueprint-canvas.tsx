'use client'

import { useMemo, useCallback } from 'react'
import { TimelineCanvas } from './timeline-canvas'
import { BlueprintStepHeader, AddStepButton } from './blueprint-step-header'
import { BlueprintLaneHeader, LineOfVisibility } from './blueprint-lane-header'
import { BlueprintCell } from './blueprint-cell'
import { CanvasMode } from './canvas-header'
import {
  getOrderedLayers,
  buildCellsMap,
  showLineOfVisibilityAfter,
  LAYER_CONFIG,
  type BlueprintStep,
  type BlueprintCell as CellType,
  type LayerType,
} from '@/lib/boundary-objects/blueprint-cells'

// Layer definition for TimelineCanvas
interface LayerDefinition {
  id: LayerType
  name: string
  type: LayerType
}

interface BlueprintCanvasProps {
  blueprintId: string
  steps: BlueprintStep[]
  cells: CellType[]
  mode: CanvasMode
  selectedCellKey: string | null
  onCellSelect: (stepId: string, layerType: LayerType) => void
  onStepUpdate: (stepId: string, name: string) => Promise<void>
  onStepDelete: (stepId: string) => Promise<void>
  onStepAdd: () => Promise<void>
  onStepMove: (stepId: string, direction: 'left' | 'right') => Promise<void>
  onRefresh: () => void
}

/**
 * Blueprint Canvas - Service Blueprint visualization
 *
 * Wraps TimelineCanvas with blueprint-specific:
 * - Fixed 4 content layers + line of visibility separator
 * - Step headers with inline editing
 * - Cell rendering with content preview
 */
export function BlueprintCanvas({
  blueprintId,
  steps,
  cells,
  mode,
  selectedCellKey,
  onCellSelect,
  onStepUpdate,
  onStepDelete,
  onStepAdd,
  onStepMove,
  onRefresh,
}: BlueprintCanvasProps) {
  // Build layers from fixed layer types
  const layers: LayerDefinition[] = useMemo(() => {
    return getOrderedLayers().map((type) => ({
      id: type,
      name: LAYER_CONFIG[type].name,
      type,
    }))
  }, [])

  // Build cells map for efficient lookup
  const cellsMap = useMemo(() => buildCellsMap(cells), [cells])

  // Get cell for a specific step and layer
  const getCell = useCallback(
    (stepId: string, layerType: LayerType): CellType | null => {
      return cellsMap.get(stepId)?.get(layerType) || null
    },
    [cellsMap]
  )

  // Sort steps by sequence
  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => a.sequence - b.sequence),
    [steps]
  )

  // Render cell content
  const renderCell = useCallback(
    (step: BlueprintStep, layer: LayerDefinition) => {
      const cell = getCell(step.id, layer.type)
      const cellKey = `${step.id}:${layer.type}`
      const isSelected = selectedCellKey === cellKey

      return (
        <BlueprintCell
          cell={cell}
          stepId={step.id}
          layerType={layer.type}
          isSelected={isSelected}
          onClick={() => onCellSelect(step.id, layer.type)}
        />
      )
    },
    [getCell, selectedCellKey, onCellSelect]
  )

  // Render step header
  const renderStepHeader = useCallback(
    (step: BlueprintStep, index: number) => {
      return (
        <BlueprintStepHeader
          step={step}
          index={index}
          totalSteps={sortedSteps.length}
          onUpdate={(name) => onStepUpdate(step.id, name)}
          onDelete={() => onStepDelete(step.id)}
          onMoveLeft={
            index > 0 ? () => onStepMove(step.id, 'left') : undefined
          }
          onMoveRight={
            index < sortedSteps.length - 1
              ? () => onStepMove(step.id, 'right')
              : undefined
          }
        />
      )
    },
    [sortedSteps.length, onStepUpdate, onStepDelete, onStepMove]
  )

  // Render lane header
  const renderLaneHeader = useCallback((layer: LayerDefinition) => {
    return <BlueprintLaneHeader layerType={layer.type} />
  }, [])

  // Render add step button
  const renderAddStep = useCallback(() => {
    return <AddStepButton onAdd={onStepAdd} />
  }, [onStepAdd])

  // Render separator after frontstage layer (index 1)
  const renderSeparatorAfterLayer = useCallback(
    (layerIndex: number) => {
      if (showLineOfVisibilityAfter(layerIndex)) {
        return <LineOfVisibility key="line-of-visibility" />
      }
      return null
    },
    []
  )

  // Handle cell click
  const handleCellClick = useCallback(
    (stepId: string, layerId: string) => {
      onCellSelect(stepId, layerId as LayerType)
    },
    [onCellSelect]
  )

  return (
    <TimelineCanvas
      steps={sortedSteps}
      layers={layers}
      mode={mode}
      getStepId={(step) => step.id}
      getStepName={(step) => step.name}
      getStepSequence={(step) => step.sequence}
      getLayerId={(layer) => layer.id}
      getLayerName={(layer) => layer.name}
      renderCell={renderCell}
      renderStepHeader={renderStepHeader}
      renderLaneHeader={renderLaneHeader}
      renderAddStep={renderAddStep}
      renderSeparatorAfterLayer={renderSeparatorAfterLayer}
      onCellClick={handleCellClick}
      onBackgroundClick={() => {}}
    />
  )
}
