'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAllSpecimens, type SpecimenMetadata } from '@/components/specimens/registry'
import { toast } from 'sonner'
import { RelationshipSelector } from './relationship-selector'
import { FormFieldWithAI } from '@/components/forms'
import { EntityLinkField } from './entity-link-field'
import { syncEntityLinks } from '@/lib/entity-links'
import type { PendingLink } from '@/lib/types/entity-relationships'

interface SpecimenFormData {
  title: string
  slug: string
  description: string
  component_id: string
  type: string
  published: boolean
  tags: string
  projectIds: string[]
  logEntryIds: string[]
}

interface SpecimenFormProps {
  specimenId?: string
  initialData?: Partial<SpecimenFormData>
}

export function SpecimenForm({ specimenId, initialData }: SpecimenFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableSpecimens, setAvailableSpecimens] = useState<SpecimenMetadata[]>([])
  const [pendingAssumptionLinks, setPendingAssumptionLinks] = useState<PendingLink[]>([])

  const [formData, setFormData] = useState<SpecimenFormData>({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    component_id: initialData?.component_id || '',
    type: initialData?.type || '',
    published: initialData?.published || false,
    tags: initialData?.tags || '',
    projectIds: initialData?.projectIds || [],
    logEntryIds: initialData?.logEntryIds || [],
  })

  useEffect(() => {
    // Load available specimens from registry
    setAvailableSpecimens(getAllSpecimens())
  }, [])

  // Load existing relationships
  useEffect(() => {
    if (specimenId) {
      loadRelationships()
    }
  }, [specimenId])

  const loadRelationships = async () => {
    if (!specimenId) return

    // Load project relationships
    const { data: projects } = await supabase
      .from('project_specimens')
      .select('project_id')
      .eq('specimen_id', specimenId)

    // Load log entry relationships
    const { data: logEntries } = await supabase
      .from('log_entry_specimens')
      .select('log_entry_id')
      .eq('specimen_id', specimenId)

    setFormData(prev => ({
      ...prev,
      projectIds: projects?.map(r => r.project_id) || [],
      logEntryIds: logEntries?.map(r => r.log_entry_id) || [],
    }))
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleTitleChange = (value: string) => {
    setFormData({ ...formData, title: value })
    if (!specimenId && !formData.slug) {
      setFormData({ ...formData, title: value, slug: generateSlug(value) })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Validate slug format
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
        component_code: formData.component_id, // Store component ID in component_code field
        type: formData.type || null,
        published: formData.published,
        tags: tagsArray.length > 0 ? tagsArray : null,
      }

      let savedSpecimenId = specimenId

      if (specimenId) {
        // Update existing specimen
        const { error: updateError } = await supabase
          .from('specimens')
          .update(specimenData)
          .eq('id', specimenId)

        if (updateError) throw updateError
      } else {
        // Create new specimen
        const { data: newSpecimen, error: insertError } = await supabase
          .from('specimens')
          .insert([specimenData])
          .select('id')
          .single()

        if (insertError) throw insertError
        savedSpecimenId = newSpecimen.id

        // Sync pending entity links for create mode
        if (pendingAssumptionLinks.length > 0) {
          await syncEntityLinks(
            { type: 'specimen', id: newSpecimen.id },
            'assumption',
            'related',
            pendingAssumptionLinks.map(l => l.targetId)
          )
        }
      }

      // Update relationships
      if (savedSpecimenId) {
        // Delete existing project relationships
        await supabase
          .from('project_specimens')
          .delete()
          .eq('specimen_id', savedSpecimenId)

        // Insert new project relationships
        if (formData.projectIds.length > 0) {
          const projectRelations = formData.projectIds.map((projectId, index) => ({
            project_id: projectId,
            specimen_id: savedSpecimenId,
            position: index
          }))

          const { error: projectError } = await supabase
            .from('project_specimens')
            .insert(projectRelations)

          if (projectError) throw projectError
        }

        // Delete existing log entry relationships
        await supabase
          .from('log_entry_specimens')
          .delete()
          .eq('specimen_id', savedSpecimenId)

        // Insert new log entry relationships
        if (formData.logEntryIds.length > 0) {
          const logEntryRelations = formData.logEntryIds.map((logEntryId, index) => ({
            log_entry_id: logEntryId,
            specimen_id: savedSpecimenId,
            position: index
          }))

          const { error: logEntryError } = await supabase
            .from('log_entry_specimens')
            .insert(logEntryRelations)

          if (logEntryError) throw logEntryError
        }
      }

      toast.success(specimenId ? 'Specimen updated successfully!' : 'Specimen created successfully!')
      router.push('/admin/specimens')
      router.refresh()
    } catch (err: any) {
      console.error('Error saving specimen:', err)
      // Provide user-friendly error for duplicate slug
      if (err.code === '23505' || err.message?.includes('duplicate key')) {
        setError(`The slug "${formData.slug}" is already in use. Please choose a different one.`)
        toast.error('Slug already in use')
      } else {
        setError(err.message || 'Failed to save specimen')
        toast.error(err.message || 'Failed to save specimen')
      }
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push('/admin/specimens')
  }

  const handleDelete = async () => {
    if (!specimenId) return

    const confirmed = confirm('Are you sure you want to delete this specimen? This action cannot be undone.')
    if (!confirmed) return

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('specimens')
        .delete()
        .eq('id', specimenId)

      if (deleteError) throw deleteError

      toast.success('Specimen deleted successfully')
      router.push('/admin/specimens')
      router.refresh()
    } catch (err: any) {
      console.error('Error deleting specimen:', err)
      setError(err.message || 'Failed to delete specimen')
      toast.error(err.message || 'Failed to delete specimen')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/10 text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
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
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background"
              placeholder="Animated Card Component"
            />
          </FormFieldWithAI>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-2">
              Slug *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/</span>
              <input
                type="text"
                id="slug"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                className="flex-1 px-3 py-2 rounded-lg border bg-background"
                placeholder="animated-card"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Only lowercase letters, numbers, and hyphens
            </p>
          </div>

          <div>
            <label htmlFor="component_id" className="block text-sm font-medium mb-2">
              Component *
            </label>
            <select
              id="component_id"
              required
              value={formData.component_id}
              onChange={(e) => {
                const selectedSpecimen = availableSpecimens.find(s => s.id === e.target.value)
                setFormData({
                  ...formData,
                  component_id: e.target.value,
                  description: formData.description || selectedSpecimen?.description || '',
                  type: formData.type || selectedSpecimen?.category || '',
                  tags: formData.tags || selectedSpecimen?.tags?.join(', ') || '',
                })
              }}
              className="w-full px-3 py-2 rounded-lg border bg-background"
            >
              <option value="">Select a component...</option>
              {availableSpecimens.map((specimen) => (
                <option key={specimen.id} value={specimen.id}>
                  {specimen.name}
                </option>
              ))}
            </select>
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
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border bg-background resize-none"
              placeholder="A brief description of this component..."
            />
          </FormFieldWithAI>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <h3 className="font-medium">Settings</h3>

            <div>
              <label htmlFor="type" className="block text-sm font-medium mb-2">
                Type
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
              >
                <option value="">Select type...</option>
                <option value="ui-component">UI Component</option>
                <option value="interactive">Interactive</option>
                <option value="visual">Visual</option>
                <option value="animation">Animation</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">Published</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Make this specimen visible to the public
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-4">
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
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
                placeholder="react, animation, ui"
              />
            </FormFieldWithAI>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <RelationshipSelector
              label="Link Projects"
              tableName="projects"
              selectedIds={formData.projectIds}
              onChange={(ids) => setFormData({ ...formData, projectIds: ids })}
              helperText="Select projects that use this specimen"
            />
          </div>

          <div className="rounded-lg border bg-card p-4">
            <RelationshipSelector
              label="Link Log Entries"
              tableName="log_entries"
              selectedIds={formData.logEntryIds}
              onChange={(ids) => setFormData({ ...formData, logEntryIds: ids })}
              helperText="Select log entries that feature this specimen"
            />
          </div>

          <div className="rounded-lg border bg-card p-4">
            <EntityLinkField
              label="Related Assumptions"
              sourceType="specimen"
              sourceId={specimenId}
              targetType="assumption"
              targetTableName="assumptions"
              targetDisplayField="title"
              linkType="related"
              allowMultiple={true}
              pendingLinks={pendingAssumptionLinks}
              onPendingLinksChange={setPendingAssumptionLinks}
              helperText="Link to related assumptions"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t">
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : specimenId ? 'Update Specimen' : 'Create Specimen'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>

        {specimenId && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors disabled:opacity-50"
          >
            Delete Specimen
          </button>
        )}
      </div>
    </form>
  )
}
