'use client'

import { ReactNode } from 'react'
import { CanvasMode } from './canvas-header'

/**
 * TimelineCanvas - Shared grid component for timeline-based canvases
 *
 * Used by: Blueprint Canvas, Journey Canvas
 *
 * Pattern: Steps × Layers grid where:
 * - Steps = columns (sequential phases)
 * - Layers = rows (different perspectives/levels)
 */

export interface TimelineCanvasProps<TStep, TLayer> {
  /** Step data (columns) */
  steps: TStep[]
  /** Layer definitions (rows) */
  layers: TLayer[]
  /** Current canvas mode */
  mode: CanvasMode

  // Configuration getters
  getStepId: (step: TStep) => string
  getStepName: (step: TStep) => string
  getStepSequence: (step: TStep) => number
  getLayerId: (layer: TLayer) => string
  getLayerName: (layer: TLayer) => string
  getLayerColor?: (layer: TLayer) => string

  // Render slots
  renderCell: (step: TStep, layer: TLayer, stepIndex: number, layerIndex: number) => ReactNode
  renderStepHeader?: (step: TStep, index: number) => ReactNode
  renderLaneHeader?: (layer: TLayer, index: number) => ReactNode
  renderAddStep?: () => ReactNode
  /** Render a separator row (e.g., Line of Visibility) after specific layer index */
  renderSeparatorAfterLayer?: (layerIndex: number) => ReactNode | null

  // Callbacks
  onCellClick?: (stepId: string, layerId: string) => void
  onBackgroundClick?: () => void
}

/**
 * Generic timeline grid component.
 * Renders steps as columns and layers as rows with optional separators.
 */
export function TimelineCanvas<TStep, TLayer>({
  steps,
  layers,
  mode,
  getStepId,
  getStepName,
  getStepSequence,
  getLayerId,
  getLayerName,
  getLayerColor,
  renderCell,
  renderStepHeader,
  renderLaneHeader,
  renderAddStep,
  renderSeparatorAfterLayer,
  onCellClick,
  onBackgroundClick,
}: TimelineCanvasProps<TStep, TLayer>) {
  // Sort steps by sequence
  const sortedSteps = [...steps].sort(
    (a, b) => getStepSequence(a) - getStepSequence(b)
  )

  // Default step header renderer
  const defaultStepHeader = (step: TStep, index: number) => (
    <div className="flex-1 min-w-[180px] p-3 border-r text-center font-medium text-sm">
      <span className="text-muted-foreground mr-2">{index + 1}.</span>
      {getStepName(step)}
    </div>
  )

  // Default lane header renderer
  const defaultLaneHeader = (layer: TLayer) => {
    const color = getLayerColor?.(layer)
    return (
      <div
        className="w-40 flex-shrink-0 p-3 border-r font-medium text-sm"
        style={color ? { borderLeftColor: color, borderLeftWidth: 4 } : undefined}
      >
        {getLayerName(layer)}
      </div>
    )
  }

  return (
    <div className="min-w-max p-6" onClick={onBackgroundClick}>
      <div className="border rounded-lg overflow-hidden bg-background">
        {/* Header row with step names */}
        <div className="flex border-b bg-muted/50">
          {/* Row label column */}
          <div className="w-40 flex-shrink-0 p-3 border-r font-medium text-sm text-muted-foreground">
            Layer
          </div>
          {/* Step columns */}
          {sortedSteps.map((step, index) =>
            renderStepHeader ? (
              <div key={getStepId(step)} className="flex-1 min-w-[180px] border-r">
                {renderStepHeader(step, index)}
              </div>
            ) : (
              <div key={getStepId(step)}>
                {defaultStepHeader(step, index)}
              </div>
            )
          )}
          {/* Add step button */}
          {renderAddStep && (
            <div className="min-w-[100px] flex items-center justify-center">
              {renderAddStep()}
            </div>
          )}
        </div>

        {/* Grid rows - one per layer */}
        {layers.map((layer, layerIndex) => (
          <div key={getLayerId(layer)}>
            {/* Layer row */}
            <div className="flex border-b last:border-b-0">
              {/* Layer label */}
              {renderLaneHeader ? (
                renderLaneHeader(layer, layerIndex)
              ) : (
                defaultLaneHeader(layer)
              )}
              {/* Cells */}
              {sortedSteps.map((step, stepIndex) => (
                <div
                  key={`${getStepId(step)}-${getLayerId(layer)}`}
                  className={`
                    flex-1 min-w-[180px] min-h-[80px] p-2 border-r last:border-r-0
                    ${mode === 'structured' ? 'cursor-pointer hover:bg-muted/30' : ''}
                  `}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (mode === 'structured' && onCellClick) {
                      onCellClick(getStepId(step), getLayerId(layer))
                    }
                  }}
                >
                  {renderCell(step, layer, stepIndex, layerIndex)}
                </div>
              ))}
              {/* Empty cell under Add Step button */}
              {renderAddStep && <div className="min-w-[100px] border-r" />}
            </div>

            {/* Separator row (e.g., Line of Visibility) */}
            {renderSeparatorAfterLayer?.(layerIndex)}
          </div>
        ))}

        {/* Empty state */}
        {steps.length === 0 && (
          <div className="p-6 text-center text-muted-foreground">
            No steps defined. Click &quot;+ Add Step&quot; to create your first step.
          </div>
        )}
      </div>
    </div>
  )
}
