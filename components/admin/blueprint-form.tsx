'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SidebarCard } from './sidebar-card'
import { FormActions } from './form-actions'
import { FormFieldWithAI } from '@/components/forms'
import { RelationshipField } from './relationship-field'
import { EntityLinkField } from './entity-link-field'
import { syncEntityLinks } from '@/lib/entity-links'
import { buildEntityContext } from '@/lib/ai-context'
import type { PendingLink } from '@/lib/types/entity-relationships'

interface Blueprint {
  id: string
  slug: string
  name: string
  description?: string | null
  status: string
  validation_status: string
  blueprint_type: string
  service_scope?: string | null
  service_duration?: string | null
  tags: string[]
  studio_project_id?: string | null
  hypothesis_id?: string | null
}

interface BlueprintFormProps {
  blueprint?: Blueprint
  projects: { id: string; name: string }[]
}

const blueprintTypes = [
  { value: 'service', label: 'Service', description: 'Service-oriented delivery' },
  { value: 'product', label: 'Product', description: 'Product-focused experience' },
  { value: 'hybrid', label: 'Hybrid', description: 'Mix of service and product' },
  { value: 'digital', label: 'Digital', description: 'Digital-only experience' },
  { value: 'physical', label: 'Physical', description: 'Physical-only experience' },
]

const statuses = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'validated', label: 'Validated' },
  { value: 'archived', label: 'Archived' },
]

const validationStatuses = [
  { value: 'untested', label: 'Untested' },
  { value: 'testing', label: 'Testing' },
  { value: 'validated', label: 'Validated' },
  { value: 'invalidated', label: 'Invalidated' },
]

