'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

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

  const [formData, setFormData] = useState<LogEntryFormData>({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    content: initialData?.content || '',
    entry_date: initialData?.entry_date || new Date().toISOString().split('T')[0],
    type: initialData?.type || '',
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
        const { error: updateError } = await supabase
          .from('log_entries')
          .update(entryData)
          .eq('id', entryId)

        if (updateError) throw updateError

        toast.success('Log entry updated successfully!')
      } else {
        // Create new entry
        const { error: insertError } = await supabase
          .from('log_entries')
          .insert([entryData])

        if (insertError) throw insertError

        toast.success('Log entry created successfully!')
      }

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
              placeholder="Today's experiment with..."
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
                placeholder="todays-experiment"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Only lowercase letters, numbers, and hyphens. Will be used in the URL.
            </p>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-2">
              Content (Markdown)
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={20}
              className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm resize-none"
              placeholder="# What I learned today&#10;&#10;Write your log entry content here in Markdown..."
            />
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
            <h3 className="font-medium">Tags</h3>
            <div>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
                placeholder="learning, coding, design"
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
