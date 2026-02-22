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

const STORY_MAP_SLOTS: RelationshipSlot[] = [
  {
    targetType: 'touchpoint',
    linkType: 'expands',
    label: 'Touchpoint',
    group: 'Journeys',
    displayField: 'name',
    allowMultiple: false,
  },
]

// ============================================================================
// Types & Constants
// ============================================================================

interface StoryMap {
  id: string
  slug: string
  name: string
  description?: string | null
  status: string
  validation_status: string
  map_type: string
  tags: string[]
  studio_project_id?: string | null
  hypothesis_id?: string | null
}

interface StoryMapFormProps {
  storyMap?: StoryMap
}

const mapTypes = [
  { value: 'feature', label: 'Feature', description: 'Feature-focused story map' },
  { value: 'product', label: 'Product', description: 'Full product scope' },
  { value: 'release', label: 'Release', description: 'Release planning map' },
  { value: 'discovery', label: 'Discovery', description: 'Discovery and research' },
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

export function StoryMapForm({ storyMap }: StoryMapFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [relatedContext, setRelatedContext] = useState<Record<string, unknown>>({})
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([])

  const [formData, setFormData] = useState({
    slug: storyMap?.slug || '',
    name: storyMap?.name || '',
    description: storyMap?.description || '',
    map_type: storyMap?.map_type || 'feature',
    status: storyMap?.status || 'draft',
    validation_status: storyMap?.validation_status || 'untested',
    studio_project_id: storyMap?.studio_project_id || '',
    hypothesis_id: storyMap?.hypothesis_id || '',
    tags: storyMap?.tags?.join(', ') || '',
  })

  // Track dirty state
  const [initialFormData] = useState(formData)
  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialFormData),
    [formData, initialFormData]
  )

  // Auto-generate slug from name
  useEffect(() => {
    if (!storyMap?.slug && formData.name) {
      const slug = formData.name
        .toLowerCase()
        .slice(0, 50)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      setFormData((prev) => ({ ...prev, slug }))
    }
  }, [formData.name, storyMap?.slug])

  // Fetch related entity data for AI context
  useEffect(() => {
    buildEntityContext('story_maps', formData).then(setRelatedContext)
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
        map_type: formData.map_type,
        status: formData.status,
        validation_status: formData.validation_status,
        studio_project_id: formData.studio_project_id || null,
        hypothesis_id: formData.hypothesis_id || null,
        tags,
      }

      if (storyMap?.id) {
        // Check slug uniqueness on update
        if (formData.slug !== storyMap.slug) {
          let query = supabase
            .from('story_maps')
            .select('id')
            .eq('slug', formData.slug)
            .neq('id', storyMap.id)

          if (formData.studio_project_id) {
            query = query.eq('studio_project_id', formData.studio_project_id)
          } else {
            query = query.is('studio_project_id', null)
          }

          const { data: existing } = await query.maybeSingle()
          if (existing) {
            throw new Error(`A story map with slug "${formData.slug}" already exists in this project.`)
          }
        }

        const { error: updateError } = await supabase
          .from('story_maps')
          .update(data)
          .eq('id', storyMap.id)

        if (updateError) throw updateError
      } else {
        // Check slug uniqueness on create
        let query = supabase
          .from('story_maps')
          .select('id')
          .eq('slug', formData.slug)

        if (formData.studio_project_id) {
          query = query.eq('studio_project_id', formData.studio_project_id)
        } else {
          query = query.is('studio_project_id', null)
        }

        const { data: existing } = await query.maybeSingle()
        if (existing) {
          throw new Error(`A story map with slug "${formData.slug}" already exists in this project.`)
        }

        const { data: created, error: insertError } = await supabase
          .from('story_maps')
          .insert(data)
          .select()
          .single()

        if (insertError) throw insertError

        // Sync pending entity links for create mode
        if (pendingLinks.length > 0) {
          const sourceRef = { type: 'story_map' as const, id: created.id }
          await syncEntityLinks(sourceRef, 'touchpoint', 'expands', pendingLinks.map(l => l.targetId))
        }
      }

      toast.success(storyMap ? 'Story map updated!' : 'Story map created!')
      router.push('/admin/story-maps')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      const code = (err as { code?: string })?.code
      if (message.includes('duplicate key') || code === '23505') {
        setError('A story map with this slug already exists.')
      } else if (message.includes('not authenticated') || code === 'PGRST301') {
        setError('You must be logged in to save story maps.')
      } else if (message.includes('permission denied') || message.includes('policy')) {
        setError('You do not have permission to modify story maps.')
      } else {
        setError(message || 'Failed to save story map.')
      }
      toast.error(message || 'Failed to save story map.')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!storyMap?.id) return

    setSaving(true)
    try {
      const { error: deleteError } = await supabase
        .from('story_maps')
        .delete()
        .eq('id', storyMap.id)

      if (deleteError) throw deleteError

      toast.success('Story map deleted')
      router.push('/admin/story-maps')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete story map.'
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
        entityType="story_maps"
        context={getAIContext({
          map_type: formData.map_type,
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
          placeholder="e.g., Checkout Feature Map"
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
          placeholder="checkout-feature-map"
        />
        <p className="mt-1 text-xs text-muted-foreground">URL-friendly identifier</p>
      </div>

      <FormFieldWithAI
        label="Description"
        fieldName="description"
        entityType="story_maps"
        context={getAIContext({
          name: formData.name,
          map_type: formData.map_type,
        })}
        currentValue={formData.description}
        onGenerate={(content) => setFormData((prev) => ({ ...prev, description: content }))}
        disabled={saving}
      >
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          rows={3}
          placeholder="What does this story map cover?"
        />
      </FormFieldWithAI>

      <div>
        <Label htmlFor="map_type" className="block mb-1">Map Type</Label>
        <Select
          value={formData.map_type}
          onValueChange={(v) => setFormData((prev) => ({ ...prev, map_type: v }))}
        >
          <SelectTrigger id="map_type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mapTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label} - {type.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  // ============================================================================
  // Links tab
  // ============================================================================

  const linksTab = (
    <div className="space-y-6">
      {storyMap?.id ? (
        <RelationshipManager
          entity={{ type: 'story_map', id: storyMap.id }}
          slots={STORY_MAP_SLOTS}
        />
      ) : (
        <RelationshipManager
          entity={{ type: 'story_map' }}
          slots={STORY_MAP_SLOTS}
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
          entityType="story_maps"
          context={getAIContext({
            name: formData.name,
            description: formData.description,
            map_type: formData.map_type,
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
            placeholder="mvp, checkout, sprint-1"
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
      title={storyMap ? formData.name || 'Untitled' : 'New Story Map'}
      subtitle={storyMap ? formData.slug : undefined}
      status={{ label: statusLabel, variant: statusVariant as 'default' | 'secondary' | 'outline' }}
      backHref="/admin/story-maps"
      backLabel="Story Maps"
      controlCluster={
        <EntityControlCluster
          isDirty={isDirty}
          isSaving={saving}
          onSave={() => handleSubmit()}
          onCancel={() => router.push('/admin/story-maps')}
          saveLabel={storyMap ? 'Save' : 'Create'}
          links={storyMap ? [
            { label: 'Canvas', href: `/admin/story-maps/${storyMap.id}/canvas`, icon: <ExternalLink className="size-4" /> },
          ] : undefined}
          onDelete={storyMap ? handleDelete : undefined}
          deleteConfirmMessage="Are you sure you want to delete this story map? This will also delete all activities and stories."
        />
      }
      tabs={tabs}
      metadata={metadataPanel}
      isDirty={isDirty}
      isSaving={saving}
      onSave={() => handleSubmit()}
      onCancel={() => router.push('/admin/story-maps')}
      onSubmit={handleSubmit}
    />
  )
}
