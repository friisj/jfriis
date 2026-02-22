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

const JOURNEY_SLOTS: RelationshipSlot[] = [
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
  { value: 'untested', label: 'Untested' },
  { value: 'testing', label: 'Testing' },
  { value: 'validated', label: 'Validated' },
  { value: 'invalidated', label: 'Invalidated' },
]

// ============================================================================
// Component
// ============================================================================

export function JourneyForm({ journey }: JourneyFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([])
  const [relatedContext, setRelatedContext] = useState<Record<string, unknown>>({})

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

  // Track dirty state
  const [initialFormData] = useState(formData)
  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialFormData),
    [formData, initialFormData]
  )

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

  // Fetch related entity data for AI context
  useEffect(() => {
    buildEntityContext('user_journeys', formData).then(setRelatedContext)
  }, [formData.studio_project_id, formData.hypothesis_id, formData.customer_profile_id])

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
        const { error } = await supabase
          .from('user_journeys')
          .update(data)
          .eq('id', journey.id)
        if (error) throw error
      } else {
        const { data: created, error } = await supabase
          .from('user_journeys')
          .insert([data])
          .select()
          .single()
        if (error) throw error

        // Sync pending entity links for create mode
        const vpcLinks = pendingLinks.filter(l => l.linkType === 'related' && l.targetLabel)
        const bmcLinks = pendingLinks.filter(l => l.linkType === 'related')

        if (vpcLinks.length > 0) {
          await syncEntityLinks(
            { type: 'user_journey', id: created.id },
            'value_proposition_canvas',
            'related',
            vpcLinks.map(l => l.targetId)
          )
        }
        if (bmcLinks.length > 0) {
          await syncEntityLinks(
            { type: 'user_journey', id: created.id },
            'business_model_canvas',
            'related',
            bmcLinks.map(l => l.targetId)
          )
        }
      }

      toast.success(journey ? 'Journey updated!' : 'Journey created!')
      if (journey) {
        router.push(`/admin/journeys/${journey.id}`)
      } else {
        router.push('/admin/journeys')
      }
      router.refresh()
    } catch (err) {
      console.error('Error saving journey:', err)
      setError(err instanceof Error ? err.message : 'Failed to save journey')
      toast.error(err instanceof Error ? err.message : 'Failed to save journey')
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

      toast.success('Journey deleted')
      router.push('/admin/journeys')
      router.refresh()
    } catch (err) {
      console.error('Error deleting journey:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete journey')
      toast.error(err instanceof Error ? err.message : 'Failed to delete journey')
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
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Customer Onboarding Journey"
          />
        </FormFieldWithAI>

        <div>
          <Label htmlFor="slug" className="block mb-1">Slug *</Label>
          <Input
            type="text"
            id="slug"
            value={formData.slug}
            onChange={(e) =>
              setFormData({
                ...formData,
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
              })
            }
            className="font-mono text-sm"
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
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
        <Textarea
          value={formData.goal}
          onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
          rows={2}
          placeholder="e.g., Successfully set up their account and understand key features"
        />
      </FormFieldWithAI>

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
  )

  // ============================================================================
  // Links tab
  // ============================================================================

  const linksTab = (
    <div className="space-y-6">
      {journey?.id ? (
        <RelationshipManager
          entity={{ type: 'user_journey', id: journey.id }}
          slots={JOURNEY_SLOTS}
        />
      ) : (
        <RelationshipManager
          entity={{ type: 'user_journey' }}
          slots={JOURNEY_SLOTS}
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
        <h3 className="text-sm font-semibold">Relationships</h3>
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
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Journey Type</h3>
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
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Status</h3>
        <div>
          <Label htmlFor="status" className="block mb-1 text-xs text-muted-foreground">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData({ ...formData, status: v })}
          >
            <SelectTrigger id="status" className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="validation_status" className="block mb-1 text-xs text-muted-foreground">Validation Status</Label>
          <Select
            value={formData.validation_status}
            onValueChange={(v) => setFormData({ ...formData, validation_status: v })}
          >
            <SelectTrigger id="validation_status" className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {validationStatuses.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Details</h3>
        <div>
          <Label htmlFor="duration_estimate" className="block mb-1 text-xs text-muted-foreground">Duration Estimate</Label>
          <Input
            type="text"
            id="duration_estimate"
            value={formData.duration_estimate}
            onChange={(e) => setFormData({ ...formData, duration_estimate: e.target.value })}
            placeholder="e.g., 2-3 weeks"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <FormFieldWithAI
          label="Tags"
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
          description="Comma-separated tags"
        >
          <Input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="onboarding, b2b, mobile"
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
      title={journey ? formData.name || 'Untitled' : 'New Journey'}
      subtitle={journey ? formData.slug : undefined}
      status={{ label: statusLabel, variant: statusVariant as 'default' | 'secondary' | 'outline' }}
      backHref="/admin/journeys"
      backLabel="Journeys"
      controlCluster={
        <EntityControlCluster
          isDirty={isDirty}
          isSaving={saving}
          onSave={() => handleSubmit()}
          onCancel={() => router.push('/admin/journeys')}
          saveLabel={journey ? 'Save' : 'Create'}
          links={journey ? [
            { label: 'Canvas', href: `/admin/journeys/${journey.id}`, icon: <ExternalLink className="size-4" /> },
          ] : undefined}
          onDelete={journey ? handleDelete : undefined}
        />
      }
      tabs={tabs}
      metadata={metadataPanel}
      isDirty={isDirty}
      isSaving={saving}
      onSave={() => handleSubmit()}
      onCancel={() => router.push('/admin/journeys')}
      onSubmit={handleSubmit}
    />
  )
}
