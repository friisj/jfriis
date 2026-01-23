'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  updateStoryAction,
  deleteStoryAction,
} from '@/app/(private)/admin/story-maps/[id]/canvas/actions'
import type { StoryMapLayer } from '@/lib/boundary-objects/story-map-layers'

interface UserStory {
  id: string
  title: string
  description: string | null
  activity_id: string
  vertical_position: number | null
  layer_id: string | null
  priority: string | null
  status: string
  story_type: string | null
  story_points: number | null
  acceptance_criteria: string | null
}

interface Activity {
  id: string
  name: string
}

interface StoryDetailPanelProps {
  storyId: string
  activities: Activity[]
  layers: StoryMapLayer[]
  onClose: () => void
  onUpdate: () => void
  onDelete: () => void
}

const PRIORITIES = [
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
]

const STATUSES = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'ready', label: 'Ready' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
  { value: 'archived', label: 'Archived' },
]

const STORY_TYPES = [
  { value: 'feature', label: 'Feature' },
  { value: 'enhancement', label: 'Enhancement' },
  { value: 'bug', label: 'Bug' },
  { value: 'tech_debt', label: 'Tech Debt' },
  { value: 'spike', label: 'Spike' },
]

export function StoryDetailPanel({
  storyId,
  activities,
  layers,
  onClose,
  onUpdate,
  onDelete,
}: StoryDetailPanelProps) {
  const [story, setStory] = useState<UserStory | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('')
  const [priority, setPriority] = useState<string | null>(null)
  const [status, setStatus] = useState('backlog')
  const [storyType, setStoryType] = useState<string | null>(null)
  const [storyPoints, setStoryPoints] = useState<number | null>(null)
  const [activityId, setActivityId] = useState('')
  const [layerId, setLayerId] = useState<string | null>(null)

  // Fetch story details
  useEffect(() => {
    const fetchStory = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('user_stories')
        .select('*')
        .eq('id', storyId)
        .single()

      if (error) {
        setError('Failed to load story')
        setIsLoading(false)
        return
      }

      setStory(data as any)
      setTitle(data.title)
      setDescription(data.description || '')
      setAcceptanceCriteria(data.acceptance_criteria || '')
      setPriority(data.priority ?? '')
      setStatus(data.status ?? '')
      setStoryType(data.story_type ?? '')
      setStoryPoints(data.story_points)
      setActivityId(data.activity_id)
      setLayerId(data.layer_id ?? '')
      setIsLoading(false)
    }

    fetchStory()
  }, [storyId])

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setIsSaving(true)
    setError(null)

    const layer = layers.find(l => l.id === layerId)

    const result = await updateStoryAction(storyId, {
      title: title.trim(),
      description: description.trim() || null,
      acceptance_criteria: acceptanceCriteria.trim() || null,
      priority,
      status,
      story_type: storyType,
      story_points: storyPoints,
      activity_id: activityId,
      layer_id: layerId,
      vertical_position: layer?.sequence ?? 0,
    })

    setIsSaving(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    onUpdate()
  }

  const handleDelete = async () => {
    if (!confirm('Delete this story? This cannot be undone.')) {
      return
    }

    setIsSaving(true)
    setError(null)

    const result = await deleteStoryAction(storyId)

    setIsSaving(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    onDelete()
  }

  if (isLoading) {
    return (
      <div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg z-50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-3/4" />
          <div className="h-20 bg-muted rounded" />
          <div className="h-10 bg-muted rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (!story) {
    return (
      <div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg z-50 p-6">
        <div className="text-center text-muted-foreground">Story not found</div>
        <button onClick={onClose} className="mt-4 text-sm text-primary">
          Close
        </button>
      </div>
    )
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Story Details</h2>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-2 bg-red-50 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-md resize-none"
          />
        </div>

        {/* Activity (Column) */}
        <div>
          <label className="block text-sm font-medium mb-1">Activity</label>
          <select
            value={activityId}
            onChange={(e) => setActivityId(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Layer (Row) */}
        <div>
          <label className="block text-sm font-medium mb-1">Layer</label>
          <select
            value={layerId || ''}
            onChange={(e) => setLayerId(e.target.value || null)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">No layer</option>
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Priority & Status row */}
        <div className="grid grid-cols-2 gap-3">
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
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Type & Points row */}
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
            <label className="block text-sm font-medium mb-1">Points</label>
            <input
              type="number"
              min="1"
              value={storyPoints || ''}
              onChange={(e) =>
                setStoryPoints(e.target.value ? parseInt(e.target.value) : null)
              }
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        {/* Acceptance Criteria */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Acceptance Criteria
          </label>
          <textarea
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border rounded-md resize-none"
            placeholder="Given... When... Then..."
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t flex items-center justify-between">
        <button
          onClick={handleDelete}
          disabled={isSaving}
          className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
        >
          Delete
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm border rounded-md hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
