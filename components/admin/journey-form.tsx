'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FormFieldWithAI } from '@/components/forms'

interface CustomerProfile {
  id: string
  name: string
  slug: string
}

interface StudioProject {
  id: string
  name: string
  slug: string
}

interface Journey {
  id: string
  slug: string
  name: string
  description?: string | null
  status: string
  validation_status: string
  journey_type: string
  goal?: string | null
  duration_estimate?: string | null
  tags: string[]
  customer_profile_id?: string | null
  studio_project_id?: string | null
  hypothesis_id?: string | null
}

interface JourneyFormProps {
  journey?: Journey
  customerProfiles: CustomerProfile[]
  studioProjects: StudioProject[]
}

const journeyTypes = [
  { value: 'end_to_end', label: 'End-to-End', description: 'Complete customer experience' },
  { value: 'sub_journey', label: 'Sub-Journey', description: 'Specific portion of larger journey' },
  { value: 'micro_moment', label: 'Micro-Moment', description: 'Brief critical interaction' },
]

const statuses = [
  { value: 'draft', label: 'Draft', description: 'Work in progress' },
  { value: 'active', label: 'Active', description: 'Currently in use' },
  { value: 'validated', label: 'Validated', description: 'Confirmed with data' },
  { value: 'archived', label: 'Archived', description: 'No longer relevant' },
]

const validationStatuses = [
  { value: 'untested', label: 'Untested', description: 'Not yet validated' },
  { value: 'testing', label: 'Testing', description: 'Currently validating' },
  { value: 'validated', label: 'Validated', description: 'Confirmed with evidence' },
  { value: 'invalidated', label: 'Invalidated', description: 'Proven incorrect' },
]

export function JourneyForm({ journey, customerProfiles, studioProjects }: JourneyFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    slug: journey?.slug || '',
    name: journey?.name || '',
    description: journey?.description || '',
    journey_type: journey?.journey_type || 'end_to_end',
    status: journey?.status || 'draft',
    validation_status: journey?.validation_status || 'untested',
    customer_profile_id: journey?.customer_profile_id || '',
    studio_project_id: journey?.studio_project_id || '',
    hypothesis_id: journey?.hypothesis_id || '',
    goal: journey?.goal || '',
    duration_estimate: journey?.duration_estimate || '',
    tags: journey?.tags?.join(', ') || '',
  })

  // Auto-generate slug from name
  useEffect(() => {
    if (!journey?.slug && formData.name) {
      const slug = formData.name
        .toLowerCase()
        .slice(0, 50)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      setFormData((prev) => ({ ...prev, slug }))
    }
  }, [formData.name, journey?.slug])

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
        name: formData.name,
        description: formData.description || null,
        journey_type: formData.journey_type,
        status: formData.status,
        validation_status: formData.validation_status,
        customer_profile_id: formData.customer_profile_id || null,
        studio_project_id: formData.studio_project_id || null,
        hypothesis_id: formData.hypothesis_id || null,
        goal: formData.goal || null,
        duration_estimate: formData.duration_estimate || null,
        tags: tags.length > 0 ? tags : [],
      }

      if (journey) {
        // Edit mode
        const { error } = await supabase
          .from('user_journeys')
          .update(data)
          .eq('id', journey.id)
        if (error) throw error
        router.push(`/admin/journeys/${journey.id}`)
      } else {
        // Create mode
        const { data: created, error } = await supabase
          .from('user_journeys')
          .insert([data])
          .select()
          .single()
        if (error) throw error
        router.push(`/admin/journeys/${created.id}`)
      }

      router.refresh()
    } catch (err) {
      console.error('Error saving journey:', err)
      setError(err instanceof Error ? err.message : 'Failed to save journey')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!journey || !confirm('Are you sure you want to delete this journey?')) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_journeys')
        .delete()
        .eq('id', journey.id)

      if (error) throw error

      router.push('/admin/journeys')
      router.refresh()
    } catch (err) {
      console.error('Error deleting journey:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete journey')
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

      {/* Basic Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Basic Information</h2>

        <FormFieldWithAI
          label="Journey Name *"
          fieldName="name"
          entityType="user_journeys"
          context={{
            journey_type: formData.journey_type,
            customer_profile_id: formData.customer_profile_id,
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
            placeholder="e.g., Customer Onboarding Journey"
          />
        </FormFieldWithAI>

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

        <FormFieldWithAI
          label="Description"
          fieldName="description"
          entityType="user_journeys"
          context={{
            name: formData.name,
            journey_type: formData.journey_type,
            goal: formData.goal,
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
            placeholder="Describe this customer journey..."
          />
        </FormFieldWithAI>

        <div>
          <label className="block text-sm font-medium mb-2">Journey Type *</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {journeyTypes.map((type) => (
              <label
                key={type.value}
                className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.journey_type === type.value
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="journey_type"
                    value={type.value}
                    checked={formData.journey_type === type.value}
                    onChange={(e) => setFormData({ ...formData, journey_type: e.target.value })}
                    className="sr-only"
                  />
                  <span className="font-medium text-sm">{type.label}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">{type.description}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Context */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Customer Context</h2>

        <FormFieldWithAI
          label="Customer Goal"
          fieldName="goal"
          entityType="user_journeys"
          context={{
            name: formData.name,
            journey_type: formData.journey_type,
            customer_profile_id: formData.customer_profile_id,
          }}
          currentValue={formData.goal}
          onGenerate={(content) => setFormData({ ...formData, goal: content })}
          disabled={saving}
          description="What is the customer trying to accomplish?"
        >
          <textarea
            value={formData.goal}
            onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border bg-background"
            rows={2}
            placeholder="e.g., Successfully set up their account and understand key features"
          />
        </FormFieldWithAI>

        <div>
          <label className="block text-sm font-medium mb-1">Duration Estimate</label>
          <input
            type="text"
            value={formData.duration_estimate}
            onChange={(e) => setFormData({ ...formData, duration_estimate: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border bg-background"
            placeholder="e.g., 2-3 weeks, 30 minutes, 6 months"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Customer Profile</label>
          <select
            value={formData.customer_profile_id}
            onChange={(e) => setFormData({ ...formData, customer_profile_id: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border bg-background"
          >
            <option value="">No customer profile</option>
            {customerProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status & Validation */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Status & Validation</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} - {s.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Validation Status *</label>
            <select
              value={formData.validation_status}
              onChange={(e) => setFormData({ ...formData, validation_status: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
            >
              {validationStatuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} - {s.description}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Project Context */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Project Context</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Studio Project</label>
          <select
            value={formData.studio_project_id}
            onChange={(e) => setFormData({ ...formData, studio_project_id: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border bg-background"
          >
            <option value="">No project</option>
            {studioProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <FormFieldWithAI
          label="Tags"
          fieldName="tags"
          entityType="user_journeys"
          context={{
            name: formData.name,
            journey_type: formData.journey_type,
            goal: formData.goal,
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
            placeholder="onboarding, b2b, mobile (comma-separated)"
          />
        </FormFieldWithAI>
      </div>

      {/* Helper text for stages/touchpoints */}
      {!journey && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-2 text-blue-700 dark:text-blue-400">
            <svg className="w-5 h-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium">Next Step: Add Stages & Touchpoints</p>
              <p className="text-sm mt-1">
                After creating the journey, you'll be able to add stages and touchpoints on the detail page.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {journey && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Delete Journey
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
            {saving ? 'Saving...' : journey ? 'Save Changes' : 'Create Journey'}
          </button>
        </div>
      </div>
    </form>
  )
}
