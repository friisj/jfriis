'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
  })

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

      // Check if slug is already taken (only when creating or changing slug)
      if (!projectId || formData.slug !== initialData?.slug) {
        const { data: existing } = await supabase
          .from('projects')
          .select('id')
          .eq('slug', formData.slug)
          .single()

        if (existing && existing.id !== projectId) {
          throw new Error(`The slug "${formData.slug}" is already in use. Please choose a different one.`)
        }
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

      if (projectId) {
        // Update existing project
        const { error: updateError } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', projectId)

        if (updateError) throw updateError
      } else {
        // Create new project
        const { error: insertError } = await supabase
          .from('projects')
          .insert([projectData])

        if (insertError) throw insertError
      }

      router.push('/admin/projects')
      router.refresh()
    } catch (err: any) {
      console.error('Error saving project:', err)
      setError(err.message || 'Failed to save project')
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

      router.push('/admin/projects')
      router.refresh()
    } catch (err: any) {
      console.error('Error deleting project:', err)
      setError(err.message || 'Failed to delete project')
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
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Title *
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background"
              placeholder="My Awesome Project"
            />
          </div>

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
                pattern="[a-z0-9-]+"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Only lowercase letters, numbers, and hyphens. Will be used in the URL.
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border bg-background resize-none"
              placeholder="A brief description of your project..."
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-2">
              Content (Markdown)
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={16}
              className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm resize-none"
              placeholder="# Project Details&#10;&#10;Write your project content here in Markdown..."
            />
          </div>
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
            <h3 className="font-medium">Tags</h3>
            <div>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
                placeholder="react, typescript, design"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated tags
              </p>
            </div>
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
