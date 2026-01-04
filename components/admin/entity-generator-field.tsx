'use client'

/**
 * EntityGeneratorField Component
 *
 * A field for managing child entities with LLM-assisted generation.
 * Displays existing DB items + pending (localStorage) items.
 * Supports quick generate, batch generate, inline editing, and deletion.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useEntityGenerator, type PendingEntity } from '@/lib/ai/hooks/useEntityGenerator'
import { EntityGeneratorItem } from './entity-generator-item'
import { getEntityGenerationConfig } from '@/lib/ai/prompts/entity-generation'
import type { EntityType } from '@/lib/ai/types/entities'

export interface EntityGeneratorFieldProps {
  /** Field label */
  label: string
  /** Source entity info */
  sourceEntity: {
    type: string
    id: string
    data: Record<string, unknown>
  }
  /** Target entity type to generate */
  targetType: string
  /** Existing DB items */
  items: Array<{ id: string; [key: string]: unknown }>
  /** Default values for generated entities */
  defaultValues?: Record<string, unknown>
  /** Called when flushing pending items - returns success/error */
  onFlush?: (pending: PendingEntity[]) => Promise<{ success: boolean; error?: string }>
  /** Called when a DB item is deleted */
  onDeleteItem?: (id: string) => Promise<{ success: boolean; error?: string }>
  /** Field to display in collapsed view */
  displayField?: string
  /** Fields to show in expanded edit view */
  editableFields?: string[]
  /** Field hints for labels */
  fieldHints?: Record<string, string>
  /** Link pattern for editing DB items (use {id} placeholder) */
  editLinkPattern?: string
  /** Link for manually adding new item */
  addLink?: string
  /** Status field name */
  statusField?: string
  /** Whether the field is disabled */
  disabled?: boolean
}

