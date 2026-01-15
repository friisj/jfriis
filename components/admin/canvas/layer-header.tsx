'use client'

import { useState, useRef, useEffect } from 'react'
import {
  updateLayerNameAction,
  deleteLayerAction,
  createLayerAction,
} from '@/app/(private)/admin/story-maps/[id]/canvas/actions'
import type { StoryMapLayer } from '@/lib/boundary-objects/story-map-layers'
import { LAYER_NAME_MAX_LENGTH } from '@/lib/boundary-objects/story-map-layers'

interface LayerHeaderProps {
  layer: StoryMapLayer
  onUpdate: () => void
  onDelete: () => void
}

export function LayerHeader({ layer, onUpdate, onDelete }: LayerHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(layer.name)
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
    if (!editName.trim() || editName === layer.name) {
      setEditName(layer.name)
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    setError(null)

    const result = await updateLayerNameAction(layer.id, editName)

    setIsSaving(false)

    if (!result.success) {
      setError(result.error)
      setEditName(layer.name)
    } else {
      onUpdate()
    }
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Delete layer "${layer.name}"? Stories in this layer will lose their layer assignment.`)) {
      return
    }

    setIsDeleting(true)
    setError(null)

    const result = await deleteLayerAction(layer.id)

    setIsDeleting(false)

    if (!result.success) {
      setError(result.error)
    } else {
      onDelete()
    }
    setIsMenuOpen(false)
  }

  const layerTypeColors: Record<string, string> = {
    customer: 'bg-blue-50 border-l-blue-400',
    internal_agent: 'bg-green-50 border-l-green-400',
    ai_agent: 'bg-purple-50 border-l-purple-400',
    platform: 'bg-orange-50 border-l-orange-400',
    api: 'bg-gray-50 border-l-gray-400',
  }

  return (
    <div
      className={`w-40 flex-shrink-0 p-3 border-r border-l-4 relative group ${
        layerTypeColors[layer.layer_type || ''] || 'bg-muted/30 border-l-gray-300'
      }`}
    >
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
              setEditName(layer.name)
              setIsEditing(false)
            }
          }}
          maxLength={LAYER_NAME_MAX_LENGTH}
          disabled={isSaving}
          className="w-full px-1 py-0.5 text-sm font-medium border rounded bg-background disabled:opacity-50"
        />
      ) : (
        <div
          className="font-medium text-sm cursor-pointer hover:text-primary"
          onClick={() => setIsEditing(true)}
          title="Click to rename"
        >
          {layer.name}
        </div>
      )}

      {layer.layer_type && (
        <div className="text-xs text-muted-foreground mt-0.5 capitalize">
          {layer.layer_type.replace('_', ' ')}
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

interface AddLayerButtonProps {
  storyMapId: string
  nextSequence: number
  onAdd: () => void
}

export function AddLayerButton({ storyMapId, nextSequence, onAdd }: AddLayerButtonProps) {
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

    const result = await createLayerAction(storyMapId, newName, nextSequence)

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
      <div className="flex border-b last:border-b-0">
        <div className="w-40 flex-shrink-0 p-3 border-r bg-muted/30">
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
            maxLength={LAYER_NAME_MAX_LENGTH}
            disabled={isSaving}
            placeholder="Layer name..."
            className="w-full px-1 py-0.5 text-sm border rounded bg-background disabled:opacity-50"
          />
          {error && (
            <div className="text-xs text-red-600 mt-1">{error}</div>
          )}
        </div>
        <div className="flex-1 p-3 text-sm text-muted-foreground">
          {isSaving ? 'Creating...' : 'Press Enter to add, Escape to cancel'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex border-b last:border-b-0">
      <button
        onClick={() => setIsAdding(true)}
        className="w-40 flex-shrink-0 p-3 border-r text-left text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        + Add Layer
      </button>
      <div className="flex-1" />
    </div>
  )
}
