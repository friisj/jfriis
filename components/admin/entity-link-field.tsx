'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  LinkableEntityType,
  LinkType,
  PendingLink,
  EntityLink,
} from '@/lib/types/entity-relationships'
import { syncEntityLinks, syncEntityLinksAsTarget, deleteLink } from '@/lib/entity-links'

interface TargetItem {
  id: string
  label: string
  subtitle?: string
}

interface EntityLinkFieldProps {
  // Source entity (the form's entity)
  sourceType: LinkableEntityType
  sourceId?: string // undefined for create mode

  // Target configuration
  targetType: LinkableEntityType
  targetTableName: string
  targetDisplayField?: string // Default: 'name'
  targetSubtitleField?: string // Secondary info

  // Relationship semantics
  linkType: LinkType
  allowMultiple?: boolean // Default: true
  ordered?: boolean // Default: false

  // Reverse relationship mode
  // When true: form's entity is the TARGET, selecting SOURCE entities
  // e.g., Specimen form selecting which Projects link TO this specimen
  asTarget?: boolean

  // UI
  label: string
  placeholder?: string
  helperText?: string
  disabled?: boolean

  // For create mode (controlled)
  pendingLinks?: PendingLink[]
  onPendingLinksChange?: (links: PendingLink[]) => void
}

