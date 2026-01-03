'use client'

import { useState, useEffect } from 'react'
import type {
  EvidenceEntityType,
  UniversalEvidence,
  UniversalEvidenceType,
  PendingEvidence,
} from '@/lib/types/entity-relationships'
import { getEvidence, addEvidence, deleteEvidence, updateEvidence } from '@/lib/evidence'

interface EvidenceManagerProps {
  // Entity this evidence supports
  entityType: EvidenceEntityType
  entityId?: string // undefined for create mode

  // UI configuration
  label?: string
  compact?: boolean // Sidebar mode vs full mode
  allowedTypes?: UniversalEvidenceType[] // Restrict evidence types

  // For controlled mode (create forms)
  pendingEvidence?: PendingEvidence[]
  onPendingEvidenceChange?: (evidence: PendingEvidence[]) => void
}

const ALL_EVIDENCE_TYPES: UniversalEvidenceType[] = [
  'interview',
  'survey',
  'observation',
  'research',
  'analytics',
  'metrics',
  'ab_test',
  'experiment',
  'prototype',
  'user_test',
  'heuristic_eval',
  'competitor',
  'expert',
  'market_research',
  'team_discussion',
  'stakeholder_feedback',
]

const EVIDENCE_TYPE_LABELS: Record<UniversalEvidenceType, string> = {
  interview: 'Interview',
  survey: 'Survey',
  observation: 'Observation',
  research: 'Research',
  analytics: 'Analytics',
  metrics: 'Metrics',
  ab_test: 'A/B Test',
  experiment: 'Experiment',
  prototype: 'Prototype',
  user_test: 'User Test',
  heuristic_eval: 'Heuristic Eval',
  competitor: 'Competitor',
  expert: 'Expert',
  market_research: 'Market Research',
  team_discussion: 'Team Discussion',
  stakeholder_feedback: 'Stakeholder Feedback',
}

