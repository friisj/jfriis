'use client'

import { useState, useCallback, useMemo } from 'react'

// ============================================================================
// Types
// ============================================================================

export interface UseCellSelectionOptions {
  /** Parent entity ID (storyMapId, blueprintId, or journeyId) - used for context */
  parentId: string
  /** Default layer to select when a column is clicked without specifying a layer */
  defaultLayer?: string
  /** Called when selection changes */
  onSelectionChange?: (cellKey: string | null) => void
}

/**
 * Return value from useCanvasCellSelection hook.
 * Provides state and functions for managing cell selection in canvas grids.
 */
export interface UseCellSelectionReturn {
  /** Currently selected cell key in format "columnId:layerId" */
  selectedCellKey: string | null
  /** Select a specific cell */
  selectCell: (columnId: string, layerId: string) => void
  /** Clear the current selection */
  clearSelection: () => void
  /** Check if a specific cell is selected */
  isSelected: (columnId: string, layerId: string) => boolean
  /** Get the cell key for a column and layer combination */
  getCellKey: (columnId: string, layerId: string) => string
  /** Parse a cell key into its components */
  parseCellKey: (cellKey: string) => { columnId: string; layerId: string } | null
  /** Get the currently selected column and layer IDs */
  selectedCell: { columnId: string; layerId: string } | null
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing cell selection state in canvas components.
 * Provides a consistent selection pattern across Story Map, Blueprint, and Journey canvases.
 *
 * Cell keys are formatted as "columnId:layerId" to uniquely identify each cell in the grid.
 *
 * @example
 * ```tsx
 * const { selectedCellKey, selectCell, isSelected, clearSelection } = useCanvasCellSelection({
 *   parentId: storyMapId,
 *   onSelectionChange: (key) => console.log('Selected:', key)
 * })
 *
 * // In cell rendering:
 * <div
 *   onClick={() => selectCell(activity.id, layer.id)}
 *   className={isSelected(activity.id, layer.id) ? 'ring-2 ring-primary' : ''}
 * >
 *   {cellContent}
 * </div>
 * ```
 */
export function useCanvasCellSelection(
  options: UseCellSelectionOptions
): UseCellSelectionReturn {
  const { onSelectionChange, defaultLayer } = options

  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null)

  // Get cell key from column and layer IDs
  const getCellKey = useCallback((columnId: string, layerId: string): string => {
    return `${columnId}:${layerId}`
  }, [])

  // Parse cell key into components
  const parseCellKey = useCallback(
    (cellKey: string): { columnId: string; layerId: string } | null => {
      if (!cellKey) return null
      const parts = cellKey.split(':')
      if (parts.length !== 2) return null
      const [columnId, layerId] = parts
      // Guard against empty parts (e.g., ":", "foo:", ":bar")
      if (!columnId || !layerId) return null
      return { columnId, layerId }
    },
    []
  )

  // Select a specific cell
  const selectCell = useCallback(
    (columnId: string, layerId: string) => {
      const key = getCellKey(columnId, layerId)
      setSelectedCellKey(key)
      onSelectionChange?.(key)
    },
    [getCellKey, onSelectionChange]
  )

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedCellKey(null)
    onSelectionChange?.(null)
  }, [onSelectionChange])

  // Check if a cell is selected
  const isSelected = useCallback(
    (columnId: string, layerId: string): boolean => {
      return selectedCellKey === getCellKey(columnId, layerId)
    },
    [selectedCellKey, getCellKey]
  )

  // Get currently selected cell as parsed object
  const selectedCell = useMemo(() => {
    if (!selectedCellKey) return null
    return parseCellKey(selectedCellKey)
  }, [selectedCellKey, parseCellKey])

  return {
    selectedCellKey,
    selectCell,
    clearSelection,
    isSelected,
    getCellKey,
    parseCellKey,
    selectedCell,
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a cell key from column and layer IDs.
 * Standalone utility for use outside the hook.
 */
export function createCellKey(columnId: string, layerId: string): string {
  return `${columnId}:${layerId}`
}

/**
 * Parse a cell key into its components.
 * Standalone utility for use outside the hook.
 * Returns null for invalid keys (empty, wrong format, or empty parts).
 */
export function parseCellKeyUtil(
  cellKey: string
): { columnId: string; layerId: string } | null {
  if (!cellKey) return null
  const parts = cellKey.split(':')
  if (parts.length !== 2) return null
  const [columnId, layerId] = parts
  // Guard against empty parts (e.g., ":", "foo:", ":bar")
  if (!columnId || !layerId) return null
  return { columnId, layerId }
}
