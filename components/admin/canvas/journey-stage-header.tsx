'use client'

import { useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { CanvasColumnHeader } from './canvas-column-header'
import type { JourneyStage } from '@/lib/boundary-objects/journey-cells'

interface JourneyStageHeaderProps {
  stage: JourneyStage
  index: number
  totalStages: number
  onUpdate: (name: string) => Promise<void>
  onDelete: () => Promise<void>
  onMoveLeft?: () => Promise<void>
  onMoveRight?: () => Promise<void>
}

/**
 * Stage column header for Journey canvas.
 * Uses the generic CanvasColumnHeader with Journey-specific configuration.
 */
export function JourneyStageHeader({
  stage,
  index,
  totalStages,
  onUpdate,
  onDelete,
  onMoveLeft,
  onMoveRight,
}: JourneyStageHeaderProps) {
  const getName = useCallback((s: JourneyStage) => s.name, [])
  const getKey = useCallback((s: JourneyStage) => s.id, [])

  return (
    <CanvasColumnHeader
      item={stage}
      index={index}
      totalCount={totalStages}
      getName={getName}
      getKey={getKey}
      orientation="horizontal"
      showIndex={true}
      editable={true}
      onRename={onUpdate}
      onDelete={onDelete}
      onMoveLeft={onMoveLeft}
      onMoveRight={onMoveRight}
      deleteConfirmTitle="Delete Stage"
      deleteConfirmDescription={`Are you sure you want to delete "${stage.name}"? This will also delete all cells in this stage. This action cannot be undone.`}
    />
  )
}

interface AddStageButtonProps {
  onAdd: () => Promise<void>
}

/**
 * Button to add a new stage.
 */
export function AddStageButton({ onAdd }: AddStageButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleAdd = async () => {
    setIsLoading(true)
    try {
      await onAdd()
    } catch (error) {
      console.error('Failed to add stage:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleAdd}
      disabled={isLoading}
      className="h-8"
    >
      <Plus className="h-4 w-4 mr-1" />
      {isLoading ? 'Adding...' : 'Add Stage'}
    </Button>
  )
}
