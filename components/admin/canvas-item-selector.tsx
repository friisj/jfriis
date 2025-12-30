'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { BLOCK_ITEM_TYPES, type CanvasItemType, type CanvasType } from '@/lib/types/canvas-items'

interface CanvasItem {
  id: string
  title: string
  description: string | null
  item_type: CanvasItemType
  importance: string
  validation_status: string
  tags: string[] | null
  studio_project_id: string | null
}

interface CanvasItemSelectorProps {
  /** Currently placed item IDs in this block */
  placedItemIds: string[]
  /** Canvas context for creating placements */
  canvasType: CanvasType
  canvasId?: string // Optional for create mode
  blockName: string
  /** Which item types are valid for this block */
  allowedTypes: CanvasItemType[]
  /** Project scope for filtering items */
  projectId?: string
  /** Called when placed items change */
  onItemsChange: (itemIds: string[]) => void
  /** Compact mode for inline display */
  compact?: boolean
}

const itemTypeLabels: Record<CanvasItemType, string> = {
  partner: 'Partner',
  activity: 'Activity',
  resource: 'Resource',
  value_proposition: 'Value Prop',
  segment: 'Segment',
  relationship: 'Relationship',
  channel: 'Channel',
  cost: 'Cost',
  revenue: 'Revenue',
  job: 'Job',
  pain: 'Pain',
  gain: 'Gain',
  product_service: 'Product/Service',
  pain_reliever: 'Pain Reliever',
  gain_creator: 'Gain Creator',
}

const itemTypeColors: Record<CanvasItemType, string> = {
  partner: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  activity: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  resource: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  value_proposition: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  segment: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  relationship: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
  channel: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
  cost: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  revenue: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  job: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  pain: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  gain: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  product_service: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  pain_reliever: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  gain_creator: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
}

const importanceColors: Record<string, string> = {
  critical: 'text-red-600 dark:text-red-400',
  high: 'text-orange-600 dark:text-orange-400',
  medium: 'text-muted-foreground',
  low: 'text-muted-foreground',
}

const validationStatusLabels: Record<string, string> = {
  untested: 'Untested',
  testing: 'Testing',
  validated: 'Validated',
  invalidated: 'Invalidated',
}

