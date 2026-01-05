'use client'

/**
 * DraftTabs Component
 *
 * Tab interface for switching between log entry drafts.
 * Supports primary draft indicator, renaming, and deletion.
 */

import { useState, useRef, useEffect } from 'react'
import type { LogEntryDraft } from '@/lib/types/database'

export interface DraftTabsProps {
  drafts: LogEntryDraft[]
  activeDraftId: string | null
  onSelectDraft: (draftId: string) => void
  onCreateDraft: () => void
  onSetPrimary: (draftId: string) => void
  onRenameDraft: (draftId: string, label: string) => void
  onDeleteDraft: (draftId: string) => void
  disabled?: boolean
}

export function DraftTabs({
  drafts,
  activeDraftId,
  onSelectDraft,
  onCreateDraft,
  onSetPrimary,
  onRenameDraft,
  onDeleteDraft,
  disabled = false,
}: DraftTabsProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(null)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  // Focus input when renaming
  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [renaming])

  const getDraftLabel = (draft: LogEntryDraft, index: number): string => {
    return draft.label || `Draft ${index + 1}`
  }

  const handleRenameSubmit = (draftId: string) => {
    if (renameValue.trim()) {
      onRenameDraft(draftId, renameValue.trim())
    }
    setRenaming(null)
    setRenameValue('')
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent, draftId: string) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(draftId)
    } else if (e.key === 'Escape') {
      setRenaming(null)
      setRenameValue('')
    }
  }

  const startRenaming = (draft: LogEntryDraft, index: number) => {
    setRenaming(draft.id)
    setRenameValue(getDraftLabel(draft, index))
    setMenuOpen(null)
  }

  return (
    <div className="flex items-center gap-1 border-b pb-2 mb-3 overflow-x-auto">
      {drafts.map((draft, index) => {
        const isActive = draft.id === activeDraftId
        const label = getDraftLabel(draft, index)

        return (
          <div key={draft.id} className="relative flex-shrink-0">
            {renaming === draft.id ? (
              <input
                ref={inputRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRenameSubmit(draft.id)}
                onKeyDown={(e) => handleRenameKeyDown(e, draft.id)}
                className="px-3 py-1.5 text-sm rounded-md border bg-background w-24"
              />
            ) : (
              <button
                type="button"
                onClick={() => onSelectDraft(draft.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setMenuOpen(draft.id)
                }}
                disabled={disabled}
                className={`
                  px-3 py-1.5 text-sm rounded-md transition-colors
                  flex items-center gap-1.5
                  ${isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {draft.is_primary && (
                  <span className="text-amber-500" title="Primary draft">
                    ★
                  </span>
                )}
                <span>{label}</span>
                <span
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(menuOpen === draft.id ? null : draft.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      setMenuOpen(menuOpen === draft.id ? null : draft.id)
                    }
                  }}
                  className={`ml-1 opacity-50 hover:opacity-100 ${disabled ? '' : 'cursor-pointer'}`}
                >
                  ▾
                </span>
              </button>
            )}

            {/* Dropdown Menu */}
            {menuOpen === draft.id && (
              <div
                ref={menuRef}
                className="absolute top-full left-0 mt-1 z-50 min-w-[140px] py-1 rounded-md border bg-popover shadow-lg"
              >
                {!draft.is_primary && (
                  <button
                    type="button"
                    onClick={() => {
                      onSetPrimary(draft.id)
                      setMenuOpen(null)
                    }}
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted"
                  >
                    ★ Set as primary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => startRenaming(draft, index)}
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted"
                >
                  Rename
                </button>
                {!draft.is_primary && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this draft?')) {
                        onDeleteDraft(draft.id)
                      }
                      setMenuOpen(null)
                    }}
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted text-red-600"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Add Draft Button */}
      <button
        type="button"
        onClick={onCreateDraft}
        disabled={disabled}
        className={`
          px-3 py-1.5 text-sm rounded-md
          border border-dashed border-muted-foreground/30
          text-muted-foreground hover:text-foreground hover:border-muted-foreground/50
          transition-colors flex-shrink-0
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title="Create new draft"
      >
        +
      </button>
    </div>
  )
}
