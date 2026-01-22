'use client'

import { memo } from 'react'
import {
  JOURNEY_LAYER_CONFIG,
  type JourneyLayerType,
} from '@/lib/boundary-objects/journey-cells'

// Tailwind border color classes for layer types
const LAYER_BORDER_CLASSES: Record<JourneyLayerType, string> = {
  touchpoint: 'border-l-blue-500',
  emotion: 'border-l-pink-500',
  pain_point: 'border-l-orange-500',
  channel: 'border-l-green-500',
  opportunity: 'border-l-purple-500',
}

interface JourneyLaneHeaderProps {
  layerType: JourneyLayerType
}

/**
 * Lane row header showing layer name with color accent.
 * Memoized to prevent unnecessary re-renders.
 */
export const JourneyLaneHeader = memo(function JourneyLaneHeader({
  layerType,
}: JourneyLaneHeaderProps) {
  const config = JOURNEY_LAYER_CONFIG[layerType]
  const borderClass = LAYER_BORDER_CLASSES[layerType]

  return (
    <div
      className={`w-40 flex-shrink-0 p-3 border-r font-medium text-sm border-l-4 ${borderClass}`}
    >
      <div className="truncate" title={config.name}>
        {config.name}
      </div>
      <div className="text-xs text-muted-foreground font-normal truncate" title={config.description}>
        {config.description}
      </div>
    </div>
  )
})
