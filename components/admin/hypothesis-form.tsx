'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { FormFieldWithAI } from '@/components/forms'
import { AdminEntityLayout } from '@/components/admin/admin-entity-layout'
import { EntityControlCluster } from '@/components/admin/entity-control-cluster'
import { RelationshipManager, type RelationshipSlot } from '@/components/admin/relationship-manager'
import { RelationshipField } from './relationship-field'
import { syncEntityLinks } from '@/lib/entity-links'
import { isValidUuid } from '@/lib/utils/validation'
import type { PendingLink } from '@/lib/types/entity-relationships'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

// ============================================================================
// Relationship slots
// ============================================================================

const HYPOTHESIS_SLOTS: RelationshipSlot[] = [
  {
    targetType: 'assumption',
    linkType: 'tests',
    label: 'Assumptions Tested',
    group: 'Validation',
    displayField: 'statement',
    editHref: (id) => `/admin/assumptions/${id}/edit`,
  },
]

// ============================================================================
// Types & Constants
// ============================================================================

interface Hypothesis {
  id: string
  project_id: string
  statement: string
  validation_criteria: string | null
  sequence: number
  status: string
}

interface HypothesisFormProps {
  hypothesis?: Hypothesis
}

const statuses = [
  { value: 'proposed', label: 'Proposed', description: 'Hypothesis identified but not yet testing' },
  { value: 'testing', label: 'Testing', description: 'Currently running experiments' },
  { value: 'validated', label: 'Validated', description: 'Evidence supports the hypothesis' },
  { value: 'invalidated', label: 'Invalidated', description: 'Evidence refutes the hypothesis' },
]

function smartTruncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > maxLength * 0.6) return truncated.slice(0, lastSpace) + '...'
  return truncated + '...'
}

// ============================================================================
// Component
// ============================================================================

