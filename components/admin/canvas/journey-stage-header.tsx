'use client'

import { useState, useRef, useEffect, memo } from 'react'
import { MoreHorizontal, Pencil, Trash2, ArrowLeft, ArrowRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
 * Stage column header with inline editing and actions menu.
 * Memoized to prevent unnecessary re-renders.
 */
export const JourneyStageHeader = memo(function JourneyStageHeader({
  stage,
  index,
  totalStages,
  onUpdate,
  onDelete,
  onMoveLeft,
  onMoveRight,
}: JourneyStageHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(stage.name)
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Reset edit value when stage changes
  useEffect(() => {
    setEditValue(stage.name)
  }, [stage.name])

  const handleSave = async () => {
    if (editValue.trim() === stage.name) {
      setIsEditing(false)
      return
    }

    if (!editValue.trim()) {
      setEditValue(stage.name)
      setIsEditing(false)
      return
    }

    setIsLoading(true)
    try {
      await onUpdate(editValue.trim())
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update stage:', error)
      setEditValue(stage.name)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(stage.name)
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await onDelete()
    } catch (error) {
      console.error('Failed to delete stage:', error)
    } finally {
      setIsLoading(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between p-3 group">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="h-7 text-sm font-medium"
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm font-medium hover:text-primary transition-colors text-left truncate w-full"
              title={stage.name}
            >
              <span className="text-muted-foreground mr-1.5">{index + 1}.</span>
              {stage.name}
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1"
              disabled={isLoading}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Stage options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            {onMoveLeft && (
              <DropdownMenuItem onClick={onMoveLeft}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Move Left
              </DropdownMenuItem>
            )}
            {onMoveRight && (
              <DropdownMenuItem onClick={onMoveRight}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Move Right
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{stage.name}&quot;? This will also
              delete all cells in this stage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
})

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
