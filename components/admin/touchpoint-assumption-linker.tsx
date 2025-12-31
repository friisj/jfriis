'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { AssumptionRelationshipType } from '@/lib/types/boundary-objects'
import {
  createTouchpointAssumption,
  deleteTouchpointAssumption,
  type TouchpointAssumptionWithDetails,
  type TouchpointAssumptionInsert,
} from '@/lib/boundary-objects/mappings'

interface Assumption {
  id: string
  statement: string
  status: string
  risk_level: string | null
}

interface TouchpointAssumptionLinkerProps {
  touchpointId: string
  projectId?: string
  linkedAssumptions: TouchpointAssumptionWithDetails[]
  onAssumptionChange?: () => void
}

const relationshipTypes: { value: AssumptionRelationshipType; label: string; description: string }[] = [
  { value: 'tests', label: 'Tests', description: 'This touchpoint tests the assumption' },
  { value: 'validates', label: 'Validates', description: 'Evidence from this touchpoint validates' },
  { value: 'challenges', label: 'Challenges', description: 'Evidence challenges the assumption' },
  { value: 'depends_on', label: 'Depends On', description: 'Touchpoint design depends on assumption' },
]

const validRelationshipTypes: AssumptionRelationshipType[] = ['tests', 'validates', 'challenges', 'depends_on']

const statusColors: Record<string, string> = {
  untested: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  testing: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  validated: 'bg-green-500/10 text-green-700 dark:text-green-400',
  invalidated: 'bg-red-500/10 text-red-700 dark:text-red-400',
}

const riskColors: Record<string, string> = {
  low: 'text-green-600 dark:text-green-400',
  medium: 'text-amber-600 dark:text-amber-400',
  high: 'text-red-600 dark:text-red-400',
}

