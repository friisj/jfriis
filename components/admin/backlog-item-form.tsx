'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { FormFieldWithAI } from '@/components/forms'
import { SidebarCard } from './sidebar-card'
import { FormActions } from './form-actions'
import { EntityLinkField } from './entity-link-field'
import { syncEntityLinks } from '@/lib/entity-links'
import type { PendingLink } from '@/lib/types/entity-relationships'

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
  const [pendingAssumptionLinks, setPendingAssumptionLinks] = useState<PendingLink[]>([])

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
        const { data: newItem, error: insertError } = await supabase
          .from('backlog_items')
          .insert([itemData])
          .select('id')
          .single()

        if (insertError) throw insertError

        // Sync pending entity links for create mode
        if (pendingAssumptionLinks.length > 0) {
          await syncEntityLinks(
            { type: 'backlog_item', id: newItem.id },
            'assumption',
            'related',
            pendingAssumptionLinks.map(l => l.targetId)
          )
        }

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
          <FormFieldWithAI
            label="Title"
            fieldName="title"
            entityType="backlog_items"
            context={{
              status: formData.status,
            }}
            currentValue={formData.title}
            onGenerate={(content) => setFormData({ ...formData, title: content })}
            disabled={isSubmitting}
            description="Optional - can be left blank for quick capture"
          >
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
              placeholder="Quick idea or title..."
            />
          </FormFieldWithAI>

          <FormFieldWithAI
            label="Content"
            fieldName="content"
            entityType="backlog_items"
            context={{
              title: formData.title,
              status: formData.status,
            }}
            currentValue={formData.content}
            onGenerate={(content) => setFormData({ ...formData, content })}
            disabled={isSubmitting}
          >
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={16}
              className="w-full px-3 py-2 rounded-lg border bg-background resize-none"
              placeholder="Capture your idea, thoughts, or notes here..."
            />
          </FormFieldWithAI>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <SidebarCard title="Settings">
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
          </SidebarCard>

          <SidebarCard title="Tags">
            <FormFieldWithAI
              label=""
              fieldName="tags"
              entityType="backlog_items"
              context={{
                title: formData.title,
                content: formData.content,
                status: formData.status,
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
                placeholder="idea, prototype, research"
              />
            </FormFieldWithAI>
          </SidebarCard>

          <SidebarCard title="Related Assumptions">
            <EntityLinkField
              label=""
              sourceType="backlog_item"
              sourceId={itemId}
              targetType="assumption"
              targetTableName="assumptions"
              targetDisplayField="title"
              linkType="related"
              allowMultiple={true}
              pendingLinks={pendingAssumptionLinks}
              onPendingLinksChange={setPendingAssumptionLinks}
              helperText="Link to related assumptions"
            />
          </SidebarCard>
        </div>
      </div>

      <FormActions
        isSubmitting={isSubmitting}
        submitLabel={itemId ? 'Update Item' : 'Create Item'}
        onCancel={handleCancel}
        onDelete={itemId ? handleDelete : undefined}
        deleteConfirmMessage="Are you sure you want to delete this backlog item? This action cannot be undone."
      />
    </form>
  )
}
