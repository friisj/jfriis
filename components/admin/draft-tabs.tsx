'use client'

/**
 * DraftTabs Component
 *
 * Tab interface for switching between log entry drafts.
 * Supports primary draft indicator, renaming, and deletion.
 */

import { useState, useRef, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { LogEntryDraft } from '@/lib/types/database'

export interface DraftTabsProps {
  drafts: LogEntryDraft[]
  activeDraftId: string | null
  onSelectDraft: (draftId: string) => void
  onCreateDraft: () => void
  onSetPrimary: (draftId: string) => void
  onRenameDraft: (draftId: string, label: string) => void
  onRegenerateName?: (draftId: string) => void
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
  onRegenerateName,
  onDeleteDraft,
  disabled = false,
}: DraftTabsProps) {
  const [openPopover, setOpenPopover] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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
      onRenameDraft(draftId, renameValue.trim().slice(0, 40))
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
    setOpenPopover(null)
  }

  return (
    <div className="flex items-center gap-1 border-b pb-2 mb-3 overflow-x-auto">
      {drafts.map((draft, index) => {
        const isActive = draft.id === activeDraftId
        const label = getDraftLabel(draft, index)

        return (
          <div key={draft.id} className="flex-shrink-0">
            {renaming === draft.id ? (
              <input
                ref={inputRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value.slice(0, 40))}
                onBlur={() => handleRenameSubmit(draft.id)}
                onKeyDown={(e) => handleRenameKeyDown(e, draft.id)}
                maxLength={40}
                className="px-3 py-1.5 text-sm rounded-md border bg-background w-32"
              />
            ) : (
              <Popover
                open={openPopover === draft.id}
                onOpenChange={(open) => setOpenPopover(open ? draft.id : null)}
              >
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => onSelectDraft(draft.id)}
                    disabled={disabled}
                    className={`
                      px-3 py-1.5 text-sm rounded-l-md transition-colors
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
                    <span className="max-w-[120px] truncate">{label}</span>
                  </button>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      disabled={disabled}
                      className={`
                        px-1.5 py-1.5 text-sm rounded-r-md transition-colors
                        ${isActive
                          ? 'bg-primary text-primary-foreground hover:bg-primary/80'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <span className="opacity-60 hover:opacity-100">▾</span>
                    </button>
                  </PopoverTrigger>
                </div>

                <PopoverContent
                  align="start"
                  sideOffset={4}
                  className="w-44 p-1"
                >
                  {!draft.is_primary && (
                    <button
                      type="button"
                      onClick={() => {
                        onSetPrimary(draft.id)
                        setOpenPopover(null)
                      }}
                      className="w-full px-3 py-1.5 text-sm text-left rounded hover:bg-muted"
                    >
                      ★ Set as primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startRenaming(draft, index)}
                    className="w-full px-3 py-1.5 text-sm text-left rounded hover:bg-muted"
                  >
                    Rename
                  </button>
                  {onRegenerateName && (
                    <button
                      type="button"
                      onClick={() => {
                        onRegenerateName(draft.id)
                        setOpenPopover(null)
                      }}
                      className="w-full px-3 py-1.5 text-sm text-left rounded hover:bg-muted"
                    >
                      ✨ Re-generate name
                    </button>
                  )}
                  {!draft.is_primary && (
                    <>
                      <div className="my-1 border-t" />
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Delete this draft?')) {
                            onDeleteDraft(draft.id)
                          }
                          setOpenPopover(null)
                        }}
                        className="w-full px-3 py-1.5 text-sm text-left rounded hover:bg-muted text-red-600"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </PopoverContent>
              </Popover>
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
