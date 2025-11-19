'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface BacklogItemFormData {
  title: string
  content: string
  status: 'inbox' | 'in-progress' | 'shaped' | 'archived'
  tags: string
}

interface BacklogItemFormProps {
  itemId?: string
  initialData?: Partial<BacklogItemFormData>
}

export function BacklogItemForm({ itemId, initialData }: BacklogItemFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<BacklogItemFormData>({
    title: initialData?.title || '',
    content: initialData?.content || '',
    status: initialData?.status || 'inbox',
    tags: initialData?.tags || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)

      const itemData = {
        title: formData.title || null,
        content: formData.content || null,
        status: formData.status,
        tags: tagsArray.length > 0 ? tagsArray : null,
      }

      if (itemId) {
        // Update existing item
        const { error: updateError } = await supabase
          .from('backlog_items')
          .update(itemData)
          .eq('id', itemId)

        if (updateError) throw updateError

        toast.success('Backlog item updated successfully!')
      } else {
        // Create new item
        const { error: insertError } = await supabase
          .from('backlog_items')
          .insert([itemData])

        if (insertError) throw insertError

        toast.success('Backlog item created successfully!')
      }

      router.push('/admin/backlog')
      router.refresh()
    } catch (err: any) {
      console.error('Error saving backlog item:', err)
      setError(err.message || 'Failed to save backlog item')
      toast.error(err.message || 'Failed to save backlog item')
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push('/admin/backlog')
  }

  const handleDelete = async () => {
    if (!itemId) return

    const confirmed = confirm('Are you sure you want to delete this backlog item? This action cannot be undone.')
    if (!confirmed) return

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('backlog_items')
        .delete()
        .eq('id', itemId)

      if (deleteError) throw deleteError

      toast.success('Backlog item deleted successfully')
      router.push('/admin/backlog')
      router.refresh()
    } catch (err: any) {
      console.error('Error deleting backlog item:', err)
      setError(err.message || 'Failed to delete backlog item')
      toast.error(err.message || 'Failed to delete backlog item')
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
              Title
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
              placeholder="Quick idea or title..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional - can be left blank for quick capture
            </p>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-2">
              Content
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={16}
              className="w-full px-3 py-2 rounded-lg border bg-background resize-none"
              placeholder="Capture your idea, thoughts, or notes here..."
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
                onChange={(e) => setFormData({ ...formData, status: e.target.value as BacklogItemFormData['status'] })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
              >
                <option value="inbox">Inbox</option>
                <option value="in-progress">In Progress</option>
                <option value="shaped">Shaped</option>
                <option value="archived">Archived</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Track the state of this idea
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
                placeholder="idea, prototype, research"
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
            {isSubmitting ? 'Saving...' : itemId ? 'Update Item' : 'Create Item'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>

        {itemId && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors disabled:opacity-50"
          >
            Delete Item
          </button>
        )}
      </div>
    </form>
  )
}
