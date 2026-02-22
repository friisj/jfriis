'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { FormFieldWithAI } from '@/components/forms'
import { AdminEntityLayout } from '@/components/admin/admin-entity-layout'
import { EntityControlCluster } from '@/components/admin/entity-control-cluster'
import { RelationshipManager, type RelationshipSlot } from '@/components/admin/relationship-manager'
import { RelationshipField } from './relationship-field'
import { syncEntityLinks } from '@/lib/entity-links'
import { buildEntityContext } from '@/lib/ai-context'
import type { PendingLink } from '@/lib/types/entity-relationships'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ExternalLink } from 'lucide-react'

// ============================================================================
// Relationship slots
// ============================================================================

const BLUEPRINT_SLOTS: RelationshipSlot[] = [
  {
    targetType: 'user_journey',
    linkType: 'related',
    label: 'User Journeys',
    group: 'Journeys & Maps',
    displayField: 'name',
    editHref: (id) => `/admin/journeys/${id}/edit`,
  },
  {
    targetType: 'story_map',
    linkType: 'related',
    label: 'Story Maps',
    group: 'Journeys & Maps',
    displayField: 'name',
    editHref: (id) => `/admin/story-maps/${id}/edit`,
  },
  {
    targetType: 'value_proposition_canvas',
    linkType: 'related',
    label: 'Value Propositions',
    group: 'Strategic Context',
    displayField: 'name',
    editHref: (id) => `/admin/canvases/value-proposition/${id}/edit`,
  },
  {
    targetType: 'business_model_canvas',
    linkType: 'related',
    label: 'Business Models',
    group: 'Strategic Context',
    displayField: 'name',
    editHref: (id) => `/admin/canvases/business-model/${id}/edit`,
  },
]

// ============================================================================
// Types & Constants
// ============================================================================

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

// ============================================================================
// Component
// ============================================================================

