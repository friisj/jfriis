'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { FormFieldWithAI } from '@/components/forms'
import { AdminEntityLayout } from '@/components/admin/admin-entity-layout'
import { EntityControlCluster } from '@/components/admin/entity-control-cluster'
import { RelationshipManager, type RelationshipSlot } from '@/components/admin/relationship-manager'
import { RelationshipField } from './relationship-field'
import { FeedbackManager } from './feedback-manager'
import { syncPendingFeedback } from '@/lib/feedback'
import { syncEntityLinks } from '@/lib/entity-links'
import type { PendingFeedback, PendingLink } from '@/lib/types/entity-relationships'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ============================================================================
// Relationship slots
// ============================================================================

const ASSUMPTION_SLOTS: RelationshipSlot[] = [
  {
    targetType: 'hypothesis',
    linkType: 'tested_by',
    label: 'Hypotheses',
    group: 'Validation',
    displayField: 'statement',
    editHref: (id) => `/admin/hypotheses/${id}/edit`,
  },
  {
    targetType: 'business_model_canvas',
    linkType: 'related',
    label: 'Business Models',
    group: 'Strategic Context',
    displayField: 'name',
    editHref: (id) => `/admin/canvases/business-model/${id}/edit`,
  },
  {
    targetType: 'value_proposition_canvas',
    linkType: 'related',
    label: 'Value Propositions',
    group: 'Strategic Context',
    displayField: 'name',
    editHref: (id) => `/admin/canvases/value-proposition/${id}/edit`,
  },
]

// ============================================================================
// Types & Constants
// ============================================================================

interface Assumption {
  id: string
  slug: string
  statement: string
  category: string
  importance: string
  evidence_level: string
  status: string
  is_leap_of_faith: boolean | null
  source_type: string | null
  source_id: string | null
  source_block: string | null
  studio_project_id: string | null
  hypothesis_id: string | null
  validation_criteria: string | null
  decision: string | null
  decision_notes: string | null
  notes: string | null
  tags: string[] | null
  validated_at: string | null
  invalidated_at: string | null
}

interface AssumptionFormProps {
  assumption?: Assumption
}

const categories = [
  { value: 'desirability', label: 'Desirability', description: 'Do customers want this?' },
  { value: 'viability', label: 'Viability', description: 'Can we make money / sustain this?' },
  { value: 'feasibility', label: 'Feasibility', description: 'Can we build it?' },
  { value: 'usability', label: 'Usability', description: 'Can customers use it effectively?' },
  { value: 'ethical', label: 'Ethical', description: 'Is there potential harm?' },
]

const importanceLevels = [
  { value: 'critical', label: 'Critical', description: 'Must be true for success' },
  { value: 'high', label: 'High', description: 'Very important to validate' },
  { value: 'medium', label: 'Medium', description: 'Moderately important' },
  { value: 'low', label: 'Low', description: 'Nice to validate but not essential' },
]

const evidenceLevels = [
  { value: 'none', label: 'None', description: 'Pure assumption, no evidence' },
  { value: 'weak', label: 'Weak', description: 'Anecdotal or limited data' },
  { value: 'moderate', label: 'Moderate', description: 'Some supporting evidence' },
  { value: 'strong', label: 'Strong', description: 'Well validated with data' },
]

const statuses = [
  { value: 'identified', label: 'Identified' },
  { value: 'prioritized', label: 'Prioritized' },
  { value: 'testing', label: 'Testing' },
  { value: 'validated', label: 'Validated' },
  { value: 'invalidated', label: 'Invalidated' },
  { value: 'archived', label: 'Archived' },
]

const sourceTypes = [
  { value: '', label: 'None / Manual' },
  { value: 'business_model_canvas', label: 'Business Model Canvas' },
  { value: 'value_map', label: 'Value Map' },
  { value: 'customer_profile', label: 'Customer Profile' },
  { value: 'value_proposition_canvas', label: 'Value Proposition Canvas' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'solution', label: 'Solution' },
]

const decisions = [
  { value: '', label: 'No decision yet' },
  { value: 'persevere', label: 'Persevere' },
  { value: 'pivot', label: 'Pivot' },
  { value: 'kill', label: 'Kill' },
]

// ============================================================================
// Component
// ============================================================================

