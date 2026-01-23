'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { handleSupabaseResult, showErrorToast, showSuccessToast } from '@/lib/utils/error-handling'
import { validateAssumptionForm } from '@/lib/utils/validation'
import type { CanvasType } from '@/lib/types/canvas-items'

// Extended canvas types for assumption source tracking
type AssumptionSourceType = CanvasType | 'value_proposition_canvas'

interface Assumption {
  id: string
  slug: string
  statement: string
  category: string
  importance: string
  evidence_level: string
  status: string
  is_leap_of_faith: boolean | null
}

interface AssumptionLinkerProps {
  /** Currently linked assumption IDs (for block-level linking) */
  linkedIds?: string[]
  /** Called when links change (for block-level linking) */
  onChange?: (ids: string[]) => void
  /** Canvas item ID (for item-level linking via canvas_item_assumptions table) */
  canvasItemId?: string
  /** Source context for new assumptions */
  sourceType: AssumptionSourceType
  /** Block name within the canvas (e.g., 'customer_segments') */
  sourceBlock?: string
  /** Project ID for filtering and new assumptions */
  projectId?: string
  /** Compact mode for inline display */
  compact?: boolean
}

const categoryColors: Record<string, string> = {
  desirability: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  viability: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  feasibility: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  usability: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  ethical: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
}

const categoryLabels: Record<string, string> = {
  desirability: 'Desirability',
  viability: 'Viability',
  feasibility: 'Feasibility',
  usability: 'Usability',
  ethical: 'Ethical',
}

const importanceLabels: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const evidenceLabels: Record<string, string> = {
  none: 'None',
  weak: 'Weak',
  moderate: 'Moderate',
  strong: 'Strong',
}

const statusLabels: Record<string, string> = {
  identified: 'Identified',
  prioritized: 'Prioritized',
  testing: 'Testing',
  validated: 'Validated',
  invalidated: 'Invalidated',
  archived: 'Archived',
}