export function CanvasItemSelector({
  placedItemIds,
  canvasType,
  canvasId,
  blockName,
  allowedTypes,
  projectId,
  onItemsChange,
  compact = false,
}: CanvasItemSelectorProps) {
  const [placedItems, setPlacedItems] = useState<CanvasItem[]>([])
  const [allItems, setAllItems] = useState<CanvasItem[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [newItemTitle, setNewItemTitle] = useState('')
  const [newItemType, setNewItemType] = useState<CanvasItemType>(allowedTypes[0])
  const [detailsOpen, setDetailsOpen] = useState<string | null>(null)
  const [loadingItems, setLoadingItems] = useState(true)
  const [loadingPlaced, setLoadingPlaced] = useState(false)

  // Fetch all items for search (filtered by allowed types)
  useEffect(() => {
    async function fetchItems() {
      setLoadingItems(true)
      try {
        let query = supabase
          .from('canvas_items')
          .select('id, title, description, item_type, importance, validation_status, tags, studio_project_id')
          .in('item_type', allowedTypes)
          .order('updated_at', { ascending: false })
          .limit(100)

        if (projectId) {
          query = query.or(`studio_project_id.eq.${projectId},studio_project_id.is.null`)
        }

        const { data } = await query
        setAllItems(data || [])
      } finally {
        setLoadingItems(false)
      }
    }
    fetchItems()
  }, [allowedTypes, projectId])

  // Fetch placed items details
  useEffect(() => {
    if (placedItemIds.length === 0) {
      setPlacedItems([])
      setLoadingPlaced(false)
      return
    }

    async function fetchPlaced() {
      setLoadingPlaced(true)
      try {
        const { data } = await supabase
          .from('canvas_items')
          .select('id, title, description, item_type, importance, validation_status, tags, studio_project_id')
          .in('id', placedItemIds)

        // Preserve order from placedItemIds
        const ordered = placedItemIds
          .map((id) => data?.find((item) => item.id === id))
          .filter(Boolean) as CanvasItem[]
        setPlacedItems(ordered)
      } finally {
        setLoadingPlaced(false)
      }
    }
    fetchPlaced()
  }, [placedItemIds])

  const handleAddItem = useCallback(
    (itemId: string) => {
      if (!placedItemIds.includes(itemId)) {
        onItemsChange([...placedItemIds, itemId])
      }
      setSearchOpen(false)
      setSearchQuery('')
    },
    [placedItemIds, onItemsChange]
  )

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      onItemsChange(placedItemIds.filter((id) => id !== itemId))
    },
    [placedItemIds, onItemsChange]
  )

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return
      const newOrder = [...placedItemIds]
      ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
      onItemsChange(newOrder)
    },
    [placedItemIds, onItemsChange]
  )

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index === placedItemIds.length - 1) return
      const newOrder = [...placedItemIds]
      ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
      onItemsChange(newOrder)
    },
    [placedItemIds, onItemsChange]
  )

  const handleCreateItem = async () => {
    if (!newItemTitle.trim()) return

    setCreating(true)
    setCreateError(null)
    try {
      const { data, error } = await supabase
        .from('canvas_items')
        .insert([
          {
            title: newItemTitle,
            item_type: newItemType,
            importance: 'medium',
            validation_status: 'untested',
            tags: [],
            metadata: {},
            studio_project_id: projectId || null,
          },
        ])
        .select('id')
        .single()

      if (error) throw error

      // Add the new item to the placed items
      onItemsChange([...placedItemIds, data.id])

      // Refresh the list
      const { data: allData } = await supabase
        .from('canvas_items')
        .select('id, title, description, item_type, importance, validation_status, tags, studio_project_id')
        .in('item_type', allowedTypes)
        .order('updated_at', { ascending: false })
        .limit(100)
      setAllItems(allData || [])

      setNewItemTitle('')
      setCreateError(null)
      setSearchOpen(false)
    } catch (err) {
      console.error('Error creating canvas item:', err)
      setCreateError('Failed to create item. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  // Filter available items (not already placed)
  const availableItems = allItems.filter((item) => !placedItemIds.includes(item.id))

  // Filter by search query - search in title, description, and tags
  const filteredItems = searchQuery
    ? availableItems.filter((item) => {
        const query = searchQuery.toLowerCase()
        const matchesTitle = item.title.toLowerCase().includes(query)
        const matchesDescription = item.description?.toLowerCase().includes(query)
        const matchesTags = item.tags?.some((tag) => tag.toLowerCase().includes(query))
        return matchesTitle || matchesDescription || matchesTags
      })
    : availableItems

  return (
    <div className="space-y-2">
      {/* Placed Items */}
      {loadingPlaced ? (
        <div className="p-4 rounded-lg border bg-background">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading placed items...
          </div>
        </div>
      ) : placedItems.length > 0 ? (
        <div className="space-y-2">
          {placedItems.map((item, index) => (
            <div
              key={item.id}
              className="group flex items-center gap-2 p-2 rounded-lg border bg-background hover:bg-accent/50 transition-colors"
            >
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === placedItems.length - 1}
                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Item info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{item.title}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${itemTypeColors[item.item_type]}`}>
                    {itemTypeLabels[item.item_type]}
                  </span>
                  <span className={`text-xs ${importanceColors[item.importance]}`}>
                    {item.importance}
                  </span>
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                )}
              </div>

              {/* Details popover */}
              <Popover open={detailsOpen === item.id} onOpenChange={(open) => setDetailsOpen(open ? item.id : null)}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="View details"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-2">
                    <div>
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {itemTypeLabels[item.item_type]} • {validationStatusLabels[item.validation_status]}
                      </p>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <span className="text-xs text-muted-foreground">Importance:</span>
                      <span className={`text-xs font-medium ${importanceColors[item.importance]}`}>
                        {item.importance}
                      </span>
                    </div>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.tags.map((tag) => (
                          <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-muted">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemoveItem(item.id)}
                className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove from block"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Add Item Button */}
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed hover:bg-accent/50 transition-colors text-sm text-muted-foreground hover:text-foreground"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add {itemTypeLabels[allowedTypes[0]]}
            {allowedTypes.length > 1 && ` or ${itemTypeLabels[allowedTypes[1]]}`}
            {allowedTypes.length > 2 && '...'}
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[400px]" align="start">
          <Command>
            <CommandInput
              placeholder={`Search ${allowedTypes.map((t) => itemTypeLabels[t]).join(', ')}...`}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {loadingItems ? (
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading items...
                  </div>
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    <div className="p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-3">No items found</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('')
                          // Trigger create mode - show create form
                        }}
                        className="text-sm text-primary hover:underline"
                      >
                        Create new item
                      </button>
                    </div>
                  </CommandEmpty>

                  {filteredItems.length > 0 && (
                    <CommandGroup heading="Existing Items">
                      {filteredItems.slice(0, 10).map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => handleAddItem(item.id)}
                      className="flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{item.title}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${itemTypeColors[item.item_type]}`}>
                            {itemTypeLabels[item.item_type]}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{validationStatusLabels[item.validation_status]}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

                  <CommandSeparator />

                  <CommandGroup heading="Create New">
                    <div className="p-2 space-y-2">
                      {createError && (
                        <div className="px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                          {createError}
                        </div>
                      )}
                      <input
                        type="text"
                        value={newItemTitle}
                        onChange={(e) => {
                          setNewItemTitle(e.target.value)
                          if (createError) setCreateError(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newItemTitle.trim()) {
                            handleCreateItem()
                          }
                        }}
                        placeholder="Enter item title..."
                        className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                      />
                      {allowedTypes.length > 1 && (
                        <select
                          value={newItemType}
                          onChange={(e) => setNewItemType(e.target.value as CanvasItemType)}
                          className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                        >
                          {allowedTypes.map((type) => (
                            <option key={type} value={type}>
                              {itemTypeLabels[type]}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={handleCreateItem}
                        disabled={!newItemTitle.trim() || creating}
                        className="w-full px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creating ? 'Creating...' : 'Create & Add'}
                      </button>
                    </div>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {placedItems.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No items added yet. Click above to add or create items.
        </p>
      )}
    </div>
  )
}

/**
 * Helper function to get allowed item types for a block
 */
export function getAllowedTypesForBlock(blockName: string): CanvasItemType[] {
  return BLOCK_ITEM_TYPES[blockName] || []
}
