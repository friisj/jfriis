'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { CanvasItemType, JobType, Intensity, Importance, ValidationStatus, Frequency } from '@/lib/types/canvas-items'
import { FormFieldWithAI } from '@/components/forms'
import { EvidenceManager } from './evidence-manager'
import { syncPendingEvidence } from '@/lib/evidence'
import type { PendingEvidence } from '@/lib/types/entity-relationships'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

interface StudioProject {
  id: string
  name: string
}

interface CanvasItem {
  id: string
  title: string
  description: string | null
  item_type: CanvasItemType
  importance: Importance
  validation_status: ValidationStatus
  job_type: JobType | null
  job_context: string | null
  intensity: Intensity | null
  frequency: Frequency | null
  notes: string | null
  tags: string[] | null
  studio_project_id: string | null
}

interface CanvasItemFormProps {
  item?: CanvasItem
  mode: 'create' | 'edit'
}

const itemTypes = [
  { value: 'partner', label: 'Partner', category: 'Business Model Canvas' },
  { value: 'activity', label: 'Activity', category: 'Business Model Canvas' },
  { value: 'resource', label: 'Resource', category: 'Business Model Canvas' },
  { value: 'value_proposition', label: 'Value Proposition', category: 'Business Model Canvas' },
  { value: 'segment', label: 'Segment', category: 'Business Model Canvas' },
  { value: 'relationship', label: 'Relationship', category: 'Business Model Canvas' },
  { value: 'channel', label: 'Channel', category: 'Business Model Canvas' },
  { value: 'cost', label: 'Cost', category: 'Business Model Canvas' },
  { value: 'revenue', label: 'Revenue', category: 'Business Model Canvas' },
  { value: 'job', label: 'Job', category: 'Customer Profile' },
  { value: 'pain', label: 'Pain', category: 'Customer Profile' },
  { value: 'gain', label: 'Gain', category: 'Customer Profile' },
  { value: 'product_service', label: 'Product/Service', category: 'Value Map' },
  { value: 'pain_reliever', label: 'Pain Reliever', category: 'Value Map' },
  { value: 'gain_creator', label: 'Gain Creator', category: 'Value Map' },
]

const importanceLevels = [
  { value: 'critical', label: 'Critical', description: 'Essential for success' },
  { value: 'high', label: 'High', description: 'Very important' },
  { value: 'medium', label: 'Medium', description: 'Moderately important' },
  { value: 'low', label: 'Low', description: 'Nice to have' },
]

const validationStatuses = [
  { value: 'untested', label: 'Untested', description: 'Not yet validated' },
  { value: 'testing', label: 'Testing', description: 'Currently validating' },
  { value: 'validated', label: 'Validated', description: 'Confirmed with evidence' },
  { value: 'invalidated', label: 'Invalidated', description: 'Disproven' },
]

const jobTypes = [
  { value: 'functional', label: 'Functional', description: 'Practical task to complete' },
  { value: 'social', label: 'Social', description: 'How they want to be perceived' },
  { value: 'emotional', label: 'Emotional', description: 'How they want to feel' },
  { value: 'supporting', label: 'Supporting', description: 'Auxiliary jobs' },
]

const intensities = [
  { value: 'minor', label: 'Minor', description: 'Low intensity' },
  { value: 'moderate', label: 'Moderate', description: 'Medium intensity' },
  { value: 'major', label: 'Major', description: 'High intensity' },
  { value: 'extreme', label: 'Extreme', description: 'Critical severity' },
]

const frequencies = [
  { value: 'rarely', label: 'Rarely', description: 'Infrequent' },
  { value: 'sometimes', label: 'Sometimes', description: 'Occasional' },
  { value: 'often', label: 'Often', description: 'Regular' },
  { value: 'always', label: 'Always', description: 'Constant' },
]