export function TouchpointAssumptionLinker({
  touchpointId,
  projectId,
  linkedAssumptions: initialLinked,
  onAssumptionChange,
}: TouchpointAssumptionLinkerProps) {
  const [linkedAssumptions, setLinkedAssumptions] = useState<TouchpointAssumptionWithDetails[]>(initialLinked)
  const [showSelector, setShowSelector] = useState(false)
  const [availableAssumptions, setAvailableAssumptions] = useState<Assumption[]>([])
  const [selectedAssumption, setSelectedAssumption] = useState<string>('')
  const [relationshipType, setRelationshipType] = useState<AssumptionRelationshipType>('tests')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      setSelectedAssumption('')
      setNotes('')
    }
  }, [showSelector])

  useEffect(() => {
    if (showSelector) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showSelector, handleKeyDown])

  // Load available assumptions when selector opens
  useEffect(() => {
    if (!showSelector) return

    async function loadAssumptions() {
      setLoading(true)
      try {
        let query = supabase
          .from('assumptions')
          .select('id, statement, status, risk_level')
          .order('created_at', { ascending: false })

        if (projectId) {
          query = query.eq('studio_project_id', projectId)
        }

        const { data, error } = await query

        if (error) throw error

        // Filter out already linked assumptions
        const linkedIds = new Set(linkedAssumptions.map((l) => l.assumption_id))
        const available = (data || []).filter((a) => !linkedIds.has(a.id))
        setAvailableAssumptions(available)
      } catch (err) {
        console.error('Error loading assumptions:', err)
        setError('Failed to load assumptions')
      } finally {
        setLoading(false)
      }
    }

    loadAssumptions()
  }, [showSelector, projectId, linkedAssumptions])

  const handleLink = async () => {
    if (!selectedAssumption) return

    // Validate relationship type
    if (!validRelationshipTypes.includes(relationshipType)) {
      setError('Invalid relationship type')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const insertData: TouchpointAssumptionInsert = {
        touchpoint_id: touchpointId,
        assumption_id: selectedAssumption,
        relationship_type: relationshipType,
        notes: notes || undefined,
      }

      const link = await createTouchpointAssumption(insertData)

      // Find the assumption details
      const assumption = availableAssumptions.find((a) => a.id === selectedAssumption)

      setLinkedAssumptions((prev) => [
        ...prev,
        { ...link, assumption: assumption || null },
      ])

      setShowSelector(false)
      setSelectedAssumption('')
      setRelationshipType('tests')
      setNotes('')
      onAssumptionChange?.()
    } catch (err) {
      console.error('Error linking assumption:', err)
      setError(err instanceof Error ? err.message : 'Failed to link assumption')
    } finally {
      setSaving(false)
    }
  }

  const handleUnlink = async (assumptionId: string) => {
    if (!confirm('Remove this assumption link?')) return

    setUnlinkingId(assumptionId)
    setError(null)

    // Optimistic update
    const previousLinked = linkedAssumptions
    setLinkedAssumptions((prev) =>
      prev.filter((l) => l.assumption_id !== assumptionId)
    )

    try {
      await deleteTouchpointAssumption(touchpointId, assumptionId)
      onAssumptionChange?.()
    } catch (err) {
      console.error('Error unlinking assumption:', err)
      // Rollback on error
      setLinkedAssumptions(previousLinked)
      setError(err instanceof Error ? err.message : 'Failed to unlink assumption')
    } finally {
      setUnlinkingId(null)
    }
  }

  // Click outside to close modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowSelector(false)
      setSelectedAssumption('')
      setNotes('')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          Linked Assumptions ({linkedAssumptions.length})
        </h4>
        <button
          onClick={() => setShowSelector(true)}
          className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
        >
          + Link
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
          aria-labelledby="link-assumption-title"
        >
          <div className="bg-background border rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 id="link-assumption-title" className="text-lg font-semibold mb-4">Link Assumption</h3>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading assumptions...
              </div>
            ) : availableAssumptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No available assumptions to link.
                {projectId && ' Try removing the project filter.'}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Assumption Selector */}
                <div>
                  <label className="block text-sm font-medium mb-2">Select Assumption *</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {availableAssumptions.map((assumption) => (
                      <label
                        key={assumption.id}
                        className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                          selectedAssumption === assumption.id
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-accent'
                        }`}
                      >
                        <input
                          type="radio"
                          name="assumption"
                          value={assumption.id}
                          checked={selectedAssumption === assumption.id}
                          onChange={(e) => setSelectedAssumption(e.target.value)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2">{assumption.statement}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[assumption.status]}`}>
                              {assumption.status}
                            </span>
                            {assumption.risk_level && (
                              <span className={`text-xs ${riskColors[assumption.risk_level]}`}>
                                {assumption.risk_level} risk
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Relationship Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">Relationship Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {relationshipTypes.map((type) => (
                      <label
                        key={type.value}
                        className={`flex flex-col p-2 rounded-lg border cursor-pointer transition-colors ${
                          relationshipType === type.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="relationship"
                          value={type.value}
                          checked={relationshipType === type.value}
                          onChange={(e) => setRelationshipType(e.target.value as AssumptionRelationshipType)}
                          className="sr-only"
                        />
                        <span className="text-sm font-medium">{type.label}</span>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
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
                    placeholder="Optional context about this relationship..."
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSelector(false)
                      setSelectedAssumption('')
                      setNotes('')
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLink}
                    disabled={saving || !selectedAssumption}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Linking...' : 'Link Assumption'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Linked List */}
      {linkedAssumptions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No assumptions linked yet.
        </p>
      ) : (
        <div className="space-y-2">
          {linkedAssumptions.map((link) => (
            <div
              key={link.id}
              className={`p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors ${
                unlinkingId === link.assumption_id ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground capitalize">
                      {link.relationship_type || 'tests'}
                    </span>
                    {link.assumption?.status && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[link.assumption.status]}`}>
                        {link.assumption.status}
                      </span>
                    )}
                  </div>
                  <p className="text-sm line-clamp-2">
                    {link.assumption?.statement || 'Unknown assumption'}
                  </p>
                  {link.notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {link.notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleUnlink(link.assumption_id)}
                  className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                  title="Remove link"
                  disabled={unlinkingId === link.assumption_id}
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