export function EntityLinkField({
  sourceType,
  sourceId,
  targetType,
  targetTableName,
  targetDisplayField = 'name',
  targetSubtitleField,
  linkType,
  allowMultiple = true,
  ordered = false,
  asTarget = false,
  label,
  placeholder,
  helperText,
  disabled = false,
  pendingLinks,
  onPendingLinksChange,
}: EntityLinkFieldProps) {
  const [items, setItems] = useState<TargetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [existingLinks, setExistingLinks] = useState<EntityLink[]>([])
  const [saving, setSaving] = useState(false)

  // Determine if we're in controlled mode (create) or uncontrolled mode (edit)
  const isControlled = pendingLinks !== undefined && onPendingLinksChange !== undefined
  const isEditMode = sourceId !== undefined

  // Load available target items
  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const selectFields = targetSubtitleField
        ? `id, ${targetDisplayField}, ${targetSubtitleField}`
        : `id, ${targetDisplayField}`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from(targetTableName)
        .select(selectFields)
        .order(targetDisplayField)

      if (!error && data) {
        const mapped = (data as Record<string, unknown>[]).map((item) => ({
          id: item.id as string,
          label: (item[targetDisplayField] as string) || (item.id as string),
          subtitle: targetSubtitleField ? (item[targetSubtitleField] as string) : undefined,
        }))
        setItems(mapped)
      }
    } catch (err) {
      console.error(`Error loading ${targetTableName}:`, err)
    } finally {
      setLoading(false)
    }
  }, [targetTableName, targetDisplayField, targetSubtitleField])

  // Load existing links in edit mode
  const loadExistingLinks = useCallback(async () => {
    if (!isEditMode) return

    try {
      let query = supabase.from('entity_links').select('*')

      if (asTarget) {
        // Form's entity is the TARGET, selecting SOURCE entities
        // e.g., specimen is target, selecting projects that link TO it
        query = query
          .eq('target_type', sourceType)
          .eq('target_id', sourceId!)
          .eq('source_type', targetType)
          .eq('link_type', linkType)
      } else {
        // Normal mode: form's entity is SOURCE, selecting TARGET entities
        query = query
          .eq('source_type', sourceType)
          .eq('source_id', sourceId!)
          .eq('target_type', targetType)
          .eq('link_type', linkType)
      }

      const { data, error } = await query.order('position', { nullsFirst: false })

      if (!error && data) {
        setExistingLinks(data as EntityLink[])
      }
    } catch (err) {
      console.error('Error loading existing links:', err)
    }
  }, [isEditMode, sourceType, sourceId, targetType, linkType, asTarget])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  useEffect(() => {
    if (isEditMode) {
      loadExistingLinks()
    }
  }, [isEditMode, loadExistingLinks])

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get current selection based on mode
  const getSelectedIds = (): string[] => {
    if (isControlled) {
      return pendingLinks?.map((l) => l.targetId) || []
    }
    // When asTarget, we selected source_ids (the entities linking TO us)
    return existingLinks.map((l) => asTarget ? l.source_id : l.target_id)
  }

  const selectedIds = getSelectedIds()

  const getSelectedItems = () => {
    return items.filter((item) => selectedIds.includes(item.id))
  }

  // Handle selection in controlled mode (create)
  const handleControlledSelect = (id: string) => {
    if (!onPendingLinksChange || !pendingLinks) return

    const item = items.find((i) => i.id === id)
    if (!item) return

    if (allowMultiple) {
      if (selectedIds.includes(id)) {
        onPendingLinksChange(pendingLinks.filter((l) => l.targetId !== id))
      } else {
        onPendingLinksChange([
          ...pendingLinks,
          {
            targetId: id,
            targetLabel: item.label,
            linkType,
            position: ordered ? pendingLinks.length : undefined,
          },
        ])
      }
    } else {
      onPendingLinksChange([
        {
          targetId: id,
          targetLabel: item.label,
          linkType,
          position: ordered ? 0 : undefined,
        },
      ])
      setIsOpen(false)
      setSearchTerm('')
    }
  }

  // Handle selection in uncontrolled mode (edit)
  const handleUncontrolledSelect = async (id: string) => {
    if (!sourceId) return

    setSaving(true)
    try {
      const newIds = selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id]

      if (asTarget) {
        // Form's entity is TARGET, sync entities that link TO us
        await syncEntityLinksAsTarget(
          { type: sourceType, id: sourceId },
          targetType,
          linkType,
          allowMultiple ? newIds : [id]
        )
      } else {
        // Normal mode: form's entity is SOURCE
        await syncEntityLinks(
          { type: sourceType, id: sourceId },
          targetType,
          linkType,
          allowMultiple ? newIds : [id]
        )
      }

      if (!allowMultiple) {
        setIsOpen(false)
        setSearchTerm('')
      }

      await loadExistingLinks()
    } catch (err) {
      console.error('Error updating links:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSelect = (id: string) => {
    if (isControlled) {
      handleControlledSelect(id)
    } else {
      handleUncontrolledSelect(id)
    }
  }

  // Handle removal
  const handleClear = async (id?: string) => {
    if (isControlled) {
      if (!onPendingLinksChange || !pendingLinks) return

      if (allowMultiple && id) {
        onPendingLinksChange(pendingLinks.filter((l) => l.targetId !== id))
      } else {
        onPendingLinksChange([])
      }
    } else {
      if (!sourceId) return

      setSaving(true)
      try {
        if (allowMultiple && id) {
          // Find link by the appropriate ID field
          const link = existingLinks.find((l) =>
            asTarget ? l.source_id === id : l.target_id === id
          )
          if (link) {
            await deleteLink(link.id)
          }
        } else {
          // Clear all links of this type
          if (asTarget) {
            await syncEntityLinksAsTarget(
              { type: sourceType, id: sourceId },
              targetType,
              linkType,
              []
            )
          } else {
            await syncEntityLinks(
              { type: sourceType, id: sourceId },
              targetType,
              linkType,
              []
            )
          }
        }

        await loadExistingLinks()
      } catch (err) {
        console.error('Error removing link:', err)
      } finally {
        setSaving(false)
      }
    }
  }

  const selectedItem =
    !allowMultiple && selectedIds.length > 0
      ? items.find((i) => i.id === selectedIds[0])
      : null

  // Single-select mode
  if (!allowMultiple) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium">{label}</label>

        <div className="relative">
          <button
            type="button"
            onClick={() => !disabled && !saving && setIsOpen(!isOpen)}
            disabled={disabled || saving}
            className={`w-full px-3 py-2 text-left border rounded-lg bg-background flex items-center justify-between transition-colors ${
              disabled || saving
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:border-primary/50 cursor-pointer'
            }`}
          >
            <span className={selectedItem ? '' : 'text-muted-foreground'}>
              {saving
                ? 'Saving...'
                : selectedItem?.label || placeholder || `Select ${label.toLowerCase()}...`}
            </span>
            <svg
              className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {selectedItem && !disabled && !saving && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-64 overflow-hidden">
              <div className="p-2 border-b">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-2 py-1 text-sm border rounded bg-background"
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {loading ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">Loading...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">No items found</div>
                ) : (
                  filteredItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      className={`w-full px-3 py-2 text-left hover:bg-accent transition-colors ${
                        selectedIds.includes(item.id) ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="text-sm font-medium">{item.label}</div>
                      {item.subtitle && (
                        <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
      </div>
    )
  }

  // Multi-select mode
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg">
          {getSelectedItems().map((item) => (
            <div
              key={item.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-full text-xs"
            >
              <span>{item.label}</span>
              <button
                type="button"
                onClick={() => handleClear(item.id)}
                disabled={disabled || saving}
                className="hover:opacity-70 disabled:opacity-50"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={`border rounded-lg overflow-hidden ${disabled || saving ? 'opacity-50' : ''}`}>
        <input
          type="text"
          placeholder={placeholder || `Search ${label.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled || saving}
          className="w-full px-3 py-2 border-b bg-background disabled:cursor-not-allowed"
        />

        <div className="max-h-40 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-sm text-muted-foreground text-center">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">No items found</div>
          ) : (
            <div className="divide-y">
              {filteredItems.map((item) => (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer ${
                    disabled || saving ? 'cursor-not-allowed' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => handleSelect(item.id)}
                    disabled={disabled || saving}
                    className="rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.label}</div>
                    {item.subtitle && (
                      <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {saving && (
        <p className="text-xs text-muted-foreground">Saving changes...</p>
      )}
      {helperText && !saving && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  )
}