export function CanvasItemForm({ item, mode }: CanvasItemFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<StudioProject[]>([])
  const [pendingEvidence, setPendingEvidence] = useState<PendingEvidence[]>([])

  const [formData, setFormData] = useState({
    title: item?.title || '',
    description: item?.description || '',
    item_type: item?.item_type || ('partner' as CanvasItemType),
    importance: item?.importance || ('medium' as Importance),
    validation_status: item?.validation_status || ('untested' as ValidationStatus),
    job_type: item?.job_type || ('' as JobType | ''),
    job_context: item?.job_context || '',
    intensity: item?.intensity || ('' as Intensity | ''),
    frequency: item?.frequency || ('' as Frequency | ''),
    notes: item?.notes || '',
    tags: item?.tags?.join(', ') || '',
    studio_project_id: item?.studio_project_id || '',
  })

  // Fetch projects for dropdown
  useEffect(() => {
    async function fetchProjects() {
      const { data } = await supabase
        .from('studio_projects')
        .select('id, name')
        .order('name')
      setProjects(data || [])
    }
    fetchProjects()
  }, [])

  // Determine if job-specific or pain/gain-specific fields should be shown
  const isJobType = formData.item_type === 'job'
  const isPainOrGain = formData.item_type === 'pain' || formData.item_type === 'gain'

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
        title: formData.title,
        description: formData.description || null,
        item_type: formData.item_type,
        importance: formData.importance,
        validation_status: formData.validation_status,
        job_type: isJobType && formData.job_type ? formData.job_type : null,
        job_context: isJobType && formData.job_context ? formData.job_context : null,
        intensity: isPainOrGain && formData.intensity ? formData.intensity : null,
        frequency: formData.frequency || null,
        notes: formData.notes || null,
        tags: tags.length > 0 ? tags : [],
        metadata: {},
        studio_project_id: formData.studio_project_id || null,
      }

      if (mode === 'create') {
        const { data: created, error } = await supabase
          .from('canvas_items')
          .insert([data])
          .select()
          .single()
        if (error) throw error

        // Sync pending evidence to the newly created entity
        if (pendingEvidence.length > 0 && created) {
          await syncPendingEvidence({ type: 'canvas_item', id: created.id }, pendingEvidence)
        }
      } else {
        const { error } = await supabase
          .from('canvas_items')
          .update(data)
          .eq('id', item!.id)
        if (error) throw error
      }

      router.push('/admin/items')
      router.refresh()
    } catch (err) {
      console.error('Error saving canvas item:', err)
      setError(err instanceof Error ? err.message : 'Failed to save canvas item')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!item || !confirm('Are you sure you want to delete this item? This will also remove all placements.')) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('canvas_items')
        .delete()
        .eq('id', item.id)

      if (error) throw error

      router.push('/admin/items')
      router.refresh()
    } catch (err) {
      console.error('Error deleting canvas item:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete canvas item')
    } finally {
      setSaving(false)
    }
  }

  // Group item types by category
  const bmcTypes = itemTypes.filter((t) => t.category === 'Business Model Canvas')
  const cpTypes = itemTypes.filter((t) => t.category === 'Customer Profile')
  const vmTypes = itemTypes.filter((t) => t.category === 'Value Map')

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Basic Information</h2>

        <FormFieldWithAI
          label="Title *"
          fieldName="title"
          entityType="canvas_items"
          context={{
            item_type: formData.item_type,
            studio_project_id: formData.studio_project_id,
          }}
          currentValue={formData.title}
          onGenerate={(content) => setFormData({ ...formData, title: content })}
          disabled={saving}
        >
          <Input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="e.g., Small Business Owners, Auto-backup feature"
          />
        </FormFieldWithAI>

        <FormFieldWithAI
          label="Description"
          fieldName="description"
          entityType="canvas_items"
          context={{
            title: formData.title,
            item_type: formData.item_type,
            importance: formData.importance,
          }}
          currentValue={formData.description}
          onGenerate={(content) => setFormData({ ...formData, description: content })}
          disabled={saving}
        >
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            placeholder="Detailed description of this item"
          />
        </FormFieldWithAI>

        <div>
          <Label className="block mb-1">Project</Label>
          <Select
            value={formData.studio_project_id || '__none__'}
            onValueChange={(v) => setFormData({ ...formData, studio_project_id: v === '__none__' ? '' : v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No project</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Item Type */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Item Type *</h2>
        <p className="text-sm text-muted-foreground -mt-2">
          Select the type of canvas item. This determines which canvas blocks it can appear in.
        </p>

        <div className="space-y-4">
          {/* Business Model Canvas */}
          <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Business Model Canvas</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {bmcTypes.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.item_type === type.value
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent'
                  }`}
                >
                  <input
                    type="radio"
                    name="item_type"
                    value={type.value}
                    checked={formData.item_type === type.value}
                    onChange={(e) => setFormData({ ...formData, item_type: e.target.value as CanvasItemType })}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Customer Profile */}
          <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Customer Profile</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {cpTypes.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.item_type === type.value
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent'
                  }`}
                >
                  <input
                    type="radio"
                    name="item_type"
                    value={type.value}
                    checked={formData.item_type === type.value}
                    onChange={(e) => setFormData({ ...formData, item_type: e.target.value as CanvasItemType })}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Value Map */}
          <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Value Map</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {vmTypes.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.item_type === type.value
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent'
                  }`}
                >
                  <input
                    type="radio"
                    name="item_type"
                    value={type.value}
                    checked={formData.item_type === type.value}
                    onChange={(e) => setFormData({ ...formData, item_type: e.target.value as CanvasItemType })}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">{type.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Job-specific fields */}
      {isJobType && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Job Details</h2>
          <p className="text-sm text-muted-foreground -mt-2">
            Jobs to be Done: What is the customer trying to accomplish?
          </p>

          <div>
            <Label className="block mb-2">Job Type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {jobTypes.map((type) => (
                <label
                  key={type.value}
                  className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.job_type === type.value
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="job_type"
                      value={type.value}
                      checked={formData.job_type === type.value}
                      onChange={(e) => setFormData({ ...formData, job_type: e.target.value as JobType })}
                      className="sr-only"
                    />
                    <span className="font-medium text-sm">{type.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">{type.description}</span>
                </label>
              ))}
            </div>
          </div>

          <FormFieldWithAI
            label="Job Context"
            fieldName="job_context"
            entityType="canvas_items"
            context={{
              title: formData.title,
              description: formData.description,
              job_type: formData.job_type,
            }}
            currentValue={formData.job_context}
            onGenerate={(content) => setFormData({ ...formData, job_context: content })}
            disabled={saving}
            description="Example: When I'm preparing a weekly status report"
          >
            <Input
              type="text"
              value={formData.job_context}
              onChange={(e) => setFormData({ ...formData, job_context: e.target.value })}
              placeholder="When I'm... (context or trigger)"
            />
          </FormFieldWithAI>
        </div>
      )}

      {/* Pain/Gain specific fields */}
      {isPainOrGain && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">
            {formData.item_type === 'pain' ? 'Pain' : 'Gain'} Intensity
          </h2>
          <p className="text-sm text-muted-foreground -mt-2">
            How severe is this {formData.item_type === 'pain' ? 'pain' : 'desired gain'}?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {intensities.map((level) => (
              <label
                key={level.value}
                className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.intensity === level.value
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="intensity"
                    value={level.value}
                    checked={formData.intensity === level.value}
                    onChange={(e) => setFormData({ ...formData, intensity: e.target.value as Intensity })}
                    className="sr-only"
                  />
                  <span className="font-medium text-sm">{level.label}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">{level.description}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Prioritization & Validation */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Prioritization & Validation</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="block mb-2">Importance *</Label>
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
                    onChange={(e) => setFormData({ ...formData, importance: e.target.value as Importance })}
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
            <Label className="block mb-2">Validation Status *</Label>
            <div className="space-y-2">
              {validationStatuses.map((status) => (
                <label
                  key={status.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.validation_status === status.value
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent'
                  }`}
                >
                  <input
                    type="radio"
                    name="validation_status"
                    value={status.value}
                    checked={formData.validation_status === status.value}
                    onChange={(e) => setFormData({ ...formData, validation_status: e.target.value as ValidationStatus })}
                    className="sr-only"
                  />
                  <div>
                    <span className="font-medium text-sm">{status.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{status.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Label className="block mb-1">Frequency</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {frequencies.map((freq) => (
              <label
                key={freq.value}
                className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.frequency === freq.value
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-accent'
                }`}
              >
                <input
                  type="radio"
                  name="frequency"
                  value={freq.value}
                  checked={formData.frequency === freq.value}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as Frequency })}
                  className="sr-only"
                />
                <span className="font-medium text-sm">{freq.label}</span>
                <span className="text-xs text-muted-foreground mt-1">{freq.description}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Notes & Tags */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Notes & Tags</h2>

        <FormFieldWithAI
          label="Notes"
          fieldName="notes"
          entityType="canvas_items"
          context={{
            title: formData.title,
            description: formData.description,
            item_type: formData.item_type,
            validation_status: formData.validation_status,
          }}
          currentValue={formData.notes}
          onGenerate={(content) => setFormData({ ...formData, notes: content })}
          disabled={saving}
        >
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="Additional context, insights, or observations"
          />
        </FormFieldWithAI>

        <FormFieldWithAI
          label="Tags"
          fieldName="tags"
          entityType="canvas_items"
          context={{
            title: formData.title,
            item_type: formData.item_type,
            importance: formData.importance,
          }}
          currentValue={formData.tags}
          onGenerate={(content) => setFormData({ ...formData, tags: content })}
          disabled={saving}
        >
          <Input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="premium, b2b, technical (comma-separated)"
          />
        </FormFieldWithAI>
      </div>

      {/* Evidence */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Evidence</h2>
        <p className="text-sm text-muted-foreground -mt-2">
          Attach evidence that supports or refutes this canvas item.
        </p>
        <EvidenceManager
          entityType="canvas_item"
          entityId={item?.id}
          pendingEvidence={pendingEvidence}
          onPendingEvidenceChange={setPendingEvidence}
        />
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
              Delete Item
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
            {saving ? 'Saving...' : mode === 'create' ? 'Create Item' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  )
}
