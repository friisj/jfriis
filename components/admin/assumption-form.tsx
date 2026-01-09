'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FormFieldWithAI } from '@/components/forms'
import { SidebarCard } from './sidebar-card'
import { FormActions } from './form-actions'
import { RelationshipField } from './relationship-field'
import { EvidenceManager } from './evidence-manager'
import { EntityLinkField } from './entity-link-field'
import { syncPendingEvidence } from '@/lib/evidence'
import { syncEntityLinks } from '@/lib/entity-links'
import type { PendingEvidence, PendingLink } from '@/lib/types/entity-relationships'

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
  { value: 'identified', label: 'Identified', description: 'Just captured' },
  { value: 'prioritized', label: 'Prioritized', description: 'In queue to test' },
  { value: 'testing', label: 'Testing', description: 'Currently being tested' },
  { value: 'validated', label: 'Validated', description: 'Supported by evidence' },
  { value: 'invalidated', label: 'Invalidated', description: 'Refuted by evidence' },
  { value: 'archived', label: 'Archived', description: 'No longer relevant' },
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
  { value: 'persevere', label: 'Persevere', description: 'Continue as planned' },
  { value: 'pivot', label: 'Pivot', description: 'Change direction' },
  { value: 'kill', label: 'Kill', description: 'Stop pursuing this' },
]

export function AssumptionForm({ assumption }: AssumptionFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingEvidence, setPendingEvidence] = useState<PendingEvidence[]>([])
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        // Set validated/invalidated timestamps based on status
        validated_at: formData.status === 'validated' && !assumption?.validated_at
          ? new Date().toISOString()
          : assumption?.validated_at,
        invalidated_at: formData.status === 'invalidated' && !assumption?.invalidated_at
          ? new Date().toISOString()
          : assumption?.invalidated_at,
      }

      if (assumption) {
        // Edit mode
        const { error } = await supabase
          .from('assumptions')
          .update(data)
          .eq('id', assumption.id)
        if (error) throw error
        router.push('/admin/assumptions')
      } else {
        // Create mode
        const { data: created, error } = await supabase
          .from('assumptions')
          .insert([data])
          .select()
          .single()
        if (error) throw error

        // Sync pending evidence to the newly created entity
        if (pendingEvidence.length > 0 && created) {
          await syncPendingEvidence({ type: 'assumption', id: created.id }, pendingEvidence)
        }

        // Sync pending entity links for create mode
        if (pendingHypothesisLinks.length > 0 && created) {
          await syncEntityLinks(
            { type: 'assumption', id: created.id },
            'hypothesis',
            'tested_by',
            pendingHypothesisLinks.map(l => l.targetId)
          )
        }

        router.push(`/admin/assumptions`)
      }

      router.refresh()
    } catch (err) {
      console.error('Error saving assumption:', err)
      setError(err instanceof Error ? err.message : 'Failed to save assumption')
    } finally {
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

      router.push('/admin/assumptions')
      router.refresh()
    } catch (err) {
      console.error('Error deleting assumption:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete assumption')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
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
                <textarea
                  value={formData.statement}
                  onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border bg-background"
                  rows={3}
                  required
                  placeholder="We believe that..."
                />
              </FormFieldWithAI>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Slug *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  })
                }
                className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm"
                required
                pattern="^[a-z0-9-]+$"
              />
            </div>
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
            <textarea
              value={formData.validation_criteria}
              onChange={(e) => setFormData({ ...formData, validation_criteria: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
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
              <textarea
                value={formData.decision_notes}
                onChange={(e) => setFormData({ ...formData, decision_notes: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
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
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
              rows={3}
            />
          </FormFieldWithAI>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <SidebarCard title="Relationships">
            <RelationshipField
              label="Studio Project"
              value={formData.studio_project_id}
              onChange={(id) => setFormData({ ...formData, studio_project_id: id as string })}
              tableName="studio_projects"
              displayField="name"
              mode="single"
              placeholder="Select project..."
            />
          </SidebarCard>

          <SidebarCard title="Status">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
              >
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Decision</label>
              <select
                value={formData.decision}
                onChange={(e) => setFormData({ ...formData, decision: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
              >
                {decisions.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </SidebarCard>

          <SidebarCard title="Source">
            <div>
              <label className="block text-sm font-medium mb-1">Source Type</label>
              <select
                value={formData.source_type}
                onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
              >
                {sourceTypes.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Source Block</label>
              <input
                type="text"
                value={formData.source_block}
                onChange={(e) => setFormData({ ...formData, source_block: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
                placeholder="e.g., customer_segments"
              />
            </div>
          </SidebarCard>

          <SidebarCard title="Tags">
            <FormFieldWithAI
              label=""
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
            >
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
                placeholder="pricing, technical, user-need"
              />
            </FormFieldWithAI>
          </SidebarCard>

          <SidebarCard title="Evidence">
            <EvidenceManager
              entityType="assumption"
              entityId={assumption?.id}
              pendingEvidence={pendingEvidence}
              onPendingEvidenceChange={setPendingEvidence}
            />
          </SidebarCard>

          <SidebarCard title="Tested By Hypotheses">
            <EntityLinkField
              label=""
              sourceType="assumption"
              sourceId={assumption?.id}
              targetType="hypothesis"
              targetTableName="studio_hypotheses"
              targetDisplayField="statement"
              linkType="tested_by"
              allowMultiple={true}
              pendingLinks={pendingHypothesisLinks}
              onPendingLinksChange={setPendingHypothesisLinks}
              helperText="Which hypotheses test this assumption?"
            />
          </SidebarCard>
        </div>
      </div>

      <FormActions
        isSubmitting={saving}
        submitLabel={assumption ? 'Save Changes' : 'Create Assumption'}
        onCancel={() => router.back()}
        onDelete={assumption ? handleDelete : undefined}
        deleteConfirmMessage="Are you sure you want to delete this assumption?"
      />
    </form>
  )
}
