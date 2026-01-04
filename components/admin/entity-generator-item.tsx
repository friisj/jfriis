'use client'

/**
 * EntityGeneratorItem Component
 *
 * Renders a single item in the EntityGeneratorField list.
 * Supports:
 * - Collapsed view with inline text editing
 * - Expanded view with all editable fields
 * - Delete action
 * - Pending state visual distinction
 */

import { useState, useRef, useEffect } from 'react'

export interface EntityGeneratorItemProps {
  /** The item data */
  item: Record<string, unknown>
  /** Whether this is a pending (unsaved) item */
  isPending: boolean
  /** Field to display in collapsed view */
  displayField: string
  /** Fields to show in expanded view */
  editableFields: string[]
  /** Field hints for labels */
  fieldHints?: Record<string, string>
  /** Status field name (for status indicator) */
  statusField?: string
  /** Callback when item is updated */
  onUpdate: (updates: Record<string, unknown>) => void
  /** Callback when item is deleted */
  onDelete: () => void
  /** Link to full edit page (for DB items) */
  editLink?: string
  /** Whether editing is disabled */
  disabled?: boolean
}

export function EntityGeneratorItem({
  item,
  isPending,
  displayField,
  editableFields,
  fieldHints = {},
  statusField = 'status',
  onUpdate,
  onDelete,
  editLink,
  disabled = false,
}: EntityGeneratorItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditingInline, setIsEditingInline] = useState(false)
  const [inlineValue, setInlineValue] = useState('')
  const inlineInputRef = useRef<HTMLInputElement>(null)

  const displayValue = String(item[displayField] || '')
  const status = item[statusField] as string | undefined

  // Focus inline input when editing starts
  useEffect(() => {
    if (isEditingInline && inlineInputRef.current) {
      inlineInputRef.current.focus()
      inlineInputRef.current.select()
    }
  }, [isEditingInline])

  const handleInlineEdit = () => {
    if (disabled) return
    setInlineValue(displayValue)
    setIsEditingInline(true)
  }

  const handleInlineBlur = () => {
    if (inlineValue.trim() && inlineValue !== displayValue) {
      onUpdate({ [displayField]: inlineValue.trim() })
    }
    setIsEditingInline(false)
  }

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInlineBlur()
    } else if (e.key === 'Escape') {
      setIsEditingInline(false)
    }
  }

  const handleFieldChange = (field: string, value: string) => {
    onUpdate({ [field]: value })
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isPending) {
      // Instant delete for pending items
      onDelete()
    } else {
      // Confirm for DB items
      if (confirm('Delete this item? This cannot be undone.')) {
        onDelete()
      }
    }
  }

  const getStatusIndicator = () => {
    if (!status) return '○'
    switch (status) {
      case 'validated':
      case 'completed':
        return '✓'
      case 'invalidated':
      case 'abandoned':
        return '✗'
      case 'testing':
      case 'in_progress':
        return '◐'
      default:
        return '○'
    }
  }

  const getStatusColor = () => {
    if (!status) return 'text-gray-400'
    switch (status) {
      case 'validated':
      case 'completed':
        return 'text-green-500'
      case 'invalidated':
      case 'abandoned':
        return 'text-red-500'
      case 'testing':
      case 'in_progress':
        return 'text-blue-500'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <div
      className={`border rounded-lg transition-colors ${
        isPending
          ? 'border-dashed border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/10'
          : 'border-border'
      } ${isExpanded ? 'bg-muted/30' : ''}`}
    >
      {/* Collapsed Row */}
      <div
        className={`flex items-center gap-2 px-3 py-2 ${
          !isExpanded ? 'cursor-pointer hover:bg-muted/50' : ''
        }`}
        onClick={() => !isEditingInline && setIsExpanded(!isExpanded)}
      >
        {/* Expand/Collapse Arrow */}
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
        >
          <span className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
            ▸
          </span>
        </button>

        {/* Status Indicator */}
        <span className={`text-sm ${getStatusColor()}`}>{getStatusIndicator()}</span>

        {/* Display Field (Inline Editable) */}
        <div className="flex-1 min-w-0">
          {isEditingInline ? (
            <input
              ref={inlineInputRef}
              type="text"
              value={inlineValue}
              onChange={(e) => setInlineValue(e.target.value)}
              onBlur={handleInlineBlur}
              onKeyDown={handleInlineKeyDown}
              className="w-full px-2 py-1 text-sm rounded border bg-background"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={`text-sm truncate block ${
                !disabled ? 'cursor-text hover:text-primary' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation()
                handleInlineEdit()
              }}
              title={displayValue}
            >
              {displayValue || <span className="text-muted-foreground italic">Empty</span>}
            </span>
          )}
        </div>

        {/* Pending Badge */}
        {isPending && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            pending
          </span>
        )}

        {/* Edit Link (for DB items) */}
        {editLink && !isPending && (
          <a
            href={editLink}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => e.stopPropagation()}
            title="Edit in full page"
          >
            ⚙️
          </a>
        )}

        {/* Delete Button */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={disabled}
          className="p-1 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
          title="Delete"
        >
          ×
        </button>
      </div>

      {/* Expanded Fields */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-3">
          {editableFields.map((field) => (
            <div key={field}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {fieldHints[field] || field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </label>
              <textarea
                value={String(item[field] || '')}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                disabled={disabled}
                rows={2}
                className="w-full px-2 py-1.5 text-sm rounded border bg-background resize-none disabled:opacity-50"
                placeholder={fieldHints[field] || `Enter ${field.replace(/_/g, ' ')}...`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