export function BlueprintForm({ blueprint }: BlueprintFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [relatedContext, setRelatedContext] = useState<Record<string, unknown>>({})
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([])

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

  // Track dirty state
  const [initialFormData] = useState(formData)
  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialFormData),
    [formData, initialFormData]
  )

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

  const getAIContext = (additionalContext: Record<string, unknown> = {}) => ({
    ...relatedContext,
    ...additionalContext,
  })

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
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
            throw new Error(`A blueprint with slug "${formData.slug}" already exists in this project.`)
          }
        }

        const { error: updateError } = await supabase
          .from('service_blueprints')
          .update(data)
          .eq('id', blueprint.id)

        if (updateError) throw updateError
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
          throw new Error(`A blueprint with slug "${formData.slug}" already exists in this project.`)
        }

        const { data: created, error: insertError } = await supabase
          .from('service_blueprints')
          .insert(data)
          .select()
          .single()

        if (insertError) throw insertError

        // Sync pending entity links for create mode
        // RelationshipManager handles all link types via slots
        if (pendingLinks.length > 0) {
          const sourceRef = { type: 'service_blueprint' as const, id: created.id }
          const journeyLinks = pendingLinks.filter(l => l.notes?.includes('user_journey') || false)
          const storyMapLinks = pendingLinks.filter(l => l.notes?.includes('story_map') || false)
          const vpcLinks = pendingLinks.filter(l => l.notes?.includes('value_proposition') || false)
          const bmcLinks = pendingLinks.filter(l => l.notes?.includes('business_model') || false)

          if (journeyLinks.length > 0) {
            await syncEntityLinks(sourceRef, 'user_journey', 'related', journeyLinks.map(l => l.targetId))
          }
          if (storyMapLinks.length > 0) {
            await syncEntityLinks(sourceRef, 'story_map', 'related', storyMapLinks.map(l => l.targetId))
          }
          if (vpcLinks.length > 0) {
            await syncEntityLinks(sourceRef, 'value_proposition_canvas', 'related', vpcLinks.map(l => l.targetId))
          }
          if (bmcLinks.length > 0) {
            await syncEntityLinks(sourceRef, 'business_model_canvas', 'related', bmcLinks.map(l => l.targetId))
          }
        }
      }

      toast.success(blueprint ? 'Blueprint updated!' : 'Blueprint created!')
      router.push('/admin/blueprints')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      const code = (err as { code?: string })?.code
      if (message.includes('duplicate key') || code === '23505') {
        setError('A blueprint with this slug already exists.')
      } else if (message.includes('not authenticated') || code === 'PGRST301') {
        setError('You must be logged in to save blueprints.')
      } else if (message.includes('permission denied') || message.includes('policy')) {
        setError('You do not have permission to modify blueprints.')
      } else {
        setError(message || 'Failed to save blueprint.')
      }
      toast.error(message || 'Failed to save blueprint.')
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

      toast.success('Blueprint deleted')
      router.push('/admin/blueprints')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete blueprint.'
      setError(message)
      toast.error(message)
      setSaving(false)
    }
  }

  // Status badge
  const statusLabel = formData.status.charAt(0).toUpperCase() + formData.status.slice(1)
  const statusVariant = formData.status === 'active' ? 'default'
    : formData.status === 'validated' ? 'secondary'
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
        <Input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          required
          placeholder="e.g., Customer Onboarding Flow"
        />
      </FormFieldWithAI>

      <div>
        <Label htmlFor="slug" className="block mb-1">Slug *</Label>
        <Input
          type="text"
          id="slug"
          value={formData.slug}
          onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
          required
          className="font-mono text-sm"
          placeholder="customer-onboarding-flow"
        />
        <p className="mt-1 text-xs text-muted-foreground">URL-friendly identifier</p>
      </div>

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
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          rows={3}
          placeholder="What does this blueprint cover?"
        />
      </FormFieldWithAI>

      <div>
        <Label htmlFor="blueprint_type" className="block mb-1">Blueprint Type</Label>
        <Select
          value={formData.blueprint_type}
          onValueChange={(v) => setFormData((prev) => ({ ...prev, blueprint_type: v }))}
        >
          <SelectTrigger id="blueprint_type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {blueprintTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label} - {type.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
        <Input
          type="text"
          value={formData.service_scope}
          onChange={(e) => setFormData((prev) => ({ ...prev, service_scope: e.target.value }))}
          placeholder="e.g., New customer signup to first value delivery"
        />
      </FormFieldWithAI>

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
        <Input
          type="text"
          value={formData.service_duration}
          onChange={(e) => setFormData((prev) => ({ ...prev, service_duration: e.target.value }))}
          placeholder="e.g., 15-30 minutes"
        />
      </FormFieldWithAI>
    </div>
  )

  // ============================================================================
  // Links tab
  // ============================================================================

  const linksTab = (
    <div className="space-y-6">
      {blueprint?.id ? (
        <RelationshipManager
          entity={{ type: 'service_blueprint', id: blueprint.id }}
          slots={BLUEPRINT_SLOTS}
        />
      ) : (
        <RelationshipManager
          entity={{ type: 'service_blueprint' }}
          slots={BLUEPRINT_SLOTS}
          pendingLinks={pendingLinks}
          onPendingLinksChange={setPendingLinks}
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
        <h3 className="text-sm font-semibold">Status</h3>
        <div>
          <Label className="block text-xs mb-1 text-muted-foreground">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData((prev) => ({ ...prev, status: v }))}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="block text-xs mb-1 text-muted-foreground">Validation</Label>
          <Select
            value={formData.validation_status}
            onValueChange={(v) => setFormData((prev) => ({ ...prev, validation_status: v }))}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {validationStatuses.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Relationships</h3>
        <RelationshipField
          label="Studio Project"
          value={formData.studio_project_id}
          onChange={(id) => setFormData((prev) => ({ ...prev, studio_project_id: id as string }))}
          tableName="studio_projects"
          displayField="name"
          mode="single"
          placeholder="Select project..."
        />
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

      <div className="rounded-lg border bg-card p-4 space-y-3">
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
          description="Comma-separated tags"
        >
          <Input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
            placeholder="onboarding, digital, self-service"
          />
        </FormFieldWithAI>
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
      title={blueprint ? formData.name || 'Untitled' : 'New Blueprint'}
      subtitle={blueprint ? formData.slug : undefined}
      status={{ label: statusLabel, variant: statusVariant as 'default' | 'secondary' | 'outline' }}
      backHref="/admin/blueprints"
      backLabel="Blueprints"
      controlCluster={
        <EntityControlCluster
          isDirty={isDirty}
          isSaving={saving}
          onSave={() => handleSubmit()}
          onCancel={() => router.push('/admin/blueprints')}
          saveLabel={blueprint ? 'Save' : 'Create'}
          links={blueprint ? [
            { label: 'Canvas', href: `/admin/blueprints/${blueprint.id}`, icon: <ExternalLink className="size-4" /> },
          ] : undefined}
          onDelete={blueprint ? handleDelete : undefined}
        />
      }
      tabs={tabs}
      metadata={metadataPanel}
      isDirty={isDirty}
      isSaving={saving}
      onSave={() => handleSubmit()}
      onCancel={() => router.push('/admin/blueprints')}
      onSubmit={handleSubmit}
    />
  )
}
