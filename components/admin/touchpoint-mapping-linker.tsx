'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { TouchpointMappingType, Strength } from '@/lib/types/boundary-objects'
import {
  createTouchpointMapping,
  deleteTouchpointMapping,
  type TouchpointMappingWithTarget,
  type TouchpointMappingInsert,
} from '@/lib/boundary-objects/mappings'

interface CanvasItem {
  id: string
  title: string
  item_type: string
}

interface TouchpointMappingLinkerProps {
  touchpointId: string
  projectId?: string
  mappings: TouchpointMappingWithTarget[]
  onMappingChange?: () => void
}

const mappingTypes: { value: TouchpointMappingType; label: string; icon: string; description: string }[] = [
  { value: 'addresses_job', label: 'Addresses Job', icon: '🎯', description: 'Helps customer do a job' },
  { value: 'triggers_pain', label: 'Triggers Pain', icon: '😣', description: 'Causes customer pain' },
  { value: 'delivers_gain', label: 'Delivers Gain', icon: '✨', description: 'Delivers customer gain' },
  { value: 'tests_assumption', label: 'Tests Assumption', icon: '🧪', description: 'Tests an assumption' },
  { value: 'delivers_value_prop', label: 'Delivers Value', icon: '💎', description: 'Delivers value proposition' },
]

const strengthLevels: { value: Strength; label: string; color: string }[] = [
  { value: 'weak', label: 'Weak', color: 'text-orange-600 dark:text-orange-400' },
  { value: 'moderate', label: 'Moderate', color: 'text-blue-600 dark:text-blue-400' },
  { value: 'strong', label: 'Strong', color: 'text-green-600 dark:text-green-400' },
]

const itemTypeIcons: Record<string, string> = {
  job: '🎯',
  pain: '😣',
  gain: '✨',
  product_service: '📦',
  pain_reliever: '💊',
  gain_creator: '🚀',
}

const itemTypeColors: Record<string, string> = {
  job: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  pain: 'bg-red-500/10 text-red-700 dark:text-red-300',
  gain: 'bg-green-500/10 text-green-700 dark:text-green-300',
  product_service: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  pain_reliever: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  gain_creator: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
}

