'use client'

import { useState, useRef, useEffect } from 'react'
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
  onUpdate: () => void
  onDelete: () => void
}

export function ActivityHeader({ activity, onUpdate, onDelete }: ActivityHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(activity.name)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSave = async () => {
    if (!editName.trim() || editName === activity.name) {
      setEditName(activity.name)
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    setError(null)

    const result = await updateActivityNameAction(activity.id, editName)

    setIsSaving(false)

    if (!result.success) {
      setError(result.error)
      setEditName(activity.name)
    } else {
      onUpdate()
    }
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Delete activity "${activity.name}"? All stories in this column will be deleted.`)) {
      return
    }

    setIsDeleting(true)
    setError(null)

    const result = await deleteActivityAction(activity.id)

    setIsDeleting(false)

    if (!result.success) {
      setError(result.error)
    } else {
      onDelete()
    }
    setIsMenuOpen(false)
  }

  return (
    <div className="flex-1 min-w-[200px] p-3 border-r last:border-r-0 relative group">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') {
              setEditName(activity.name)
              setIsEditing(false)
            }
          }}
          maxLength={ACTIVITY_NAME_MAX_LENGTH}
          disabled={isSaving}
          className="w-full px-1 py-0.5 text-sm font-medium border rounded bg-background disabled:opacity-50"
        />
      ) : (
        <div
          className="font-medium text-sm cursor-pointer hover:text-primary"
          onClick={() => setIsEditing(true)}
          title="Click to rename"
        >
          {activity.name}
        </div>
      )}

      {activity.description && !isEditing && (
        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
          {activity.description}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-xs text-red-600 mt-1">{error}</div>
      )}

      {/* Options menu button */}
      <div ref={menuRef} className="absolute top-2 right-2">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/10 transition-opacity"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="8" cy="13" r="1.5" />
            </svg>
          )}
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-lg z-10 min-w-[120px]">
            <button
              onClick={() => {
                setIsEditing(true)
                setIsMenuOpen(false)
              }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-muted"
            >
              Rename
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-red-600 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface AddActivityButtonProps {
  storyMapId: string
  nextSequence: number
  onAdd: () => void
}

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
