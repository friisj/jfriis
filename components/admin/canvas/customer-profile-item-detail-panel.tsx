'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { X, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  ProfileItem,
  ProfileBlockId,
  ProfileBlockConfig,
  JobType,
  SeverityLevel,
  ImportanceLevel,
} from '@/lib/boundary-objects/customer-profile-canvas'
import {
  JOB_TYPES,
  SEVERITY_LEVELS,
  IMPORTANCE_LEVELS,
  ITEM_CONTENT_MAX_LENGTH,
  EVIDENCE_MAX_LENGTH,
  isJobItem,
  isPainItem,
  isGainItem,
} from '@/lib/boundary-objects/customer-profile-canvas'

// ============================================================================
// Types
// ============================================================================

export interface ProfileItemDetailData {
  content: string
  type?: JobType | null
  severity?: SeverityLevel | null
  importance?: ImportanceLevel | null
  evidence?: string | null
}

export interface CustomerProfileItemDetailPanelProps {
  item: ProfileItem | null
  blockId: ProfileBlockId
  blockConfig: ProfileBlockConfig
  onSave: (data: ProfileItemDetailData) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
  isNew?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function CustomerProfileItemDetailPanel({
  item,
  blockId,
  blockConfig,
  onSave,
  onDelete,
  onClose,
  isNew = false,
}: CustomerProfileItemDetailPanelProps) {
  const [content, setContent] = useState(item?.content || '')
  // Use type guards for safe type narrowing
  const [type, setType] = useState<JobType | ''>(() => {
    if (item && isJobItem(item)) return item.type || ''
    return ''
  })
  const [severity, setSeverity] = useState<SeverityLevel | ''>(() => {
    if (item && isPainItem(item)) return item.severity || ''
    return ''
  })
  const [importance, setImportance] = useState<ImportanceLevel | ''>(() => {
    if (item && (isJobItem(item) || isGainItem(item))) return item.importance || ''
    return ''
  })
  const [evidence, setEvidence] = useState(item?.evidence || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when item changes
  useEffect(() => {
    setContent(item?.content || '')
    setType((item as { type?: JobType })?.type || '')
    setSeverity((item as { severity?: SeverityLevel })?.severity || '')
    setImportance((item as { importance?: ImportanceLevel })?.importance || '')
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
      const data: ProfileItemDetailData = {
        content: content.trim(),
        evidence: evidence.trim() || null,
      }

      // Add block-specific fields
      if (blockId === 'jobs') {
        data.type = type || null
        data.importance = importance || null
      } else if (blockId === 'pains') {
        data.severity = severity || null
      } else if (blockId === 'gains') {
        data.importance = importance || null
      }

      await onSave(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [content, type, severity, importance, evidence, blockId, onSave])

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
      case 'jobs':
        return (
          <>
            {/* Job Type Field */}
            <div>
              <label htmlFor="item-job-type" className="block text-sm font-medium mb-1.5">
                Job Type
              </label>
              <select
                id="item-job-type"
                value={type}
                onChange={(e) => setType(e.target.value as JobType | '')}
                className={cn(
                  'w-full p-2 text-sm border rounded-md',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'
                )}
              >
                <option value="">No type</option>
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Importance Field */}
            <div>
              <label htmlFor="item-job-importance" className="block text-sm font-medium mb-1.5">
                Importance
              </label>
              <select
                id="item-job-importance"
                value={importance}
                onChange={(e) => setImportance(e.target.value as ImportanceLevel | '')}
                className={cn(
                  'w-full p-2 text-sm border rounded-md',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'
                )}
              >
                <option value="">No importance set</option>
                {IMPORTANCE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level === 'nice_to_have' ? 'Nice to Have' : level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </>
        )

      case 'pains':
        return (
          <div>
            <label htmlFor="item-severity" className="block text-sm font-medium mb-1.5">
              Severity
            </label>
            <select
              id="item-severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as SeverityLevel | '')}
              className={cn(
                'w-full p-2 text-sm border rounded-md',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'
              )}
            >
              <option value="">No severity set</option>
              {SEVERITY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )

      case 'gains':
        return (
          <div>
            <label htmlFor="item-gain-importance" className="block text-sm font-medium mb-1.5">
              Importance
            </label>
            <select
              id="item-gain-importance"
              value={importance}
              onChange={(e) => setImportance(e.target.value as ImportanceLevel | '')}
              className={cn(
                'w-full p-2 text-sm border rounded-md',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'
              )}
            >
              <option value="">No importance set</option>
              {IMPORTANCE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level === 'nice_to_have' ? 'Nice to Have' : level.charAt(0).toUpperCase() + level.slice(1)}
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
