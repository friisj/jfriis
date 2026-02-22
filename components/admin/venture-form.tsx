'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { MdxEditor } from '@/components/forms/mdx-editor'
import { FormFieldWithAI } from '@/components/forms'
import { AdminEntityLayout } from '@/components/admin/admin-entity-layout'
import { EntityControlCluster } from '@/components/admin/entity-control-cluster'
import { RelationshipManager, type RelationshipSlot } from '@/components/admin/relationship-manager'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExternalLink } from 'lucide-react'

// ============================================================================
// Relationship slots for ventures
// ============================================================================

const VENTURE_SLOTS: RelationshipSlot[] = [
  {
    targetType: 'specimen',
    linkType: 'contains',
    label: 'Specimens',
    group: 'Portfolio',
    displayField: 'title',
    editHref: (id) => `/admin/specimens/${id}/edit`,
    ordered: true,
  },
  {
    targetType: 'log_entry',
    linkType: 'related',
    label: 'Log Entries',
    group: 'Documentation',
    displayField: 'title',
    direction: 'inbound',
    editHref: (id) => `/admin/log/${id}/edit`,
  },
  {
    targetType: 'studio_project',
    linkType: 'related',
    label: 'Studio Projects',
    group: 'R&D',
    displayField: 'name',
    editHref: (id) => `/admin/studio/${id}/edit`,
  },
  {
    targetType: 'business_model_canvas',
    linkType: 'related',
    label: 'Business Models',
    group: 'Strategic Context',
    displayField: 'name',
    editHref: (id) => `/admin/canvases/business-model/${id}/edit`,
  },
  {
    targetType: 'customer_profile',
    linkType: 'related',
    label: 'Customer Profiles',
    group: 'Strategic Context',
    displayField: 'name',
    editHref: (id) => `/admin/canvases/customer-profiles/${id}/edit`,
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
    targetType: 'value_map',
    linkType: 'related',
    label: 'Value Maps',
    group: 'Strategic Context',
    displayField: 'name',
    editHref: (id) => `/admin/canvases/value-maps/${id}/edit`,
  },
  {
    targetType: 'user_journey',
    linkType: 'related',
    label: 'User Journeys',
    group: 'Journeys & Blueprints',
    displayField: 'name',
    editHref: (id) => `/admin/journeys/${id}/edit`,
  },
  {
    targetType: 'service_blueprint',
    linkType: 'related',
    label: 'Service Blueprints',
    group: 'Journeys & Blueprints',
    displayField: 'name',
    editHref: (id) => `/admin/blueprints/${id}/edit`,
  },
  {
    targetType: 'story_map',
    linkType: 'related',
    label: 'Story Maps',
    group: 'Development',
    displayField: 'name',
    editHref: (id) => `/admin/story-maps/${id}/edit`,
  },
]

// ============================================================================
// Component
// ============================================================================

interface VentureFormData {
  title: string
  slug: string
  description: string
  content: string
  status: string
  type: string
  start_date: string
  end_date: string
  published: boolean
  tags: string
}

interface VentureFormProps {
  ventureId?: string
  initialData?: Partial<VentureFormData>
}

