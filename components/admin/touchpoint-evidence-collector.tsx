'use client'

import { useState, useEffect, useCallback } from 'react'
import type { TouchpointEvidence, EvidenceType, ValidationConfidence } from '@/lib/types/boundary-objects'
import { TouchpointEvidenceForm } from './touchpoint-evidence-form'
import {
  createTouchpointEvidence,
  updateTouchpointEvidence,
  deleteTouchpointEvidence,
  type TouchpointEvidenceInsert,
  type TouchpointEvidenceUpdate,
} from '@/lib/boundary-objects/mappings'

interface TouchpointEvidenceCollectorProps {
  touchpointId: string
  evidence: TouchpointEvidence[]
  onEvidenceChange?: () => void
}

const evidenceTypeIcons: Record<string, string> = {
  user_test: '🧪',
  interview: '🎙️',
  survey: '📊',
  analytics: '📈',
  observation: '👁️',
  prototype: '🎨',
  ab_test: '🔬',
  heuristic_eval: '📋',
}

const evidenceTypeLabels: Record<string, string> = {
  user_test: 'User Test',
  interview: 'Interview',
  survey: 'Survey',
  analytics: 'Analytics',
  observation: 'Observation',
  prototype: 'Prototype',
  ab_test: 'A/B Test',
  heuristic_eval: 'Heuristic Eval',
}

const confidenceColors: Record<string, string> = {
  low: 'text-orange-600 dark:text-orange-400',
  medium: 'text-blue-600 dark:text-blue-400',
  high: 'text-green-600 dark:text-green-400',
}

// Valid evidence types for type-safe casting
const validEvidenceTypes: EvidenceType[] = [
  'user_test', 'interview', 'survey', 'analytics',
  'observation', 'prototype', 'ab_test', 'heuristic_eval'
]

const validConfidenceLevels: ValidationConfidence[] = ['low', 'medium', 'high']

