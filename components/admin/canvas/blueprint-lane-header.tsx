'use client'

import { CanvasLaneHeader, CanvasSeparator } from './canvas-lane-header'
import {
  BLUEPRINT_LAYER_CONFIG,
  type CanvasLayerDefinition,
} from '@/lib/boundary-objects/canvas-layers'
import type { LayerType } from '@/lib/boundary-objects/blueprint-cells'

interface BlueprintLaneHeaderProps {
  layerType: LayerType
}

/**
 * Layer row header for Blueprint canvas.
 * Shows layer name with color indicator.
 * Layers are fixed (not user-editable).
 */
export function BlueprintLaneHeader({
  layerType,
}: BlueprintLaneHeaderProps) {
  const layer = BLUEPRINT_LAYER_CONFIG.getLayerById(layerType)

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
        showBackground={true}
        subtitle={fallbackLayer.description}
      />
    )
  }

  return (
    <CanvasLaneHeader
      layer={layer}
      editable={false}
      showBorder={true}
      showBackground={true}
      subtitle={layer.description}
    />
  )
}

/**
 * Line of Visibility separator row.
 * Visual separator between frontstage and backstage.
 */
export function LineOfVisibility() {
  return <CanvasSeparator label="Line of Visibility" />
}
