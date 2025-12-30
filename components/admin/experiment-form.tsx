'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FormFieldWithAI } from '@/components/forms'

interface StudioProject {
  id: string
  name: string
}

interface Hypothesis {
  id: string
  statement: string
  sequence: number
}

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
  { value: 'prototype', label: 'Prototype', description: 'Build something to learn' },
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
  const [projects, setProjects] = useState<StudioProject[]>([])
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([])

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

  useEffect(() => {
    async function loadProjects() {
      const { data } = await supabase
        .from('studio_projects')
        .select('id, name')
        .order('name')
      if (data) setProjects(data)
    }
    loadProjects()
  }, [])

  // Load hypotheses when project changes
  useEffect(() => {
    if (formData.project_id) {
      async function loadHypotheses() {
        const { data } = await supabase
          .from('studio_hypotheses')
          .select('id, statement, sequence')
          .eq('project_id', formData.project_id)
          .order('sequence')
        if (data) setHypotheses(data)
      }
      loadHypotheses()
    } else {
      setHypotheses([])
    }
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
        const { error } = await supabase
          .from('studio_experiments')
          .insert([data])

        if (error) throw error
      }

      router.push('/admin/experiments')
      router.refresh()
    } catch (err) {
      console.error('Error saving experiment:', err)
      setError(err instanceof Error ? err.message : 'Failed to save experiment')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!experiment || !confirm('Are you sure you want to delete this experiment?')) return

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">Studio Project *</label>
          <select
            value={formData.project_id}
            onChange={(e) => setFormData({ ...formData, project_id: e.target.value, hypothesis_id: '' })}
            className="w-full px-3 py-2 rounded-lg border bg-background"
            required
          >
            <option value="">Select a project...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Linked Hypothesis</label>
          <select
            value={formData.hypothesis_id}
            onChange={(e) => setFormData({ ...formData, hypothesis_id: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border bg-background"
            disabled={!formData.project_id}
          >
            <option value="">No hypothesis (standalone experiment)</option>
            {hypotheses.map((h) => (
              <option key={h.id} value={h.id}>
                #{h.sequence}: {h.statement.slice(0, 60)}...
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {formData.project_id ? 'Optional: Link to a hypothesis being tested' : 'Select a project first'}
          </p>
        </div>
      </div>

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

      <div>
        <label className="block text-sm font-medium mb-2">Type</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {types.map((t) => (
            <label
              key={t.value}
              className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.type === t.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <input
                type="radio"
                name="type"
                value={t.value}
                checked={formData.type === t.value}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="sr-only"
              />
              <span className="font-medium text-sm">{t.label}</span>
              <span className="text-xs text-muted-foreground">{t.description}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Status</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">Outcome</label>
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
          <p className="text-xs text-muted-foreground mt-1">
            Set after experiment completes
          </p>
        </div>
      </div>

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

      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Delete
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Experiment'}
          </button>
        </div>
      </div>
    </form>
  )
}