export function AssumptionForm({ assumption }: AssumptionFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingFeedback, setPendingFeedback] = useState<PendingFeedback[]>([])
  const [pendingHypothesisLinks, setPendingHypothesisLinks] = useState<PendingLink[]>([])

  const [formData, setFormData] = useState({
    slug: assumption?.slug || '',
    statement: assumption?.statement || '',
    category: assumption?.category || 'desirability',
    importance: assumption?.importance || 'medium',
    evidence_level: assumption?.evidence_level || 'none',
    status: assumption?.status || 'identified',
    studio_project_id: assumption?.studio_project_id || '',
    source_type: assumption?.source_type || '',
    source_block: assumption?.source_block || '',
    validation_criteria: assumption?.validation_criteria || '',
    decision: assumption?.decision || '',
    decision_notes: assumption?.decision_notes || '',
    notes: assumption?.notes || '',
    tags: assumption?.tags?.join(', ') || '',
  })

  // Track dirty state
  const [initialFormData] = useState(formData)
  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialFormData),
    [formData, initialFormData]
  )

  // Compute leap of faith status
  const isLeapOfFaith =
    (formData.importance === 'critical' || formData.importance === 'high') &&
    (formData.evidence_level === 'none' || formData.evidence_level === 'weak')

  // Auto-generate slug from statement
  useEffect(() => {
    if (!assumption?.slug && formData.statement) {
      const slug = formData.statement
        .toLowerCase()
        .slice(0, 50)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      setFormData((prev) => ({ ...prev, slug }))
    }
  }, [formData.statement, assumption?.slug])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const tags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const data = {
        slug: formData.slug,
        statement: formData.statement,
        category: formData.category,
        importance: formData.importance,
        evidence_level: formData.evidence_level,
        status: formData.status,
        studio_project_id: formData.studio_project_id || null,
        source_type: formData.source_type || null,
        source_block: formData.source_block || null,
        validation_criteria: formData.validation_criteria || null,
        decision: formData.decision || null,
        decision_notes: formData.decision_notes || null,
        notes: formData.notes || null,
        tags: tags.length > 0 ? tags : null,
        validated_at: formData.status === 'validated' && !assumption?.validated_at
          ? new Date().toISOString()
          : assumption?.validated_at,
        invalidated_at: formData.status === 'invalidated' && !assumption?.invalidated_at
          ? new Date().toISOString()
          : assumption?.invalidated_at,
      }

      if (assumption) {
        const { error } = await supabase
          .from('assumptions')
          .update(data)
          .eq('id', assumption.id)
        if (error) throw error
      } else {
        const { data: created, error } = await supabase
          .from('assumptions')
          .insert([data])
          .select()
          .single()
        if (error) throw error

        // Sync pending feedback
        if (pendingFeedback.length > 0 && created) {
          await syncPendingFeedback({ type: 'assumption', id: created.id }, pendingFeedback)
        }

        // Sync pending entity links
        if (pendingHypothesisLinks.length > 0 && created) {
          try {
            await syncEntityLinks(
              { type: 'assumption', id: created.id },
              'hypothesis',
              'tested_by',
              pendingHypothesisLinks.map(l => l.targetId)
            )
          } catch (linkError) {
            console.error('Error syncing entity links:', linkError)
            setError('Assumption created, but failed to link hypotheses. You can link them manually.')
            setTimeout(() => {
              router.push('/admin/assumptions')
            }, 3000)
            return
          }
        }
      }

      toast.success(assumption ? 'Assumption updated!' : 'Assumption created!')
      router.push('/admin/assumptions')
      router.refresh()
    } catch (err) {
      console.error('Error saving assumption:', err)
      setError(err instanceof Error ? err.message : 'Failed to save assumption')
      toast.error(err instanceof Error ? err.message : 'Failed to save assumption')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!assumption) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('assumptions')
        .delete()
        .eq('id', assumption.id)

      if (error) throw error

      toast.success('Assumption deleted')
      router.push('/admin/assumptions')
      router.refresh()
    } catch (err) {
      console.error('Error deleting assumption:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete assumption')
      toast.error(err instanceof Error ? err.message : 'Failed to delete assumption')
      setSaving(false)
    }
  }

  // Status badge
  const statusLabel = formData.status.charAt(0).toUpperCase() + formData.status.slice(1)
  const statusVariant = formData.status === 'validated' ? 'default'
    : formData.status === 'invalidated' ? 'destructive'
    : formData.status === 'testing' ? 'secondary'
    : 'outline'

  // ============================================================================
  // Fields tab
  // ============================================================================

  const fieldsTab = (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/10 text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Leap of Faith Indicator */}
      {isLeapOfFaith && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">Leap of Faith</span>
          </div>
          <p className="text-sm text-amber-600 dark:text-amber-400/80 mt-1">
            High importance + low evidence. Prioritize testing this assumption.
          </p>
        </div>
      )}

      {/* Statement */}
      <FormFieldWithAI
        label="Statement *"
        fieldName="statement"
        entityType="assumptions"
        context={{
          category: formData.category,
          importance: formData.importance,
        }}
        currentValue={formData.statement}
        onGenerate={(content) => setFormData({ ...formData, statement: content })}
        disabled={saving}
        description='Frame as a testable belief: "We believe [audience] will [behavior] because [reason]"'
      >
        <Textarea
          value={formData.statement}
          onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
          rows={3}
          required
          placeholder="We believe that..."
        />
      </FormFieldWithAI>

      <div>
        <Label className="block mb-1">Slug *</Label>
        <Input
          type="text"
          value={formData.slug}
          onChange={(e) =>
            setFormData({
              ...formData,
              slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            })
          }
          className="font-mono text-sm"
          required
          pattern="^[a-z0-9-]+$"
        />
      </div>

      {/* Category Classification */}
      <div>
        <label className="block text-sm font-medium mb-2">Category *</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {categories.map((cat) => (
            <label
              key={cat.value}
              className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.category === cat.value
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-accent'
              }`}
            >
              <input
                type="radio"
                name="category"
                value={cat.value}
                checked={formData.category === cat.value}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="sr-only"
              />
              <span className="font-medium text-sm">{cat.label}</span>
              <span className="text-xs text-muted-foreground mt-1">{cat.description}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Prioritization Matrix */}
      <div className="space-y-4">
        <div>
          <h3 className="font-medium">Prioritization Matrix</h3>
          <p className="text-sm text-muted-foreground">
            Test high-importance / low-evidence assumptions first.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Importance *</label>
            <div className="space-y-2">
              {importanceLevels.map((level) => (
                <label
                  key={level.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.importance === level.value
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent'
                  }`}
                >
                  <input
                    type="radio"
                    name="importance"
                    value={level.value}
                    checked={formData.importance === level.value}
                    onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
                    className="sr-only"
                  />
                  <div>
                    <span className="font-medium text-sm">{level.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{level.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Evidence Level *</label>
            <div className="space-y-2">
              {evidenceLevels.map((level) => (
                <label
                  key={level.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.evidence_level === level.value
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent'
                  }`}
                >
                  <input
                    type="radio"
                    name="evidence_level"
                    value={level.value}
                    checked={formData.evidence_level === level.value}
                    onChange={(e) => setFormData({ ...formData, evidence_level: e.target.value })}
                    className="sr-only"
                  />
                  <div>
                    <span className="font-medium text-sm">{level.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{level.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Validation */}
      <FormFieldWithAI
        label="Validation Criteria"
        fieldName="validation_criteria"
        entityType="assumptions"
        context={{
          statement: formData.statement,
          category: formData.category,
          importance: formData.importance,
        }}
        currentValue={formData.validation_criteria}
        onGenerate={(content) => setFormData({ ...formData, validation_criteria: content })}
        disabled={saving}
      >
        <Textarea
          value={formData.validation_criteria}
          onChange={(e) => setFormData({ ...formData, validation_criteria: e.target.value })}
          rows={2}
          placeholder="What evidence would prove this true or false?"
        />
      </FormFieldWithAI>

      {formData.decision && (
        <FormFieldWithAI
          label="Decision Notes"
          fieldName="decision_notes"
          entityType="assumptions"
          context={{
            statement: formData.statement,
            validation_criteria: formData.validation_criteria,
            decision: formData.decision,
            status: formData.status,
          }}
          currentValue={formData.decision_notes}
          onGenerate={(content) => setFormData({ ...formData, decision_notes: content })}
          disabled={saving}
        >
          <Textarea
            value={formData.decision_notes}
            onChange={(e) => setFormData({ ...formData, decision_notes: e.target.value })}
            rows={2}
            placeholder="What did we learn? What are we doing next?"
          />
        </FormFieldWithAI>
      )}

      <FormFieldWithAI
        label="Notes"
        fieldName="notes"
        entityType="assumptions"
        context={{
          statement: formData.statement,
          category: formData.category,
          status: formData.status,
        }}
        currentValue={formData.notes}
        onGenerate={(content) => setFormData({ ...formData, notes: content })}
        disabled={saving}
      >
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </FormFieldWithAI>

      {/* Feedback */}
      <div>
        <Label className="block mb-2">Feedback</Label>
        <FeedbackManager
          entityType="assumption"
          entityId={assumption?.id}
          pendingFeedback={pendingFeedback}
          onPendingFeedbackChange={setPendingFeedback}
        />
      </div>

      {/* Quick-create hypothesis */}
      {assumption?.id && (
        <div className="p-4 border rounded-lg bg-muted/30">
          <Link
            href={`/admin/hypotheses/new?assumption=${assumption.id}`}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            Create Hypothesis to Test This
          </Link>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Pre-fills form and auto-links this assumption
          </p>
        </div>
      )}
    </div>
  )

  // ============================================================================
  // Links tab
  // ============================================================================

  const linksTab = (
    <div className="space-y-6">
      {assumption?.id ? (
        <RelationshipManager
          entity={{ type: 'assumption', id: assumption.id }}
          slots={ASSUMPTION_SLOTS}
        />
      ) : (
        <RelationshipManager
          entity={{ type: 'assumption' }}
          slots={ASSUMPTION_SLOTS}
          pendingLinks={pendingHypothesisLinks}
          onPendingLinksChange={setPendingHypothesisLinks}
        />
      )}
    </div>
  )

  // ============================================================================
  // Metadata panel
  // ============================================================================

  const metadataPanel = (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Status</h3>

        <div>
          <Label className="block mb-1 text-xs text-muted-foreground">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData({ ...formData, status: v })}
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="block mb-1 text-xs text-muted-foreground">Decision</Label>
          <Select
            value={formData.decision || '__none__'}
            onValueChange={(v) => setFormData({ ...formData, decision: v === '__none__' ? '' : v })}
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {decisions.map((d) => (
                <SelectItem key={d.value || '__none__'} value={d.value || '__none__'}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Relationships</h3>

        <RelationshipField
          label="Studio Project"
          value={formData.studio_project_id}
          onChange={(id) => setFormData({ ...formData, studio_project_id: id as string })}
          tableName="studio_projects"
          displayField="name"
          mode="single"
          placeholder="Select project..."
        />
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Source</h3>

        <div>
          <Label className="block mb-1 text-xs text-muted-foreground">Source Type</Label>
          <Select
            value={formData.source_type || '__none__'}
            onValueChange={(v) => setFormData({ ...formData, source_type: v === '__none__' ? '' : v })}
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sourceTypes.map((s) => (
                <SelectItem key={s.value || '__none__'} value={s.value || '__none__'}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="block mb-1 text-xs text-muted-foreground">Source Block</Label>
          <Input
            type="text"
            value={formData.source_block}
            onChange={(e) => setFormData({ ...formData, source_block: e.target.value })}
            placeholder="e.g., customer_segments"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <FormFieldWithAI
          label="Tags"
          fieldName="tags"
          entityType="assumptions"
          context={{
            statement: formData.statement,
            category: formData.category,
            importance: formData.importance,
          }}
          currentValue={formData.tags}
          onGenerate={(content) => setFormData({ ...formData, tags: content })}
          disabled={saving}
          description="Comma-separated tags"
        >
          <Input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="pricing, technical, user-need"
          />
        </FormFieldWithAI>
      </div>
    </div>
  )

  // ============================================================================
  // Tabs
  // ============================================================================

  const tabs = [
    { id: 'fields', label: 'Fields', content: fieldsTab },
    { id: 'links', label: 'Links', content: linksTab },
  ]

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <AdminEntityLayout
      title={assumption ? formData.statement?.slice(0, 60) || 'Untitled' : 'New Assumption'}
      subtitle={assumption ? formData.slug : undefined}
      status={{ label: statusLabel, variant: statusVariant as 'default' | 'secondary' | 'destructive' | 'outline' }}
      backHref="/admin/assumptions"
      backLabel="Assumptions"
      controlCluster={
        <EntityControlCluster
          isDirty={isDirty}
          isSaving={saving}
          onSave={() => handleSubmit()}
          onCancel={() => router.push('/admin/assumptions')}
          saveLabel={assumption ? 'Save' : 'Create'}
          onDelete={assumption ? handleDelete : undefined}
        />
      }
      tabs={tabs}
      metadata={metadataPanel}
      isDirty={isDirty}
      isSaving={saving}
      onSave={() => handleSubmit()}
      onCancel={() => router.push('/admin/assumptions')}
      onSubmit={handleSubmit}
    />
  )
}
