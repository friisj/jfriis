'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { MdxEditor } from '@/components/forms/mdx-editor'
import { FormFieldWithAI } from '@/components/forms'
import { EntityLinkField } from './entity-link-field'
import { DraftTabs } from './draft-tabs'
import { DraftGenerationControls, type GenerationMetadata } from './draft-generation-controls'
import { syncEntityLinks } from '@/lib/entity-links'
import {
  getDraftsForEntry,
  createDraft,
  updateDraft,
  setDraftAsPrimary,
  deleteDraft,
  createInitialDraft,
} from '@/app/actions/log-entry-drafts'
import type { PendingLink } from '@/lib/types/entity-relationships'
import type { LogEntryDraft } from '@/lib/types/database'

interface LogEntryFormData {
  title: string
  slug: string
  content: string
  entry_date: string
  type: string
  published: boolean
  tags: string
}

interface LogEntryFormProps {
  entryId?: string
  initialData?: Partial<LogEntryFormData>
}

export function LogEntryForm({ entryId, initialData }: LogEntryFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pending links for create mode (EntityLinkField handles edit mode internally)
  const [pendingSpecimenLinks, setPendingSpecimenLinks] = useState<PendingLink[]>([])
  const [pendingProjectLinks, setPendingProjectLinks] = useState<PendingLink[]>([])
  const [pendingAssumptionLinks, setPendingAssumptionLinks] = useState<PendingLink[]>([])

  // Draft state
  const [drafts, setDrafts] = useState<LogEntryDraft[]>([])
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [draftsLoading, setDraftsLoading] = useState(false)
  const [draftContentChanged, setDraftContentChanged] = useState(false)
  const contentBeforeEditRef = useRef<string>('')

  const [formData, setFormData] = useState<LogEntryFormData>({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    content: initialData?.content || '',
    entry_date: initialData?.entry_date || new Date().toISOString().split('T')[0],
    type: initialData?.type || '',
    published: initialData?.published || false,
    tags: initialData?.tags || '',
  })

  // Load drafts for existing entry
  useEffect(() => {
    if (entryId) {
      setDraftsLoading(true)
      getDraftsForEntry(entryId).then((result) => {
        if (result.success && result.data) {
          setDrafts(result.data)
          // Select primary draft, or first draft if no primary
          const primary = result.data.find((d) => d.is_primary)
          const selected = primary || result.data[0]
          if (selected) {
            setActiveDraftId(selected.id)
            setFormData((prev) => ({ ...prev, content: selected.content }))
            contentBeforeEditRef.current = selected.content
          }
        }
        setDraftsLoading(false)
      })
    }
  }, [entryId])

  // Track content changes
  const handleContentChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, content: value }))
    setDraftContentChanged(value !== contentBeforeEditRef.current)
  }, [])

  // Save current draft content to server (for edit mode)
  const saveDraftContent = useCallback(async () => {
    if (!entryId || !activeDraftId || !draftContentChanged) return

    const result = await updateDraft(activeDraftId, { content: formData.content })
    if (result.success && result.data) {
      setDrafts((prev) =>
        prev.map((d) => (d.id === activeDraftId ? result.data! : d))
      )
      setDraftContentChanged(false)
      contentBeforeEditRef.current = formData.content
    }
  }, [entryId, activeDraftId, draftContentChanged, formData.content])

  // Handle draft selection
  const handleSelectDraft = useCallback(async (draftId: string) => {
    // Save current draft first if changed
    if (draftContentChanged && activeDraftId) {
      await saveDraftContent()
    }

    const draft = drafts.find((d) => d.id === draftId)
    if (draft) {
      setActiveDraftId(draftId)
      setFormData((prev) => ({ ...prev, content: draft.content }))
      contentBeforeEditRef.current = draft.content
      setDraftContentChanged(false)
    }
  }, [draftContentChanged, activeDraftId, drafts, saveDraftContent])

  // Create new blank draft
  const handleCreateDraft = useCallback(async () => {
    if (!entryId) return

    // Save current draft first
    if (draftContentChanged && activeDraftId) {
      await saveDraftContent()
    }

    const result = await createDraft(entryId, '')
    if (result.success && result.data) {
      setDrafts((prev) => [...prev, result.data!])
      setActiveDraftId(result.data.id)
      setFormData((prev) => ({ ...prev, content: '' }))
      contentBeforeEditRef.current = ''
      setDraftContentChanged(false)
      toast.success('New draft created')
    } else {
      toast.error(result.error || 'Failed to create draft')
    }
  }, [entryId, draftContentChanged, activeDraftId, saveDraftContent])

  // Set draft as primary
  const handleSetPrimary = useCallback(async (draftId: string) => {
    const result = await setDraftAsPrimary(draftId)
    if (result.success) {
      setDrafts((prev) =>
        prev.map((d) => ({ ...d, is_primary: d.id === draftId }))
      )
      toast.success('Draft set as primary')
    } else {
      toast.error(result.error || 'Failed to set primary')
    }
  }, [])

  // Rename draft
  const handleRenameDraft = useCallback(async (draftId: string, label: string) => {
    const result = await updateDraft(draftId, { label })
    if (result.success && result.data) {
      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? result.data! : d))
      )
    } else {
      toast.error(result.error || 'Failed to rename draft')
    }
  }, [])

  // Delete draft
  const handleDeleteDraft = useCallback(async (draftId: string) => {
    const result = await deleteDraft(draftId)
    if (result.success) {
      setDrafts((prev) => prev.filter((d) => d.id !== draftId))
      // If deleted the active draft, switch to first remaining
      if (draftId === activeDraftId) {
        const remaining = drafts.filter((d) => d.id !== draftId)
        if (remaining.length > 0) {
          handleSelectDraft(remaining[0].id)
        }
      }
      toast.success('Draft deleted')
    } else {
      toast.error(result.error || 'Failed to delete draft')
    }
  }, [activeDraftId, drafts, handleSelectDraft])

  // Handle LLM generation result
  const handleGenerated = useCallback(async (
    content: string,
    asNewDraft: boolean,
    metadata: GenerationMetadata
  ) => {
    if (!entryId) {
      // Create mode - just update local content
      setFormData((prev) => ({ ...prev, content }))
      return
    }

    if (asNewDraft) {
      // Create new draft with generated content
      const result = await createDraft(entryId, content, {
        generationInstructions: metadata.instructions,
        generationModel: metadata.model,
        generationTemperature: metadata.temperature,
        generationMode: metadata.mode,
        sourceDraftId: activeDraftId || undefined,
      })
      if (result.success && result.data) {
        setDrafts((prev) => [...prev, result.data!])
        setActiveDraftId(result.data.id)
        setFormData((prev) => ({ ...prev, content }))
        contentBeforeEditRef.current = content
        setDraftContentChanged(false)
        toast.success('Generated as new draft')
      }
    } else {
      // Update current draft with generated content
      if (activeDraftId) {
        const result = await updateDraft(activeDraftId, {
          content,
          generationInstructions: metadata.instructions,
          generationModel: metadata.model,
          generationTemperature: metadata.temperature,
          generationMode: metadata.mode,
        })
        if (result.success && result.data) {
          setDrafts((prev) =>
            prev.map((d) => (d.id === activeDraftId ? result.data! : d))
          )
          setFormData((prev) => ({ ...prev, content }))
          contentBeforeEditRef.current = content
          setDraftContentChanged(false)
        }
      }
    }
  }, [entryId, activeDraftId])

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleTitleChange = (value: string) => {
    setFormData({ ...formData, title: value })
    if (!entryId && !formData.slug) {
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

      const entryData = {
        title: formData.title,
        slug: formData.slug,
        content: { markdown: formData.content },
        entry_date: formData.entry_date,
        type: formData.type || null,
        published: formData.published,
        tags: tagsArray.length > 0 ? tagsArray : null,
        ...(formData.published && !initialData?.published ? { published_at: new Date().toISOString() } : {}),
      }

      if (entryId) {
        // Update existing entry
        // Save current draft content first
        if (activeDraftId && draftContentChanged) {
          await updateDraft(activeDraftId, { content: formData.content })
        }

        const { error: updateError } = await supabase
          .from('log_entries')
          .update(entryData)
          .eq('id', entryId)

        if (updateError) throw updateError
      } else {
        // Create new entry
        const { data: newEntry, error: insertError } = await supabase
          .from('log_entries')
          .insert([entryData])
          .select('id')
          .single()

        if (insertError) throw insertError

        // Create initial draft for the new entry
        await createInitialDraft(newEntry.id, formData.content)

        // Sync pending entity links for create mode
        const entityRef = { type: 'log_entry' as const, id: newEntry.id }

        if (pendingSpecimenLinks.length > 0) {
          await syncEntityLinks(entityRef, 'specimen', 'contains', pendingSpecimenLinks.map(l => l.targetId))
        }
        if (pendingProjectLinks.length > 0) {
          await syncEntityLinks(entityRef, 'project', 'related', pendingProjectLinks.map(l => l.targetId))
        }
        if (pendingAssumptionLinks.length > 0) {
          await syncEntityLinks(entityRef, 'assumption', 'related', pendingAssumptionLinks.map(l => l.targetId))
        }
      }

      toast.success(entryId ? 'Log entry updated successfully!' : 'Log entry created successfully!')
      router.push('/admin/log')
      router.refresh()
    } catch (err: any) {
      console.error('Error saving log entry:', err)
      // Provide user-friendly error for duplicate slug
      if (err.code === '23505' || err.message?.includes('duplicate key')) {
        setError(`The slug "${formData.slug}" is already in use. Please choose a different one.`)
        toast.error('Slug already in use')
      } else {
        setError(err.message || 'Failed to save log entry')
        toast.error(err.message || 'Failed to save log entry')
      }
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push('/admin/log')
  }

  const handleDelete = async () => {
    if (!entryId) return

    const confirmed = confirm('Are you sure you want to delete this log entry? This action cannot be undone.')
    if (!confirmed) return

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('log_entries')
        .delete()
        .eq('id', entryId)

      if (deleteError) throw deleteError

      toast.success('Log entry deleted successfully')
      router.push('/admin/log')
      router.refresh()
    } catch (err: any) {
      console.error('Error deleting log entry:', err)
      setError(err.message || 'Failed to delete log entry')
      toast.error(err.message || 'Failed to delete log entry')
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
            entityType="log_entries"
            context={{
              type: formData.type,
              entry_date: formData.entry_date,
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
              placeholder="Today's experiment with..."
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
                placeholder="todays-experiment"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Only lowercase letters, numbers, and hyphens. Will be used in the URL.
            </p>
          </div>

          {/* Drafts Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Content</label>
              <DraftGenerationControls
                currentContent={formData.content}
                context={{
                  title: formData.title,
                  type: formData.type || undefined,
                  tags: formData.tags
                    ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
                    : undefined,
                }}
                onGenerated={handleGenerated}
                disabled={isSubmitting || draftsLoading}
              />
            </div>

            {/* Draft tabs (only show in edit mode with drafts) */}
            {entryId && drafts.length > 0 && (
              <DraftTabs
                drafts={drafts}
                activeDraftId={activeDraftId}
                onSelectDraft={handleSelectDraft}
                onCreateDraft={handleCreateDraft}
                onSetPrimary={handleSetPrimary}
                onRenameDraft={handleRenameDraft}
                onDeleteDraft={handleDeleteDraft}
                disabled={isSubmitting || draftsLoading}
              />
            )}

            {draftsLoading ? (
              <div className="h-[400px] flex items-center justify-center border rounded-lg bg-muted/20">
                <span className="text-muted-foreground">Loading drafts...</span>
              </div>
            ) : (
              <MdxEditor
                value={formData.content}
                onChange={handleContentChange}
                placeholder="# What I learned today&#10;&#10;Write your log entry content here in Markdown...&#10;&#10;Embed specimens: <Specimen id=&quot;simple-card&quot; />"
                rows={20}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <h3 className="font-medium">Settings</h3>

            <div>
              <label htmlFor="entry_date" className="block text-sm font-medium mb-2">
                Entry Date *
              </label>
              <input
                type="date"
                id="entry_date"
                required
                value={formData.entry_date}
                onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
              />
            </div>

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
                <option value="experiment">Experiment</option>
                <option value="idea">Idea</option>
                <option value="research">Research</option>
                <option value="update">Update</option>
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
                Make this entry visible to the public
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-4">
            <FormFieldWithAI
              label="Tags"
              fieldName="tags"
              entityType="log_entries"
              context={{
                title: formData.title,
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
                placeholder="learning, coding, design"
              />
            </FormFieldWithAI>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <EntityLinkField
              label="Link Specimens"
              sourceType="log_entry"
              sourceId={entryId}
              targetType="specimen"
              targetTableName="specimens"
              targetDisplayField="name"
              linkType="contains"
              allowMultiple={true}
              pendingLinks={pendingSpecimenLinks}
              onPendingLinksChange={setPendingSpecimenLinks}
              helperText="Select specimens to showcase in this log entry"
            />
          </div>

          <div className="rounded-lg border bg-card p-4">
            <EntityLinkField
              label="Link Projects"
              sourceType="log_entry"
              sourceId={entryId}
              targetType="project"
              targetTableName="projects"
              targetDisplayField="name"
              linkType="related"
              allowMultiple={true}
              pendingLinks={pendingProjectLinks}
              onPendingLinksChange={setPendingProjectLinks}
              helperText="Link related projects to this log entry"
            />
          </div>

          <div className="rounded-lg border bg-card p-4">
            <EntityLinkField
              label="Related Assumptions"
              sourceType="log_entry"
              sourceId={entryId}
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
            {isSubmitting ? 'Saving...' : entryId ? 'Update Entry' : 'Create Entry'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>

        {entryId && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors disabled:opacity-50"
          >
            Delete Entry
          </button>
        )}
      </div>
    </form>
  )
}
