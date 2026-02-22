'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAllSpecimens, type SpecimenMetadata } from '@/components/specimens/registry'
import { toast } from 'sonner'
import { FormFieldWithAI } from '@/components/forms'
import { AdminEntityLayout } from '@/components/admin/admin-entity-layout'
import { EntityControlCluster } from '@/components/admin/entity-control-cluster'
import { RelationshipManager, type RelationshipSlot } from '@/components/admin/relationship-manager'
import { syncEntityLinks, syncEntityLinksAsTarget } from '@/lib/entity-links'
import type { PendingLink } from '@/lib/types/entity-relationships'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ExternalLink } from 'lucide-react'

// ============================================================================
// Relationship slots
// ============================================================================

const SPECIMEN_SLOTS: RelationshipSlot[] = [
  {
    targetType: 'project',
    linkType: 'contains',
    label: 'Projects',
    group: 'Portfolio',
    displayField: 'name',
    direction: 'inbound',
    editHref: (id) => `/admin/ventures/${id}/edit`,
  },
  {
    targetType: 'log_entry',
    linkType: 'contains',
    label: 'Log Entries',
    group: 'Documentation',
    displayField: 'title',
    direction: 'inbound',
    editHref: (id) => `/admin/log/${id}/edit`,
  },
  {
    targetType: 'assumption',
    linkType: 'related',
    label: 'Assumptions',
    group: 'Validation',
    displayField: 'statement',
    editHref: (id) => `/admin/assumptions/${id}/edit`,
  },
]

// ============================================================================
// Types
// ============================================================================

interface SpecimenFormData {
  title: string
  slug: string
  description: string
  component_id: string
  type: string
  published: boolean
  tags: string
}

interface SpecimenFormProps {
  specimenId?: string
  initialData?: Partial<SpecimenFormData>
}

// ============================================================================
// Component
// ============================================================================

