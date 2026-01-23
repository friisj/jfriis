'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { CanvasItemType } from '@/lib/types/canvas-items'
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handling'

type FitStrength = 'weak' | 'partial' | 'strong' | 'perfect'
type MappingType = 'relieves' | 'creates' | 'addresses' | 'enables'

interface CanvasItem {
  id: string
  title: string
  description: string | null
  item_type: CanvasItemType
  importance: string
}

interface CanvasItemMapping {
  id?: string
  source_item_id: string
  target_item_id: string
  mapping_type: MappingType
  fit_strength: FitStrength
  notes?: string | null
}

interface FitMappingEditorProps {
  valueMapId: string
  customerProfileId: string
}

const fitStrengthColors: Record<FitStrength, string> = {
  weak: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  partial: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  strong: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  perfect: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
}

const fitStrengthLabels: Record<FitStrength, string> = {
  weak: 'Weak Fit',
  partial: 'Partial Fit',
  strong: 'Strong Fit',
  perfect: 'Perfect Fit',
}

export function FitMappingEditor({ valueMapId, customerProfileId }: FitMappingEditorProps) {
  const [painRelievers, setPainRelievers] = useState<CanvasItem[]>([])
  const [gainCreators, setGainCreators] = useState<CanvasItem[]>([])
  const [pains, setPains] = useState<CanvasItem[]>([])
  const [gains, setGains] = useState<CanvasItem[]>([])
  const [mappings, setMappings] = useState<CanvasItemMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [editingMapping, setEditingMapping] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch all items and mappings
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        // Fetch Value Map items (pain_relievers, gain_creators)
        const { data: vmPlacements, error: vmPlacementsError } = await supabase
          .from('canvas_item_placements')
          .select('canvas_item_id, block_name')
          .eq('canvas_id', valueMapId)
          .eq('canvas_type', 'value_map')
          .in('block_name', ['pain_relievers', 'gain_creators'])

        if (vmPlacementsError) {
          console.error('Error fetching Value Map placements:', vmPlacementsError)
          setError('Failed to load Value Map items')
          return
        }

        let allSourceIds: string[] = []

        if (vmPlacements && vmPlacements.length > 0) {
          const vmItemIds = vmPlacements.map((p) => p.canvas_item_id)
          allSourceIds = vmItemIds

          const { data: vmItems, error: vmItemsError } = await supabase
            .from('canvas_items')
            .select('id, title, description, item_type, importance')
            .in('id', vmItemIds)

          if (vmItemsError) {
            console.error('Error fetching Value Map items:', vmItemsError)
            setError('Failed to load Value Map item details')
            return
          }

          setPainRelievers(
            (vmItems?.filter((item) =>
              vmPlacements.find((p) => p.canvas_item_id === item.id && p.block_name === 'pain_relievers')
            ) || []) as any
          )
          setGainCreators(
            (vmItems?.filter((item) =>
              vmPlacements.find((p) => p.canvas_item_id === item.id && p.block_name === 'gain_creators')
            ) || []) as any
          )
        }

        // Fetch Customer Profile items (pains, gains)
        const { data: cpPlacements, error: cpPlacementsError } = await supabase
          .from('canvas_item_placements')
          .select('canvas_item_id, block_name')
          .eq('canvas_id', customerProfileId)
          .eq('canvas_type', 'customer_profile')
          .in('block_name', ['pains', 'gains'])

        if (cpPlacementsError) {
          console.error('Error fetching Customer Profile placements:', cpPlacementsError)
          setError('Failed to load Customer Profile items')
          return
        }

        let allTargetIds: string[] = []

        if (cpPlacements && cpPlacements.length > 0) {
          const cpItemIds = cpPlacements.map((p) => p.canvas_item_id)
          allTargetIds = cpItemIds

          const { data: cpItems, error: cpItemsError } = await supabase
            .from('canvas_items')
            .select('id, title, description, item_type, importance')
            .in('id', cpItemIds)

          if (cpItemsError) {
            console.error('Error fetching Customer Profile items:', cpItemsError)
            setError('Failed to load Customer Profile item details')
            return
          }

          setPains(
            (cpItems?.filter((item) =>
              cpPlacements.find((p) => p.canvas_item_id === item.id && p.block_name === 'pains')
            ) || []) as any
          )
          setGains(
            (cpItems?.filter((item) =>
              cpPlacements.find((p) => p.canvas_item_id === item.id && p.block_name === 'gains')
            ) || []) as any
          )
        }

        // SECURITY FIX: Always fetch mappings, even if one side is empty
        // This prevents orphaned mappings from being invisible
        const { data: existingMappings, error: mappingsError } = await supabase
          .from('canvas_item_mappings')
          .select('*')
          .or(
            `source_item_id.in.(${allSourceIds.join(',')}),target_item_id.in.(${allTargetIds.join(',')})`
          )

        if (mappingsError) {
          console.error('Error fetching mappings:', mappingsError)
          // Don't set error here - mappings are optional
          setMappings([])
        } else {
          setMappings((existingMappings || []) as any)
        }
      } catch (err) {
        console.error('Unexpected error loading FIT mapping data:', err)
        setError('An unexpected error occurred while loading data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [valueMapId, customerProfileId])

  const handleItemClick = async (itemId: string, isSource: boolean) => {
    if (isSource) {
      // Select source item
      setSelectedSource(itemId)
      return
    }

    // Target clicked - need a source selected
    if (!selectedSource) return

    // Prevent concurrent operations
    if (creating) return

    setCreating(true)
    try {
      // SAFETY FIX: Null checks before property access
      const sourceItem = [...painRelievers, ...gainCreators].find((i) => i.id === selectedSource)
      const targetItem = [...pains, ...gains].find((i) => i.id === itemId)

      if (!sourceItem) {
        showErrorToast('Source item not found')
        setSelectedSource(null)
        return
      }

      if (!targetItem) {
        showErrorToast('Target item not found')
        return
      }

      // Determine mapping type based on item types
      let mappingType: MappingType = 'addresses'
      if (sourceItem.item_type === 'pain_reliever' && targetItem.item_type === 'pain') {
        mappingType = 'relieves'
      } else if (sourceItem.item_type === 'gain_creator' && targetItem.item_type === 'gain') {
        mappingType = 'creates'
      }

      // Check if mapping already exists
      const existing = mappings.find(
        (m) => m.source_item_id === selectedSource && m.target_item_id === itemId
      )

      if (existing) {
        // Edit existing mapping
        setEditingMapping(existing.id || null)
        setSelectedSource(null)
        showSuccessToast('Editing existing connection')
        return
      }

      // Create new mapping
      const { data, error } = await supabase
        .from('canvas_item_mappings')
        .insert([
          {
            source_item_id: selectedSource,
            target_item_id: itemId,
            mapping_type: mappingType,
            fit_strength: 'partial',
          },
        ])
        .select()
        .single()

      if (error) {
        console.error('Error creating mapping:', error)
        showErrorToast('Failed to create connection')
        return
      }

      // Only update state after successful DB operation
      if (data) {
        setMappings([...mappings, data as CanvasItemMapping])
        showSuccessToast('Connection created')
      }

      setSelectedSource(null)
    } catch (err) {
      console.error('Unexpected error creating mapping:', err)
      showErrorToast('An unexpected error occurred')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateFitStrength = async (mappingId: string, fitStrength: FitStrength) => {
    // Prevent concurrent operations
    if (updating) return

    setUpdating(mappingId)
    try {
      const { error } = await supabase
        .from('canvas_item_mappings')
        .update({ fit_strength: fitStrength })
        .eq('id', mappingId)

      if (error) {
        console.error('Error updating fit strength:', error)
        showErrorToast('Failed to update fit strength')
        return
      }

      // Only update state after successful DB operation
      setMappings(mappings.map((m) => (m.id === mappingId ? { ...m, fit_strength: fitStrength } : m)))
      setEditingMapping(null)
      showSuccessToast('Fit strength updated')
    } catch (err) {
      console.error('Unexpected error updating fit strength:', err)
      showErrorToast('An unexpected error occurred')
    } finally {
      setUpdating(null)
    }
  }

  const handleDeleteMapping = async (mappingId: string) => {
    // Prevent concurrent operations
    if (deleting) return

    setDeleting(mappingId)
    try {
      const { error } = await supabase.from('canvas_item_mappings').delete().eq('id', mappingId)

      if (error) {
        console.error('Error deleting mapping:', error)
        showErrorToast('Failed to delete connection')
        return
      }

      // Only update state after successful DB operation
      setMappings(mappings.filter((m) => m.id !== mappingId))
      setEditingMapping(null)
      showSuccessToast('Connection deleted')
    } catch (err) {
      console.error('Unexpected error deleting mapping:', err)
      showErrorToast('An unexpected error occurred')
    } finally {
      setDeleting(null)
    }
  }

  const getMappingCount = (itemId: string, isSource: boolean) => {
    return mappings.filter((m) =>
      isSource ? m.source_item_id === itemId : m.target_item_id === itemId
    ).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading FIT mapping...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
        <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-xs text-red-700 dark:text-red-400 hover:underline"
        >
          Reload page
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
        <p className="text-blue-700 dark:text-blue-400">
          <strong>Create FIT connections:</strong> Click a pain reliever or gain creator on the left, then
          click a pain or gain on the right to create a connection. Click existing connections to edit fit
          strength.
        </p>
      </div>

      {/* Mapping Grid */}
      <div className="grid grid-cols-2 gap-8">
        {/* Left side: Value Map items */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Value Map</h3>

          {/* Pain Relievers */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">Pain Relievers</h4>
            {painRelievers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No pain relievers added</p>
            ) : (
              <div className="space-y-1">
                {painRelievers.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id, true)}
                    className={`w-full text-left p-2 rounded border text-sm transition-colors ${
                      selectedSource === item.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{item.title}</span>
                      {getMappingCount(item.id, true) > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                          {getMappingCount(item.id, true)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Gain Creators */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">Gain Creators</h4>
            {gainCreators.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No gain creators added</p>
            ) : (
              <div className="space-y-1">
                {gainCreators.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id, true)}
                    className={`w-full text-left p-2 rounded border text-sm transition-colors ${
                      selectedSource === item.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{item.title}</span>
                      {getMappingCount(item.id, true) > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                          {getMappingCount(item.id, true)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side: Customer Profile items */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Customer Profile</h3>

          {/* Pains */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">Pains</h4>
            {pains.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No pains added</p>
            ) : (
              <div className="space-y-1">
                {pains.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id, false)}
                    disabled={!selectedSource}
                    className={`w-full text-left p-2 rounded border text-sm transition-colors ${
                      selectedSource
                        ? 'border-border hover:bg-accent cursor-pointer'
                        : 'border-border opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{item.title}</span>
                      {getMappingCount(item.id, false) > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                          {getMappingCount(item.id, false)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Gains */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">Gains</h4>
            {gains.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No gains added</p>
            ) : (
              <div className="space-y-1">
                {gains.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id, false)}
                    disabled={!selectedSource}
                    className={`w-full text-left p-2 rounded border text-sm transition-colors ${
                      selectedSource
                        ? 'border-border hover:bg-accent cursor-pointer'
                        : 'border-border opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{item.title}</span>
                      {getMappingCount(item.id, false) > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                          {getMappingCount(item.id, false)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mappings List */}
      {mappings.length > 0 && (
        <div className="pt-6 border-t space-y-3">
          <h3 className="font-medium text-sm">FIT Connections ({mappings.length})</h3>
          <div className="space-y-2">
            {mappings.map((mapping) => {
              const sourceItem = [...painRelievers, ...gainCreators].find(
                (i) => i.id === mapping.source_item_id
              )
              const targetItem = [...pains, ...gains].find((i) => i.id === mapping.target_item_id)

              if (!sourceItem || !targetItem) return null

              return (
                <div
                  key={mapping.id}
                  className="p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-sm">
                        <span className="font-medium">{sourceItem.title}</span>
                        <span className="text-muted-foreground mx-2">→</span>
                        <span className="font-medium">{targetItem.title}</span>
                      </div>
                      {editingMapping === mapping.id ? (
                        <div className="flex items-center gap-2">
                          {(['weak', 'partial', 'strong', 'perfect'] as FitStrength[]).map((strength) => (
                            <button
                              key={strength}
                              onClick={() => mapping.id && handleUpdateFitStrength(mapping.id, strength)}
                              className={`text-xs px-2 py-1 rounded border ${fitStrengthColors[strength]}`}
                            >
                              {fitStrengthLabels[strength]}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingMapping(mapping.id || null)}
                          className={`text-xs px-2 py-1 rounded border ${
                            fitStrengthColors[mapping.fit_strength]
                          }`}
                        >
                          {fitStrengthLabels[mapping.fit_strength]}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => mapping.id && handleDeleteMapping(mapping.id)}
                      className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded"
                      title="Delete mapping"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected source indicator */}
      {selectedSource && (
        <div className="fixed bottom-4 right-4 p-3 rounded-lg bg-primary text-primary-foreground shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm">
              Selected:{' '}
              {[...painRelievers, ...gainCreators].find((i) => i.id === selectedSource)?.title}
            </span>
            <button
              onClick={() => setSelectedSource(null)}
              className="p-1 hover:bg-primary-foreground/20 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