export function EvidenceManager({
  entityType,
  entityId,
  label = 'Evidence',
  compact = false,
  allowedTypes,
  pendingEvidence,
  onPendingEvidenceChange,
}: EvidenceManagerProps) {
  const [existingEvidence, setExistingEvidence] = useState<UniversalEvidence[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Determine if we're in controlled mode (create) or uncontrolled mode (edit)
  const isControlled = pendingEvidence !== undefined && onPendingEvidenceChange !== undefined
  const isEditMode = entityId !== undefined

  const availableTypes = allowedTypes || ALL_EVIDENCE_TYPES

  // Load existing evidence in edit mode
  useEffect(() => {
    if (!isEditMode) return

    const loadEvidence = async () => {
      setLoading(true)
      try {
        const data = await getEvidence({ type: entityType, id: entityId })
        setExistingEvidence(data)
      } catch (err) {
        console.error('Error loading evidence:', err)
      } finally {
        setLoading(false)
      }
    }

    loadEvidence()
  }, [isEditMode, entityType, entityId])

  // Evidence item with optional ID (for display)
  type EvidenceDisplayItem = PendingEvidence & { id?: string }

  // Get all evidence items to display
  const allEvidence: EvidenceDisplayItem[] = isControlled
    ? pendingEvidence || []
    : existingEvidence.map((e) => ({
        evidence_type: e.evidence_type as UniversalEvidenceType,
        title: e.title,
        displayLabel: e.title, // Use title as display label for existing evidence
        content: e.content,
        source_url: e.source_url,
        confidence: e.confidence || undefined,
        supports: e.supports,
        id: e.id,
      }))

  const handleAddEvidence = async (newEvidence: PendingEvidence) => {
    if (isControlled) {
      onPendingEvidenceChange?.([...(pendingEvidence || []), newEvidence])
    } else if (entityId) {
      setSaving(true)
      try {
        await addEvidence(
          { type: entityType, id: entityId },
          {
            evidence_type: newEvidence.evidence_type,
            title: newEvidence.title,
            content: newEvidence.content,
            source_url: newEvidence.source_url,
            confidence: newEvidence.confidence,
            supports: newEvidence.supports,
            tags: [],
            metadata: {},
          }
        )
        // Reload evidence
        const data = await getEvidence({ type: entityType, id: entityId })
        setExistingEvidence(data)
      } catch (err) {
        console.error('Error adding evidence:', err)
      } finally {
        setSaving(false)
      }
    }
    setShowAddForm(false)
  }

  const handleRemoveEvidence = async (index: number, id?: string) => {
    if (isControlled) {
      const updated = [...(pendingEvidence || [])]
      updated.splice(index, 1)
      onPendingEvidenceChange?.(updated)
    } else if (id && entityId) {
      setSaving(true)
      try {
        await deleteEvidence(id)
        const data = await getEvidence({ type: entityType, id: entityId })
        setExistingEvidence(data)
      } catch (err) {
        console.error('Error deleting evidence:', err)
      } finally {
        setSaving(false)
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {label && <h4 className="text-sm font-medium">{label}</h4>}
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-muted rounded" />
          <div className="h-8 bg-muted rounded w-3/4" />
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {label && <h4 className="text-sm font-medium">{label}</h4>}

        {allEvidence.length === 0 && !showAddForm && (
          <p className="text-sm text-muted-foreground">No evidence collected</p>
        )}

        {allEvidence.length > 0 && (
          <ul className="space-y-1.5">
            {allEvidence.map((evidence, index) => (
              <li
                key={evidence.id ?? index}
                className="flex items-start gap-2 text-sm p-2 rounded bg-muted/50"
              >
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                    evidence.supports
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {evidence.supports ? '+' : '-'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {evidence.displayLabel || evidence.title || EVIDENCE_TYPE_LABELS[evidence.evidence_type]}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {EVIDENCE_TYPE_LABELS[evidence.evidence_type]}
                    {evidence.confidence && ` (${Math.round(evidence.confidence * 100)}%)`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveEvidence(index, evidence.id)}
                  disabled={saving}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {showAddForm ? (
          <EvidenceForm
            availableTypes={availableTypes}
            onSubmit={handleAddEvidence}
            onCancel={() => setShowAddForm(false)}
            compact
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            disabled={saving}
            className="w-full px-3 py-2 text-sm border border-dashed rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
          >
            + Add Evidence
          </button>
        )}
      </div>
    )
  }

  // Full mode
  return (
    <div className="space-y-4">
      {label && <h4 className="text-base font-medium">{label}</h4>}

      {allEvidence.length === 0 && !showAddForm && (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <p className="text-muted-foreground mb-2">No evidence collected yet</p>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="text-sm text-primary hover:underline"
          >
            Add your first piece of evidence
          </button>
        </div>
      )}

      {allEvidence.length > 0 && (
        <div className="space-y-3">
          {allEvidence.map((evidence, index) => (
            <div
              key={evidence.id ?? index}
              className="p-4 border rounded-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        evidence.supports
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {evidence.supports ? 'Supporting' : 'Refuting'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {EVIDENCE_TYPE_LABELS[evidence.evidence_type]}
                    </span>
                    {evidence.confidence && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(evidence.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                  <h5 className="font-medium">
                    {evidence.displayLabel || evidence.title || EVIDENCE_TYPE_LABELS[evidence.evidence_type]}
                  </h5>
                  {evidence.content && (
                    <p className="text-sm text-muted-foreground mt-1">{evidence.content}</p>
                  )}
                  {evidence.source_url && (
                    <a
                      href={evidence.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      View source
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveEvidence(index, evidence.id)}
                  disabled={saving}
                  className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddForm ? (
        <EvidenceForm
          availableTypes={availableTypes}
          onSubmit={handleAddEvidence}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        allEvidence.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            disabled={saving}
            className="w-full px-4 py-3 text-sm border border-dashed rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
          >
            + Add More Evidence
          </button>
        )
      )}
    </div>
  )
}

// Evidence form subcomponent
interface EvidenceFormProps {
  availableTypes: UniversalEvidenceType[]
  onSubmit: (evidence: PendingEvidence) => void
  onCancel: () => void
  compact?: boolean
}

function EvidenceForm({ availableTypes, onSubmit, onCancel, compact = false }: EvidenceFormProps) {
  const [formData, setFormData] = useState<PendingEvidence>({
    evidence_type: availableTypes[0],
    title: '',
    content: '',
    source_url: '',
    confidence: undefined,
    supports: true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="space-y-2 p-3 border rounded-lg bg-background">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={formData.evidence_type}
            onChange={(e) =>
              setFormData({ ...formData, evidence_type: e.target.value as UniversalEvidenceType })
            }
            className="px-2 py-1.5 text-sm border rounded bg-background"
          >
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {EVIDENCE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <select
            value={formData.supports ? 'supports' : 'refutes'}
            onChange={(e) =>
              setFormData({ ...formData, supports: e.target.value === 'supports' })
            }
            className="px-2 py-1.5 text-sm border rounded bg-background"
          >
            <option value="supports">Supporting</option>
            <option value="refutes">Refuting</option>
          </select>
        </div>
        <input
          type="text"
          placeholder="Title (optional)"
          value={formData.title || ''}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border rounded bg-background"
        />
        <textarea
          placeholder="Summary..."
          value={formData.content || ''}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={2}
          className="w-full px-2 py-1.5 text-sm border rounded bg-background resize-none"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Add
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm border rounded hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <h5 className="font-medium">Add Evidence</h5>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={formData.evidence_type}
            onChange={(e) =>
              setFormData({ ...formData, evidence_type: e.target.value as UniversalEvidenceType })
            }
            className="w-full px-3 py-2 border rounded-lg bg-background"
          >
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {EVIDENCE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Stance</label>
          <select
            value={formData.supports ? 'supports' : 'refutes'}
            onChange={(e) =>
              setFormData({ ...formData, supports: e.target.value === 'supports' })
            }
            className="w-full px-3 py-2 border rounded-lg bg-background"
          >
            <option value="supports">Supporting</option>
            <option value="refutes">Refuting</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          type="text"
          placeholder="Brief title for this evidence"
          value={formData.title || ''}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg bg-background"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Summary</label>
        <textarea
          placeholder="What did you learn? Key findings..."
          value={formData.content || ''}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border rounded-lg bg-background resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Source URL</label>
          <input
            type="url"
            placeholder="https://..."
            value={formData.source_url || ''}
            onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg bg-background"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Confidence</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={(formData.confidence || 0.5) * 100}
              onChange={(e) =>
                setFormData({ ...formData, confidence: Number(e.target.value) / 100 })
              }
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-10">
              {Math.round((formData.confidence || 0.5) * 100)}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Add Evidence
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

/**
 * Evidence summary badge for list views
 */
interface EvidenceBadgeProps {
  entityType: EvidenceEntityType
  entityId: string
  className?: string
}

export function EvidenceBadge({ entityType, entityId, className = '' }: EvidenceBadgeProps) {
  const [summary, setSummary] = useState<{
    total: number
    supporting: number
    refuting: number
  } | null>(null)

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const { getEvidenceSummary } = await import('@/lib/evidence')
        const data = await getEvidenceSummary({ type: entityType, id: entityId })
        setSummary(data)
      } catch (err) {
        console.error('Error loading evidence summary:', err)
      }
    }

    loadSummary()
  }, [entityType, entityId])

  if (!summary || summary.total === 0) return null

  return (
    <div className={`flex items-center gap-1 text-xs ${className}`}>
      {summary.supporting > 0 && (
        <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          +{summary.supporting}
        </span>
      )}
      {summary.refuting > 0 && (
        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          -{summary.refuting}
        </span>
      )}
    </div>
  )
}
