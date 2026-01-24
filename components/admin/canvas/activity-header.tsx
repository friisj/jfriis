'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { CanvasColumnHeader } from './canvas-column-header'
import {
  updateActivityNameAction,
  deleteActivityAction,
  createActivityAction,
} from '@/app/(private)/admin/story-maps/[id]/canvas/actions'
import { ACTIVITY_NAME_MAX_LENGTH } from '@/lib/boundary-objects/story-map-layers'

interface Activity {
  id: string
  name: string
  description: string | null
  sequence: number
  user_goal: string | null
}

interface ActivityHeaderProps {
  activity: Activity
  /** Zero-based index of this activity (optional for backward compatibility) */
  index?: number
  /** Total number of activities (optional for backward compatibility) */
  totalActivities?: number
  onUpdate: () => void
  onDelete: () => void
}

/**
 * Activity column header for Story Map canvas.
 * Uses the generic CanvasColumnHeader with Story Map-specific configuration.
 */
export function ActivityHeader({
  activity,
  index = 0,
  totalActivities = 1,
  onUpdate,
  onDelete,
}: ActivityHeaderProps) {
  const getName = useCallback((a: Activity) => a.name, [])
  const getKey = useCallback((a: Activity) => a.id, [])

  const handleRename = useCallback(async (newName: string) => {
    const result = await updateActivityNameAction(activity.id, newName)
    if (!result.success) {
      throw new Error(result.error)
    }
    onUpdate()
  }, [activity.id, onUpdate])

  const handleDelete = useCallback(async () => {
    const result = await deleteActivityAction(activity.id)
    if (!result.success) {
      throw new Error(result.error)
    }
    onDelete()
  }, [activity.id, onDelete])

  return (
    <CanvasColumnHeader
      item={activity}
      index={index}
      totalCount={totalActivities}
      getName={getName}
      getKey={getKey}
      orientation="horizontal"
      showIndex={false}
      editable={true}
      maxLength={ACTIVITY_NAME_MAX_LENGTH}
      onRename={handleRename}
      onDelete={handleDelete}
      deleteConfirmTitle="Delete Activity?"
      deleteConfirmDescription={`Delete activity "${activity.name}"? All stories in this column will be deleted.`}
      description={activity.description}
      className="flex-1 min-w-[200px] border-r last:border-r-0"
    />
  )
}

interface AddActivityButtonProps {
  storyMapId: string
  nextSequence: number
  onAdd: () => void
}

/**
 * Button/inline input to add a new activity.
 * Handles the inline input state locally since it needs to collect a name before creating.
 */
export function AddActivityButton({ storyMapId, nextSequence, onAdd }: AddActivityButtonProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

  const handleAdd = async () => {
    if (!newName.trim()) {
      setIsAdding(false)
      return
    }

    setIsSaving(true)
    setError(null)

    const result = await createActivityAction(storyMapId, newName, nextSequence)

    setIsSaving(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    onAdd()
    setNewName('')
    setIsAdding(false)
  }

  if (isAdding) {
    return (
      <div className="min-w-[200px] p-3 border-r">
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={handleAdd}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
            if (e.key === 'Escape') {
              setNewName('')
              setIsAdding(false)
              setError(null)
            }
          }}
          maxLength={ACTIVITY_NAME_MAX_LENGTH}
          disabled={isSaving}
          placeholder="Activity name..."
          className="w-full px-1 py-0.5 text-sm border rounded bg-background disabled:opacity-50"
        />
        {error && (
          <div className="text-xs text-red-600 mt-1">{error}</div>
        )}
        <div className="text-xs text-muted-foreground mt-1">
          {isSaving ? 'Creating...' : 'Enter to add, Esc to cancel'}
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className="min-w-[120px] p-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
    >
      + Add Activity
    </button>
  )
}
