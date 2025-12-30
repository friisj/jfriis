'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { MdxEditor } from '@/components/forms/mdx-editor'
import { RelationshipSelector } from './relationship-selector'
import { FormFieldWithAI } from '@/components/forms'

interface ProjectFormData {
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
  specimenIds: string[]
  logEntryIds: string[]
}

interface ProjectFormProps {
  projectId?: string
  initialData?: Partial<ProjectFormData>
}

export function ProjectForm({ projectId, initialData }: ProjectFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<ProjectFormData>({
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
    specimenIds: initialData?.specimenIds || [],
    logEntryIds: initialData?.logEntryIds || [],
  })

  // Load existing relationships
  useEffect(() => {
    if (projectId) {
      loadRelationships()
    }
  }, [projectId])

  const loadRelationships = async () => {
    if (!projectId) return

    // Load specimen relationships
    const { data: specimens } = await supabase
      .from('project_specimens')
      .select('specimen_id')
      .eq('project_id', projectId)
      .order('position')

    // Load log entry relationships
    const { data: logEntries } = await supabase
      .from('log_entry_projects')
      .select('log_entry_id')
      .eq('project_id', projectId)

    setFormData(prev => ({
      ...prev,
      specimenIds: specimens?.map(r => r.specimen_id) || [],
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
    if (!projectId && !formData.slug) {
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

      const projectData = {
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

      let savedProjectId = projectId

      if (projectId) {
        // Update existing project
        const { error: updateError } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', projectId)

        if (updateError) throw updateError
      } else {
        // Create new project
        const { data: newProject, error: insertError } = await supabase
          .from('projects')
          .insert([projectData])
          .select('id')
          .single()

        if (insertError) throw insertError
        savedProjectId = newProject.id
      }

      // Update relationships
      if (savedProjectId) {
        // Delete existing specimen relationships
        await supabase
          .from('project_specimens')
          .delete()
          .eq('project_id', savedProjectId)

        // Insert new specimen relationships
        if (formData.specimenIds.length > 0) {
          const specimenRelations = formData.specimenIds.map((specimenId, index) => ({
            project_id: savedProjectId,
            specimen_id: specimenId,
            position: index
          }))

          const { error: specimenError } = await supabase
            .from('project_specimens')
            .insert(specimenRelations)

          if (specimenError) throw specimenError
        }

        // Delete existing log entry relationships
        await supabase
          .from('log_entry_projects')
          .delete()
          .eq('project_id', savedProjectId)

        // Insert new log entry relationships
        if (formData.logEntryIds.length > 0) {
          const logEntryRelations = formData.logEntryIds.map((logEntryId) => ({
            project_id: savedProjectId,
            log_entry_id: logEntryId
          }))

          const { error: logEntryError } = await supabase
            .from('log_entry_projects')
            .insert(logEntryRelations)

          if (logEntryError) throw logEntryError
        }
      }

      toast.success(projectId ? 'Project updated successfully!' : 'Project created successfully!')
      router.push('/admin/projects')
      router.refresh()
    } catch (err: any) {
      console.error('Error saving project:', err)
      // Provide user-friendly error for duplicate slug
      if (err.code === '23505' || err.message?.includes('duplicate key')) {
        setError(`The slug "${formData.slug}" is already in use. Please choose a different one.`)
        toast.error('Slug already in use')
      } else {
        setError(err.message || 'Failed to save project')
        toast.error(err.message || 'Failed to save project')
      }
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push('/admin/projects')
  }

  const handleDelete = async () => {
    if (!projectId) return

    const confirmed = confirm('Are you sure you want to delete this project? This action cannot be undone.')
    if (!confirmed) return

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (deleteError) throw deleteError

      toast.success('Project deleted successfully')
      router.push('/admin/projects')
      router.refresh()
    } catch (err: any) {
      console.error('Error deleting project:', err)
      setError(err.message || 'Failed to delete project')
      toast.error(err.message || 'Failed to delete project')
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
            entityType="projects"
            context={{
              status: formData.status,
              type: formData.type,
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
              placeholder="My Awesome Project"
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
                placeholder="my-awesome-project"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Only lowercase letters, numbers, and hyphens. Will be used in the URL.
            </p>
          </div>

          <FormFieldWithAI
            label="Description"
            fieldName="description"
            entityType="projects"
            context={{
              title: formData.title,
              status: formData.status,
              type: formData.type,
            }}
            currentValue={formData.description}
            onGenerate={(content) => setFormData({ ...formData, description: content })}
            disabled={isSubmitting}
          >
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border bg-background resize-none"
              placeholder="A brief description of your project..."
            />
          </FormFieldWithAI>

          <MdxEditor
            value={formData.content}
            onChange={(value) => setFormData({ ...formData, content: value })}
            placeholder="# Project Details&#10;&#10;Write your project content here in Markdown...&#10;&#10;You can embed specimens using: <Specimen id=&quot;simple-card&quot; />"
            rows={16}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <h3 className="font-medium">Settings</h3>

            <div>
              <label htmlFor="status" className="block text-sm font-medium mb-2">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium mb-2">
                Type
              </label>
              <input
                type="text"
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
                placeholder="project, business, experiment..."
              />
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
                Make this project visible to the public
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-4">
            <h3 className="font-medium">Dates</h3>

            <div>
              <label htmlFor="start_date" className="block text-sm font-medium mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="start_date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
              />
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium mb-2">
                End Date
              </label>
              <input
                type="date"
                id="end_date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
              />
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-4">
            <FormFieldWithAI
              label="Tags"
              fieldName="tags"
              entityType="projects"
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
                placeholder="react, typescript, design"
              />
            </FormFieldWithAI>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <RelationshipSelector
              label="Link Specimens"
              tableName="specimens"
              selectedIds={formData.specimenIds}
              onChange={(ids) => setFormData({ ...formData, specimenIds: ids })}
              helperText="Select specimens to showcase in this project"
            />
          </div>

          <div className="rounded-lg border bg-card p-4">
            <RelationshipSelector
              label="Link Log Entries"
              tableName="log_entries"
              selectedIds={formData.logEntryIds}
              onChange={(ids) => setFormData({ ...formData, logEntryIds: ids })}
              helperText="Select log entries related to this project"
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
            {isSubmitting ? 'Saving...' : projectId ? 'Update Project' : 'Create Project'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>

        {projectId && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors disabled:opacity-50"
          >
            Delete Project
          </button>
        )}
      </div>
    </form>
  )
}
