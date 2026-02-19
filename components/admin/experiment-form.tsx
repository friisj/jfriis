'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FormFieldWithAI } from '@/components/forms'
import { SidebarCard } from './sidebar-card'
import { RelationshipField } from './relationship-field'
import { EntityLinkField } from './entity-link-field'
import { MixedAssetLinkField, type PendingAssetLink } from './mixed-asset-link-field'
import { EvidenceManager } from './evidence-manager'
import { syncEntityLinks } from '@/lib/entity-links'
import { syncPendingEvidence } from '@/lib/evidence'
import type { PendingLink, PendingEvidence } from '@/lib/types/entity-relationships'

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
  mode: 'create' | 'edit'
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

export function ExperimentForm({ experiment, mode }: ExperimentFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [navigateToDetail, setNavigateToDetail] = useState(false)
  const [pendingCanvasLinks, setPendingCanvasLinks] = useState<PendingLink[]>([])
  const [pendingAssetLinks, setPendingAssetLinks] = useState<PendingAssetLink[]>([])
  const [pendingEvidence, setPendingEvidence] = useState<PendingEvidence[]>([])

  // Get project from URL if creating new
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

  // Look up project slug for Save & View navigation
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
    if (mode === 'create' && formData.name) {
      setFormData((prev) => ({ ...prev, slug: generateSlug(formData.name) }))
    }
  }, [formData.name, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

      if (mode === 'edit' && experiment) {
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

        // Sync pending evidence
        if (pendingEvidence.length > 0) {
          await syncPendingEvidence({ type: 'studio_experiment' as any, id: newExperiment.id }, pendingEvidence)
        }
      }

      if (navigateToDetail && projectSlug && formData.slug) {
        router.push(`/studio/${projectSlug}/${formData.slug}`)
      } else {
        router.push('/admin/experiments')
      }
      router.refresh()
    } catch (err) {
      console.error('Error saving experiment:', err)
      setError(err instanceof Error ? err.message : 'Failed to save experiment')
    } finally {
      setSaving(false)
      setNavigateToDetail(false)
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

      router.push('/admin/experiments')
      router.refresh()
    } catch (err) {
      console.error('Error deleting experiment:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete experiment')
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
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
                required
                placeholder="e.g., Landing page A/B test"
              />
            </FormFieldWithAI>

            <div>
              <label className="block text-sm font-medium mb-1">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm"
                required
                placeholder="landing-page-ab-test"
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL-friendly identifier (auto-generated from name)
              </p>
            </div>
          </div>

          {/* Type selector — inline pill row */}
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
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
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
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
            <textarea
              value={formData.learnings}
              onChange={(e) => setFormData({ ...formData, learnings: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
              rows={4}
              placeholder="What did we learn from this experiment?"
            />
          </FormFieldWithAI>

          {/* Assets */}
          <div>
            <label className="block text-sm font-medium mb-2">Assets</label>
            <MixedAssetLinkField
              experimentId={experiment?.id}
              projectId={formData.project_id}
              disabled={saving}
              pendingLinks={mode === 'create' ? pendingAssetLinks : undefined}
              onPendingLinksChange={mode === 'create' ? setPendingAssetLinks : undefined}
            />
          </div>

          {/* Evidence */}
          <div>
            <label className="block text-sm font-medium mb-2">Evidence</label>
            <EvidenceManager
              entityType={"studio_experiment" as any}
              entityId={experiment?.id}
              pendingEvidence={pendingEvidence}
              onPendingEvidenceChange={setPendingEvidence}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <SidebarCard title="Relationships">
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
          </SidebarCard>

          <SidebarCard title="Status">
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
          </SidebarCard>

          <SidebarCard title="Outcome">
            <div>
              <select
                value={formData.outcome}
                onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
              >
                {outcomes.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                    {o.description ? ` - ${o.description}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                Set after experiment completes
              </p>
            </div>
          </SidebarCard>

          <SidebarCard title="Related Canvas Items">
            <EntityLinkField
              label=""
              sourceType={"studio_experiment" as any}
              sourceId={experiment?.id}
              targetType={"canvas_item" as any}
              targetTableName="canvas_items"
              targetDisplayField="content"
              linkType={"related" as any}
              allowMultiple={true}
              pendingLinks={pendingCanvasLinks}
              onPendingLinksChange={setPendingCanvasLinks}
              helperText="Link to related canvas items"
            />
          </SidebarCard>

        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t">
        <div>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Are you sure you want to delete this experiment?')) {
                  handleDelete()
                }
              }}
              disabled={saving}
              className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={saving}
            className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          {projectSlug && (
            <button
              type="submit"
              disabled={saving}
              onClick={() => setNavigateToDetail(true)}
              className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              {saving && navigateToDetail ? 'Saving...' : 'Save & View'}
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving && !navigateToDetail ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Experiment'}
          </button>
        </div>
      </div>
    </form>
  )
}
