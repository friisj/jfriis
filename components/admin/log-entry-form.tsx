'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { MdxEditor } from '@/components/forms/mdx-editor'
import { FormFieldWithAI } from '@/components/forms'
import { AdminEntityLayout } from '@/components/admin/admin-entity-layout'
import { EntityControlCluster } from '@/components/admin/entity-control-cluster'
import { RelationshipManager, type RelationshipSlot } from '@/components/admin/relationship-manager'
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
import { Input } from '@/components/ui/input'
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
// Relationship slots for log entries
// ============================================================================

const LOG_ENTRY_SLOTS: RelationshipSlot[] = [
  {
    targetType: 'specimen',
    linkType: 'contains',
    label: 'Specimens',
    group: 'Content',
    displayField: 'title',
    editHref: (id) => `/admin/specimens/${id}/edit`,
    ordered: true,
  },
  {
    targetType: 'project',
    linkType: 'related',
    label: 'Projects',
    group: 'Context',
    displayField: 'name',
    editHref: (id) => `/admin/ventures/${id}/edit`,
  },
  {
    targetType: 'assumption',
    linkType: 'related',
    label: 'Assumptions',
    group: 'Context',
    displayField: 'title',
    editHref: (id) => `/admin/assumptions/${id}/edit`,
  },
]

// ============================================================================
// Types
// ============================================================================

interface LogEntryFormData {
  title: string
  slug: string
  content: string
  entry_date: string
  type: string
  published: boolean
  is_private: boolean
  tags: string
  idea_stage: string
}

interface LogEntryFormProps {
  entryId?: string
  initialData?: Partial<LogEntryFormData>
}

// ============================================================================
// Component
// ============================================================================

