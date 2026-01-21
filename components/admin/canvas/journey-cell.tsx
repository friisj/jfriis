'use client'

import { memo } from 'react'
import {
  type JourneyCell as CellType,
  type JourneyLayerType,
  type Touchpoint,
  getEmotionEmoji,
  getEmotionBgClass,
} from '@/lib/boundary-objects/journey-cells'

interface JourneyCellProps {
  cell: CellType | null
  stageId: string
  layerType: JourneyLayerType
  touchpoints?: Touchpoint[]
  isSelected: boolean
  onClick: () => void
}

// Background colors for cells (lighter versions of lane colors)
const CELL_BG_COLORS: Record<JourneyLayerType, string> = {
  touchpoint: 'hover:bg-blue-50/50',
  emotion: 'hover:bg-pink-50/50',
  pain_point: 'hover:bg-orange-50/50',
  channel: 'hover:bg-green-50/50',
  opportunity: 'hover:bg-purple-50/50',
}

/**
 * Individual cell in the Journey canvas grid.
 * Displays cell content with layer-specific rendering.
 *
 * Memoized to prevent re-renders when parent re-renders but cell props unchanged.
 */
export const JourneyCell = memo(function JourneyCell({
  cell,
  layerType,
  touchpoints = [],
  isSelected,
  onClick,
}: JourneyCellProps) {
  const bgHover = CELL_BG_COLORS[layerType]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  // Render touchpoint layer - displays actual touchpoint entities
  if (layerType === 'touchpoint') {
    return (
      <TouchpointCell
        touchpoints={touchpoints}
        isSelected={isSelected}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        bgHover={bgHover}
      />
    )
  }

  // Render emotion layer specially
  if (layerType === 'emotion') {
    return (
      <EmotionCell
        cell={cell}
        isSelected={isSelected}
        onClick={onClick}
        onKeyDown={handleKeyDown}
      />
    )
  }

  // Render channel layer with badge
  if (layerType === 'channel' && cell?.channel_type) {
    return (
      <ChannelCell
        cell={cell}
        isSelected={isSelected}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        bgHover={bgHover}
      />
    )
  }

  // Default cell rendering (for pain_point, opportunity layers)
  const hasContent = cell?.content && cell.content.trim().length > 0

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
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-muted-foreground/50 text-sm">
          Click to add
        </div>
      )}
    </div>
  )
})

// Touchpoint cell - displays touchpoint entities linked to this stage
const TouchpointCell = memo(function TouchpointCell({
  touchpoints,
  isSelected,
  onClick,
  onKeyDown,
  bgHover,
}: {
  touchpoints: Touchpoint[]
  isSelected: boolean
  onClick: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  bgHover: string
}) {
  const hasTouchpoints = touchpoints.length > 0

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
      onKeyDown={onKeyDown}
      role="gridcell"
      tabIndex={0}
      aria-selected={isSelected}
      aria-label={hasTouchpoints ? `${touchpoints.length} touchpoint(s)` : 'No touchpoints - click to add'}
    >
      {hasTouchpoints ? (
        <div className="space-y-1">
          {touchpoints.slice(0, 3).map((tp) => (
            <div
              key={tp.id}
              className="text-xs p-1.5 bg-blue-50 border border-blue-200 rounded truncate"
              title={tp.name}
            >
              {tp.name}
            </div>
          ))}
          {touchpoints.length > 3 && (
            <div className="text-xs text-muted-foreground text-center">
              +{touchpoints.length - 3} more
            </div>
          )}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-muted-foreground/50 text-sm">
          Click to add touchpoint
        </div>
      )}
    </div>
  )
})

// Emotion cell with score visualization
const EmotionCell = memo(function EmotionCell({
  cell,
  isSelected,
  onClick,
  onKeyDown,
}: {
  cell: CellType | null
  isSelected: boolean
  onClick: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}) {
  const hasScore = cell?.emotion_score !== null && cell?.emotion_score !== undefined
  const score = cell?.emotion_score ?? null
  const emoji = getEmotionEmoji(score)
  const bgClass = getEmotionBgClass(score)
  const hasContent = cell?.content && cell.content.trim().length > 0

  return (
    <div
      className={`
        h-full min-h-[80px] p-2 transition-all cursor-pointer rounded
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
        ${bgClass}
        ${isSelected ? 'ring-2 ring-primary' : ''}
      `}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onKeyDown={onKeyDown}
      role="gridcell"
      tabIndex={0}
      aria-selected={isSelected}
      aria-label={hasScore ? `Emotion score: ${score}` : 'No emotion score set'}
    >
      {hasScore || hasContent ? (
        <div className="flex flex-col items-center justify-center h-full gap-1">
          {hasScore && (
            <>
              <span className="text-2xl" role="img" aria-label={`Emotion: ${emoji}`}>
                {emoji}
              </span>
              <span className="text-sm font-medium">
                {score !== null && score > 0 ? `+${score}` : score}
              </span>
            </>
          )}
          {hasContent && (
            <p className="text-xs text-center line-clamp-2 text-muted-foreground mt-1">
              {cell.content}
            </p>
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

// Channel cell with channel type badge
const ChannelCell = memo(function ChannelCell({
  cell,
  isSelected,
  onClick,
  onKeyDown,
  bgHover,
}: {
  cell: CellType
  isSelected: boolean
  onClick: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  bgHover: string
}) {
  const hasContent = cell.content && cell.content.trim().length > 0

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
      onKeyDown={onKeyDown}
      role="gridcell"
      tabIndex={0}
      aria-selected={isSelected}
    >
      <div className="text-sm leading-relaxed">
        {cell.channel_type && (
          <span className="inline-block px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded mb-1">
            {cell.channel_type}
          </span>
        )}
        {hasContent && <p className="line-clamp-3">{cell.content}</p>}
      </div>
    </div>
  )
})