export function VentureForm({ ventureId, initialData }: VentureFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<VentureFormData>({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    content: initialData?.content || '',
    status: initialData?.status || 'draft',
    type: initialData?.type || '',
    start_date: initialData?.start_date || '',
    end_date: initialData?.end_date || '',
    published: initialData?.published || false,
    tags: initialData?.tags || '',
  })

  // Track dirty state
  const [initialFormData] = useState(formData)
  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialFormData),
    [formData, initialFormData]
  )

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleTitleChange = (value: string) => {
    if (!ventureId && !formData.slug) {
      setFormData({ ...formData, title: value, slug: generateSlug(value) })
    } else {
      setFormData({ ...formData, title: value })
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (!/^[a-z0-9-]+$/.test(formData.slug)) {
        throw new Error('Slug can only contain lowercase letters, numbers, and hyphens')
      }

      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)

      const ventureData = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        content: { markdown: formData.content },
        status: formData.status,
        type: formData.type || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        published: formData.published,
        tags: tagsArray.length > 0 ? tagsArray : null,
        ...(formData.published && !initialData?.published ? { published_at: new Date().toISOString() } : {}),
      }

      if (ventureId) {
        const { error: updateError } = await supabase
          .from('ventures')
          .update(ventureData)
          .eq('id', ventureId)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('ventures')
          .insert([ventureData])
          .select('id')
          .single()
        if (insertError) throw insertError
      }

      // Relationships are handled by RelationshipManager — no sync needed here

      toast.success(ventureId ? 'Venture updated!' : 'Venture created!')
      router.push('/admin/ventures')
      router.refresh()
    } catch (err: any) {
      console.error('Error saving venture:', err)
      if (err.code === '23505' || err.message?.includes('duplicate key')) {
        setError(`The slug "${formData.slug}" is already in use.`)
        toast.error('Slug already in use')
      } else {
        setError(err.message || 'Failed to save venture')
        toast.error(err.message || 'Failed to save venture')
      }
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!ventureId) return
    setIsSubmitting(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('ventures')
        .delete()
        .eq('id', ventureId)
      if (deleteError) throw deleteError

      toast.success('Venture deleted')
      router.push('/admin/ventures')
      router.refresh()
    } catch (err: any) {
      console.error('Error deleting venture:', err)
      setError(err.message || 'Failed to delete venture')
      toast.error(err.message || 'Failed to delete venture')
      setIsSubmitting(false)
    }
  }

  // Status for badge
  const statusLabel = formData.status.charAt(0).toUpperCase() + formData.status.slice(1)
  const statusVariant = formData.status === 'active' ? 'default'
    : formData.status === 'completed' ? 'secondary'
    : 'outline'

  // ============================================================================
  // Tab content
  // ============================================================================

  const fieldsTab = (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/10 text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <FormFieldWithAI
        label="Title *"
        fieldName="title"
        entityType="ventures"
        context={{ status: formData.status, type: formData.type }}
        currentValue={formData.title}
        onGenerate={(content) => handleTitleChange(content)}
        disabled={isSubmitting}
      >
        <Input
          type="text"
          required
          value={formData.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="My Awesome Venture"
        />
      </FormFieldWithAI>

      <div>
        <Label htmlFor="slug" className="block mb-2">Slug *</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">/</span>
          <Input
            type="text"
            id="slug"
            required
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            className="flex-1"
            placeholder="my-awesome-venture"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Only lowercase letters, numbers, and hyphens.
        </p>
      </div>

      <FormFieldWithAI
        label="Description"
        fieldName="description"
        entityType="ventures"
        context={{ title: formData.title, status: formData.status, type: formData.type }}
        currentValue={formData.description}
        onGenerate={(content) => setFormData({ ...formData, description: content })}
        disabled={isSubmitting}
      >
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="resize-none"
          placeholder="A brief description of your venture..."
        />
      </FormFieldWithAI>

      <MdxEditor
        value={formData.content}
        onChange={(value) => setFormData({ ...formData, content: value })}
        placeholder="# Venture Details&#10;&#10;Write your venture content here in Markdown..."
        rows={16}
      />
    </div>
  )

  const linksTab = (
    <div className="space-y-6">
      {ventureId ? (
        <RelationshipManager
          entity={{ type: 'project', id: ventureId }}
          slots={VENTURE_SLOTS}
        />
      ) : (
        <p className="text-sm text-muted-foreground py-4">
          Save the venture first to link related entities.
        </p>
      )}
    </div>
  )

  // ============================================================================
  // Metadata panel
  // ============================================================================

  const metadataPanel = (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Settings</h3>

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
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="type" className="block mb-1 text-xs text-muted-foreground">Type</Label>
          <Input
            type="text"
            id="type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            placeholder="project, business..."
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="meta_published"
            checked={formData.published}
            onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
          />
          <Label htmlFor="meta_published" className="text-sm">Published</Label>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Dates</h3>

        <div>
          <Label htmlFor="start_date" className="block mb-1 text-xs text-muted-foreground">Start</Label>
          <Input
            type="date"
            id="start_date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="end_date" className="block mb-1 text-xs text-muted-foreground">End</Label>
          <Input
            type="date"
            id="end_date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <FormFieldWithAI
          label="Tags"
          fieldName="tags"
          entityType="ventures"
          context={{ title: formData.title, description: formData.description, type: formData.type }}
          currentValue={formData.tags}
          onGenerate={(content) => setFormData({ ...formData, tags: content })}
          disabled={isSubmitting}
          description="Comma-separated tags"
        >
          <Input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="react, typescript, design"
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
      title={ventureId ? formData.title || 'Untitled' : 'New Venture'}
      subtitle={ventureId ? formData.slug : undefined}
      status={{ label: statusLabel, variant: statusVariant as any }}
      backHref="/admin/ventures"
      backLabel="Ventures"
      controlCluster={
        <EntityControlCluster
          isDirty={isDirty}
          isSaving={isSubmitting}
          onSave={() => handleSubmit()}
          onCancel={() => router.push('/admin/ventures')}
          saveLabel={ventureId ? 'Save' : 'Create'}
          links={ventureId ? [
            { label: 'Portfolio', href: `/portfolio/${formData.slug}`, icon: <ExternalLink className="size-4" />, external: true },
          ] : undefined}
          onDelete={ventureId ? handleDelete : undefined}
        />
      }
      tabs={tabs}
      metadata={metadataPanel}
      isDirty={isDirty}
      isSaving={isSubmitting}
      onSave={() => handleSubmit()}
      onCancel={() => router.push('/admin/ventures')}
      onSubmit={handleSubmit}
    />
  )
}