export function LogEntryForm({ entryId, initialData }: LogEntryFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pending links for create mode (RelationshipManager handles edit mode internally)
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([])

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
    is_private: initialData?.is_private || false,
    tags: initialData?.tags || '',
    idea_stage: (initialData as Record<string, string>)?.idea_stage || '',
  })

  // Track dirty state
  const [initialFormData] = useState(formData)
  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialFormData),
    [formData, initialFormData]
  )

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

  // Regenerate draft name via LLM
  const handleRegenerateName = useCallback(async (draftId: string) => {
    const draft = drafts.find((d) => d.id === draftId)
    if (!draft) return

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-draft-name',
          input: {
            content: draft.content,
            title: formData.title,
            type: formData.type || undefined,
          },
        }),
      })

      const result = await response.json()

      if (result.success && result.data?.name) {
        const updateResult = await updateDraft(draftId, { label: result.data.name })
        if (updateResult.success && updateResult.data) {
          setDrafts((prev) =>
            prev.map((d) => (d.id === draftId ? updateResult.data! : d))
          )
          toast.success('Draft name regenerated')
        }
      } else {
        toast.error('Failed to generate name')
      }
    } catch {
      toast.error('Failed to regenerate name')
    }
  }, [drafts, formData.title, formData.type])

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
        label: metadata.suggestedTitle,
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
          label: metadata.suggestedTitle,
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
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
        is_private: formData.is_private,
        tags: tagsArray.length > 0 ? tagsArray : null,
        idea_stage: formData.type === 'idea' ? (formData.idea_stage || 'captured') : null,
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

        // Group pending links by target type and link type, then sync
        const specimenLinks = pendingLinks.filter(l => l.linkType === 'contains')
        const projectLinks = pendingLinks.filter(
          l => l.linkType === 'related' && LOG_ENTRY_SLOTS.find(
            s => s.targetType === 'project' && s.linkType === l.linkType
          )
        )
        const assumptionLinks = pendingLinks.filter(
          l => l.linkType === 'related' && LOG_ENTRY_SLOTS.find(
            s => s.targetType === 'assumption' && s.linkType === l.linkType
          )
        )

        if (specimenLinks.length > 0) {
          await syncEntityLinks(entityRef, 'specimen', 'contains', specimenLinks.map(l => l.targetId))
        }
        if (projectLinks.length > 0) {
          await syncEntityLinks(entityRef, 'project', 'related', projectLinks.map(l => l.targetId))
        }
        if (assumptionLinks.length > 0) {
          await syncEntityLinks(entityRef, 'assumption', 'related', assumptionLinks.map(l => l.targetId))
        }
      }

      toast.success(entryId ? 'Log entry updated successfully!' : 'Log entry created successfully!')
      router.push('/admin/log')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save log entry'
      const code = (err as { code?: string })?.code
      console.error('Error saving log entry:', err)
      // Provide user-friendly error for duplicate slug
      if (code === '23505' || message?.includes('duplicate key')) {
        setError(`The slug "${formData.slug}" is already in use. Please choose a different one.`)
        toast.error('Slug already in use')
      } else {
        setError(message)
        toast.error(message)
      }
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!entryId) return

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete log entry'
      console.error('Error deleting log entry:', err)
      setError(message)
      toast.error(message)
      setIsSubmitting(false)
    }
  }

  // ============================================================================
  // Status badge
  // ============================================================================

  const getStatusConfig = () => {
    if (formData.published) {
      return { label: 'Published', variant: 'default' as const }
    }
    if (formData.is_private) {
      return { label: 'Private', variant: 'destructive' as const }
    }
    if (formData.type) {
      const typeLabel = formData.type.charAt(0).toUpperCase() + formData.type.slice(1)
      return { label: typeLabel, variant: 'secondary' as const }
    }
    return { label: 'Draft', variant: 'outline' as const }
  }

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
        entityType="log_entries"
        context={{
          type: formData.type,
          entry_date: formData.entry_date,
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
          placeholder="Today's experiment with..."
        />
      </FormFieldWithAI>

      <div>
        <Label htmlFor="slug" className="block mb-2">
          Slug *
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">/</span>
          <Input
            type="text"
            id="slug"
            required
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            className="flex-1"
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
          <Label className="block">Content</Label>
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
            onRegenerateName={handleRegenerateName}
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
  )

  // ============================================================================
  // Links tab
  // ============================================================================

  const linksTab = (
    <div className="space-y-6">
      {entryId ? (
        <RelationshipManager
          entity={{ type: 'log_entry', id: entryId }}
          slots={LOG_ENTRY_SLOTS}
        />
      ) : (
        <RelationshipManager
          entity={{ type: 'log_entry' }}
          slots={LOG_ENTRY_SLOTS}
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
          <Label htmlFor="entry_date" className="block mb-1 text-xs text-muted-foreground">
            Entry Date *
          </Label>
          <Input
            type="date"
            id="entry_date"
            required
            value={formData.entry_date}
            onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="type" className="block mb-1 text-xs text-muted-foreground">
            Type
          </Label>
          <Select
            value={formData.type || '__none__'}
            onValueChange={(v) => {
              const newType = v === '__none__' ? '' : v
              setFormData({
                ...formData,
                type: newType,
                idea_stage: newType === 'idea' && !formData.idea_stage ? 'captured' : formData.idea_stage,
              })
            }}
          >
            <SelectTrigger id="type" className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select type...</SelectItem>
              <SelectItem value="experiment">Experiment</SelectItem>
              <SelectItem value="idea">Idea</SelectItem>
              <SelectItem value="research">Research</SelectItem>
              <SelectItem value="update">Update</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.type === 'idea' && (
          <div>
            <Label htmlFor="idea_stage" className="block mb-1 text-xs text-muted-foreground">
              Idea Stage
            </Label>
            <Select
              value={formData.idea_stage}
              onValueChange={(v) => setFormData({ ...formData, idea_stage: v })}
            >
              <SelectTrigger id="idea_stage" className="w-full" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="captured">Captured</SelectItem>
                <SelectItem value="exploring">Exploring</SelectItem>
                <SelectItem value="validated">Validated</SelectItem>
                <SelectItem value="graduated">Graduated</SelectItem>
                <SelectItem value="parked">Parked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Switch
            id="meta_published"
            checked={formData.published}
            onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
          />
          <div>
            <Label htmlFor="meta_published" className="text-sm">Published</Label>
            <p className="text-xs text-muted-foreground">
              Make this entry visible to the public
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="meta_is_private"
            checked={formData.is_private}
            onCheckedChange={(checked) => setFormData({ ...formData, is_private: checked })}
          />
          <div>
            <Label htmlFor="meta_is_private" className="text-sm">Private</Label>
            <p className="text-xs text-muted-foreground">
              Hidden in privacy mode
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
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
          <Input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="learning, coding, design"
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

  const statusConfig = getStatusConfig()

  return (
    <AdminEntityLayout
      title={entryId ? formData.title || 'Untitled' : 'New Log Entry'}
      subtitle={entryId ? formData.slug : undefined}
      status={statusConfig}
      backHref="/admin/log"
      backLabel="Log"
      controlCluster={
        <EntityControlCluster
          isDirty={isDirty}
          isSaving={isSubmitting}
          onSave={() => handleSubmit()}
          onCancel={() => router.push('/admin/log')}
          saveLabel={entryId ? 'Save' : 'Create'}
          links={entryId && formData.published ? [
            { label: 'View', href: `/log/${formData.slug}`, icon: <ExternalLink className="size-4" />, external: true },
          ] : undefined}
          onDelete={entryId ? handleDelete : undefined}
        />
      }
      tabs={tabs}
      metadata={metadataPanel}
      isDirty={isDirty}
      isSaving={isSubmitting}
      onSave={() => handleSubmit()}
      onCancel={() => router.push('/admin/log')}
      onSubmit={handleSubmit}
    />
  )
}
