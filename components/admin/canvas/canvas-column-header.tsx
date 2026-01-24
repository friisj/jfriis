'use client'

import { useState, useRef, useEffect, useCallback, type ReactNode, memo } from 'react'
import { MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { toast } from 'sonner'

// ============================================================================
// Types
// ============================================================================

export interface MenuAction {
  label: string
  icon?: ReactNode
  onClick: () => void
  variant?: 'default' | 'destructive'
}

export interface CanvasColumnHeaderProps<T> {
  /** The data item this header represents */
  item: T

  /** Zero-based index of this column */
  index: number

  /** Total number of columns */
  totalCount: number

  /** Function to extract the display name from the item */
  getName: (item: T) => string

  /** Function to extract a unique key from the item */
  getKey: (item: T) => string

  /**
   * Layout orientation:
   * - 'vertical': Step number on top, name below (Blueprint style)
   * - 'horizontal': Number and name inline (Journey/Story Map style)
   */
  orientation?: 'vertical' | 'horizontal'

  /** Label for the column number (e.g., "Step", "Stage") */
  indexLabel?: string

  /** Whether to show the index number */
  showIndex?: boolean

  /** Whether the name is editable */
  editable?: boolean

  /** Maximum length for the name input */
  maxLength?: number

  /** Called when the name is updated */
  onRename?: (newName: string) => Promise<void>

  /** Additional menu actions beyond rename/move/delete */
  menuActions?: MenuAction[]

  /** Whether this column can move left */
  canMoveLeft?: boolean

  /** Whether this column can move right */
  canMoveRight?: boolean

  /** Called when moving left */
  onMoveLeft?: () => void | Promise<void>

  /** Called when moving right */
  onMoveRight?: () => void | Promise<void>

  /** Called when deleting */
  onDelete?: () => Promise<void>

  /** Message shown in delete confirmation dialog */
  deleteConfirmTitle?: string

  /** Description shown in delete confirmation dialog */
  deleteConfirmDescription?: string

  /** Optional description to show below the name */
  description?: string | null

  /** Whether an operation is in progress */
  isLoading?: boolean

  /** Additional class name for the container */
  className?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * Generic column header component for timeline canvases.
 * Supports inline editing, dropdown menu with actions, and reordering.
 * Memoized to prevent unnecessary re-renders.
 */
function CanvasColumnHeaderInner<T>({
  item,
  index,
  totalCount,
  getName,
  getKey,
  orientation = 'horizontal',
  indexLabel,
  showIndex = true,
  editable = true,
  maxLength = 100,
  onRename,
  menuActions = [],
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
  onDelete,
  deleteConfirmTitle = 'Delete Column?',
  deleteConfirmDescription,
  description,
  isLoading: externalLoading,
  className = '',
}: CanvasColumnHeaderProps<T>) {
  const name = getName(item)
  const key = getKey(item)

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(name)
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loading = isLoading || externalLoading

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Reset edit value when item name changes
  useEffect(() => {
    setEditValue(name)
  }, [name])

  const handleSave = useCallback(async () => {
    const trimmed = editValue.trim()

    if (trimmed === name || !trimmed) {
      setEditValue(name)
      setIsEditing(false)
      setError(null)
      return
    }

    if (!onRename) {
      setIsEditing(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onRename(trimmed)
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update name:', err)
      const message = err instanceof Error ? err.message : 'Failed to update name'
      setError(message)
      toast.error(message)
      setEditValue(name)
    } finally {
      setIsLoading(false)
    }
  }, [editValue, name, onRename])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(name)
      setIsEditing(false)
      setError(null)
    }
  }, [handleSave, name])

  const handleDelete = useCallback(async () => {
    if (!onDelete) return

    setIsLoading(true)
    try {
      await onDelete()
    } catch (err) {
      console.error('Failed to delete:', err)
      const message = err instanceof Error ? err.message : 'Failed to delete'
      toast.error(message)
    } finally {
      setIsLoading(false)
      setShowDeleteDialog(false)
    }
  }, [onDelete])

  const startEditing = useCallback(() => {
    if (editable) {
      setIsEditing(true)
      setError(null)
    }
  }, [editable])

  // Build dropdown menu items
  const hasMenu = editable || onMoveLeft || onMoveRight || onDelete || menuActions.length > 0

  // Determine if move buttons should show based on position
  const showMoveLeft = canMoveLeft ?? (index > 0 && !!onMoveLeft)
  const showMoveRight = canMoveRight ?? (index < totalCount - 1 && !!onMoveRight)

  // Default delete description
  const finalDeleteDescription = deleteConfirmDescription
    ?? `This will permanently delete "${name}" and all its contents. This action cannot be undone.`

  // ============================================================================
  // Render
  // ============================================================================

  if (orientation === 'vertical') {
    // Vertical layout (Blueprint style)
    return (
      <div className={`p-3 h-full flex flex-col items-center justify-center group relative ${className}`}>
        {/* Index label */}
        {showIndex && indexLabel && (
          <span className="text-xs text-muted-foreground mb-1">
            {indexLabel} {index + 1}
          </span>
        )}

        {/* Name - click to edit */}
        {isEditing ? (
          <div className="flex flex-col items-center gap-0.5">
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              disabled={loading}
              maxLength={maxLength}
              title="Press Enter to save, Escape to cancel"
              className={`text-sm text-center h-7 max-w-[150px] ${
                editValue.length > maxLength - 10 ? 'border-orange-500' : ''
              }`}
            />
            {editValue.length > maxLength - 10 && (
              <span className="text-[10px] text-muted-foreground">
                {maxLength - editValue.length} remaining
              </span>
            )}
          </div>
        ) : (
          <button
            onClick={startEditing}
            aria-label={editable ? `Edit name: ${name}` : name}
            className={`font-medium text-sm transition-colors ${
              editable ? 'hover:text-primary cursor-text' : 'cursor-default'
            }`}
            disabled={!editable}
          >
            {name}
          </button>
        )}

        {/* Error message */}
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}

        {/* Actions menu */}
        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={loading}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {editable && onRename && (
                <DropdownMenuItem onClick={startEditing}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
              )}
              {showMoveLeft && onMoveLeft && (
                <DropdownMenuItem onClick={() => onMoveLeft()}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Move Left
                </DropdownMenuItem>
              )}
              {showMoveRight && onMoveRight && (
                <DropdownMenuItem onClick={() => onMoveRight()}>
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Move Right
                </DropdownMenuItem>
              )}
              {menuActions.map((action, i) => (
                <DropdownMenuItem
                  key={i}
                  onClick={action.onClick}
                  className={action.variant === 'destructive' ? 'text-destructive' : ''}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Delete confirmation dialog */}
        {onDelete && (
          <AlertDialog open={showDeleteDialog} onOpenChange={(open) => !loading && setShowDeleteDialog(open)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{deleteConfirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>{finalDeleteDescription}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    )
  }

  // Horizontal layout (Journey/Story Map style)
  return (
    <>
      <div className={`flex items-center justify-between p-3 group ${className}`}>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              disabled={loading}
              maxLength={maxLength}
              className="h-7 text-sm font-medium"
            />
          ) : (
            <button
              onClick={startEditing}
              className={`text-sm font-medium transition-colors text-left truncate w-full ${
                editable ? 'hover:text-primary' : 'cursor-default'
              }`}
              title={name}
              aria-label={editable ? `Edit column: ${name}` : name}
              disabled={!editable}
            >
              {showIndex && (
                <span className="text-muted-foreground mr-1.5">{index + 1}.</span>
              )}
              {name}
            </button>
          )}

          {/* Description */}
          {description && !isEditing && (
            <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {description}
            </div>
          )}

          {/* Error message */}
          {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
        </div>

        {/* Actions menu */}
        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1"
                disabled={loading}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {editable && onRename && (
                <DropdownMenuItem onClick={startEditing}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
              )}
              {showMoveLeft && onMoveLeft && (
                <DropdownMenuItem onClick={() => onMoveLeft()}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Move Left
                </DropdownMenuItem>
              )}
              {showMoveRight && onMoveRight && (
                <DropdownMenuItem onClick={() => onMoveRight()}>
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Move Right
                </DropdownMenuItem>
              )}
              {menuActions.map((action, i) => (
                <DropdownMenuItem
                  key={i}
                  onClick={action.onClick}
                  className={action.variant === 'destructive' ? 'text-destructive' : ''}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {onDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{deleteConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>{finalDeleteDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={loading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}

// Memoize with generic support
export const CanvasColumnHeader = memo(CanvasColumnHeaderInner) as typeof CanvasColumnHeaderInner

// ============================================================================
// Add Button Component
// ============================================================================

export interface AddColumnButtonProps {
  /** Label for the button (e.g., "+ Step", "+ Stage", "+ Activity") */
  label: string

  /** Called when adding a new column */
  onAdd: () => Promise<void>

  /** Whether an operation is in progress */
  isLoading?: boolean

  /** Additional class name */
  className?: string

  /** Variant style */
  variant?: 'button' | 'inline'
}

/**
 * Generic button to add a new column.
 */
export function AddColumnButton({
  label,
  onAdd,
  isLoading: externalLoading,
  className = '',
  variant = 'button',
}: AddColumnButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const loading = isLoading || externalLoading

  const handleClick = async () => {
    setIsLoading(true)
    try {
      await onAdd()
    } catch (err) {
      console.error('Failed to add:', err)
      const message = err instanceof Error ? err.message : 'Failed to add'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (variant === 'inline') {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className={`min-w-[120px] p-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors whitespace-nowrap disabled:opacity-50 ${className}`}
      >
        {loading ? '...' : label}
      </button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className={`h-full min-h-[60px] w-full text-muted-foreground hover:text-foreground ${className}`}
    >
      {loading ? '...' : label}
    </Button>
  )
}
