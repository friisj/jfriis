'use client'

import { useState } from 'react'
import type { TouchpointEvidence } from '@/lib/types/boundary-objects'
import { FormFieldWithAI } from '@/components/forms'

interface TouchpointEvidenceFormProps {
  evidence?: TouchpointEvidence
  onSubmit: (data: {
    evidence_type: string
    title: string
    summary?: string
    url?: string
    supports_design?: boolean | null
    confidence?: string
    collected_at?: string
  }) => void
  onCancel: () => void
  saving?: boolean
}

const evidenceTypes = [
  { value: 'user_test', label: 'User Test', icon: '🧪', description: 'Usability testing session' },
  { value: 'interview', label: 'Interview', icon: '🎙️', description: 'Customer interview' },
  { value: 'survey', label: 'Survey', icon: '📊', description: 'Survey responses' },
  { value: 'analytics', label: 'Analytics', icon: '📈', description: 'Quantitative data' },
  { value: 'observation', label: 'Observation', icon: '👁️', description: 'Field observation' },
  { value: 'prototype', label: 'Prototype', icon: '🎨', description: 'Prototype feedback' },
  { value: 'ab_test', label: 'A/B Test', icon: '🔬', description: 'A/B test results' },
  { value: 'heuristic_eval', label: 'Heuristic Eval', icon: '📋', description: 'Expert evaluation' },
]

const confidenceLevels = [
  { value: 'low', label: 'Low', description: 'Single data point or anecdotal' },
  { value: 'medium', label: 'Medium', description: 'Multiple data points or patterns' },
  { value: 'high', label: 'High', description: 'Strong, consistent evidence' },
]

export function TouchpointEvidenceForm({
  evidence,
  onSubmit,
  onCancel,
  saving,
}: TouchpointEvidenceFormProps) {
  const [formData, setFormData] = useState({
    evidence_type: evidence?.evidence_type || 'user_test',
    title: evidence?.title || '',
    summary: evidence?.summary || '',
    url: evidence?.url || '',
    supports_design: evidence?.supports_design ?? null,
    confidence: evidence?.confidence || '',
    collected_at: evidence?.collected_at
      ? new Date(evidence.collected_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      evidence_type: formData.evidence_type,
      title: formData.title,
      summary: formData.summary || undefined,
      url: formData.url || undefined,
      supports_design: formData.supports_design,
      confidence: formData.confidence || undefined,
      collected_at: formData.collected_at || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Evidence Type */}
      <div>
        <label className="block text-sm font-medium mb-2">Evidence Type *</label>
        <div className="grid grid-cols-2 gap-2">
          {evidenceTypes.map((type) => (
            <label
              key={type.value}
              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                formData.evidence_type === type.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <input
                type="radio"
                name="evidence_type"
                value={type.value}
                checked={formData.evidence_type === type.value}
                onChange={(e) => setFormData({ ...formData, evidence_type: e.target.value })}
                className="sr-only"
              />
              <span>{type.icon}</span>
              <span className="text-sm">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Title */}
      <FormFieldWithAI
        label="Title *"
        fieldName="title"
        entityType="touchpoint_evidence"
        context={{
          evidence_type: formData.evidence_type,
          confidence: formData.confidence,
        }}
        currentValue={formData.title}
        onGenerate={(content) => setFormData({ ...formData, title: content })}
        disabled={saving}
      >
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border bg-background"
          required
          placeholder="e.g., User Test Session #4 - Checkout Flow"
        />
      </FormFieldWithAI>

      {/* Summary */}
      <FormFieldWithAI
        label="Summary"
        fieldName="summary"
        entityType="touchpoint_evidence"
        context={{
          title: formData.title,
          evidence_type: formData.evidence_type,
          supports_design: formData.supports_design,
          confidence: formData.confidence,
        }}
        currentValue={formData.summary}
        onGenerate={(content) => setFormData({ ...formData, summary: content })}
        disabled={saving}
      >
        <textarea
          value={formData.summary}
          onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border bg-background"
          rows={3}
          placeholder="Key findings and observations..."
        />
      </FormFieldWithAI>

      {/* URL */}
      <div>
        <label className="block text-sm font-medium mb-1">URL</label>
        <input
          type="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border bg-background"
          placeholder="https://..."
        />
        <p className="text-xs text-muted-foreground mt-1">
          Link to full evidence (recording, document, dashboard)
        </p>
      </div>

      {/* Supports Design */}
      <div>
        <label className="block text-sm font-medium mb-2">Does this evidence support the design?</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, supports_design: true })}
            className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${
              formData.supports_design === true
                ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-300'
                : 'border-border hover:border-green-500/50'
            }`}
          >
            ✓ Yes, supports
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, supports_design: false })}
            className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${
              formData.supports_design === false
                ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-300'
                : 'border-border hover:border-red-500/50'
            }`}
          >
            ✗ No, contradicts
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, supports_design: null })}
            className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${
              formData.supports_design === null
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            Unclear
          </button>
        </div>
      </div>

      {/* Confidence */}
      <div>
        <label className="block text-sm font-medium mb-2">Confidence Level</label>
        <div className="grid grid-cols-3 gap-2">
          {confidenceLevels.map((level) => (
            <label
              key={level.value}
              className={`flex flex-col p-2 rounded-lg border cursor-pointer transition-colors ${
                formData.confidence === level.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <input
                type="radio"
                name="confidence"
                value={level.value}
                checked={formData.confidence === level.value}
                onChange={(e) => setFormData({ ...formData, confidence: e.target.value })}
                className="sr-only"
              />
              <span className="text-sm font-medium">{level.label}</span>
              <span className="text-xs text-muted-foreground">{level.description}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Collected At */}
      <div>
        <label className="block text-sm font-medium mb-1">Collected Date</label>
        <input
          type="date"
          value={formData.collected_at}
          onChange={(e) => setFormData({ ...formData, collected_at: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border bg-background"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !formData.title}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : evidence ? 'Save Changes' : 'Add Evidence'}
        </button>
      </div>
    </form>
  )
}
