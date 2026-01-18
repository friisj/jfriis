'use client'

import { memo } from 'react'
import type { BlueprintCell as CellType, LayerType } from '@/lib/boundary-objects/blueprint-cells'

interface BlueprintCellProps {
  cell: CellType | null
  stepId: string
  layerType: LayerType
  isSelected: boolean
  onClick: () => void
}

// Background colors for cells (lighter versions of lane colors)
const CELL_BG_COLORS: Record<LayerType, string> = {
  customer_action: 'hover:bg-blue-50/50',
  frontstage: 'hover:bg-green-50/50',
  backstage: 'hover:bg-orange-50/50',
  support_process: 'hover:bg-purple-50/50',
}

/**
 * Individual cell in the Blueprint canvas grid.
 * Displays cell content and handles selection.
 *
 * Memoized to prevent re-renders when parent re-renders but cell props unchanged.
 */
export const BlueprintCell = memo(function BlueprintCell({
  cell,
  layerType,
  isSelected,
  onClick,
}: BlueprintCellProps) {
  const hasContent = cell?.content && cell.content.trim().length > 0
  const bgHover = CELL_BG_COLORS[layerType]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <div
      className={`
        h-full min-h-[80px] p-2 transition-all cursor-pointer rounded
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
        ${bgHover}
        ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}
      `}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onKeyDown={handleKeyDown}
      role="gridcell"
      tabIndex={0}
      aria-selected={isSelected}
      aria-label={hasContent ? `Cell with content: ${cell?.content?.slice(0, 50)}` : 'Empty cell - click to add content'}
    >
      {hasContent ? (
        <div className="text-sm leading-relaxed">
          <p className="line-clamp-4">{cell.content}</p>
          {/* Optional metadata indicators */}
          {(cell.actors || cell.duration_estimate || cell.cost_implication || cell.failure_risk) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {cell.actors && (
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                  {cell.actors.split(',').length} actor(s)
                </span>
              )}
              {cell.duration_estimate && (
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                  {cell.duration_estimate}
                </span>
              )}
              {cell.failure_risk && cell.failure_risk !== 'none' && (
                <RiskBadge risk={cell.failure_risk} />
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-muted-foreground/50 text-sm">
          Click to add
        </div>
      )}
    </div>
  )
})

// Risk badge component - memoized for performance
const RiskBadge = memo(function RiskBadge({ risk }: { risk: string }) {
  const colors: Record<string, string> = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
  }

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${colors[risk] || 'bg-gray-100 text-gray-600'}`}>
      {risk} risk
    </span>
  )
})
