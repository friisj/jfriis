'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { StudioProject } from '@/lib/types/database'
import { FormFieldWithAI } from '@/components/forms'
import { flushEntityGenerator } from '@/components/admin/entity-generator-field'

interface StudioProjectFormProps {
  project?: StudioProject
  mode: 'create' | 'edit'
}

export function StudioProjectForm({ project, mode }: StudioProjectFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    slug: project?.slug || '',
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'draft',
    temperature: project?.temperature || '',
    current_focus: project?.current_focus || '',
    problem_statement: project?.problem_statement || '',
    success_criteria: project?.success_criteria || '',
    scope_out: project?.scope_out || '',
    path: project?.path || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const data = {
        ...formData,
        temperature: formData.temperature || null,
        description: formData.description || null,
        current_focus: formData.current_focus || null,
        problem_statement: formData.problem_statement || null,
        success_criteria: formData.success_criteria || null,
        scope_out: formData.scope_out || null,
        path: formData.path || null,
      }

      if (mode === 'create') {
        const { error } = await supabase
          .from('studio_projects')
          .insert([data])

        if (error) throw error
      } else {
        // Flush any pending generated entities before saving project
        const hypothesesFlush = await flushEntityGenerator(
          'studio_projects',
          project!.id,
          'studio_hypotheses'
        )
        if (!hypothesesFlush.success) {
          throw new Error(hypothesesFlush.error || 'Failed to save pending hypotheses')
        }

        const experimentsFlush = await flushEntityGenerator(
          'studio_projects',
          project!.id,
          'studio_experiments'
        )
        if (!experimentsFlush.success) {
          throw new Error(experimentsFlush.error || 'Failed to save pending experiments')
        }

        const { error } = await supabase
          .from('studio_projects')
          .update(data)
          .eq('id', project!.id)

        if (error) throw error
      }

      router.push('/admin/studio')
      router.refresh()
    } catch (err) {
      console.error('Error saving project:', err)
      setError(err instanceof Error ? err.message : 'Failed to save project')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!project || !confirm('Are you sure you want to delete this project?')) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('studio_projects')
        .delete()
        .eq('id', project.id)

      if (error) throw error

      router.push('/admin/studio')
      router.refresh()
    } catch (err) {
      console.error('Error deleting project:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete project')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Basic Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug *</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm"
              required
              pattern="^[a-z0-9-]+$"
            />
          </div>
        </div>

        <FormFieldWithAI
          label="Description"
          fieldName="description"
          entityType="studio_projects"
          context={{ name: formData.name }}
          currentValue={formData.description}
          onGenerate={(content) => setFormData({ ...formData, description: content })}
          disabled={saving}
        >
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border bg-background"
            rows={2}
          />
        </FormFieldWithAI>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Temperature</label>
            <select
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
            >
              <option value="">None</option>
              <option value="hot">🔥 Hot</option>
              <option value="warm">🌡️ Warm</option>
              <option value="cold">❄️ Cold</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Path</label>
            <input
              type="text"
              value={formData.path}
              onChange={(e) => setFormData({ ...formData, path: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm"
              placeholder="components/studio/{slug}/"
            />
          </div>
        </div>

        <FormFieldWithAI
          label="Current Focus"
          fieldName="current_focus"
          entityType="studio_projects"
          context={{ name: formData.name, description: formData.description }}
          currentValue={formData.current_focus}
          onGenerate={(content) => setFormData({ ...formData, current_focus: content })}
          disabled={saving}
        >
          <textarea
            value={formData.current_focus}
            onChange={(e) => setFormData({ ...formData, current_focus: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border bg-background"
            rows={2}
            placeholder="What are you working on right now?"
          />
        </FormFieldWithAI>
      </div>

      {/* PRD Fields */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">PRD</h2>

        <FormFieldWithAI
          label="Problem Statement"
          fieldName="problem_statement"
          entityType="studio_projects"
          context={{ name: formData.name, description: formData.description }}
          currentValue={formData.problem_statement}
          onGenerate={(content) => setFormData({ ...formData, problem_statement: content })}
          disabled={saving}
        >
          <textarea
            value={formData.problem_statement}
            onChange={(e) => setFormData({ ...formData, problem_statement: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border bg-background"
            rows={3}
            placeholder="What problem does this project solve?"
          />
        </FormFieldWithAI>

        <FormFieldWithAI
          label="Success Criteria"
          fieldName="success_criteria"
          entityType="studio_projects"
          context={{
            name: formData.name,
            description: formData.description,
            problem_statement: formData.problem_statement,
          }}
          currentValue={formData.success_criteria}
          onGenerate={(content) => setFormData({ ...formData, success_criteria: content })}
          disabled={saving}
        >
          <textarea
            value={formData.success_criteria}
            onChange={(e) => setFormData({ ...formData, success_criteria: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border bg-background"
            rows={3}
            placeholder="How will we know this succeeded?"
          />
        </FormFieldWithAI>

        <FormFieldWithAI
          label="Out of Scope"
          fieldName="scope_out"
          entityType="studio_projects"
          context={{
            name: formData.name,
            description: formData.description,
            problem_statement: formData.problem_statement,
          }}
          currentValue={formData.scope_out}
          onGenerate={(content) => setFormData({ ...formData, scope_out: content })}
          disabled={saving}
        >
          <textarea
            value={formData.scope_out}
            onChange={(e) => setFormData({ ...formData, scope_out: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border bg-background"
            rows={3}
            placeholder="What are we explicitly NOT building?"
          />
        </FormFieldWithAI>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Delete Project
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
            {saving ? 'Saving...' : mode === 'create' ? 'Create Project' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  )
}
