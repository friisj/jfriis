'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import type { BlueprintStep } from '@/lib/boundary-objects/blueprint-cells'

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
 * Step column header with inline editing and actions menu.
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
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(step.name)
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    if (editValue.trim() === step.name) {
      setIsEditing(false)
      return
    }
    if (!editValue.trim()) {
      setEditValue(step.name)
      setIsEditing(false)
      return
    }

    setIsLoading(true)
    try {
      await onUpdate(editValue.trim())
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update step:', error)
      setEditValue(step.name)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(step.name)
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await onDelete()
    } catch (error) {
      console.error('Failed to delete step:', error)
    } finally {
      setIsLoading(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <div className="p-3 h-full flex flex-col items-center justify-center group relative">
      {/* Step number */}
      <span className="text-xs text-muted-foreground mb-1">Step {index + 1}</span>

      {/* Step name - click to edit */}
      {isEditing ? (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="text-sm text-center h-7 max-w-[150px]"
        />
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="font-medium text-sm hover:text-primary transition-colors cursor-text"
        >
          {step.name}
        </button>
      )}

      {/* Actions menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>
          {index > 0 && onMoveLeft && (
            <DropdownMenuItem onClick={onMoveLeft}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Move Left
            </DropdownMenuItem>
          )}
          {index < totalSteps - 1 && onMoveRight && (
            <DropdownMenuItem onClick={onMoveRight}>
              <ChevronRight className="h-4 w-4 mr-2" />
              Move Right
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Step?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{step.name}&quot; and all its cells.
              This action cannot be undone.
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
    </div>
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
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      await onAdd()
    } catch (error) {
      console.error('Failed to add step:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={loading || isLoading}
      className="h-full min-h-[60px] w-full text-muted-foreground hover:text-foreground"
    >
      {loading ? '...' : '+ Step'}
    </Button>
  )
}
