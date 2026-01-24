'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { CanvasLaneHeader } from './canvas-lane-header'
import {
  updateLayerNameAction,
  deleteLayerAction,
  createLayerAction,
} from '@/app/(private)/admin/story-maps/[id]/canvas/actions'
import type { StoryMapLayer } from '@/lib/boundary-objects/story-map-layers'
import {
  LAYER_NAME_MAX_LENGTH,
} from '@/lib/boundary-objects/story-map-layers'
import {
  type CanvasLayerDefinition,
  STORY_MAP_LAYER_COLORS,
} from '@/lib/boundary-objects/canvas-layers'

interface LayerHeaderProps {
  layer: StoryMapLayer
  index?: number
  totalLayers?: number
  onUpdate: () => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

/**
 * Layer row header for Story Map canvas.
 * Uses the generic CanvasLaneHeader with Story Map-specific configuration.
 * Layers are dynamic and editable.
 */
export function LayerHeader({
  layer,
  index = 0,
  totalLayers = 1,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: LayerHeaderProps) {
  // Convert StoryMapLayer to CanvasLayerDefinition
  const layerDefinition: CanvasLayerDefinition = {
    id: layer.id,
    name: layer.name,
    description: layer.description ?? undefined,
    color: STORY_MAP_LAYER_COLORS[index % STORY_MAP_LAYER_COLORS.length],
  }

  const handleRename = useCallback(async (newName: string) => {
    const result = await updateLayerNameAction(layer.id, newName)
    if (!result.success) {
      throw new Error(result.error)
    }
    onUpdate()
  }, [layer.id, onUpdate])

  const handleDelete = useCallback(async () => {
    const result = await deleteLayerAction(layer.id)
    if (!result.success) {
      throw new Error(result.error)
    }
    onDelete()
  }, [layer.id, onDelete])

  // Subtitle showing layer type if available
  const subtitle = layer.layer_type
    ? layer.layer_type.replace(/_/g, ' ')
    : undefined

  return (
    <CanvasLaneHeader
      layer={layerDefinition}
      index={index}
      totalLayers={totalLayers}
      editable={true}
      maxLength={LAYER_NAME_MAX_LENGTH}
      onRename={handleRename}
      onDelete={handleDelete}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      deleteConfirmDescription={`Delete layer "${layer.name}"? Stories in this layer will lose their layer assignment.`}
      showBorder={true}
      showBackground={true}
      subtitle={subtitle}
    />
  )
}

interface AddLayerButtonProps {
  storyMapId: string
  nextSequence: number
  onAdd: () => void
}

/**
 * Button/inline input to add a new layer.
 * Handles the inline input state locally since it needs to collect a name before creating.
 */
export function AddLayerButton({ storyMapId, nextSequence, onAdd }: AddLayerButtonProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

  const handleAdd = async () => {
    if (!newName.trim()) {
      setIsAdding(false)
      return
    }

    setIsSaving(true)
    setError(null)

    const result = await createLayerAction(storyMapId, newName, nextSequence)

    setIsSaving(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    onAdd()
    setNewName('')
    setIsAdding(false)
  }

  if (isAdding) {
    return (
      <div className="flex border-b last:border-b-0">
        <div className="w-40 flex-shrink-0 p-3 border-r bg-muted/30">
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleAdd}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') {
                setNewName('')
                setIsAdding(false)
                setError(null)
              }
            }}
            maxLength={LAYER_NAME_MAX_LENGTH}
            disabled={isSaving}
            placeholder="Layer name..."
            className="w-full px-1 py-0.5 text-sm border rounded bg-background disabled:opacity-50"
          />
          {error && (
            <div className="text-xs text-red-600 mt-1">{error}</div>
          )}
        </div>
        <div className="flex-1 p-3 text-sm text-muted-foreground">
          {isSaving ? 'Creating...' : 'Press Enter to add, Escape to cancel'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex border-b last:border-b-0">
      <button
        onClick={() => setIsAdding(true)}
        className="w-40 flex-shrink-0 p-3 border-r text-left text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        + Add Layer
      </button>
      <div className="flex-1" />
    </div>
  )
}
