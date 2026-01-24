'use client'

import { useState, useRef, useEffect, useCallback, type ReactNode, memo } from 'react'
import { MoreHorizontal, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
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
import type { CanvasLayerDefinition } from '@/lib/boundary-objects/canvas-layers'
import { getTailwindBgClass } from '@/lib/boundary-objects/canvas-layers'

// ============================================================================
// Types
// ============================================================================

export interface CanvasLaneHeaderProps {
  /** Layer definition with id, name, color, etc. */
  layer: CanvasLayerDefinition

  /** Zero-based index of this layer (for reordering) */
  index?: number

  /** Total number of layers (for reordering) */
  totalLayers?: number

  /** Whether the layer name is editable */
  editable?: boolean

  /** Maximum length for the name input */
  maxLength?: number

  /** Called when the name is updated */
  onRename?: (newName: string) => Promise<void>

  /** Called when deleting */
  onDelete?: () => Promise<void>

  /** Delete confirmation message */
  deleteConfirmDescription?: string

  /** Called when moving up (decreasing index) */
  onMoveUp?: () => void | Promise<void>

  /** Called when moving down (increasing index) */
  onMoveDown?: () => void | Promise<void>

  /** Whether this layer can move up */
  canMoveUp?: boolean

  /** Whether this layer can move down */
  canMoveDown?: boolean

  /** Width class (default: w-40) */
  width?: string

  /** Whether to show background color from layer definition */
  showBackground?: boolean

  /** Whether to show border color from layer definition */
  showBorder?: boolean

  /** Additional content to render below the name (e.g., layer type) */
  subtitle?: string | ReactNode

  /** Whether an operation is in progress */
  isLoading?: boolean

  /** Additional class name for the container */
  className?: string
}

// ============================================================================
// Color Mapping
// ============================================================================

/**
 * Map semantic color names to Tailwind border-l classes.
 */
const COLOR_TO_BORDER_CLASS: Record<string, string> = {
  blue: 'border-l-blue-500',
  green: 'border-l-green-500',
  orange: 'border-l-orange-500',
  purple: 'border-l-purple-500',
  pink: 'border-l-pink-500',
  red: 'border-l-red-500',
  yellow: 'border-l-yellow-500',
  gray: 'border-l-gray-500',
  indigo: 'border-l-indigo-500',
  cyan: 'border-l-cyan-500',
  teal: 'border-l-teal-500',
}

function getBorderClass(color: string | undefined): string {
  if (!color) return 'border-l-gray-300'
  return COLOR_TO_BORDER_CLASS[color.toLowerCase()] ?? 'border-l-gray-300'
}

// ============================================================================
// Component
// ============================================================================

/**
 * Generic lane (row) header component for timeline canvases.
 * Supports both fixed layers (read-only) and dynamic layers (editable).
 * Memoized to prevent unnecessary re-renders.
 */
function CanvasLaneHeaderInner({
  layer,
  index = 0,
  totalLayers = 1,
  editable = false,
  maxLength = 100,
  onRename,
  onDelete,
  deleteConfirmDescription,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  width = 'w-40',
  showBackground = false,
  showBorder = true,
  subtitle,
  isLoading: externalLoading,
  className = '',
}: CanvasLaneHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(layer.name)
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

  // Reset edit value when layer name changes
  useEffect(() => {
    setEditValue(layer.name)
  }, [layer.name])

  const handleSave = useCallback(async () => {
    const trimmed = editValue.trim()

    if (trimmed === layer.name || !trimmed) {
      setEditValue(layer.name)
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
      setEditValue(layer.name)
    } finally {
      setIsLoading(false)
    }
  }, [editValue, layer.name, onRename])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      } else if (e.key === 'Escape') {
        setEditValue(layer.name)
        setIsEditing(false)
        setError(null)
      }
    },
    [handleSave, layer.name]
  )

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

  // Determine if move buttons should show based on position
  const showMoveUp = canMoveUp ?? (index > 0 && !!onMoveUp)
  const showMoveDown = canMoveDown ?? (index < totalLayers - 1 && !!onMoveDown)

  // Build has menu check
  const hasMenu = editable || onMoveUp || onMoveDown || onDelete

  // Build style classes
  const borderClass = showBorder ? `border-l-4 ${getBorderClass(layer.color)}` : ''
  const bgClass = showBackground ? getTailwindBgClass(layer.color) : ''

  // Default delete description
  const finalDeleteDescription =
    deleteConfirmDescription ??
    `This will delete the "${layer.name}" layer. Contents may be affected.`

  return (
    <>
      <div
        className={`${width} flex-shrink-0 p-3 border-r font-medium text-sm relative group ${borderClass} ${bgClass} ${className}`}
      >
        {/* Name - click to edit (if editable) */}
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
          <div
            onClick={editable ? startEditing : undefined}
            className={`truncate ${editable ? 'cursor-pointer hover:text-primary' : ''}`}
            title={editable ? `Click to rename: ${layer.name}` : layer.name}
          >
            {layer.name}
          </div>
        )}

        {/* Subtitle (e.g., description or layer type) */}
        {subtitle && !isEditing && (
          <div className="text-xs text-muted-foreground font-normal mt-0.5 truncate">
            {subtitle}
          </div>
        )}

        {/* Error message */}
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}

        {/* Actions menu (only for editable layers) */}
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
              {showMoveUp && onMoveUp && (
                <DropdownMenuItem onClick={() => onMoveUp()}>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Move Up
                </DropdownMenuItem>
              )}
              {showMoveDown && onMoveDown && (
                <DropdownMenuItem onClick={() => onMoveDown()}>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Move Down
                </DropdownMenuItem>
              )}
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
        <AlertDialog open={showDeleteDialog} onOpenChange={(open) => !loading && setShowDeleteDialog(open)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Layer?</AlertDialogTitle>
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

// Memoize
export const CanvasLaneHeader = memo(CanvasLaneHeaderInner)

// ============================================================================
// Separator Component
// ============================================================================

export interface CanvasSeparatorProps {
  /** Label for the separator (e.g., "Line of Visibility") */
  label: string
  /** Width class for the label column (should match lane headers) */
  width?: string
  /** Additional class name */
  className?: string
}

/**
 * Horizontal separator row for canvases.
 * Used for Line of Visibility in Blueprint canvas.
 */
export function CanvasSeparator({
  label,
  width = 'w-40',
  className = '',
}: CanvasSeparatorProps) {
  return (
    <div
      className={`flex items-center border-b border-dashed border-gray-400 bg-gray-50 ${className}`}
    >
      <div
        className={`${width} flex-shrink-0 p-2 border-r font-medium text-xs text-gray-500 text-center`}
      >
        {label}
      </div>
      <div className="flex-1 border-t border-dashed border-gray-400" />
    </div>
  )
}
