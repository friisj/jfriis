'use client'

import { useState, useEffect } from 'react'
import type {
  FeedbackEntityType,
  Feedback,
  FeedbackSourceType,
  PendingFeedback,
  HatType,
} from '@/lib/types/entity-relationships'
import {
  HAT_TYPE_LABELS,
  HAT_TYPE_COLORS,
} from '@/lib/types/entity-relationships'
import { getFeedback, addFeedback, deleteFeedback, updateFeedback } from '@/lib/feedback'

interface FeedbackManagerProps {
  // Entity this feedback is attached to
  entityType: FeedbackEntityType
  entityId?: string // undefined for create mode

  // UI configuration
  label?: string
  compact?: boolean // Sidebar mode vs full mode
  allowedTypes?: FeedbackSourceType[] // Restrict source types

  // For controlled mode (create forms)
  pendingFeedback?: PendingFeedback[]
  onPendingFeedbackChange?: (feedback: PendingFeedback[]) => void
}

const ALL_FEEDBACK_TYPES: FeedbackSourceType[] = [
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

const FEEDBACK_TYPE_LABELS: Record<FeedbackSourceType, string> = {
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

const ALL_HATS: HatType[] = ['white', 'black', 'yellow', 'red', 'green', 'blue']

export function FeedbackManager({
  entityType,
  entityId,
  label = 'Feedback',
  compact = false,
  allowedTypes,
  pendingFeedback,
  onPendingFeedbackChange,
}: FeedbackManagerProps) {
  const [existingFeedback, setExistingFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Determine if we're in controlled mode (create) or uncontrolled mode (edit)
  const isControlled = pendingFeedback !== undefined && onPendingFeedbackChange !== undefined
  const isEditMode = entityId !== undefined

  const availableTypes = allowedTypes || ALL_FEEDBACK_TYPES

  // Load existing feedback in edit mode
  useEffect(() => {
    if (!isEditMode) return

    const loadFeedback = async () => {
      setLoading(true)
      try {
        const data = await getFeedback({ type: entityType, id: entityId })
        setExistingFeedback(data)
      } catch (err) {
        console.error('Error loading feedback:', err)
      } finally {
        setLoading(false)
      }
    }

    loadFeedback()
  }, [isEditMode, entityType, entityId])

  // Feedback item with optional ID (for display)
  type FeedbackDisplayItem = PendingFeedback & { id?: string }

  // Get all feedback items to display
  const allFeedback: FeedbackDisplayItem[] = isControlled
    ? pendingFeedback || []
    : existingFeedback.map((f) => ({
        hat_type: f.hat_type,
        feedback_type: f.feedback_type as FeedbackSourceType,
        title: f.title,
        displayLabel: f.title,
        content: f.content,
        source_url: f.source_url,
        confidence: f.confidence || undefined,
        supports: f.supports,
        id: f.id,
      }))

  const handleAddFeedback = async (newFeedback: PendingFeedback) => {
    if (isControlled) {
      onPendingFeedbackChange?.([...(pendingFeedback || []), newFeedback])
    } else if (entityId) {
      setSaving(true)
      try {
        await addFeedback(
          { type: entityType, id: entityId },
          {
            hat_type: newFeedback.hat_type,
            feedback_type: newFeedback.feedback_type,
            title: newFeedback.title,
            content: newFeedback.content,
            source_url: newFeedback.source_url,
            confidence: newFeedback.confidence,
            supports: newFeedback.supports,
            tags: [],
            metadata: {},
          }
        )
        const data = await getFeedback({ type: entityType, id: entityId })
        setExistingFeedback(data)
      } catch (err) {
        console.error('Error adding feedback:', err)
      } finally {
        setSaving(false)
      }
    }
    setShowAddForm(false)
  }

  const handleRemoveFeedback = async (index: number, id?: string) => {
    if (isControlled) {
      const updated = [...(pendingFeedback || [])]
      updated.splice(index, 1)
      onPendingFeedbackChange?.(updated)
    } else if (id && entityId) {
      setSaving(true)
      try {
        await deleteFeedback(id)
        const data = await getFeedback({ type: entityType, id: entityId })
        setExistingFeedback(data)
      } catch (err) {
        console.error('Error deleting feedback:', err)
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

        {allFeedback.length === 0 && !showAddForm && (
          <p className="text-sm text-muted-foreground">No feedback collected</p>
        )}

        {allFeedback.length > 0 && (
          <ul className="space-y-1.5">
            {allFeedback.map((item, index) => (
              <li
                key={item.id ?? index}
                className="flex items-start gap-2 text-sm p-2 rounded bg-muted/50"
              >
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${HAT_TYPE_COLORS[item.hat_type]}`}>
                  {HAT_TYPE_LABELS[item.hat_type]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {item.displayLabel || item.title || FEEDBACK_TYPE_LABELS[item.feedback_type]}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {FEEDBACK_TYPE_LABELS[item.feedback_type]}
                    {item.confidence && ` (${Math.round(item.confidence * 100)}%)`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFeedback(index, item.id)}
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
          <FeedbackForm
            availableTypes={availableTypes}
            onSubmit={handleAddFeedback}
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
            + Add Feedback
          </button>
        )}
      </div>
    )
  }

  // Full mode
  return (
    <div className="space-y-4">
      {label && <h4 className="text-base font-medium">{label}</h4>}

      {allFeedback.length === 0 && !showAddForm && (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <p className="text-muted-foreground mb-2">No feedback collected yet</p>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="text-sm text-primary hover:underline"
          >
            Add your first piece of feedback
          </button>
        </div>
      )}

      {allFeedback.length > 0 && (
        <div className="space-y-3">
          {allFeedback.map((item, index) => (
            <div
              key={item.id ?? index}
              className="p-4 border rounded-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${HAT_TYPE_COLORS[item.hat_type]}`}>
                      {HAT_TYPE_LABELS[item.hat_type]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {FEEDBACK_TYPE_LABELS[item.feedback_type]}
                    </span>
                    {item.supports !== null && item.supports !== undefined && (
                      <span className={`text-xs ${item.supports ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {item.supports ? 'Supporting' : 'Refuting'}
                      </span>
                    )}
                    {item.confidence && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(item.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                  <h5 className="font-medium">
                    {item.displayLabel || item.title || FEEDBACK_TYPE_LABELS[item.feedback_type]}
                  </h5>
                  {item.content && (
                    <p className="text-sm text-muted-foreground mt-1">{item.content}</p>
                  )}
                  {item.source_url && (
                    <a
                      href={item.source_url}
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
                  onClick={() => handleRemoveFeedback(index, item.id)}
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
        <FeedbackForm
          availableTypes={availableTypes}
          onSubmit={handleAddFeedback}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        allFeedback.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            disabled={saving}
            className="w-full px-4 py-3 text-sm border border-dashed rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
          >
            + Add More Feedback
          </button>
        )
      )}
    </div>
  )
}

// Feedback form subcomponent
interface FeedbackFormProps {
  availableTypes: FeedbackSourceType[]
  onSubmit: (feedback: PendingFeedback) => void
  onCancel: () => void
  compact?: boolean
}

function supportsFromString(value: string): boolean | null {
  if (value === 'supports') return true
  if (value === 'refutes') return false
  return null
}

function supportsToString(value: boolean | null): string {
  if (value === true) return 'supports'
  if (value === false) return 'refutes'
  return 'neutral'
}

function FeedbackForm({ availableTypes, onSubmit, onCancel, compact = false }: FeedbackFormProps) {
  const [formData, setFormData] = useState<PendingFeedback>({
    hat_type: 'white',
    feedback_type: availableTypes[0],
    title: '',
    content: '',
    source_url: '',
    confidence: undefined,
    supports: null,
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
            value={formData.hat_type}
            onChange={(e) => setFormData({ ...formData, hat_type: e.target.value as HatType })}
            className="px-2 py-1.5 text-sm border rounded bg-background"
          >
            {ALL_HATS.map((hat) => (
              <option key={hat} value={hat}>{HAT_TYPE_LABELS[hat]}</option>
            ))}
          </select>
          <select
            value={formData.feedback_type}
            onChange={(e) =>
              setFormData({ ...formData, feedback_type: e.target.value as FeedbackSourceType })
            }
            className="px-2 py-1.5 text-sm border rounded bg-background"
          >
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {FEEDBACK_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <select
          value={supportsToString(formData.supports)}
          onChange={(e) => setFormData({ ...formData, supports: supportsFromString(e.target.value) })}
          className="w-full px-2 py-1.5 text-sm border rounded bg-background"
        >
          <option value="neutral">Neutral</option>
          <option value="supports">Supporting</option>
          <option value="refutes">Refuting</option>
        </select>
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
      <h5 className="font-medium">Add Feedback</h5>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Hat</label>
          <select
            value={formData.hat_type}
            onChange={(e) => setFormData({ ...formData, hat_type: e.target.value as HatType })}
            className="w-full px-3 py-2 border rounded-lg bg-background"
          >
            {ALL_HATS.map((hat) => (
              <option key={hat} value={hat}>{HAT_TYPE_LABELS[hat]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Source</label>
          <select
            value={formData.feedback_type}
            onChange={(e) =>
              setFormData({ ...formData, feedback_type: e.target.value as FeedbackSourceType })
            }
            className="w-full px-3 py-2 border rounded-lg bg-background"
          >
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {FEEDBACK_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Stance</label>
        <select
          value={supportsToString(formData.supports)}
          onChange={(e) => setFormData({ ...formData, supports: supportsFromString(e.target.value) })}
          className="w-full px-3 py-2 border rounded-lg bg-background"
        >
          <option value="neutral">Neutral</option>
          <option value="supports">Supporting</option>
          <option value="refutes">Refuting</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          type="text"
          placeholder="Brief title for this feedback"
          value={formData.title || ''}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg bg-background"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Summary</label>
        <textarea
          placeholder="What did you observe? Key findings..."
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
          Add Feedback
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
 * Feedback summary badge for list views
 */
interface FeedbackBadgeProps {
  entityType: FeedbackEntityType
  entityId: string
  className?: string
}

export function FeedbackBadge({ entityType, entityId, className = '' }: FeedbackBadgeProps) {
  const [summary, setSummary] = useState<{
    total: number
    supporting: number
    refuting: number
  } | null>(null)

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const { getFeedbackSummary } = await import('@/lib/feedback')
        const data = await getFeedbackSummary({ type: entityType, id: entityId })
        setSummary(data)
      } catch (err) {
        console.error('Error loading feedback summary:', err)
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
