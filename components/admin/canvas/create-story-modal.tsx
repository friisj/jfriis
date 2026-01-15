'use client'

import { useState } from 'react'
import { createStoryAction } from '@/app/(private)/admin/story-maps/[id]/canvas/actions'
import type { StoryMapLayer } from '@/lib/boundary-objects/story-map-layers'

interface Activity {
  id: string
  name: string
}

interface CreateStoryModalProps {
  activityId: string
  activities: Activity[]
  layer: StoryMapLayer
  layers: StoryMapLayer[]
  onClose: () => void
  onCreate: () => void
}

const PRIORITIES = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const STORY_TYPES = [
  { value: 'feature', label: 'Feature' },
  { value: 'enhancement', label: 'Enhancement' },
  { value: 'bug', label: 'Bug' },
  { value: 'tech_debt', label: 'Tech Debt' },
  { value: 'spike', label: 'Spike' },
]

export function CreateStoryModal({
  activityId,
  activities,
  layer,
  layers,
  onClose,
  onCreate,
}: CreateStoryModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<string | null>(null)
  const [storyType, setStoryType] = useState<string | null>('feature')
  const [selectedActivityId, setSelectedActivityId] = useState(activityId)
  const [selectedLayerId, setSelectedLayerId] = useState(layer.id)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setIsCreating(true)
    setError(null)

    const result = await createStoryAction({
      title: title.trim(),
      description: description.trim() || null,
      activity_id: selectedActivityId,
      layer_id: selectedLayerId,
      priority,
      status: 'backlog',
      story_type: storyType,
    })

    setIsCreating(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    onCreate()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Create Story</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted"
            title="Close"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {error && (
            <div className="p-2 bg-red-50 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="As a user, I want to..."
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-md resize-none"
            />
          </div>

          {/* Activity & Layer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Activity</label>
              <select
                value={selectedActivityId}
                onChange={(e) => setSelectedActivityId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Layer</label>
              <select
                value={selectedLayerId}
                onChange={(e) => setSelectedLayerId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                {layers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={storyType || ''}
                onChange={(e) => setStoryType(e.target.value || null)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">None</option>
                {STORY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={priority || ''}
                onChange={(e) => setPriority(e.target.value || null)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">None</option>
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-md hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Create Story'}
          </button>
        </div>
      </div>
    </div>
  )
}