export function EntityGeneratorField({
  label,
  sourceEntity,
  targetType,
  items,
  defaultValues = {},
  onFlush,
  onDeleteItem,
  displayField: displayFieldProp,
  editableFields: editableFieldsProp,
  fieldHints: fieldHintsProp,
  editLinkPattern,
  addLink,
  statusField = 'status',
  disabled = false,
}: EntityGeneratorFieldProps) {
  const [showBatchPopover, setShowBatchPopover] = useState(false)
  const [batchCount, setBatchCount] = useState(3)
  const [batchInstructions, setBatchInstructions] = useState('')
  const [flushError, setFlushError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Get config for target type (for defaults)
  const config = getEntityGenerationConfig(targetType as EntityType)
  const displayField = displayFieldProp || config?.displayField || 'name'
  const editableFields = editableFieldsProp || config?.editableFields || ['name', 'description']
  const fieldHints = fieldHintsProp || config?.fieldHints || {}

  // Entity generator hook - HIGH-3: pass existing items for anti-redundancy
  const {
    state,
    error,
    storageError,
    pendingItems,
    isLoadingPending,
    generate,
    generateBatch,
    updatePending,
    deletePending,
    clearError,
    stop,
    flush,
  } = useEntityGenerator({
    sourceType: sourceEntity.type,
    sourceId: sourceEntity.id,
    sourceData: sourceEntity.data,
    targetType,
    existingItems: items, // HIGH-3: Pass DB items for anti-redundancy
    defaultValues,
  })

  const isGenerating = state === 'generating'

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowBatchPopover(false)
      }
    }

    if (showBatchPopover) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showBatchPopover])

  // CRITICAL-1: Expose flush function for parent form to call
  const handleFlush = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!onFlush || pendingItems.length === 0) {
      return { success: true }
    }

    setFlushError(null)
    const result = await onFlush(pendingItems)

    if (result.success) {
      // Clear pending items after successful flush
      flush()
    } else {
      setFlushError(result.error || 'Failed to save pending items')
    }

    return result
  }, [onFlush, pendingItems, flush])

  // Register flush function on window for parent form access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = `entity-generator-flush:${sourceEntity.type}:${sourceEntity.id}:${targetType}`
      ;(window as any)[key] = handleFlush
      return () => {
        delete (window as any)[key]
      }
    }
  }, [handleFlush, sourceEntity.type, sourceEntity.id, targetType])

  const handleQuickGenerate = async () => {
    if (isGenerating) {
      stop()
      return
    }
    await generate()
  }

  const handleBatchGenerate = async () => {
    await generateBatch(batchCount, batchInstructions.trim() || undefined)
    setShowBatchPopover(false)
    setBatchInstructions('')
  }

  const handleUpdateItem = (item: { id: string } | PendingEntity, updates: Record<string, unknown>) => {
    if ('_pendingId' in item) {
      updatePending(item._pendingId, updates)
    }
    // For DB items, we'd need to call an update function
    // For now, DB items are read-only inline (use edit link for full edit)
  }

  const handleDeleteItem = async (item: { id: string } | PendingEntity) => {
    setDeleteError(null)

    if ('_pendingId' in item) {
      deletePending(item._pendingId)
    } else if (onDeleteItem) {
      const result = await onDeleteItem(item.id)
      if (!result.success) {
        setDeleteError(result.error || 'Failed to delete item')
      }
    }
  }

  // Combine DB items and pending items
  const allItems = [
    ...items.map((item) => ({ ...item, _isPending: false })),
    ...pendingItems.map((item) => ({ ...item, _isPending: true })),
  ]

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>

        <div className="relative inline-flex items-center gap-1">
          {/* Quick Generate */}
          <button
            type="button"
            onClick={handleQuickGenerate}
            disabled={disabled}
            aria-label={isGenerating ? 'Stop generation' : 'Generate one item'}
            className={`
              inline-flex items-center justify-center
              w-7 h-7 rounded-md
              text-sm font-medium
              transition-colors
              ${isGenerating
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={isGenerating ? 'Stop generation' : 'Generate one'}
          >
            {isGenerating ? (
              <span aria-hidden="true" className="animate-spin">◌</span>
            ) : (
              <span aria-hidden="true">✨</span>
            )}
          </button>

          {/* Batch Generate Popover Trigger */}
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setShowBatchPopover(!showBatchPopover)}
              disabled={disabled || isGenerating}
              aria-label="Generate multiple items"
              className={`
                inline-flex items-center justify-center
                w-7 h-7 rounded-md
                text-sm font-medium
                transition-colors
                hover:bg-muted text-muted-foreground hover:text-foreground
                ${disabled || isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title="Generate multiple"
            >
              <span aria-hidden="true">⚙️</span>
              <span className="text-[10px] ml-0.5">▾</span>
            </button>

            {/* Batch Popover */}
            {showBatchPopover && (
              <div className="absolute right-0 top-full mt-1 z-50 w-64 p-3 rounded-lg border bg-popover shadow-lg">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Generate
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={batchCount}
                        onChange={(e) => setBatchCount(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-16 px-2 py-1 text-sm rounded border bg-background"
                      />
                      <span className="text-sm text-muted-foreground">
                        {targetType.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Focus on (optional)
                    </label>
                    <textarea
                      value={batchInstructions}
                      onChange={(e) => setBatchInstructions(e.target.value)}
                      placeholder="e.g., focus on onboarding experience..."
                      className="w-full h-16 px-2 py-1.5 text-sm rounded border bg-background resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleBatchGenerate}
                    className="w-full px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Generate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Displays */}
      {error && (
        <div className="p-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>{error.message}</span>
          <button
            type="button"
            onClick={clearError}
            className="text-red-400 hover:text-red-600"
          >
            ×
          </button>
        </div>
      )}

      {storageError && (
        <div className="p-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-sm text-amber-600 dark:text-amber-400">
          {storageError}
        </div>
      )}

      {flushError && (
        <div className="p-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 text-sm text-red-600 dark:text-red-400">
          {flushError}
        </div>
      )}

      {deleteError && (
        <div className="p-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>{deleteError}</span>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            className="text-red-400 hover:text-red-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoadingPending ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      ) : allItems.length > 0 ? (
        /* Items List */
        <div className="space-y-2">
          {allItems.map((item) => (
            <EntityGeneratorItem
              key={'_pendingId' in item ? item._pendingId : item.id}
              item={item}
              isPending={item._isPending}
              displayField={displayField}
              editableFields={editableFields}
              fieldHints={fieldHints}
              statusField={statusField}
              onUpdate={(updates) => handleUpdateItem(item, updates)}
              onDelete={() => handleDeleteItem(item)}
              editLink={
                !item._isPending && editLinkPattern
                  ? editLinkPattern.replace('{id}', item.id)
                  : undefined
              }
              disabled={disabled}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-2">
          No {targetType.replace(/_/g, ' ')} yet.
        </p>
      )}

      {/* Add Link */}
      {addLink && (
        <a
          href={addLink}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          + Add manually
        </a>
      )}

      {/* Pending Count Indicator */}
      {pendingItems.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {pendingItems.length} pending {pendingItems.length === 1 ? 'item' : 'items'} will be saved with the project
        </p>
      )}
    </div>
  )
}

/**
 * Helper to call flush from parent form
 */
export async function flushEntityGenerator(
  sourceType: string,
  sourceId: string,
  targetType: string
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: true }
  }

  const key = `entity-generator-flush:${sourceType}:${sourceId}:${targetType}`
  const flushFn = (window as any)[key]

  if (flushFn) {
    return await flushFn()
  }

  return { success: true }
}