export function TouchpointMappingLinker({
  touchpointId,
  projectId,
  mappings: initialMappings,
  onMappingChange,
}: TouchpointMappingLinkerProps) {
  const [mappings, setMappings] = useState<TouchpointMappingWithTarget[]>(initialMappings)
  const [showSelector, setShowSelector] = useState(false)
  const [availableItems, setAvailableItems] = useState<CanvasItem[]>([])
  const [selectedItem, setSelectedItem] = useState<string>('')
  const [mappingType, setMappingType] = useState<TouchpointMappingType>('addresses_job')
  const [strength, setStrength] = useState<Strength>('moderate')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')

  // Auto-clear errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Keyboard handler for modal (Escape to close)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && showSelector) {
      setShowSelector(false)
      setSelectedItem('')
      setNotes('')
    }
  }, [showSelector])

  useEffect(() => {
    if (showSelector) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showSelector, handleKeyDown])

  // Load available canvas items when selector opens
  useEffect(() => {
    if (!showSelector) return

    async function loadCanvasItems() {
      setLoading(true)
      try {
        let query = supabase
          .from('canvas_items')
          .select('id, title, item_type')
          .order('item_type')
          .order('title')

        if (projectId) {
          query = query.eq('studio_project_id', projectId)
        }

        const { data, error } = await query

        if (error) throw error

        // Filter out already mapped items
        const mappedIds = new Set(mappings.map((m) => m.target_id))
        const available = (data || []).filter((item) => !mappedIds.has(item.id))
        setAvailableItems(available)
      } catch (err) {
        console.error('Error loading canvas items:', err)
        setError('Failed to load canvas items')
      } finally {
        setLoading(false)
      }
    }

    loadCanvasItems()
  }, [showSelector, projectId, mappings])

  const handleAddMapping = async () => {
    if (!selectedItem) return

    setSaving(true)
    setError(null)

    try {
      const insertData: TouchpointMappingInsert = {
        touchpoint_id: touchpointId,
        target_type: 'canvas_item',
        target_id: selectedItem,
        mapping_type: mappingType,
        strength: strength,
        notes: notes || undefined,
      }

      const mapping = await createTouchpointMapping(insertData)

      // Find the item details
      const item = availableItems.find((i) => i.id === selectedItem)

      setMappings((prev) => [
        ...prev,
        { ...mapping, canvas_item: item || null },
      ])

      setShowSelector(false)
      setSelectedItem('')
      setMappingType('addresses_job')
      setStrength('moderate')
      setNotes('')
      onMappingChange?.()
    } catch (err) {
      console.error('Error adding mapping:', err)
      setError(err instanceof Error ? err.message : 'Failed to add mapping')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMapping = async (mappingId: string) => {
    if (!confirm('Remove this mapping?')) return

    setRemovingId(mappingId)
    setError(null)

    // Optimistic update
    const previousMappings = mappings
    setMappings((prev) => prev.filter((m) => m.id !== mappingId))

    try {
      await deleteTouchpointMapping(mappingId)
      onMappingChange?.()
    } catch (err) {
      console.error('Error removing mapping:', err)
      // Rollback on error
      setMappings(previousMappings)
      setError(err instanceof Error ? err.message : 'Failed to remove mapping')
    } finally {
      setRemovingId(null)
    }
  }

  // Click outside to close modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowSelector(false)
      setSelectedItem('')
      setNotes('')
    }
  }

  // Filter available items by type
  const filteredItems = filterType === 'all'
    ? availableItems
    : availableItems.filter((item) => item.item_type === filterType)

  // Get unique item types for filter
  const itemTypes = Array.from(new Set(availableItems.map((i) => i.item_type)))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          Canvas Item Mappings ({mappings.length})
        </h4>
        <button
          onClick={() => setShowSelector(true)}
          className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
        >
          + Add
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 hover:text-red-800 dark:hover:text-red-200"
          >
            ×
          </button>
        </div>
      )}

      {/* Selector Modal */}
      {showSelector && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="map-canvas-item-title"
        >
          <div className="bg-background border rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 id="map-canvas-item-title" className="text-lg font-semibold mb-4">Map to Canvas Item</h3>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading canvas items...
              </div>
            ) : availableItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No available canvas items to map.
                {projectId && ' Try removing the project filter.'}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Type Filter */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                      filterType === 'all'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent hover:bg-accent/80'
                    }`}
                  >
                    All ({availableItems.length})
                  </button>
                  {itemTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                        filterType === type
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent hover:bg-accent/80'
                      }`}
                    >
                      {itemTypeIcons[type] || '📄'} {type} ({availableItems.filter((i) => i.item_type === type).length})
                    </button>
                  ))}
                </div>

                {/* Item Selector */}
                <div>
                  <label className="block text-sm font-medium mb-2">Select Item *</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {filteredItems.map((item) => (
                      <label
                        key={item.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          selectedItem === item.id
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-accent'
                        }`}
                      >
                        <input
                          type="radio"
                          name="canvasItem"
                          value={item.id}
                          checked={selectedItem === item.id}
                          onChange={(e) => setSelectedItem(e.target.value)}
                        />
                        <span>{itemTypeIcons[item.item_type] || '📄'}</span>
                        <span className="flex-1 text-sm truncate">{item.title}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${itemTypeColors[item.item_type] || ''}`}>
                          {item.item_type}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Mapping Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">Mapping Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {mappingTypes.slice(0, 4).map((type) => (
                      <label
                        key={type.value}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          mappingType === type.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="mappingType"
                          value={type.value}
                          checked={mappingType === type.value}
                          onChange={(e) => setMappingType(e.target.value as TouchpointMappingType)}
                          className="sr-only"
                        />
                        <span>{type.icon}</span>
                        <span className="text-sm">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Strength */}
                <div>
                  <label className="block text-sm font-medium mb-2">Relationship Strength</label>
                  <div className="flex gap-2">
                    {strengthLevels.map((level) => (
                      <label
                        key={level.value}
                        className={`flex-1 text-center p-2 rounded-lg border cursor-pointer transition-colors ${
                          strength === level.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="strength"
                          value={level.value}
                          checked={strength === level.value}
                          onChange={(e) => setStrength(e.target.value as Strength)}
                          className="sr-only"
                        />
                        <span className={`text-sm font-medium ${level.color}`}>{level.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border bg-background"
                    rows={2}
                    placeholder="Optional context..."
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSelector(false)
                      setSelectedItem('')
                      setNotes('')
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMapping}
                    disabled={saving || !selectedItem}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Adding...' : 'Add Mapping'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mappings List */}
      {mappings.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No canvas items mapped yet.
        </p>
      ) : (
        <div className="space-y-2">
          {mappings.map((mapping) => (
            <div
              key={mapping.id}
              className={`p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors ${
                removingId === mapping.id ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{itemTypeIcons[mapping.canvas_item?.item_type || ''] || '📄'}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${itemTypeColors[mapping.canvas_item?.item_type || ''] || ''}`}>
                      {mapping.canvas_item?.item_type || 'item'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {mappingTypes.find((t) => t.value === mapping.mapping_type)?.label || mapping.mapping_type}
                    </span>
                    {mapping.strength && (
                      <span className={`text-xs ${strengthLevels.find((s) => s.value === mapping.strength)?.color || ''}`}>
                        ({mapping.strength})
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">
                    {mapping.canvas_item?.title || 'Unknown item'}
                  </p>
                  {mapping.notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {mapping.notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveMapping(mapping.id)}
                  className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                  title="Remove"
                  disabled={removingId === mapping.id}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
