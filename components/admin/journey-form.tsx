'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FormFieldWithAI } from '@/components/forms'
import { SidebarCard } from './sidebar-card'
import { FormActions } from './form-actions'
import { RelationshipField } from './relationship-field'
import { EntityLinkField } from './entity-link-field'
import { syncEntityLinks } from '@/lib/entity-links'
import type { PendingLink } from '@/lib/types/entity-relationships'

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

interface StudioProject {
  id: string
  name: string
  description?: string | null
  problem_statement?: string | null
  status?: string
}

export function JourneyForm({ journey }: JourneyFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingVpcLinks, setPendingVpcLinks] = useState<PendingLink[]>([])
  const [pendingBmcLinks, setPendingBmcLinks] = useState<PendingLink[]>([])
  const [selectedProject, setSelectedProject] = useState<StudioProject | null>(null)

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

  // Fetch selected project data for AI context
  useEffect(() => {
    const fetchProject = async () => {
      if (!formData.studio_project_id) {
        setSelectedProject(null)
        return
      }
      const { data } = await supabase
        .from('studio_projects')
        .select('id, name, description, problem_statement, status')
        .eq('id', formData.studio_project_id)
        .single()
      setSelectedProject(data)
    }
    fetchProject()
  }, [formData.studio_project_id])

  // Build AI context including selected project data
  const getAIContext = (additionalContext: Record<string, unknown> = {}) => ({
    ...additionalContext,
    ...(selectedProject && {
      project_name: selectedProject.name,
      project_description: selectedProject.description,
      project_problem_statement: selectedProject.problem_statement,
    }),
  })

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

        // Sync pending entity links for create mode
        if (pendingVpcLinks.length > 0) {
          await syncEntityLinks(
            { type: 'user_journey', id: created.id },
            'value_proposition_canvas',
            'related',
            pendingVpcLinks.map(l => l.targetId)
          )
        }
        if (pendingBmcLinks.length > 0) {
          await syncEntityLinks(
            { type: 'user_journey', id: created.id },
            'business_model_canvas',
            'related',
            pendingBmcLinks.map(l => l.targetId)
          )
        }

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
    if (!journey) return

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormFieldWithAI
              label="Journey Name *"
              fieldName="name"
              entityType="user_journeys"
              context={getAIContext({
                journey_type: formData.journey_type,
                customer_profile_id: formData.customer_profile_id,
              })}
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
          </div>

          <FormFieldWithAI
            label="Description"
            fieldName="description"
            entityType="user_journeys"
            context={getAIContext({
              name: formData.name,
              journey_type: formData.journey_type,
              goal: formData.goal,
            })}
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

          <FormFieldWithAI
            label="Customer Goal"
            fieldName="goal"
            entityType="user_journeys"
            context={getAIContext({
              name: formData.name,
              journey_type: formData.journey_type,
              customer_profile_id: formData.customer_profile_id,
            })}
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <SidebarCard title="Relationships">
            <RelationshipField
              label="Customer Profile"
              value={formData.customer_profile_id}
              onChange={(id) => setFormData({ ...formData, customer_profile_id: id as string })}
              tableName="customer_profiles"
              displayField="name"
              mode="single"
              placeholder="Select customer profile..."
              helperText="Link to a customer persona"
            />
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

          <SidebarCard title="Related Canvases">
            <EntityLinkField
              label="Value Propositions"
              sourceType="user_journey"
              sourceId={journey?.id}
              targetType="value_proposition_canvas"
              targetTableName="value_proposition_canvases"
              targetDisplayField="name"
              linkType="related"
              allowMultiple={true}
              pendingLinks={pendingVpcLinks}
              onPendingLinksChange={setPendingVpcLinks}
              helperText="Link to value proposition canvases"
            />
            <EntityLinkField
              label="Business Models"
              sourceType="user_journey"
              sourceId={journey?.id}
              targetType="business_model_canvas"
              targetTableName="business_model_canvases"
              targetDisplayField="name"
              linkType="related"
              allowMultiple={true}
              pendingLinks={pendingBmcLinks}
              onPendingLinksChange={setPendingBmcLinks}
              helperText="Link to business model canvases"
            />
          </SidebarCard>

          <SidebarCard title="Journey Type">
            <div className="space-y-2">
              {journeyTypes.map((type) => (
                <label
                  key={type.value}
                  className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.journey_type === type.value
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent'
                  }`}
                >
                  <input
                    type="radio"
                    name="journey_type"
                    value={type.value}
                    checked={formData.journey_type === type.value}
                    onChange={(e) => setFormData({ ...formData, journey_type: e.target.value })}
                    className="sr-only"
                  />
                  <span className="font-medium text-sm">{type.label}</span>
                  <span className="text-xs text-muted-foreground">{type.description}</span>
                </label>
              ))}
            </div>
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
              <label className="block text-sm font-medium mb-1">Validation Status</label>
              <select
                value={formData.validation_status}
                onChange={(e) => setFormData({ ...formData, validation_status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
              >
                {validationStatuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </SidebarCard>

          <SidebarCard title="Details">
            <div>
              <label className="block text-sm font-medium mb-1">Duration Estimate</label>
              <input
                type="text"
                value={formData.duration_estimate}
                onChange={(e) => setFormData({ ...formData, duration_estimate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
                placeholder="e.g., 2-3 weeks"
              />
            </div>
          </SidebarCard>

          <SidebarCard title="Tags">
            <FormFieldWithAI
              label=""
              fieldName="tags"
              entityType="user_journeys"
              context={getAIContext({
                name: formData.name,
                journey_type: formData.journey_type,
                goal: formData.goal,
              })}
              currentValue={formData.tags}
              onGenerate={(content) => setFormData({ ...formData, tags: content })}
              disabled={saving}
            >
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
                placeholder="onboarding, b2b, mobile"
              />
            </FormFieldWithAI>
          </SidebarCard>
        </div>
      </div>

      <FormActions
        isSubmitting={saving}
        submitLabel={journey ? 'Save Changes' : 'Create Journey'}
        onCancel={() => router.back()}
        onDelete={journey ? handleDelete : undefined}
        deleteConfirmMessage="Are you sure you want to delete this journey?"
      />
    </form>
  )
}