export function HypothesisForm({ hypothesis }: HypothesisFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingAssumption, setLoadingAssumption] = useState(false)
  const [pendingAssumptionLinks, setPendingAssumptionLinks] = useState<PendingLink[]>([])

  const projectFromUrl = searchParams.get('project')
  const assumptionFromUrl = searchParams.get('assumption')

  const [assumptionData, setAssumptionData] = useState<{
    id: string
    statement: string
    category: string
    importance: string
    validation_criteria: string | null
  } | null>(null)

  const [formData, setFormData] = useState({
    project_id: hypothesis?.project_id || projectFromUrl || '',
    statement: hypothesis?.statement || '',
    validation_criteria: hypothesis?.validation_criteria || '',
    sequence: hypothesis?.sequence || 1,
    status: hypothesis?.status || 'proposed',
  })

  // Track dirty state
  const [initialFormData] = useState(formData)
  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialFormData),
    [formData, initialFormData]
  )

  // Auto-calculate next sequence when project changes
  useEffect(() => {
    if (!hypothesis && formData.project_id) {
      async function getNextSequence() {
        const { data } = await supabase
          .from('studio_hypotheses')
          .select('sequence')
          .eq('project_id', formData.project_id)
          .order('sequence', { ascending: false })
          .limit(1)

        const nextSeq = data && data.length > 0 ? data[0].sequence + 1 : 1
        setFormData((prev) => ({ ...prev, sequence: nextSeq }))
      }
      getNextSequence()
    }
  }, [formData.project_id, hypothesis])

  // Load assumption if provided in URL
  useEffect(() => {
    if (assumptionFromUrl && !hypothesis) {
      if (!isValidUuid(assumptionFromUrl)) {
        setError('Invalid assumption ID format')
        return
      }

      async function loadAssumption() {
        setLoadingAssumption(true)
        setError(null)

        try {
          const { data, error } = await supabase
            .from('assumptions')
            .select('id, statement, category, importance, validation_criteria')
            .eq('id', assumptionFromUrl!)
            .single()

          if (error) {
            console.error('Error loading assumption:', error)
            setError('Failed to load assumption. Please try again.')
            return
          }

          if (!data) {
            setError('Assumption not found')
            return
          }

          setAssumptionData(data)

          const truncatedStatement = smartTruncate(data.statement, 150)
          setFormData(prev => ({
            ...prev,
            statement: `If we address "${truncatedStatement}", then [expected outcome] because [rationale]`,
            validation_criteria: data.validation_criteria || ''
          }))

          setPendingAssumptionLinks([{
            targetId: data.id,
            targetLabel: data.statement,
            linkType: 'tests',
            notes: `Generated to test ${data.category} assumption`
          }])
        } catch (err) {
          console.error('Unexpected error loading assumption:', err)
          setError('An unexpected error occurred. Please try again.')
        } finally {
          setLoadingAssumption(false)
        }
      }
      loadAssumption()
    }
  }, [assumptionFromUrl, hypothesis])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const data = {
        project_id: formData.project_id,
        statement: formData.statement,
        validation_criteria: formData.validation_criteria || null,
        sequence: formData.sequence,
        status: formData.status,
      }

      if (hypothesis) {
        const { error } = await supabase
          .from('studio_hypotheses')
          .update(data)
          .eq('id', hypothesis.id)

        if (error) throw error
      } else {
        const { data: newHypothesis, error } = await supabase
          .from('studio_hypotheses')
          .insert([data])
          .select('id')
          .single()

        if (error) throw error

        if (pendingAssumptionLinks.length > 0) {
          try {
            await syncEntityLinks(
              { type: 'hypothesis', id: newHypothesis.id },
              'assumption',
              'tests',
              pendingAssumptionLinks.map(l => l.targetId)
            )
          } catch (linkError) {
            console.error('Error syncing entity links:', linkError)
            setError('Hypothesis created, but failed to link assumptions. You can link them manually.')
            setTimeout(() => {
              router.push('/admin/hypotheses')
              router.refresh()
            }, 3000)
            return
          }
        }
      }

      toast.success(hypothesis ? 'Hypothesis updated!' : 'Hypothesis created!')
      router.push('/admin/hypotheses')
      router.refresh()
    } catch (err) {
      console.error('Error saving hypothesis:', err)
      setError(err instanceof Error ? err.message : 'Failed to save hypothesis')
      toast.error(err instanceof Error ? err.message : 'Failed to save hypothesis')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!hypothesis) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('studio_hypotheses')
        .delete()
        .eq('id', hypothesis.id)

      if (error) throw error

      toast.success('Hypothesis deleted')
      router.push('/admin/hypotheses')
      router.refresh()
    } catch (err) {
      console.error('Error deleting hypothesis:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete hypothesis')
      toast.error(err instanceof Error ? err.message : 'Failed to delete hypothesis')
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

      {loadingAssumption && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading assumption context...</span>
          </div>
        </div>
      )}

      {assumptionData && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                This hypothesis will test:
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400/80 mt-1">
                &ldquo;{assumptionData.statement}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Category: {assumptionData.category} | Importance: {assumptionData.importance} | Auto-linked
              </p>
            </div>
          </div>
        </div>
      )}

      <FormFieldWithAI
        label="Hypothesis Statement *"
        fieldName="statement"
        entityType="studio_hypotheses"
        context={{
          project_id: formData.project_id,
          status: formData.status,
          ...(assumptionData && {
            testing_assumption: assumptionData.statement,
            assumption_category: assumptionData.category,
            assumption_importance: assumptionData.importance
          })
        }}
        currentValue={formData.statement}
        onGenerate={(content) => setFormData({ ...formData, statement: content })}
        disabled={saving}
        description={assumptionData
          ? `Hypothesis to test: "${assumptionData.statement}"`
          : 'Use "If we... then... because..." format'
        }
      >
        <Textarea
          value={formData.statement}
          onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
          rows={4}
          required
          placeholder="If we [do X], then [Y will happen] because [rationale]..."
        />
      </FormFieldWithAI>

      <FormFieldWithAI
        label="Validation Criteria"
        fieldName="validation_criteria"
        entityType="studio_hypotheses"
        context={{
          project_id: formData.project_id,
          statement: formData.statement,
          status: formData.status,
        }}
        currentValue={formData.validation_criteria}
        onGenerate={(content) => setFormData({ ...formData, validation_criteria: content })}
        disabled={saving}
      >
        <Textarea
          value={formData.validation_criteria}
          onChange={(e) => setFormData({ ...formData, validation_criteria: e.target.value })}
          rows={4}
          placeholder="How will we know if this hypothesis is validated or invalidated?"
        />
      </FormFieldWithAI>
    </div>
  )

  // ============================================================================
  // Links tab
  // ============================================================================

  const linksTab = (
    <div className="space-y-6">
      {hypothesis?.id ? (
        <RelationshipManager
          entity={{ type: 'hypothesis', id: hypothesis.id }}
          slots={HYPOTHESIS_SLOTS}
        />
      ) : (
        <RelationshipManager
          entity={{ type: 'hypothesis' }}
          slots={HYPOTHESIS_SLOTS}
          pendingLinks={pendingAssumptionLinks}
          onPendingLinksChange={setPendingAssumptionLinks}
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
        <h3 className="text-sm font-semibold">Project</h3>
        <RelationshipField
          label="Studio Project"
          value={formData.project_id}
          onChange={(id) => setFormData({ ...formData, project_id: id as string })}
          tableName="studio_projects"
          displayField="name"
          mode="single"
          required
          placeholder="Select a project..."
        />
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Settings</h3>

        <div>
          <Label htmlFor="sequence" className="block mb-1 text-xs text-muted-foreground">Sequence</Label>
          <Input
            type="number"
            id="sequence"
            min="1"
            value={formData.sequence}
            onChange={(e) => setFormData({ ...formData, sequence: parseInt(e.target.value) || 1 })}
          />
          <p className="text-xs text-muted-foreground mt-1">Order in the validation roadmap</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Status</h3>
        <div className="space-y-2">
          {statuses.map((s) => (
            <label
              key={s.value}
              className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.status === s.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <input
                type="radio"
                name="status"
                value={s.value}
                checked={formData.status === s.value}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="sr-only"
              />
              <span className="font-medium text-sm">{s.label}</span>
              <span className="text-xs text-muted-foreground">{s.description}</span>
            </label>
          ))}
        </div>
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
      title={hypothesis ? smartTruncate(formData.statement, 60) || 'Untitled' : 'New Hypothesis'}
      subtitle={hypothesis ? `H-${hypothesis.sequence}` : undefined}
      status={{ label: statusLabel, variant: statusVariant as 'default' | 'secondary' | 'destructive' | 'outline' }}
      backHref="/admin/hypotheses"
      backLabel="Hypotheses"
      controlCluster={
        <EntityControlCluster
          isDirty={isDirty}
          isSaving={saving}
          onSave={() => handleSubmit()}
          onCancel={() => router.push('/admin/hypotheses')}
          saveLabel={hypothesis ? 'Save' : 'Create'}
          onDelete={hypothesis ? handleDelete : undefined}
        />
      }
      tabs={tabs}
      metadata={metadataPanel}
      isDirty={isDirty}
      isSaving={saving}
      onSave={() => handleSubmit()}
      onCancel={() => router.push('/admin/hypotheses')}
      onSubmit={handleSubmit}
    />
  )
}
