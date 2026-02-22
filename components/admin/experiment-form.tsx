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
import { MixedAssetLinkField, type PendingAssetLink } from './mixed-asset-link-field'
import { FeedbackManager } from './feedback-manager'
import { syncEntityLinks } from '@/lib/entity-links'
import { syncPendingFeedback } from '@/lib/feedback'
import type { PendingLink, PendingFeedback } from '@/lib/types/entity-relationships'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ExternalLink } from 'lucide-react'

// ============================================================================
// Relationship slots
// ============================================================================

const EXPERIMENT_SLOTS: RelationshipSlot[] = [
  {
    targetType: 'canvas_item' as any,
    linkType: 'related' as any,
    label: 'Related Canvas Items',
    group: 'Strategic Context',
    displayField: 'content',
    editHref: () => `/admin/canvases`,
  },
]

// ============================================================================
// Types & Constants
// ============================================================================

interface Experiment {
  id: string
  project_id: string
  hypothesis_id: string | null
  slug: string
  name: string
  description: string | null
  type: string
  status: string
  outcome: string | null
  learnings: string | null
}

interface ExperimentFormProps {
  experiment?: Experiment
}

const types = [
  { value: 'spike', label: 'Spike', description: 'Quick investigation to reduce uncertainty' },
  { value: 'experiment', label: 'Experiment', description: 'Controlled test of a hypothesis' },
  { value: 'prototype', label: 'Prototype', description: 'Build or assemble to validate concept' },
  { value: 'interview', label: 'Interview', description: 'User research and discovery interviews' },
  { value: 'smoke_test', label: 'Smoke Test', description: 'Measure interest before building' },
]

const statuses = [
  { value: 'planned', label: 'Planned', description: 'Scheduled but not started' },
  { value: 'in_progress', label: 'In Progress', description: 'Currently running' },
  { value: 'completed', label: 'Completed', description: 'Finished with outcome' },
  { value: 'abandoned', label: 'Abandoned', description: 'Stopped before completion' },
]

const outcomes = [
  { value: '', label: 'Not yet determined' },
  { value: 'success', label: 'Success', description: 'Hypothesis validated' },
  { value: 'failure', label: 'Failure', description: 'Hypothesis invalidated' },
  { value: 'inconclusive', label: 'Inconclusive', description: 'No clear result' },
]

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

// ============================================================================
// Component
// ============================================================================