export function BlueprintForm({ blueprint, projects }: BlueprintFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [relatedContext, setRelatedContext] = useState<Record<string, unknown>>({})
  const [pendingJourneyLinks, setPendingJourneyLinks] = useState<PendingLink[]>([])
  const [pendingStoryMapLinks, setPendingStoryMapLinks] = useState<PendingLink[]>([])
  const [pendingVpcLinks, setPendingVpcLinks] = useState<PendingLink[]>([])
  const [pendingBmcLinks, setPendingBmcLinks] = useState<PendingLink[]>([])

  const [formData, setFormData] = useState({
    slug: blueprint?.slug || '',
    name: blueprint?.name || '',
    description: blueprint?.description || '',
    blueprint_type: blueprint?.blueprint_type || 'service',
    status: blueprint?.status || 'draft',
    validation_status: blueprint?.validation_status || 'untested',
    studio_project_id: blueprint?.studio_project_id || '',
    hypothesis_id: blueprint?.hypothesis_id || '',
    service_scope: blueprint?.service_scope || '',
    service_duration: blueprint?.service_duration || '',
    tags: blueprint?.tags?.join(', ') || '',
  })

  // Auto-generate slug from name
  useEffect(() => {
    if (!blueprint?.slug && formData.name) {
      const slug = formData.name
        .toLowerCase()
        .slice(0, 50)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      setFormData((prev) => ({ ...prev, slug }))
    }
  }, [formData.name, blueprint?.slug])

  // Fetch related entity data for AI context
  useEffect(() => {
    buildEntityContext('service_blueprints', formData).then(setRelatedContext)
  }, [formData.studio_project_id, formData.hypothesis_id])

  // Build AI context including related entity data
  const getAIContext = (additionalContext: Record<string, unknown> = {}) => ({
    ...relatedContext,
    ...additionalContext,
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
        blueprint_type: formData.blueprint_type,
        status: formData.status,
        validation_status: formData.validation_status,
        studio_project_id: formData.studio_project_id || null,
        hypothesis_id: formData.hypothesis_id || null,
        service_scope: formData.service_scope || null,
        service_duration: formData.service_duration || null,
        tags,
      }

      if (blueprint?.id) {
        // Check slug uniqueness on update (if slug changed)
        if (formData.slug !== blueprint.slug) {
          let query = supabase
            .from('service_blueprints')
            .select('id')
            .eq('slug', formData.slug)
            .neq('id', blueprint.id)

          if (formData.studio_project_id) {
            query = query.eq('studio_project_id', formData.studio_project_id)
          } else {
            query = query.is('studio_project_id', null)
          }

          const { data: existing } = await query.maybeSingle()

          if (existing) {
            throw new Error(`A blueprint with slug "${formData.slug}" already exists in this project. Please use a different slug.`)
          }
        }

        const { error: updateError } = await supabase
          .from('service_blueprints')
          .update(data)
          .eq('id', blueprint.id)

        if (updateError) throw updateError
        router.push('/admin/blueprints')
      } else {
        // Check slug uniqueness on create
        let query = supabase
          .from('service_blueprints')
          .select('id')
          .eq('slug', formData.slug)

        if (formData.studio_project_id) {
          query = query.eq('studio_project_id', formData.studio_project_id)
        } else {
          query = query.is('studio_project_id', null)
        }

        const { data: existing } = await query.maybeSingle()

        if (existing) {
          throw new Error(`A blueprint with slug "${formData.slug}" already exists in this project. Please use a different slug.`)
        }

        const { data: created, error: insertError } = await supabase
          .from('service_blueprints')
          .insert(data)
          .select()
          .single()

        if (insertError) throw insertError

        // Sync pending entity links for create mode
        const sourceRef = { type: 'service_blueprint' as const, id: created.id }
        if (pendingJourneyLinks.length > 0) {
          await syncEntityLinks(sourceRef, 'user_journey', 'related', pendingJourneyLinks.map(l => l.targetId))
        }
        if (pendingStoryMapLinks.length > 0) {
          await syncEntityLinks(sourceRef, 'story_map', 'related', pendingStoryMapLinks.map(l => l.targetId))
        }
        if (pendingVpcLinks.length > 0) {
          await syncEntityLinks(sourceRef, 'value_proposition_canvas', 'related', pendingVpcLinks.map(l => l.targetId))
        }
        if (pendingBmcLinks.length > 0) {
          await syncEntityLinks(sourceRef, 'business_model_canvas', 'related', pendingBmcLinks.map(l => l.targetId))
        }

        router.push(`/admin/blueprints/${created.id}/edit`)
      }
    } catch (err: any) {
      // Handle specific error types with actionable messages
      const message = err.message || ''
      if (message.includes('duplicate key') || err.code === '23505') {
        setError('A blueprint with this slug already exists. Please use a different slug.')
      } else if (message.includes('not authenticated') || err.code === 'PGRST301') {
        setError('You must be logged in to save blueprints.')
      } else if (message.includes('permission denied') || message.includes('policy')) {
        setError('You do not have permission to modify blueprints. Admin access required.')
      } else if (message.includes('network') || err.code === 'NETWORK_ERROR') {
        setError('Network error. Please check your connection and try again.')
      } else {
        setError(message || 'Failed to save blueprint. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!blueprint?.id) return

    setSaving(true)
    try {
      const { error: deleteError } = await supabase
        .from('service_blueprints')
        .delete()
        .eq('id', blueprint.id)

      if (deleteError) throw deleteError
      router.push('/admin/blueprints')
    } catch (err: any) {
      const message = err.message || ''
      if (message.includes('permission denied') || message.includes('policy')) {
        setError('You do not have permission to delete blueprints. Admin access required.')
      } else {
        setError(message || 'Failed to delete blueprint. Please try again.')
      }
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-8">
        {/* Main content */}
        <div className="flex-1 space-y-6">
          {/* Name */}
          <FormFieldWithAI
            label="Name *"
            fieldName="name"
            entityType="service_blueprints"
            context={getAIContext({
              blueprint_type: formData.blueprint_type,
              status: formData.status,
            })}
            currentValue={formData.name}
            onGenerate={(content) => setFormData((prev) => ({ ...prev, name: content }))}
            disabled={saving}
          >
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
              className="w-full px-3 py-2 border rounded-md bg-background"
              placeholder="e.g., Customer Onboarding Flow"
            />
          </FormFieldWithAI>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-1">
              Slug <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              required
              className="w-full px-3 py-2 border rounded-md bg-background font-mono text-sm"
              placeholder="customer-onboarding-flow"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              URL-friendly identifier
            </p>
          </div>

          {/* Description */}
          <FormFieldWithAI
            label="Description"
            fieldName="description"
            entityType="service_blueprints"
            context={getAIContext({
              name: formData.name,
              blueprint_type: formData.blueprint_type,
              service_scope: formData.service_scope,
            })}
            currentValue={formData.description}
            onGenerate={(content) => setFormData((prev) => ({ ...prev, description: content }))}
            disabled={saving}
          >
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border rounded-md bg-background"
              placeholder="What does this blueprint cover?"
            />
          </FormFieldWithAI>

          {/* Blueprint Type */}
          <div>
            <label htmlFor="blueprint_type" className="block text-sm font-medium mb-1">
              Blueprint Type
            </label>
            <select
              id="blueprint_type"
              value={formData.blueprint_type}
              onChange={(e) => setFormData((prev) => ({ ...prev, blueprint_type: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              {blueprintTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          {/* Service Scope */}
          <FormFieldWithAI
            label="Service Scope"
            fieldName="service_scope"
            entityType="service_blueprints"
            context={getAIContext({
              name: formData.name,
              description: formData.description,
              blueprint_type: formData.blueprint_type,
            })}
            currentValue={formData.service_scope}
            onGenerate={(content) => setFormData((prev) => ({ ...prev, service_scope: content }))}
            disabled={saving}
          >
            <input
              type="text"
              id="service_scope"
              value={formData.service_scope}
              onChange={(e) => setFormData((prev) => ({ ...prev, service_scope: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md bg-background"
              placeholder="e.g., New customer signup to first value delivery"
            />
          </FormFieldWithAI>

          {/* Service Duration */}
          <FormFieldWithAI
            label="Service Duration"
            fieldName="service_duration"
            entityType="service_blueprints"
            context={getAIContext({
              name: formData.name,
              service_scope: formData.service_scope,
              blueprint_type: formData.blueprint_type,
            })}
            currentValue={formData.service_duration}
            onGenerate={(content) => setFormData((prev) => ({ ...prev, service_duration: content }))}
            disabled={saving}
          >
            <input
              type="text"
              id="service_duration"
              value={formData.service_duration}
              onChange={(e) => setFormData((prev) => ({ ...prev, service_duration: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md bg-background"
              placeholder="e.g., 15-30 minutes"
            />
          </FormFieldWithAI>

          {/* Tags */}
          <FormFieldWithAI
            label="Tags"
            fieldName="tags"
            entityType="service_blueprints"
            context={getAIContext({
              name: formData.name,
              description: formData.description,
              blueprint_type: formData.blueprint_type,
            })}
            currentValue={formData.tags}
            onGenerate={(content) => setFormData((prev) => ({ ...prev, tags: content }))}
            disabled={saving}
            description="Comma-separated tags for organization"
          >
            <input
              type="text"
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md bg-background"
              placeholder="onboarding, digital, self-service"
            />
          </FormFieldWithAI>

          {/* Error */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 space-y-4">
          <SidebarCard title="Status">
            <div className="space-y-3">
              <div>
                <label htmlFor="status" className="block text-xs font-medium mb-1 text-muted-foreground">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full px-2 py-1.5 border rounded bg-background text-sm"
                >
                  {statuses.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="validation_status" className="block text-xs font-medium mb-1 text-muted-foreground">
                  Validation
                </label>
                <select
                  id="validation_status"
                  value={formData.validation_status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, validation_status: e.target.value }))}
                  className="w-full px-2 py-1.5 border rounded bg-background text-sm"
                >
                  {validationStatuses.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </SidebarCard>

          <SidebarCard title="Relationships">
            <div className="space-y-4">
              <div>
                <label htmlFor="studio_project_id" className="block text-xs font-medium mb-1 text-muted-foreground">
                  Studio Project
                </label>
                <select
                  id="studio_project_id"
                  value={formData.studio_project_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, studio_project_id: e.target.value }))}
                  className="w-full px-2 py-1.5 border rounded bg-background text-sm"
                >
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <RelationshipField
                label="Hypothesis"
                value={formData.hypothesis_id}
                onChange={(id) => setFormData((prev) => ({ ...prev, hypothesis_id: id as string }))}
                tableName="studio_hypotheses"
                displayField="statement"
                mode="single"
                placeholder="Select hypothesis..."
                helperText="Link to a hypothesis to validate"
              />
            </div>
          </SidebarCard>

          <SidebarCard title="Related Entities">
            <div className="space-y-4">
              <EntityLinkField
                label="User Journeys"
                sourceType="service_blueprint"
                sourceId={blueprint?.id}
                targetType="user_journey"
                targetTableName="user_journeys"
                targetDisplayField="name"
                linkType="related"
                allowMultiple={true}
                pendingLinks={pendingJourneyLinks}
                onPendingLinksChange={setPendingJourneyLinks}
                helperText="Link to customer journeys this blueprint supports"
              />
              <EntityLinkField
                label="Story Maps"
                sourceType="service_blueprint"
                sourceId={blueprint?.id}
                targetType="story_map"
                targetTableName="story_maps"
                targetDisplayField="name"
                linkType="related"
                allowMultiple={true}
                pendingLinks={pendingStoryMapLinks}
                onPendingLinksChange={setPendingStoryMapLinks}
                helperText="Link to story maps that implement this blueprint"
              />
              <EntityLinkField
                label="Value Propositions"
                sourceType="service_blueprint"
                sourceId={blueprint?.id}
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
                sourceType="service_blueprint"
                sourceId={blueprint?.id}
                targetType="business_model_canvas"
                targetTableName="business_model_canvases"
                targetDisplayField="name"
                linkType="related"
                allowMultiple={true}
                pendingLinks={pendingBmcLinks}
                onPendingLinksChange={setPendingBmcLinks}
                helperText="Link to business model canvases"
              />
            </div>
          </SidebarCard>

          <FormActions
            isSubmitting={saving}
            submitLabel={blueprint ? 'Save Changes' : 'Create Blueprint'}
            onCancel={() => router.push('/admin/blueprints')}
            onDelete={blueprint ? handleDelete : undefined}
            deleteConfirmMessage="Are you sure you want to delete this blueprint? This action cannot be undone."
          />
        </div>
      </div>
    </form>
  )
}