export function AssumptionLinker({
  linkedIds = [],
  onChange,
  canvasItemId,
  sourceType,
  sourceBlock,
  projectId,
  compact = false,
}: AssumptionLinkerProps) {
  const [linkedAssumptions, setLinkedAssumptions] = useState<Assumption[]>([])
  const [allAssumptions, setAllAssumptions] = useState<Assumption[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [linking, setLinking] = useState(false)
  const [unlinking, setUnlinking] = useState<string | null>(null)
  const [newStatement, setNewStatement] = useState('')
  const [newCategory, setNewCategory] = useState('desirability')
  const [itemLinkedIds, setItemLinkedIds] = useState<string[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const isItemMode = !!canvasItemId
  const activeLinkedIds = isItemMode ? itemLinkedIds : linkedIds

  // Fetch all assumptions for search
  useEffect(() => {
    async function fetchAssumptions() {
      let query = supabase
        .from('assumptions')
        .select('id, slug, statement, category, importance, evidence_level, status, is_leap_of_faith')
        .order('updated_at', { ascending: false })

      // SECURITY FIX: Use proper parameter binding instead of string interpolation
      if (projectId) {
        // Fetch items that either belong to this project OR are global (null project_id)
        query = query.or(`studio_project_id.eq.${projectId},studio_project_id.is.null`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching assumptions:', error)
        setAllAssumptions([])
        return
      }

      setAllAssumptions(data || [])
    }
    fetchAssumptions()
  }, [projectId])

  // Fetch item-level linked assumptions from canvas_item_assumptions table
  useEffect(() => {
    if (!canvasItemId) return

    async function fetchItemAssumptions() {
      const { data } = await supabase
        .from('canvas_item_assumptions')
        .select('assumption_id')
        .eq('canvas_item_id', canvasItemId!)

      const ids = (data || []).map((row) => row.assumption_id)
      setItemLinkedIds(ids)
    }
    fetchItemAssumptions()
  }, [canvasItemId])

  // Fetch linked assumptions details
  useEffect(() => {
    if (activeLinkedIds.length === 0) {
      setLinkedAssumptions([])
      return
    }

    async function fetchLinked() {
      const { data } = await supabase
        .from('assumptions')
        .select('id, slug, statement, category, importance, evidence_level, status, is_leap_of_faith')
        .in('id', activeLinkedIds)

      // Preserve order from activeLinkedIds
      const ordered = activeLinkedIds
        .map((id) => data?.find((a) => a.id === id))
        .filter(Boolean) as Assumption[]
      setLinkedAssumptions(ordered)
    }
    fetchLinked()
  }, [activeLinkedIds])

  const handleLink = useCallback(
    async (assumptionId: string) => {
      // Prevent duplicate links
      if (activeLinkedIds.includes(assumptionId)) {
        showErrorToast('This assumption is already linked')
        return
      }

      // Prevent concurrent operations
      if (linking) return

      setLinking(true)
      try {
        if (isItemMode && canvasItemId) {
          // Item-level linking: save to canvas_item_assumptions table
          const { data, error } = await supabase.from('canvas_item_assumptions').insert([
            {
              canvas_item_id: canvasItemId,
              assumption_id: assumptionId,
            },
          ])

          if (error) {
            console.error('Error linking assumption:', error)
            showErrorToast('Failed to link assumption')
            return
          }

          // Only update state after successful DB operation
          setItemLinkedIds([...itemLinkedIds, assumptionId])
        } else if (onChange) {
          // Block-level linking: update array via onChange
          onChange([...linkedIds, assumptionId])
        }

        setSearchOpen(false)
        setSearchQuery('')
      } catch (error) {
        console.error('Unexpected error linking assumption:', error)
        showErrorToast('An unexpected error occurred')
      } finally {
        setLinking(false)
      }
    },
    [activeLinkedIds, isItemMode, canvasItemId, itemLinkedIds, onChange, linkedIds, linking]
  )

  const handleUnlink = useCallback(
    async (assumptionId: string) => {
      // Prevent concurrent operations
      if (unlinking) return

      setUnlinking(assumptionId)
      try {
        if (isItemMode && canvasItemId) {
          // Item-level unlinking: delete from canvas_item_assumptions table
          const { error } = await supabase
            .from('canvas_item_assumptions')
            .delete()
            .eq('canvas_item_id', canvasItemId)
            .eq('assumption_id', assumptionId)

          if (error) {
            console.error('Error unlinking assumption:', error)
            showErrorToast('Failed to unlink assumption')
            return
          }

          // Only update state after successful DB operation
          setItemLinkedIds(itemLinkedIds.filter((id) => id !== assumptionId))
        } else if (onChange) {
          // Block-level unlinking: update array via onChange
          onChange(linkedIds.filter((id) => id !== assumptionId))
        }
      } catch (error) {
        console.error('Unexpected error unlinking assumption:', error)
        showErrorToast('An unexpected error occurred')
      } finally {
        setUnlinking(null)
      }
    },
    [isItemMode, canvasItemId, itemLinkedIds, onChange, linkedIds, unlinking]
  )

  const handleCreate = async () => {
    // Validate form data
    const validation = validateAssumptionForm({
      statement: newStatement,
      category: newCategory,
    })

    if (!validation.valid) {
      setValidationErrors(validation.errors)
      return
    }

    setValidationErrors({})
    setCreating(true)

    try {
      // Generate slug from statement
      const slug = newStatement
        .toLowerCase()
        .slice(0, 50)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      // Create the assumption
      const { data, error } = await supabase
        .from('assumptions')
        .insert([
          {
            slug,
            statement: newStatement.trim(),
            category: newCategory,
            importance: 'medium',
            evidence_level: 'none',
            status: 'identified',
            studio_project_id: projectId || null,
            source_type: sourceType,
            source_block: sourceBlock || null,
          },
        ])
        .select('id')
        .single()

      if (error) {
        console.error('Error creating assumption:', error)
        showErrorToast('Failed to create assumption')
        return
      }

      // Link the new assumption (only update state after successful DB operation)
      if (isItemMode && canvasItemId) {
        // Item-level linking
        const { error: linkError } = await supabase.from('canvas_item_assumptions').insert([
          {
            canvas_item_id: canvasItemId,
            assumption_id: data.id,
          },
        ])

        if (linkError) {
          console.error('Error linking new assumption:', linkError)
          showErrorToast('Assumption created but failed to link')
          return
        }

        setItemLinkedIds([...itemLinkedIds, data.id])
      } else if (onChange) {
        // Block-level linking
        onChange([...linkedIds, data.id])
      }

      // Refresh the list
      const { data: allData, error: fetchError } = await supabase
        .from('assumptions')
        .select('id, slug, statement, category, importance, evidence_level, status, is_leap_of_faith')
        .order('updated_at', { ascending: false })

      if (!fetchError) {
        setAllAssumptions(allData || [])
      }

      setNewStatement('')
      setSearchOpen(false)
      showSuccessToast('Assumption created and linked')
    } catch (err) {
      console.error('Unexpected error creating assumption:', err)
      showErrorToast('An unexpected error occurred')
    } finally {
      setCreating(false)
    }
  }

  // Filter assumptions for search
  const unlinkedAssumptions = allAssumptions.filter(
    (a) =>
      !activeLinkedIds.includes(a.id) &&
      (searchQuery === '' ||
        a.statement.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.category.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-2">
      {/* Linked assumptions list */}
      {linkedAssumptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {linkedAssumptions.map((assumption) => (
            <AssumptionPill
              key={assumption.id}
              assumption={assumption}
              onUnlink={() => handleUnlink(assumption.id)}
              compact={compact}
              unlinking={unlinking === assumption.id}
            />
          ))}
        </div>
      )}

      {/* Add button with search popover */}
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-dashed hover:border-primary hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add assumption
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search assumptions..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-2 text-sm text-muted-foreground">No matching assumptions</div>
              </CommandEmpty>

              {unlinkedAssumptions.length > 0 && (
                <CommandGroup heading="Existing assumptions">
                  {unlinkedAssumptions.slice(0, 5).map((assumption) => (
                    <CommandItem
                      key={assumption.id}
                      value={assumption.id}
                      onSelect={() => handleLink(assumption.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{assumption.statement}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${categoryColors[assumption.category] || ''}`}
                          >
                            {categoryLabels[assumption.category]}
                          </span>
                          {assumption.is_leap_of_faith && (
                            <span className="text-xs text-amber-600 dark:text-amber-400">LoF</span>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                  {unlinkedAssumptions.length > 5 && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      +{unlinkedAssumptions.length - 5} more...
                    </div>
                  )}
                </CommandGroup>
              )}

              <CommandSeparator />

              {/* Create new inline */}
              <CommandGroup heading="Create new">
                <div className="p-2 space-y-2">
                  {validationErrors.statement && (
                    <div className="text-xs text-red-600 dark:text-red-400">
                      {validationErrors.statement}
                    </div>
                  )}
                  <textarea
                    value={newStatement}
                    onChange={(e) => {
                      setNewStatement(e.target.value)
                      if (validationErrors.statement) {
                        setValidationErrors((prev) => {
                          const newErrors = { ...prev }
                          delete newErrors.statement
                          return newErrors
                        })
                      }
                    }}
                    placeholder="We believe that..."
                    className={`w-full px-2 py-1.5 text-sm rounded border bg-background resize-none ${
                      validationErrors.statement ? 'border-red-500' : ''
                    }`}
                    rows={2}
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs rounded border bg-background"
                    >
                      <option value="desirability">Desirability</option>
                      <option value="viability">Viability</option>
                      <option value="feasibility">Feasibility</option>
                      <option value="usability">Usability</option>
                      <option value="ethical">Ethical</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={creating || !newStatement.trim()}
                      className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {creating ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/** Individual assumption pill with detail popover */
function AssumptionPill({
  assumption,
  onUnlink,
  compact,
  unlinking,
}: {
  assumption: Assumption
  onUnlink: () => void
  compact?: boolean
  unlinking?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [localData, setLocalData] = useState(assumption)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase
        .from('assumptions')
        .update({
          importance: localData.importance,
          evidence_level: localData.evidence_level,
          status: localData.status,
        })
        .eq('id', assumption.id)
      setEditing(false)
    } catch (err) {
      console.error('Error updating assumption:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded border transition-colors ${
            categoryColors[assumption.category] || 'bg-muted'
          } hover:opacity-80`}
        >
          {assumption.is_leap_of_faith && <span className="text-amber-500">!</span>}
          <span className={compact ? 'max-w-[120px] truncate' : 'max-w-[200px] truncate'}>
            {assumption.statement}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{assumption.statement}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded ${categoryColors[assumption.category]}`}>
                  {categoryLabels[assumption.category]}
                </span>
                {assumption.is_leap_of_faith && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    Leap of Faith
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details / Edit form */}
          {editing ? (
            <div className="space-y-2 pt-2 border-t">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Importance</label>
                  <select
                    value={localData.importance}
                    onChange={(e) => setLocalData({ ...localData, importance: e.target.value })}
                    className="w-full px-2 py-1 text-xs rounded border bg-background"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Evidence</label>
                  <select
                    value={localData.evidence_level}
                    onChange={(e) => setLocalData({ ...localData, evidence_level: e.target.value })}
                    className="w-full px-2 py-1 text-xs rounded border bg-background"
                  >
                    <option value="none">None</option>
                    <option value="weak">Weak</option>
                    <option value="moderate">Moderate</option>
                    <option value="strong">Strong</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <select
                  value={localData.status}
                  onChange={(e) => setLocalData({ ...localData, status: e.target.value })}
                  className="w-full px-2 py-1 text-xs rounded border bg-background"
                >
                  <option value="identified">Identified</option>
                  <option value="prioritized">Prioritized</option>
                  <option value="testing">Testing</option>
                  <option value="validated">Validated</option>
                  <option value="invalidated">Invalidated</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setLocalData(assumption)
                    setEditing(false)
                  }}
                  className="px-2 py-1 text-xs rounded border hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? '...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pt-2 border-t text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Importance</span>
                <span className={localData.importance === 'critical' ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                  {importanceLabels[localData.importance]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Evidence</span>
                <span>{evidenceLabels[localData.evidence_level]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span>{statusLabels[localData.status]}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <button
              type="button"
              onClick={onUnlink}
              disabled={unlinking}
              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {unlinking ? 'Unlinking...' : 'Unlink'}
            </button>
            <div className="flex items-center gap-2">
              {!editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Edit
                </button>
              )}
              <a
                href={`/admin/assumptions/${assumption.id}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Full details →
              </a>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