export function ExperimentForm({ experiment }: ExperimentFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingCanvasLinks, setPendingCanvasLinks] = useState<PendingLink[]>([])
  const [pendingAssetLinks, setPendingAssetLinks] = useState<PendingAssetLink[]>([])
  const [pendingFeedback, setPendingFeedback] = useState<PendingFeedback[]>([])

  const projectFromUrl = searchParams.get('project')
  const hypothesisFromUrl = searchParams.get('hypothesis')

  const [formData, setFormData] = useState({
    project_id: experiment?.project_id || projectFromUrl || '',
    hypothesis_id: experiment?.hypothesis_id || hypothesisFromUrl || '',
    slug: experiment?.slug || '',
    name: experiment?.name || '',
    description: experiment?.description || '',
    type: experiment?.type || 'experiment',
    status: experiment?.status || 'planned',
    outcome: experiment?.outcome || '',
    learnings: experiment?.learnings || '',
  })

  // Track dirty state
  const [initialFormData] = useState(formData)
  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialFormData),
    [formData, initialFormData]
  )

  // Look up project slug for "View" link
  const [projectSlug, setProjectSlug] = useState<string | null>(null)
  useEffect(() => {
    if (!formData.project_id) { setProjectSlug(null); return }
    supabase
      .from('studio_projects')
      .select('slug')
      .eq('id', formData.project_id)
      .single()
      .then(({ data }) => setProjectSlug(data?.slug ?? null))
  }, [formData.project_id])

  // Auto-generate slug from name in create mode
  useEffect(() => {
    if (!experiment && formData.name) {
      setFormData((prev) => ({ ...prev, slug: generateSlug(formData.name) }))
    }
  }, [formData.name, experiment])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const data = {
        project_id: formData.project_id,
        hypothesis_id: formData.hypothesis_id || null,
        slug: formData.slug,
        name: formData.name,
        description: formData.description || null,
        type: formData.type,
        status: formData.status,
        outcome: formData.outcome || null,
        learnings: formData.learnings || null,
      }

      if (experiment) {
        const { error } = await supabase
          .from('studio_experiments')
          .update(data)
          .eq('id', experiment.id)

        if (error) throw error
      } else {
        const { data: newExperiment, error } = await supabase
          .from('studio_experiments')
          .insert([data])
          .select('id')
          .single()

        if (error) throw error

        // Sync pending canvas links
        if (pendingCanvasLinks.length > 0) {
          await syncEntityLinks(
            { type: 'studio_experiment' as any, id: newExperiment.id },
            'canvas_item' as any,
            'related' as any,
            pendingCanvasLinks.map(l => l.targetId)
          )
        }

        // Sync pending asset links (split by kind)
        const spikeLinks = pendingAssetLinks.filter(l => l.kind === 'spike')
        const protoLinks = pendingAssetLinks.filter(l => l.kind === 'prototype')

        if (spikeLinks.length > 0) {
          await syncEntityLinks(
            { type: 'experiment' as any, id: newExperiment.id },
            'asset_spike' as any,
            'contains' as any,
            spikeLinks.map(l => l.targetId)
          )
        }

        if (protoLinks.length > 0) {
          await syncEntityLinks(
            { type: 'experiment' as any, id: newExperiment.id },
            'asset_prototype' as any,
            'contains' as any,
            protoLinks.map(l => l.targetId)
          )
        }

        // Sync pending feedback
        if (pendingFeedback.length > 0) {
          await syncPendingFeedback({ type: 'studio_experiment' as any, id: newExperiment.id }, pendingFeedback)
        }
      }

      toast.success(experiment ? 'Experiment updated!' : 'Experiment created!')
      router.push('/admin/experiments')
      router.refresh()
    } catch (err) {
      console.error('Error saving experiment:', err)
      setError(err instanceof Error ? err.message : 'Failed to save experiment')
      toast.error(err instanceof Error ? err.message : 'Failed to save experiment')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!experiment) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('studio_experiments')
        .delete()
        .eq('id', experiment.id)

      if (error) throw error

      toast.success('Experiment deleted')
      router.push('/admin/experiments')
      router.refresh()
    } catch (err) {
      console.error('Error deleting experiment:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete experiment')
      toast.error(err instanceof Error ? err.message : 'Failed to delete experiment')
      setSaving(false)
    }
  }

  // Status badge
  const statusLabel = formData.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
  const statusVariant = formData.status === 'completed' ? 'default'
    : formData.status === 'in_progress' ? 'secondary'
    : formData.status === 'abandoned' ? 'destructive'
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormFieldWithAI
          label="Name *"
          fieldName="name"
          entityType="studio_experiments"
          context={{
            project_id: formData.project_id,
            hypothesis_id: formData.hypothesis_id,
            type: formData.type,
          }}
          currentValue={formData.name}
          onGenerate={(content) => setFormData({ ...formData, name: content })}
          disabled={saving}
        >
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Landing page A/B test"
          />
        </FormFieldWithAI>

        <div>
          <Label htmlFor="slug" className="block mb-1">Slug</Label>
          <Input
            type="text"
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="font-mono text-sm"
            required
            placeholder="landing-page-ab-test"
          />
          <p className="text-xs text-muted-foreground mt-1">
            URL-friendly identifier (auto-generated from name)
          </p>
        </div>
      </div>

      {/* Type selector -- inline pill row */}
      <div>
        <Label className="block mb-2">Type</Label>
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <label
              key={t.value}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer transition-colors text-sm ${
                formData.type === t.value
                  ? 'border-primary bg-primary/10 font-medium'
                  : 'border-border hover:border-primary/50'
              }`}
              title={t.description}
            >
              <input
                type="radio"
                name="type"
                value={t.value}
                checked={formData.type === t.value}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="sr-only"
              />
              {t.label}
            </label>
          ))}
        </div>
        {types.find(t => t.value === formData.type) && (
          <p className="text-xs text-muted-foreground mt-1.5">
            {types.find(t => t.value === formData.type)!.description}
          </p>
        )}
      </div>

      <FormFieldWithAI
        label="Description"
        fieldName="description"
        entityType="studio_experiments"
        context={{
          project_id: formData.project_id,
          hypothesis_id: formData.hypothesis_id,
          name: formData.name,
          type: formData.type,
        }}
        currentValue={formData.description}
        onGenerate={(content) => setFormData({ ...formData, description: content })}
        disabled={saving}
      >
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          placeholder="What are we testing and how?"
        />
      </FormFieldWithAI>

      <FormFieldWithAI
        label="Learnings"
        fieldName="learnings"
        entityType="studio_experiments"
        context={{
          name: formData.name,
          description: formData.description,
          type: formData.type,
          status: formData.status,
          outcome: formData.outcome,
        }}
        currentValue={formData.learnings}
        onGenerate={(content) => setFormData({ ...formData, learnings: content })}
        disabled={saving}
        description="Document key insights regardless of outcome"
      >
        <Textarea
          value={formData.learnings}
          onChange={(e) => setFormData({ ...formData, learnings: e.target.value })}
          rows={4}
          placeholder="What did we learn from this experiment?"
        />
      </FormFieldWithAI>

      {/* Assets */}
      <div>
        <Label className="block mb-2">Assets</Label>
        <MixedAssetLinkField
          experimentId={experiment?.id}
          projectId={formData.project_id}
          disabled={saving}
          pendingLinks={!experiment ? pendingAssetLinks : undefined}
          onPendingLinksChange={!experiment ? setPendingAssetLinks : undefined}
        />
      </div>

      {/* Feedback */}
      <div>
        <Label className="block mb-2">Feedback</Label>
        <FeedbackManager
          entityType={"studio_experiment" as any}
          entityId={experiment?.id}
          pendingFeedback={pendingFeedback}
          onPendingFeedbackChange={setPendingFeedback}
        />
      </div>
    </div>
  )

  // ============================================================================
  // Links tab
  // ============================================================================

  const linksTab = (
    <div className="space-y-6">
      {experiment?.id ? (
        <RelationshipManager
          entity={{ type: 'studio_experiment' as any, id: experiment.id }}
          slots={EXPERIMENT_SLOTS}
        />
      ) : (
        <RelationshipManager
          entity={{ type: 'studio_experiment' as any }}
          slots={EXPERIMENT_SLOTS}
          pendingLinks={pendingCanvasLinks}
          onPendingLinksChange={setPendingCanvasLinks}
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
        <h3 className="text-sm font-semibold">Relationships</h3>
        <RelationshipField
          label="Studio Project"
          value={formData.project_id}
          onChange={(id) => setFormData({ ...formData, project_id: id as string, hypothesis_id: '' })}
          tableName="studio_projects"
          displayField="name"
          mode="single"
          required
          placeholder="Select a project..."
        />
        <RelationshipField
          label="Linked Hypothesis"
          value={formData.hypothesis_id}
          onChange={(id) => setFormData({ ...formData, hypothesis_id: id as string })}
          tableName="studio_hypotheses"
          displayField="statement"
          mode="single"
          filterBy={{ field: 'project_id', value: formData.project_id || null }}
          disabled={!formData.project_id}
          placeholder="No hypothesis (standalone)"
          helperText={formData.project_id ? 'Optional: Link to a hypothesis' : 'Select a project first'}
        />
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

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Outcome</h3>
        <div>
          <Select
            value={formData.outcome || '__none__'}
            onValueChange={(v) => setFormData({ ...formData, outcome: v === '__none__' ? '' : v })}
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue placeholder="Not yet determined" />
            </SelectTrigger>
            <SelectContent>
              {outcomes.map((o) => (
                <SelectItem key={o.value || '__none__'} value={o.value || '__none__'}>
                  {o.label}
                  {o.description ? ` - ${o.description}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            Set after experiment completes
          </p>
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
      title={experiment ? formData.name || 'Untitled' : 'New Experiment'}
      subtitle={experiment ? formData.slug : undefined}
      status={{ label: statusLabel, variant: statusVariant as 'default' | 'secondary' | 'destructive' | 'outline' }}
      backHref="/admin/experiments"
      backLabel="Experiments"
      controlCluster={
        <EntityControlCluster
          isDirty={isDirty}
          isSaving={saving}
          onSave={() => handleSubmit()}
          onCancel={() => router.push('/admin/experiments')}
          saveLabel={experiment ? 'Save' : 'Create'}
          links={experiment && projectSlug ? [
            { label: 'View', href: `/studio/${projectSlug}/${formData.slug}`, icon: <ExternalLink className="size-4" />, external: true },
          ] : undefined}
          onDelete={experiment ? handleDelete : undefined}
        />
      }
      tabs={tabs}
      metadata={metadataPanel}
      isDirty={isDirty}
      isSaving={saving}
      onSave={() => handleSubmit()}
      onCancel={() => router.push('/admin/experiments')}
      onSubmit={handleSubmit}
    />
  )
}