export function SpecimenForm({ specimenId, initialData }: SpecimenFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableSpecimens, setAvailableSpecimens] = useState<SpecimenMetadata[]>([])

  // Pending links for create mode
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([])

  const [formData, setFormData] = useState<SpecimenFormData>({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    component_id: initialData?.component_id || '',
    type: initialData?.type || '',
    published: initialData?.published || false,
    tags: initialData?.tags || '',
  })

  // Track dirty state
  const [initialFormData] = useState(formData)
  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialFormData),
    [formData, initialFormData]
  )

  useEffect(() => {
    setAvailableSpecimens(getAllSpecimens())
  }, [])

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleTitleChange = (value: string) => {
    if (!specimenId && !formData.slug) {
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

      const specimenData = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description || null,
        component_code: formData.component_id,
        type: formData.type || null,
        published: formData.published,
        tags: tagsArray.length > 0 ? tagsArray : null,
      }

      if (specimenId) {
        const { error: updateError } = await supabase
          .from('specimens')
          .update(specimenData)
          .eq('id', specimenId)

        if (updateError) throw updateError
      } else {
        const { data: newSpecimen, error: insertError } = await supabase
          .from('specimens')
          .insert([specimenData])
          .select('id')
          .single()

        if (insertError) throw insertError

        // Sync pending entity links for create mode
        // pendingLinks are handled by RelationshipManager — split by type
        const entityRef = { type: 'specimen' as const, id: newSpecimen.id }

        const assumptionLinks = pendingLinks.filter(l => l.linkType === 'related')
        const projectLinks = pendingLinks.filter(l => l.linkType === 'contains' && l.targetLabel) // inbound

        if (assumptionLinks.length > 0) {
          await syncEntityLinks(entityRef, 'assumption', 'related', assumptionLinks.map(l => l.targetId))
        }

        if (projectLinks.length > 0) {
          await syncEntityLinksAsTarget(entityRef, 'project', 'contains', projectLinks.map(l => l.targetId))
        }
      }

      toast.success(specimenId ? 'Specimen updated!' : 'Specimen created!')
      router.push('/admin/specimens')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save specimen'
      const code = (err as { code?: string })?.code
      console.error('Error saving specimen:', err)
      if (code === '23505' || message?.includes('duplicate key')) {
        setError(`The slug "${formData.slug}" is already in use.`)
        toast.error('Slug already in use')
      } else {
        setError(message)
        toast.error(message)
      }
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!specimenId) return

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('specimens')
        .delete()
        .eq('id', specimenId)

      if (deleteError) throw deleteError

      toast.success('Specimen deleted')
      router.push('/admin/specimens')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete specimen'
      console.error('Error deleting specimen:', err)
      setError(message)
      toast.error(message)
      setIsSubmitting(false)
    }
  }

  // Status badge
  const statusLabel = formData.published ? 'Published' : 'Draft'
  const statusVariant = formData.published ? 'default' : 'outline'

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
        label="Title *"
        fieldName="title"
        entityType="specimens"
        context={{
          type: formData.type,
          component_id: formData.component_id,
        }}
        currentValue={formData.title}
        onGenerate={(content) => handleTitleChange(content)}
        disabled={isSubmitting}
      >
        <Input
          type="text"
          required
          value={formData.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Animated Card Component"
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
            placeholder="animated-card"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Only lowercase letters, numbers, and hyphens
        </p>
      </div>

      <div>
        <Label htmlFor="component_id" className="block mb-2">Component *</Label>
        <Select
          value={formData.component_id || '__none__'}
          onValueChange={(v) => {
            const value = v === '__none__' ? '' : v
            const selectedSpecimen = availableSpecimens.find(s => s.id === value)
            setFormData({
              ...formData,
              component_id: value,
              description: formData.description || selectedSpecimen?.description || '',
              type: formData.type || selectedSpecimen?.category || '',
              tags: formData.tags || selectedSpecimen?.tags?.join(', ') || '',
            })
          }}
          required
        >
          <SelectTrigger id="component_id" className="w-full">
            <SelectValue placeholder="Select a component..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Select a component...</SelectItem>
            {availableSpecimens.map((specimen) => (
              <SelectItem key={specimen.id} value={specimen.id}>
                {specimen.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Components are defined in <code className="px-1 py-0.5 bg-muted rounded text-xs">components/specimens/</code>
        </p>
      </div>

      <FormFieldWithAI
        label="Description"
        fieldName="description"
        entityType="specimens"
        context={{
          title: formData.title,
          type: formData.type,
          component_id: formData.component_id,
        }}
        currentValue={formData.description}
        onGenerate={(content) => setFormData({ ...formData, description: content })}
        disabled={isSubmitting}
        description="Auto-filled from registry, but you can customize it"
      >
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          className="resize-none"
          placeholder="A brief description of this component..."
        />
      </FormFieldWithAI>
    </div>
  )

  // ============================================================================
  // Links tab
  // ============================================================================

  const linksTab = (
    <div className="space-y-6">
      {specimenId ? (
        <RelationshipManager
          entity={{ type: 'specimen', id: specimenId }}
          slots={SPECIMEN_SLOTS}
        />
      ) : (
        <RelationshipManager
          entity={{ type: 'specimen' }}
          slots={SPECIMEN_SLOTS}
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
        <h3 className="text-sm font-semibold">Settings</h3>

        <div>
          <Label htmlFor="type" className="block mb-1 text-xs text-muted-foreground">Type</Label>
          <Select
            value={formData.type || '__none__'}
            onValueChange={(v) => setFormData({ ...formData, type: v === '__none__' ? '' : v })}
          >
            <SelectTrigger id="type" className="w-full" size="sm">
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select type...</SelectItem>
              <SelectItem value="ui-component">UI Component</SelectItem>
              <SelectItem value="interactive">Interactive</SelectItem>
              <SelectItem value="visual">Visual</SelectItem>
              <SelectItem value="animation">Animation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="published"
            checked={formData.published}
            onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
          />
          <Label htmlFor="published" className="text-sm">Published</Label>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <FormFieldWithAI
          label="Tags"
          fieldName="tags"
          entityType="specimens"
          context={{
            title: formData.title,
            description: formData.description,
            type: formData.type,
          }}
          currentValue={formData.tags}
          onGenerate={(content) => setFormData({ ...formData, tags: content })}
          disabled={isSubmitting}
          description="Comma-separated tags"
        >
          <Input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="react, animation, ui"
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
      title={specimenId ? formData.title || 'Untitled' : 'New Specimen'}
      subtitle={specimenId ? formData.slug : undefined}
      status={{ label: statusLabel, variant: statusVariant as 'default' | 'outline' }}
      backHref="/admin/specimens"
      backLabel="Specimens"
      controlCluster={
        <EntityControlCluster
          isDirty={isDirty}
          isSaving={isSubmitting}
          onSave={() => handleSubmit()}
          onCancel={() => router.push('/admin/specimens')}
          saveLabel={specimenId ? 'Save' : 'Create'}
          links={specimenId ? [
            { label: 'Gallery', href: `/gallery/${formData.slug}`, icon: <ExternalLink className="size-4" />, external: true },
          ] : undefined}
          onDelete={specimenId ? handleDelete : undefined}
        />
      }
      tabs={tabs}
      metadata={metadataPanel}
      isDirty={isDirty}
      isSaving={isSubmitting}
      onSave={() => handleSubmit()}
      onCancel={() => router.push('/admin/specimens')}
      onSubmit={handleSubmit}
    />
  )
}
