'use client'

import { useCallback } from 'react'
import { CanvasColumnHeader, AddColumnButton } from './canvas-column-header'
import type { BlueprintStep } from '@/lib/boundary-objects/blueprint-cells'
import { STEP_NAME_MAX_LENGTH } from '@/lib/boundary-objects/blueprint-cells'

interface BlueprintStepHeaderProps {
  step: BlueprintStep
  index: number
  totalSteps: number
  onUpdate: (name: string) => Promise<void>
  onDelete: () => Promise<void>
  onMoveLeft?: () => Promise<void>
  onMoveRight?: () => Promise<void>
}

/**
 * Step column header for Blueprint canvas.
 * Uses the generic CanvasColumnHeader with Blueprint-specific configuration.
 */
export function BlueprintStepHeader({
  step,
  index,
  totalSteps,
  onUpdate,
  onDelete,
  onMoveLeft,
  onMoveRight,
}: BlueprintStepHeaderProps) {
  const getName = useCallback((s: BlueprintStep) => s.name, [])
  const getKey = useCallback((s: BlueprintStep) => s.id, [])

  return (
    <CanvasColumnHeader
      item={step}
      index={index}
      totalCount={totalSteps}
      getName={getName}
      getKey={getKey}
      orientation="vertical"
      indexLabel="Step"
      showIndex={true}
      editable={true}
      maxLength={STEP_NAME_MAX_LENGTH}
      onRename={onUpdate}
      onDelete={onDelete}
      onMoveLeft={onMoveLeft}
      onMoveRight={onMoveRight}
      deleteConfirmTitle="Delete Step?"
      deleteConfirmDescription={`This will permanently delete "${step.name}" and all its cells. This action cannot be undone.`}
    />
  )
}

interface AddStepButtonProps {
  onAdd: () => Promise<void>
  isLoading?: boolean
}

/**
 * Button to add a new step column.
 */
export function AddStepButton({ onAdd, isLoading }: AddStepButtonProps) {
  return (
    <AddColumnButton
      label="+ Step"
      onAdd={onAdd}
      isLoading={isLoading}
      variant="button"
    />
  )
}
