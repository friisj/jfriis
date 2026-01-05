'use client'

/**
 * LogEntrySourceSelector Component
 *
 * Multi-select log entries with per-entry draft picker.
 * Used to select source material for generating studio projects.
 * Maximum 3 entries can be selected.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getDraftsForEntry } from '@/app/actions/log-entry-drafts'
import type { LogEntryDraft } from '@/lib/types/database'

const MAX_ENTRIES = 3

interface LogEntry {
  id: string
  title: string
  type: string | null
  tags: string[] | null
  entry_date: string
}

interface SelectedEntry {
  entry: LogEntry
  drafts: LogEntryDraft[]
  selectedDraftId: string | null
  loadingDrafts: boolean
}

export interface LogEntrySource {
  entryId: string
  title: string
  type?: string
  tags?: string[]
  content: string
}

interface LogEntrySourceSelectorProps {
  onSourcesChange: (sources: LogEntrySource[]) => void
  disabled?: boolean
}

export function LogEntrySourceSelector({
  onSourcesChange,
  disabled = false,
}: LogEntrySourceSelectorProps) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedEntries, setSelectedEntries] = useState<SelectedEntry[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load recent log entries
  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('log_entries')
        .select('id, title, type, tags, entry_date')
        .order('entry_date', { ascending: false })
        .limit(50)

      if (searchTerm.trim()) {
        query = query.ilike('title', `%${searchTerm}%`)
      }

      const { data, error } = await query

      if (!error && data) {
        setEntries(data as LogEntry[])
      }
    } catch (err) {
      console.error('Error loading log entries:', err)
    } finally {
      setLoading(false)
    }
  }, [searchTerm])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Load drafts when entry is selected
  const loadDraftsForEntry = async (entry: LogEntry): Promise<LogEntryDraft[]> => {
    const result = await getDraftsForEntry(entry.id)
    if (result.success && result.data) {
      return result.data
    }
    return []
  }

  // Notify parent of source changes
  const notifySources = useCallback((entries: SelectedEntry[]) => {
    const sources: LogEntrySource[] = entries
      .filter((e) => e.selectedDraftId && !e.loadingDrafts)
      .map((e) => {
        const draft = e.drafts.find((d) => d.id === e.selectedDraftId)
        return {
          entryId: e.entry.id,
          title: e.entry.title,
          type: e.entry.type || undefined,
          tags: e.entry.tags || undefined,
          content: draft?.content || '',
        }
      })
    onSourcesChange(sources)
  }, [onSourcesChange])

  // Select an entry
  const handleSelectEntry = async (entry: LogEntry) => {
    if (selectedEntries.length >= MAX_ENTRIES) return
    if (selectedEntries.some((e) => e.entry.id === entry.id)) return

    // Add entry with loading state
    const newEntry: SelectedEntry = {
      entry,
      drafts: [],
      selectedDraftId: null,
      loadingDrafts: true,
    }

    const updated = [...selectedEntries, newEntry]
    setSelectedEntries(updated)
    setIsOpen(false)
    setSearchTerm('')

    // Load drafts
    const drafts = await loadDraftsForEntry(entry)
    const primaryDraft = drafts.find((d) => d.is_primary) || drafts[0]

    setSelectedEntries((prev) =>
      prev.map((e) =>
        e.entry.id === entry.id
          ? {
              ...e,
              drafts,
              selectedDraftId: primaryDraft?.id || null,
              loadingDrafts: false,
            }
          : e
      )
    )

    // Notify with updated entry
    const finalEntry = {
      entry,
      drafts,
      selectedDraftId: primaryDraft?.id || null,
      loadingDrafts: false,
    }
    notifySources([...selectedEntries.filter((e) => e.entry.id !== entry.id), finalEntry])
  }

  // Remove an entry
  const handleRemoveEntry = (entryId: string) => {
    const updated = selectedEntries.filter((e) => e.entry.id !== entryId)
    setSelectedEntries(updated)
    notifySources(updated)
  }

  // Change draft for an entry
  const handleDraftChange = (entryId: string, draftId: string) => {
    const updated = selectedEntries.map((e) =>
      e.entry.id === entryId ? { ...e, selectedDraftId: draftId } : e
    )
    setSelectedEntries(updated)
    notifySources(updated)
  }

  // Filter out already selected entries
  const availableEntries = entries.filter(
    (e) => !selectedEntries.some((s) => s.entry.id === e.id)
  )

  const canAddMore = selectedEntries.length < MAX_ENTRIES

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">Source from Log Entries</label>
        <span className="text-xs text-muted-foreground">
          {selectedEntries.length}/{MAX_ENTRIES}
        </span>
      </div>

      {/* Selected Entries */}
      {selectedEntries.length > 0 && (
        <div className="space-y-2">
          {selectedEntries.map((selected) => (
            <div
              key={selected.entry.id}
              className="p-2 rounded-lg border bg-muted/30 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{selected.entry.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {selected.entry.type && (
                      <span className="capitalize">{selected.entry.type}</span>
                    )}
                    {selected.entry.entry_date && (
                      <span> · {new Date(selected.entry.entry_date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveEntry(selected.entry.id)}
                  disabled={disabled}
                  className="text-muted-foreground hover:text-foreground p-1"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>

              {/* Draft Selector */}
              {selected.loadingDrafts ? (
                <div className="text-xs text-muted-foreground">Loading drafts...</div>
              ) : selected.drafts.length > 0 ? (
                <select
                  value={selected.selectedDraftId || ''}
                  onChange={(e) => handleDraftChange(selected.entry.id, e.target.value)}
                  disabled={disabled}
                  className="w-full text-xs px-2 py-1 rounded border bg-background"
                >
                  {selected.drafts.map((draft, idx) => (
                    <option key={draft.id} value={draft.id}>
                      {draft.is_primary ? '★ ' : ''}
                      {draft.label || `Draft ${idx + 1}`}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  No drafts found
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Entry Dropdown */}
      {canAddMore && (
        <div className="relative" ref={dropdownRef}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search log entries..."
            disabled={disabled}
            className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
          />

          {isOpen && (
            <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-lg border bg-popover shadow-lg">
              {loading ? (
                <div className="p-3 text-sm text-muted-foreground">Loading...</div>
              ) : availableEntries.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">
                  {searchTerm ? 'No matching entries' : 'No entries available'}
                </div>
              ) : (
                availableEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => handleSelectEntry(entry)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <div className="font-medium truncate">{entry.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {entry.type && <span className="capitalize">{entry.type}</span>}
                      {entry.entry_date && (
                        <span> · {new Date(entry.entry_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {selectedEntries.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Select log entries to generate project fields from their content.
        </p>
      )}
    </div>
  )
}
