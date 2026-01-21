'use client'

import { useState, useCallback } from 'react'
import { X, Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  createTouchpointAction,
  updateTouchpointAction,
  deleteTouchpointAction,
} from '@/app/(private)/admin/journeys/[id]/canvas/actions'
import type { Touchpoint } from '@/lib/boundary-objects/journey-cells'

interface TouchpointDetailPanelProps {
  stageId: string
  stageName: string
  touchpoints: Touchpoint[]
  onClose: () => void
  onRefresh: () => void
}

/**
 * Side panel for managing touchpoints in a journey stage.
 * Lists existing touchpoints and allows creating/editing/deleting.
 */
export function TouchpointDetailPanel({
  stageId,
  stageName,
  touchpoints,
  onClose,
  onRefresh,
}: TouchpointDetailPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold text-sm">Touchpoints</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stageName}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Existing touchpoints */}
        {touchpoints.map((tp) => (
          <TouchpointCard
            key={tp.id}
            touchpoint={tp}
            isEditing={editingId === tp.id}
            onEdit={() => setEditingId(tp.id)}
            onCancelEdit={() => setEditingId(null)}
            onRefresh={onRefresh}
          />
        ))}

        {/* Create form */}
        {isCreating ? (
          <CreateTouchpointForm
            stageId={stageId}
            sequence={touchpoints.length}
            onCancel={() => setIsCreating(false)}
            onCreated={() => {
              setIsCreating(false)
              onRefresh()
            }}
          />
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Touchpoint
          </Button>
        )}

        {/* Empty state */}
        {touchpoints.length === 0 && !isCreating && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No touchpoints in this stage yet.
          </p>
        )}
      </div>
    </div>
  )
}

// Individual touchpoint card with edit/delete
function TouchpointCard({
  touchpoint,
  isEditing,
  onEdit,
  onCancelEdit,
  onRefresh,
}: {
  touchpoint: Touchpoint
  isEditing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onRefresh: () => void
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteTouchpointAction(touchpoint.id)
      if (!result.success) {
        toast.error(result.error || 'Failed to delete touchpoint')
        return
      }
      toast.success('Touchpoint deleted')
      onRefresh()
    } catch (error) {
      toast.error('Failed to delete touchpoint')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isEditing) {
    return (
      <EditTouchpointForm
        touchpoint={touchpoint}
        onCancel={onCancelEdit}
        onSaved={() => {
          onCancelEdit()
          onRefresh()
        }}
      />
    )
  }

  return (
    <div className="p-3 border rounded-lg hover:bg-muted/30 transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{touchpoint.name}</p>
          {touchpoint.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {touchpoint.description}
            </p>
          )}
          <div className="flex gap-2 mt-2 flex-wrap">
            {touchpoint.channel_type && (
              <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                {touchpoint.channel_type}
              </span>
            )}
            {touchpoint.importance && (
              <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                {touchpoint.importance}
              </span>
            )}
            {touchpoint.pain_level && touchpoint.pain_level !== 'none' && (
              <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                {touchpoint.pain_level}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Create touchpoint form
function CreateTouchpointForm({
  stageId,
  sequence,
  onCancel,
  onCreated,
}: {
  stageId: string
  sequence: number
  onCancel: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [channelType, setChannelType] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    try {
      const result = await createTouchpointAction(stageId, {
        name: name.trim(),
        description: description.trim() || null,
        channel_type: channelType.trim() || null,
        sequence,
      })

      if (!result.success) {
        toast.error(result.error || 'Failed to create touchpoint')
        return
      }

      toast.success('Touchpoint created')
      onCreated()
    } catch (error) {
      toast.error('Failed to create touchpoint')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 border rounded-lg space-y-3 bg-muted/30">
      <div className="space-y-1.5">
        <Label htmlFor="create-name" className="text-xs">Name</Label>
        <Input
          id="create-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Homepage Visit"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="create-description" className="text-xs">Description</Label>
        <Textarea
          id="create-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happens at this touchpoint..."
          rows={2}
          className="resize-none"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="create-channel" className="text-xs">Channel</Label>
        <Input
          id="create-channel"
          value={channelType}
          onChange={(e) => setChannelType(e.target.value)}
          placeholder="e.g., web, email, phone"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isLoading || !name.trim()}>
          {isLoading ? 'Creating...' : 'Create'}
        </Button>
      </div>
    </form>
  )
}

// Edit touchpoint form
function EditTouchpointForm({
  touchpoint,
  onCancel,
  onSaved,
}: {
  touchpoint: Touchpoint
  onCancel: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(touchpoint.name)
  const [description, setDescription] = useState(touchpoint.description || '')
  const [channelType, setChannelType] = useState(touchpoint.channel_type || '')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    try {
      const result = await updateTouchpointAction(touchpoint.id, {
        name: name.trim(),
        description: description.trim() || null,
        channel_type: channelType.trim() || null,
      })

      if (!result.success) {
        toast.error(result.error || 'Failed to update touchpoint')
        return
      }

      toast.success('Touchpoint updated')
      onSaved()
    } catch (error) {
      toast.error('Failed to update touchpoint')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 border rounded-lg space-y-3 bg-muted/30">
      <div className="space-y-1.5">
        <Label htmlFor="edit-name" className="text-xs">Name</Label>
        <Input
          id="edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-description" className="text-xs">Description</Label>
        <Textarea
          id="edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-channel" className="text-xs">Channel</Label>
        <Input
          id="edit-channel"
          value={channelType}
          onChange={(e) => setChannelType(e.target.value)}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isLoading || !name.trim()}>
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
