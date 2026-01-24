'use client'

import { CanvasLaneHeader } from './canvas-lane-header'
import {
  JOURNEY_LAYER_CONFIG,
  type CanvasLayerDefinition,
} from '@/lib/boundary-objects/canvas-layers'
import type { JourneyLayerType } from '@/lib/boundary-objects/journey-cells'

interface JourneyLaneHeaderProps {
  layerType: JourneyLayerType
}

/**
 * Lane row header for Journey canvas.
 * Shows layer name with color accent.
 * Layers are fixed (not user-editable).
 */
export function JourneyLaneHeader({
  layerType,
}: JourneyLaneHeaderProps) {
  const layer = JOURNEY_LAYER_CONFIG.getLayerById(layerType)

  if (!layer) {
    // Fallback for unknown layer types
    const fallbackLayer: CanvasLayerDefinition = {
      id: layerType,
      name: layerType,
      color: 'gray',
    }
    return (
      <CanvasLaneHeader
        layer={fallbackLayer}
        editable={false}
        showBorder={true}
        showBackground={false}
        subtitle={fallbackLayer.description}
      />
    )
  }

  return (
    <CanvasLaneHeader
      layer={layer}
      editable={false}
      showBorder={true}
      showBackground={false}
      subtitle={layer.description}
    />
  )
}
