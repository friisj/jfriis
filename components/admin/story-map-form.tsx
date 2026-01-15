'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SidebarCard } from './sidebar-card'
import { FormActions } from './form-actions'
import { FormFieldWithAI } from '@/components/forms'
import { buildEntityContext } from '@/lib/ai-context'

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
  projects: { id: string; name: string }[]
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

export function StoryMapForm({ storyMap, projects }: StoryMapFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [relatedContext, setRelatedContext] = useState<Record<string, unknown>>({})

  const [formData, setFormData] = useState({
    slug: storyMap?.slug || '',
    name: storyMap?.name || '',
    description: storyMap?.description || '',
    map_type: storyMap?.map_type || 'feature',
    status: storyMap?.status || 'draft',
    validation_status: storyMap?.validation_status || 'untested',
    studio_project_id: storyMap?.studio_project_id || '',
    tags: storyMap?.tags?.join(', ') || '',
  })

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
        map_type: formData.map_type,
        status: formData.status,
        validation_status: formData.validation_status,
        studio_project_id: formData.studio_project_id || null,
        tags,
      }

      if (storyMap?.id) {
        // Check slug uniqueness on update (if slug changed)
        if (formData.slug !== storyMap.slug) {
          const { data: existing } = await supabase
            .from('story_maps')
            .select('id')
            .eq('slug', formData.slug)
            .eq('studio_project_id', formData.studio_project_id || null)
            .neq('id', storyMap.id)
            .maybeSingle()

          if (existing) {
            throw new Error(`A story map with slug "${formData.slug}" already exists in this project. Please use a different slug.`)
          }
        }

        const { error: updateError } = await supabase
          .from('story_maps')
          .update(data)
          .eq('id', storyMap.id)

        if (updateError) throw updateError
        router.push('/admin/story-maps')
      } else {
        // Check slug uniqueness on create
        const { data: existing } = await supabase
          .from('story_maps')
          .select('id')
          .eq('slug', formData.slug)
          .eq('studio_project_id', formData.studio_project_id || null)
          .maybeSingle()

        if (existing) {
          throw new Error(`A story map with slug "${formData.slug}" already exists in this project. Please use a different slug.`)
        }

        const { data: created, error: insertError } = await supabase
          .from('story_maps')
          .insert(data)
          .select()
          .single()

        if (insertError) throw insertError
        router.push(`/admin/story-maps/${created.id}/edit`)
      }
    } catch (err: any) {
      // Handle specific error types with actionable messages
      const message = err.message || ''
      if (message.includes('duplicate key') || err.code === '23505') {
        setError('A story map with this slug already exists. Please use a different slug.')
      } else if (message.includes('not authenticated') || err.code === 'PGRST301') {
        setError('You must be logged in to save story maps.')
      } else if (message.includes('permission denied') || message.includes('policy')) {
        setError('You do not have permission to modify story maps. Admin access required.')
      } else if (message.includes('network') || err.code === 'NETWORK_ERROR') {
        setError('Network error. Please check your connection and try again.')
      } else {
        setError(message || 'Failed to save story map. Please try again.')
      }
    } finally {
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
      router.push('/admin/story-maps')
    } catch (err: any) {
      const message = err.message || ''
      if (message.includes('permission denied') || message.includes('policy')) {
        setError('You do not have permission to delete story maps. Admin access required.')
      } else {
        setError(message || 'Failed to delete story map. Please try again.')
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
            entityType="story_maps"
            context={getAIContext({
              map_type: formData.map_type,
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
              placeholder="e.g., Checkout Feature Map"
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
              placeholder="checkout-feature-map"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              URL-friendly identifier
            </p>
          </div>

          {/* Description */}
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
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border rounded-md bg-background"
              placeholder="What does this story map cover?"
            />
          </FormFieldWithAI>

          {/* Map Type */}
          <div>
            <label htmlFor="map_type" className="block text-sm font-medium mb-1">
              Map Type
            </label>
            <select
              id="map_type"
              value={formData.map_type}
              onChange={(e) => setFormData((prev) => ({ ...prev, map_type: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              {mapTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
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
            description="Comma-separated tags for organization"
          >
            <input
              type="text"
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md bg-background"
              placeholder="mvp, checkout, sprint-1"
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
          </SidebarCard>

          <FormActions
            isSubmitting={saving}
            submitLabel={storyMap ? 'Save Changes' : 'Create Story Map'}
            onCancel={() => router.push('/admin/story-maps')}
            onDelete={storyMap ? handleDelete : undefined}
            deleteConfirmMessage="Are you sure you want to delete this story map? This will also delete all activities and stories. This action cannot be undone."
          />
        </div>
      </div>
    </form>
  )
}
