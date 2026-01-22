'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { X, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BMCItem, ItemPriority, BMCBlockConfig } from '@/lib/boundary-objects/bmc-canvas'

// ============================================================================
// Types
// ============================================================================

export interface BMCItemDetailPanelProps {
  item: BMCItem | null
  blockConfig: BMCBlockConfig
  onSave: (data: { content: string; priority: ItemPriority | null }) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
  isNew?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function BMCItemDetailPanel({
  item,
  blockConfig,
  onSave,
  onDelete,
  onClose,
  isNew = false,
}: BMCItemDetailPanelProps) {
  const [content, setContent] = useState(item?.content || '')
  const [priority, setPriority] = useState<ItemPriority | ''>(item?.priority || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when item changes
  useEffect(() => {
    setContent(item?.content || '')
    setPriority(item?.priority || '')
    setError(null)
  }, [item])

  const handleSave = useCallback(async () => {
    if (!content.trim()) {
      setError('Content is required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onSave({
        content: content.trim(),
        priority: priority || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [content, priority, onSave])

  const handleDelete = useCallback(async () => {
    if (!onDelete) return

    const confirmed = window.confirm('Delete this item? This cannot be undone.')
    if (!confirmed) return

    setIsDeleting(true)
    setError(null)

    try {
      await onDelete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
      setIsDeleting(false)
    }
  }, [onDelete])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, handleSave])

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-background border-l shadow-lg flex flex-col z-10">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: blockConfig.color }}
          />
          <h3 className="font-medium">
            {isNew ? 'New Item' : 'Edit Item'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Block Info */}
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{blockConfig.name}</span>
          <p className="text-xs mt-1">{blockConfig.description}</p>
        </div>

        {/* Content Field */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Content <span className="text-destructive">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              setError(null)
            }}
            placeholder={`Describe this ${blockConfig.shortName.toLowerCase()} item...`}
            className={cn(
              'w-full min-h-[100px] p-2 text-sm border rounded-md resize-y',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
              error && 'border-destructive'
            )}
            autoFocus={isNew}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              {content.length}/500
            </span>
          </div>
        </div>

        {/* Priority Field */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as ItemPriority | '')}
            className={cn(
              'w-full p-2 text-sm border rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'
            )}
          >
            <option value="">No priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t flex items-center justify-between">
        {/* Delete Button */}
        {!isNew && onDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting || isSaving}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md',
              'text-destructive hover:bg-destructive/10 transition-colors',
              (isDeleting || isSaving) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Delete
          </button>
        )}

        {/* Save Button */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={onClose}
            disabled={isSaving || isDeleting}
            className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isDeleting || !content.trim()}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md',
              'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
              (isSaving || isDeleting || !content.trim()) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isNew ? 'Add Item' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
