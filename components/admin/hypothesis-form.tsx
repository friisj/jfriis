'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FormFieldWithAI } from '@/components/forms'
import { SidebarCard } from './sidebar-card'
import { FormActions } from './form-actions'
import { RelationshipField } from './relationship-field'

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
  mode: 'create' | 'edit'
}

const statuses = [
  { value: 'proposed', label: 'Proposed', description: 'Hypothesis identified but not yet testing' },
  { value: 'testing', label: 'Testing', description: 'Currently running experiments' },
  { value: 'validated', label: 'Validated', description: 'Evidence supports the hypothesis' },
  { value: 'invalidated', label: 'Invalidated', description: 'Evidence refutes the hypothesis' },
]

export function HypothesisForm({ hypothesis, mode }: HypothesisFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get project from URL if creating new
  const projectFromUrl = searchParams.get('project')

  const [formData, setFormData] = useState({
    project_id: hypothesis?.project_id || projectFromUrl || '',
    statement: hypothesis?.statement || '',
    validation_criteria: hypothesis?.validation_criteria || '',
    sequence: hypothesis?.sequence || 1,
    status: hypothesis?.status || 'proposed',
  })

  // Auto-calculate next sequence when project changes
  useEffect(() => {
    if (mode === 'create' && formData.project_id) {
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
  }, [formData.project_id, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

      if (mode === 'edit' && hypothesis) {
        const { error } = await supabase
          .from('studio_hypotheses')
          .update(data)
          .eq('id', hypothesis.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('studio_hypotheses')
          .insert([data])

        if (error) throw error
      }

      router.push('/admin/hypotheses')
      router.refresh()
    } catch (err) {
      console.error('Error saving hypothesis:', err)
      setError(err instanceof Error ? err.message : 'Failed to save hypothesis')
    } finally {
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

      router.push('/admin/hypotheses')
      router.refresh()
    } catch (err) {
      console.error('Error deleting hypothesis:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete hypothesis')
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
          <FormFieldWithAI
            label="Hypothesis Statement *"
            fieldName="statement"
            entityType="studio_hypotheses"
            context={{
              project_id: formData.project_id,
              status: formData.status,
            }}
            currentValue={formData.statement}
            onGenerate={(content) => setFormData({ ...formData, statement: content })}
            disabled={saving}
            description='Use "If we... then... because..." format'
          >
            <textarea
              value={formData.statement}
              onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
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
            <textarea
              value={formData.validation_criteria}
              onChange={(e) => setFormData({ ...formData, validation_criteria: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
              rows={4}
              placeholder="How will we know if this hypothesis is validated or invalidated?"
            />
          </FormFieldWithAI>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <SidebarCard title="Project">
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
          </SidebarCard>

          <SidebarCard title="Settings">
            <div>
              <label className="block text-sm font-medium mb-1">Sequence</label>
              <input
                type="number"
                min="1"
                value={formData.sequence}
                onChange={(e) => setFormData({ ...formData, sequence: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">Order in the validation roadmap</p>
            </div>
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
        </div>
      </div>

      <FormActions
        isSubmitting={saving}
        submitLabel={mode === 'edit' ? 'Save Changes' : 'Create Hypothesis'}
        onCancel={() => router.back()}
        onDelete={mode === 'edit' ? handleDelete : undefined}
        deleteConfirmMessage="Are you sure you want to delete this hypothesis?"
      />
    </form>
  )
}
