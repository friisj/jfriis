'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { X, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  ValueMapItem,
  ValueMapBlockId,
  ValueMapBlockConfig,
  ProductType,
  EffectivenessLevel,
} from '@/lib/boundary-objects/value-map-canvas'
import {
  PRODUCT_TYPES,
  EFFECTIVENESS_LEVELS,
  ITEM_CONTENT_MAX_LENGTH,
  EVIDENCE_MAX_LENGTH,
  isProductItem,
  isPainRelieverItem,
  isGainCreatorItem,
} from '@/lib/boundary-objects/value-map-canvas'

// ============================================================================
// Types
// ============================================================================

export interface ValueMapItemDetailData {
  content: string
  type?: ProductType | null
  effectiveness?: EffectivenessLevel | null
  linked_pain_id?: string | null
  linked_gain_id?: string | null
  evidence?: string | null
}

export interface ValueMapItemDetailPanelProps {
  item: ValueMapItem | null
  blockId: ValueMapBlockId
  blockConfig: ValueMapBlockConfig
  onSave: (data: ValueMapItemDetailData) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
  isNew?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function ValueMapItemDetailPanel({
  item,
  blockId,
  blockConfig,
  onSave,
  onDelete,
  onClose,
  isNew = false,
}: ValueMapItemDetailPanelProps) {
  const [content, setContent] = useState(item?.content || '')
  // Use type guards for safe type narrowing
  const [type, setType] = useState<ProductType | ''>(() => {
    if (item && isProductItem(item)) return item.type || ''
    return ''
  })
  const [effectiveness, setEffectiveness] = useState<EffectivenessLevel | ''>(() => {
    if (item && (isPainRelieverItem(item) || isGainCreatorItem(item))) return item.effectiveness || ''
    return ''
  })
  const [evidence, setEvidence] = useState(item?.evidence || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when item changes
  useEffect(() => {
    setContent(item?.content || '')
    setType((item as { type?: ProductType })?.type || '')
    setEffectiveness((item as { effectiveness?: EffectivenessLevel })?.effectiveness || '')
    setEvidence(item?.evidence || '')
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
      const data: ValueMapItemDetailData = {
        content: content.trim(),
        evidence: evidence.trim() || null,
      }

      // Add block-specific fields
      if (blockId === 'products_services') {
        data.type = type || null
      } else if (blockId === 'pain_relievers' || blockId === 'gain_creators') {
        data.effectiveness = effectiveness || null
      }

      await onSave(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [content, type, effectiveness, evidence, blockId, onSave])

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

  // Render block-specific fields
  const renderBlockFields = () => {
    switch (blockId) {
      case 'products_services':
        return (
          <div>
            <label htmlFor="item-product-type" className="block text-sm font-medium mb-1.5">
              Type
            </label>
            <select
              id="item-product-type"
              value={type}
              onChange={(e) => setType(e.target.value as ProductType | '')}
              className={cn(
                'w-full p-2 text-sm border rounded-md',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'
              )}
            >
              <option value="">No type</option>
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )

      case 'pain_relievers':
      case 'gain_creators':
        return (
          <div>
            <label htmlFor="item-effectiveness" className="block text-sm font-medium mb-1.5">
              Effectiveness
            </label>
            <select
              id="item-effectiveness"
              value={effectiveness}
              onChange={(e) => setEffectiveness(e.target.value as EffectivenessLevel | '')}
              className={cn(
                'w-full p-2 text-sm border rounded-md',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'
              )}
            >
              <option value="">No effectiveness set</option>
              {EFFECTIVENESS_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )

      default:
        return null
    }
  }

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
          <label htmlFor="item-content" className="block text-sm font-medium mb-1.5">
            Content <span className="text-destructive">*</span>
          </label>
          <textarea
            id="item-content"
            aria-describedby="item-content-hint"
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
            <span id="item-content-hint" className="text-xs text-muted-foreground">
              {content.length}/{ITEM_CONTENT_MAX_LENGTH}
            </span>
          </div>
        </div>

        {/* Block-specific fields */}
        {renderBlockFields()}

        {/* Evidence Field */}
        <div>
          <label htmlFor="item-evidence" className="block text-sm font-medium mb-1.5">
            Evidence
          </label>
          <textarea
            id="item-evidence"
            aria-describedby="item-evidence-hint"
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="What evidence supports this item?"
            className={cn(
              'w-full min-h-[60px] p-2 text-sm border rounded-md resize-y',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'
            )}
          />
          <div className="flex justify-between mt-1">
            <span id="item-evidence-hint" className="text-xs text-muted-foreground">
              {evidence.length}/{EVIDENCE_MAX_LENGTH}
            </span>
          </div>
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