// URL validation to prevent XSS (only allow http/https)
function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function TouchpointEvidenceCollector({
  touchpointId,
  evidence: initialEvidence,
  onEvidenceChange,
}: TouchpointEvidenceCollectorProps) {
  const [evidence, setEvidence] = useState<TouchpointEvidence[]>(initialEvidence)
  const [showForm, setShowForm] = useState(false)
  const [editingEvidence, setEditingEvidence] = useState<TouchpointEvidence | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Auto-clear errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Keyboard handler for modals (Escape to close)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (editingEvidence) {
        setEditingEvidence(null)
      } else if (showForm) {
        setShowForm(false)
      }
    }
  }, [editingEvidence, showForm])

  useEffect(() => {
    if (showForm || editingEvidence) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showForm, editingEvidence, handleKeyDown])

  const handleAddEvidence = async (data: {
    evidence_type: string
    title: string
    summary?: string
    url?: string
    supports_design?: boolean | null
    confidence?: string
    collected_at?: string
  }) => {
    setSaving(true)
    setError(null)

    // Validate evidence_type
    if (!validEvidenceTypes.includes(data.evidence_type as EvidenceType)) {
      setError('Invalid evidence type')
      setSaving(false)
      return
    }

    // Validate URL if provided
    if (data.url && !isValidUrl(data.url)) {
      setError('Invalid URL. Only http:// and https:// URLs are allowed.')
      setSaving(false)
      return
    }

    try {
      const insertData: TouchpointEvidenceInsert = {
        touchpoint_id: touchpointId,
        evidence_type: data.evidence_type as EvidenceType,
        title: data.title,
        summary: data.summary,
        url: data.url,
        supports_design: data.supports_design,
        confidence: data.confidence && validConfidenceLevels.includes(data.confidence as ValidationConfidence)
          ? (data.confidence as ValidationConfidence)
          : undefined,
        collected_at: data.collected_at,
      }

      const newEvidence = await createTouchpointEvidence(insertData)
      setEvidence((prev) => [newEvidence, ...prev])
      setShowForm(false)
      onEvidenceChange?.()
    } catch (err) {
      console.error('Error adding evidence:', err)
      setError(err instanceof Error ? err.message : 'Failed to add evidence')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateEvidence = async (data: {
    evidence_type: string
    title: string
    summary?: string
    url?: string
    supports_design?: boolean | null
    confidence?: string
    collected_at?: string
  }) => {
    if (!editingEvidence) return

    setSaving(true)
    setError(null)

    // Validate evidence_type
    if (!validEvidenceTypes.includes(data.evidence_type as EvidenceType)) {
      setError('Invalid evidence type')
      setSaving(false)
      return
    }

    // Validate URL if provided
    if (data.url && !isValidUrl(data.url)) {
      setError('Invalid URL. Only http:// and https:// URLs are allowed.')
      setSaving(false)
      return
    }

    try {
      const updateData: TouchpointEvidenceUpdate = {
        evidence_type: data.evidence_type as EvidenceType,
        title: data.title,
        summary: data.summary,
        url: data.url,
        supports_design: data.supports_design,
        confidence: data.confidence && validConfidenceLevels.includes(data.confidence as ValidationConfidence)
          ? (data.confidence as ValidationConfidence)
          : undefined,
        collected_at: data.collected_at,
      }

      const updated = await updateTouchpointEvidence(editingEvidence.id, updateData)
      setEvidence((prev) =>
        prev.map((e) => (e.id === editingEvidence.id ? updated : e))
      )
      setEditingEvidence(null)
      onEvidenceChange?.()
    } catch (err) {
      console.error('Error updating evidence:', err)
      setError(err instanceof Error ? err.message : 'Failed to update evidence')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!confirm('Delete this evidence?')) return

    setDeletingId(evidenceId)
    setError(null)

    // Optimistic update
    const previousEvidence = evidence
    setEvidence((prev) => prev.filter((e) => e.id !== evidenceId))

    try {
      await deleteTouchpointEvidence(evidenceId)
      onEvidenceChange?.()
    } catch (err) {
      console.error('Error deleting evidence:', err)
      // Rollback on error
      setEvidence(previousEvidence)
      setError(err instanceof Error ? err.message : 'Failed to delete evidence')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString()
  }

  // Click outside to close modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      if (editingEvidence) {
        setEditingEvidence(null)
      } else if (showForm) {
        setShowForm(false)
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          Evidence ({evidence.length})
        </h4>
        <button
          onClick={() => setShowForm(true)}
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

      {/* Add Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-evidence-title"
        >
          <div className="bg-background border rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 id="add-evidence-title" className="text-lg font-semibold mb-4">Add Evidence</h3>
            <TouchpointEvidenceForm
              onSubmit={handleAddEvidence}
              onCancel={() => setShowForm(false)}
              saving={saving}
            />
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {editingEvidence && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-evidence-title"
        >
          <div className="bg-background border rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 id="edit-evidence-title" className="text-lg font-semibold mb-4">Edit Evidence</h3>
            <TouchpointEvidenceForm
              evidence={editingEvidence}
              onSubmit={handleUpdateEvidence}
              onCancel={() => setEditingEvidence(null)}
              saving={saving}
            />
          </div>
        </div>
      )}

      {/* Evidence List */}
      {evidence.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No evidence collected yet.
        </p>
      ) : (
        <div className="space-y-2">
          {evidence.map((e) => (
            <div
              key={e.id}
              className={`p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors ${
                deletingId === e.id ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{evidenceTypeIcons[e.evidence_type] || '📄'}</span>
                    <span className="text-xs text-muted-foreground">
                      {evidenceTypeLabels[e.evidence_type] || e.evidence_type}
                    </span>
                    {e.supports_design !== null && (
                      <span
                        className={`text-xs ${
                          e.supports_design
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {e.supports_design ? '✓ Supports' : '✗ Contradicts'}
                      </span>
                    )}
                    {e.confidence && (
                      <span className={`text-xs ${confidenceColors[e.confidence]}`}>
                        ({e.confidence})
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium">{e.title}</p>
                  {e.summary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {e.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {e.collected_at && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(e.collected_at)}
                      </span>
                    )}
                    {e.url && isValidUrl(e.url) && (
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View source
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingEvidence(e)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit"
                    disabled={deletingId === e.id}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteEvidence(e.id)}
                    className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                    title="Delete"
                    disabled={deletingId === e.id}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
