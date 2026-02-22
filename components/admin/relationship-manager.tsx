'use client'

import { useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import {
  syncEntityLinks,
  syncEntityLinksAsTarget,
  deleteLink,
} from '@/lib/entity-links'
import type {
  LinkableEntityType,
  LinkType,
  PendingLink,
  EntityLink,
} from '@/lib/types/entity-relationships'
import { ENTITY_TYPE_TABLE_MAP } from '@/lib/types/entity-relationships'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronRight,
  Plus,
  X,
  Pencil,
  Search,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface RelationshipSlot {
  targetType: LinkableEntityType
  linkType: LinkType
  label: string
  group: string
  direction?: 'outbound' | 'inbound'
  allowMultiple?: boolean
  ordered?: boolean
  displayField?: string
  subtitleField?: string
  editHref?: (id: string) => string
  icon?: ReactNode
}

interface EntityEntity {
  type: LinkableEntityType
  id?: string
}

export interface RelationshipManagerProps {
  entity: EntityEntity
  slots: RelationshipSlot[]
  pendingLinks?: PendingLink[]
  onPendingLinksChange?: (links: PendingLink[]) => void
  onSuggestLinks?: () => void
  suggestingLinks?: boolean
  disabled?: boolean
  className?: string
}

interface LinkedItem {
  linkId: string
  entityId: string
  label: string
  subtitle?: string
  slot: RelationshipSlot
}

interface AvailableItem {
  id: string
  label: string
  subtitle?: string
}

// ============================================================================
// Component
// ============================================================================

export function RelationshipManager({
  entity,
  slots,
  pendingLinks,
  onPendingLinksChange,
  onSuggestLinks,
  suggestingLinks,
  disabled = false,
  className,
}: RelationshipManagerProps) {
  const isEditMode = !!entity.id
  const isControlled = pendingLinks !== undefined && onPendingLinksChange !== undefined

  // State
  const [existingLinks, setExistingLinks] = useState<EntityLink[]>([])
  const [availableItems, setAvailableItems] = useState<Record<string, AvailableItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addDialogSlots, setAddDialogSlots] = useState<RelationshipSlot[]>([])
  const [quickLinkOpen, setQuickLinkOpen] = useState(false)

  // Group slots
  const groups = useMemo(() => {
    const grouped = new Map<string, RelationshipSlot[]>()
    for (const slot of slots) {
      const existing = grouped.get(slot.group) || []
      existing.push(slot)
      grouped.set(slot.group, existing)
    }
    return grouped
  }, [slots])

  // Unique table names needed for loading items
  const uniqueTableKeys = useMemo(() => {
    const keys = new Map<string, { tableName: string; displayField: string; subtitleField?: string }>()
    for (const slot of slots) {
      const tableName = ENTITY_TYPE_TABLE_MAP[slot.targetType]
      if (!tableName) continue
      const key = `${slot.targetType}:${slot.displayField || 'name'}`
      if (!keys.has(key)) {
        keys.set(key, {
          tableName,
          displayField: slot.displayField || 'name',
          subtitleField: slot.subtitleField,
        })
      }
    }
    return keys
  }, [slots])

  // Load all available items for all target types
  const loadAvailableItems = useCallback(async () => {
    const results: Record<string, AvailableItem[]> = {}

    await Promise.all(
      Array.from(uniqueTableKeys.entries()).map(async ([key, config]) => {
        try {
          const selectFields = config.subtitleField
            ? `id, ${config.displayField}, ${config.subtitleField}`
            : `id, ${config.displayField}`

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data, error } = await (supabase as any)
            .from(config.tableName)
            .select(selectFields)
            .order(config.displayField)

          if (!error && data) {
            results[key] = (data as Record<string, unknown>[]).map((item) => ({
              id: item.id as string,
              label: (item[config.displayField] as string) || (item.id as string),
              subtitle: config.subtitleField
                ? (item[config.subtitleField] as string)
                : undefined,
            }))
          }
        } catch (err) {
          console.error(`Error loading items for ${key}:`, err)
          results[key] = []
        }
      })
    )

    setAvailableItems(results)
  }, [uniqueTableKeys])

  // Load existing links (edit mode only)
  const loadExistingLinks = useCallback(async () => {
    if (!isEditMode || !entity.id) return

    try {
      // Batch load: get ALL links for this entity in both directions
      const [outgoing, incoming] = await Promise.all([
        supabase
          .from('entity_links')
          .select('*')
          .eq('source_type', entity.type)
          .eq('source_id', entity.id)
          .order('position', { nullsFirst: false }),
        supabase
          .from('entity_links')
          .select('*')
          .eq('target_type', entity.type)
          .eq('target_id', entity.id)
          .order('position', { nullsFirst: false }),
      ])

      const allLinks: EntityLink[] = [
        ...((outgoing.data || []) as EntityLink[]),
        ...((incoming.data || []) as EntityLink[]),
      ]

      setExistingLinks(allLinks)
    } catch (err) {
      console.error('Error loading existing links:', err)
    }
  }, [isEditMode, entity.type, entity.id])

  // Initial load
  useEffect(() => {
    setLoading(true)
    Promise.all([loadAvailableItems(), loadExistingLinks()]).finally(() =>
      setLoading(false)
    )
  }, [loadAvailableItems, loadExistingLinks])

  // Auto-expand groups that have items
  useEffect(() => {
    if (loading) return

    const nonEmpty = new Set<string>()
    for (const [groupName] of groups) {
      const count = getGroupCount(groupName)
      if (count > 0) nonEmpty.add(groupName)
    }
    // Expand first group if none have items
    if (nonEmpty.size === 0 && groups.size > 0) {
      nonEmpty.add(groups.keys().next().value!)
    }
    setOpenGroups(nonEmpty)
    // Only run after initial data load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // Get items key for a slot
  const getItemsKey = (slot: RelationshipSlot) =>
    `${slot.targetType}:${slot.displayField || 'name'}`

  // Get linked items for a specific slot
  const getLinkedItemsForSlot = (slot: RelationshipSlot): LinkedItem[] => {
    const itemsKey = getItemsKey(slot)
    const items = availableItems[itemsKey] || []
    const direction = slot.direction || 'outbound'

    if (isControlled && pendingLinks) {
      // Create mode: use pending links
      return pendingLinks
        .filter((pl) => pl.linkType === slot.linkType)
        .map((pl) => {
          const item = items.find((i) => i.id === pl.targetId)
          return {
            linkId: `pending-${pl.targetId}`,
            entityId: pl.targetId,
            label: item?.label || pl.targetLabel,
            subtitle: item?.subtitle,
            slot,
          }
        })
    }

    // Edit mode: use existing links
    const relevantLinks = existingLinks.filter((link) => {
      if (direction === 'inbound') {
        return (
          link.source_type === slot.targetType &&
          link.link_type === slot.linkType &&
          link.target_type === entity.type &&
          link.target_id === entity.id
        )
      }
      return (
        link.source_type === entity.type &&
        link.source_id === entity.id &&
        link.target_type === slot.targetType &&
        link.link_type === slot.linkType
      )
    })

    return relevantLinks.map((link) => {
      const entityId = direction === 'inbound' ? link.source_id : link.target_id
      const item = items.find((i) => i.id === entityId)
      return {
        linkId: link.id,
        entityId,
        label: item?.label || entityId,
        subtitle: item?.subtitle,
        slot,
      }
    })
  }

  // Get count for a group
  const getGroupCount = (groupName: string): number => {
    const groupSlots = groups.get(groupName) || []
    return groupSlots.reduce(
      (acc, slot) => acc + getLinkedItemsForSlot(slot).length,
      0
    )
  }

  // Get total count
  const totalCount = useMemo(() => {
    return slots.reduce(
      (acc, slot) => acc + getLinkedItemsForSlot(slot).length,
      0
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, existingLinks, pendingLinks, availableItems])

  // Get unlinked items for a slot (available to add)
  const getUnlinkedItemsForSlot = (slot: RelationshipSlot): AvailableItem[] => {
    const itemsKey = getItemsKey(slot)
    const items = availableItems[itemsKey] || []
    const linkedIds = new Set(
      getLinkedItemsForSlot(slot).map((li) => li.entityId)
    )
    return items.filter((item) => !linkedIds.has(item.id))
  }

  // Handle adding a link
  const handleAdd = async (slot: RelationshipSlot, targetId: string) => {
    const itemsKey = getItemsKey(slot)
    const item = (availableItems[itemsKey] || []).find((i) => i.id === targetId)
    if (!item) return

    if (isControlled && onPendingLinksChange && pendingLinks) {
      const newLink: PendingLink = {
        targetId,
        targetLabel: item.label,
        linkType: slot.linkType,
        position: slot.ordered ? pendingLinks.length : undefined,
      }
      onPendingLinksChange([...pendingLinks, newLink])
      return
    }

    if (!entity.id) return

    setSaving(true)
    try {
      const currentIds = getLinkedItemsForSlot(slot).map((li) => li.entityId)
      const direction = slot.direction || 'outbound'

      if (direction === 'inbound') {
        await syncEntityLinksAsTarget(
          { type: entity.type, id: entity.id },
          slot.targetType,
          slot.linkType,
          [...currentIds, targetId]
        )
      } else {
        await syncEntityLinks(
          { type: entity.type, id: entity.id },
          slot.targetType,
          slot.linkType,
          [...currentIds, targetId]
        )
      }

      await loadExistingLinks()
    } catch (err) {
      console.error('Error adding link:', err)
    } finally {
      setSaving(false)
    }
  }

  // Handle removing a link
  const handleRemove = async (linkedItem: LinkedItem) => {
    if (isControlled && onPendingLinksChange && pendingLinks) {
      onPendingLinksChange(
        pendingLinks.filter(
          (pl) =>
            !(
              pl.targetId === linkedItem.entityId &&
              pl.linkType === linkedItem.slot.linkType
            )
        )
      )
      return
    }

    if (!entity.id) return

    setSaving(true)
    try {
      await deleteLink(linkedItem.linkId)
      await loadExistingLinks()
    } catch (err) {
      console.error('Error removing link:', err)
    } finally {
      setSaving(false)
    }
  }

  // Open add dialog for a group's slots
  const openAddForGroup = (groupName: string) => {
    const groupSlots = groups.get(groupName) || []
    setAddDialogSlots(groupSlots)
    setAddDialogOpen(true)
  }

  // Toggle group
  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupName)) {
        next.delete(groupName)
      } else {
        next.add(groupName)
      }
      return next
    })
  }

  // Keyboard shortcut: Cmd+K for quick link
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setAddDialogSlots(slots)
        setQuickLinkOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [slots])

  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Relationships
          </h3>
        </div>
        <div className="text-sm text-muted-foreground py-4 text-center">
          Loading relationships...
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Relationships
          {totalCount > 0 && (
            <span className="ml-1.5 text-xs font-normal">({totalCount})</span>
          )}
        </h3>
        {onSuggestLinks && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSuggestLinks}
            disabled={suggestingLinks || disabled}
          >
            {suggestingLinks ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Suggest
          </Button>
        )}
      </div>

      {/* Groups */}
      <div className="space-y-1">
        {Array.from(groups.entries()).map(([groupName, groupSlots]) => {
          const count = getGroupCount(groupName)
          const isOpen = openGroups.has(groupName)

          return (
            <Collapsible
              key={groupName}
              open={isOpen}
              onOpenChange={() => toggleGroup(groupName)}
            >
              <div className="flex items-center">
                <CollapsibleTrigger className="flex items-center gap-1.5 flex-1 py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors text-sm font-medium">
                  <ChevronRight
                    className={cn(
                      'size-3.5 text-muted-foreground transition-transform',
                      isOpen && 'rotate-90'
                    )}
                  />
                  {groupName}
                  {count > 0 && (
                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                      {count}
                    </Badge>
                  )}
                </CollapsibleTrigger>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-6 ml-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    openAddForGroup(groupName)
                  }}
                  disabled={disabled || saving}
                >
                  <Plus className="size-3.5" />
                  <span className="sr-only">Add {groupName}</span>
                </Button>
              </div>

              <CollapsibleContent className="pl-5 space-y-0.5 pb-1">
                {groupSlots.map((slot) => {
                  const items = getLinkedItemsForSlot(slot)
                  if (items.length === 0) return null

                  return (
                    <div key={`${slot.targetType}-${slot.linkType}`}>
                      {/* Show slot label if group has multiple slots */}
                      {groupSlots.length > 1 && items.length > 0 && (
                        <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mt-2 mb-0.5">
                          {slot.label}
                        </div>
                      )}
                      {items.map((item) => (
                        <div
                          key={item.linkId}
                          className="group flex items-center gap-1.5 py-1 px-1.5 -mx-1.5 rounded-md hover:bg-muted/50 transition-colors"
                        >
                          {slot.icon && (
                            <span className="text-muted-foreground shrink-0">
                              {slot.icon}
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{item.label}</div>
                            {item.subtitle && (
                              <div className="text-[11px] text-muted-foreground truncate">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                            {slot.editHref && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="size-6"
                                asChild
                              >
                                <a href={slot.editHref(item.entityId)}>
                                  <Pencil className="size-3" />
                                  <span className="sr-only">Edit</span>
                                </a>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-6 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemove(item)}
                              disabled={disabled || saving}
                            >
                              <X className="size-3" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}

                {getGroupCount(groupName) === 0 && (
                  <div className="text-xs text-muted-foreground py-2">
                    No links yet
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </div>

      {/* Quick link search */}
      <button
        type="button"
        onClick={() => {
          setAddDialogSlots(slots)
          setQuickLinkOpen(true)
        }}
        disabled={disabled}
        className="w-full flex items-center gap-2 px-3 py-2 border border-dashed rounded-md text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-50"
      >
        <Search className="size-3.5" />
        Quick link: search all entities...
        <kbd className="ml-auto hidden sm:inline-block text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
          {'\u2318'}K
        </kbd>
      </button>

      {/* Add dialog (per-group) */}
      <AddLinkDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        slots={addDialogSlots}
        getUnlinkedItems={getUnlinkedItemsForSlot}
        onAdd={handleAdd}
        disabled={disabled || saving}
      />

      {/* Quick link dialog (all slots) */}
      <AddLinkDialog
        open={quickLinkOpen}
        onOpenChange={setQuickLinkOpen}
        slots={slots}
        getUnlinkedItems={getUnlinkedItemsForSlot}
        onAdd={handleAdd}
        disabled={disabled || saving}
        title="Quick Link"
        description="Search and link to any entity"
      />
    </div>
  )
}

// ============================================================================
// Add Link Dialog
// ============================================================================

function AddLinkDialog({
  open,
  onOpenChange,
  slots,
  getUnlinkedItems,
  onAdd,
  disabled,
  title = 'Add Link',
  description = 'Select an entity to link',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  slots: RelationshipSlot[]
  getUnlinkedItems: (slot: RelationshipSlot) => AvailableItem[]
  onAdd: (slot: RelationshipSlot, targetId: string) => void
  disabled?: boolean
  title?: string
  description?: string
}) {
  // Group slots by label for display
  const slotGroups = useMemo(() => {
    const groups: { label: string; slot: RelationshipSlot; items: AvailableItem[] }[] = []
    for (const slot of slots) {
      const items = getUnlinkedItems(slot)
      if (items.length > 0) {
        groups.push({ label: slot.label, slot, items })
      }
    }
    return groups
  }, [slots, getUnlinkedItems])

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
    >
      <CommandInput placeholder="Search entities..." />
      <CommandList>
        <CommandEmpty>No matching entities found.</CommandEmpty>
        {slotGroups.map(({ label, slot, items }) => (
          <CommandGroup key={`${slot.targetType}-${slot.linkType}`} heading={label}>
            {items.map((item) => (
              <CommandItem
                key={item.id}
                value={`${label} ${item.label} ${item.subtitle || ''}`}
                onSelect={() => {
                  if (!disabled) {
                    onAdd(slot, item.id)
                    // Don't close — let user add multiple
                  }
                }}
                disabled={disabled}
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate">{item.label}</div>
                  {item.subtitle && (
                    <div className="text-xs text-muted-foreground truncate">
                      {item.subtitle}
                    </div>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
