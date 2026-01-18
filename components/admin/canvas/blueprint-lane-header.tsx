'use client'

import { LAYER_CONFIG, type LayerType } from '@/lib/boundary-objects/blueprint-cells'

interface BlueprintLaneHeaderProps {
  layerType: LayerType
}

// Tailwind color classes for layer types
// Using Tailwind's semantic color classes for theme consistency
const LAYER_BORDER_CLASSES: Record<LayerType, string> = {
  customer_action: 'border-l-blue-500',
  frontstage: 'border-l-green-500',
  backstage: 'border-l-orange-500',
  support_process: 'border-l-purple-500',
}

const LAYER_BG_CLASSES: Record<LayerType, string> = {
  customer_action: 'bg-blue-50 dark:bg-blue-950/30',
  frontstage: 'bg-green-50 dark:bg-green-950/30',
  backstage: 'bg-orange-50 dark:bg-orange-950/30',
  support_process: 'bg-purple-50 dark:bg-purple-950/30',
}

/**
 * Layer row header for Blueprint canvas.
 * Shows layer name with color indicator.
 * Layers are fixed (not user-editable).
 */
export function BlueprintLaneHeader({ layerType }: BlueprintLaneHeaderProps) {
  const config = LAYER_CONFIG[layerType]
  const borderClass = LAYER_BORDER_CLASSES[layerType]
  const bgClass = LAYER_BG_CLASSES[layerType]

  return (
    <div
      className={`w-40 flex-shrink-0 p-3 border-r border-l-4 font-medium text-sm ${borderClass} ${bgClass}`}
    >
      <div className="flex flex-col">
        <span className="font-medium">{config.name}</span>
        <span className="text-xs text-muted-foreground mt-0.5">
          {config.description}
        </span>
      </div>
    </div>
  )
}

/**
 * Line of Visibility separator row.
 * Visual separator between frontstage and backstage.
 */
export function LineOfVisibility() {
  return (
    <div className="flex items-center border-b border-dashed border-gray-400 bg-gray-50">
      <div className="w-40 flex-shrink-0 p-2 border-r font-medium text-xs text-gray-500 text-center">
        Line of Visibility
      </div>
      <div className="flex-1 border-t border-dashed border-gray-400" />
    </div>
  )
}
