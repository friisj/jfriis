'use client'

import { useCallback, useMemo } from 'react'

// ============================================================================
// Types
// ============================================================================

/** Direction for arrow key navigation */
export type NavigationDirection = 'up' | 'down' | 'left' | 'right'

export interface UseGridCellInteractionOptions {
  /** Called when a cell is clicked */
  onCellClick?: (columnId: string, layerId: string) => void
  /** Called when a key is pressed while focused on a cell */
  onCellKeyDown?: (columnId: string, layerId: string, key: string) => void
  /**
   * Called when arrow key is pressed for navigation.
   * Return the columnId and layerId of the target cell to move focus there.
   */
  onNavigate?: (
    currentColumnId: string,
    currentLayerId: string,
    direction: NavigationDirection
  ) => { columnId: string; layerId: string } | null
  /**
   * Function to check if a click was on content within the cell that should handle its own click.
   * For example, clicking on a story card should not also select the cell.
   * Returns true if the event should be ignored (not trigger cell selection).
   */
  isClickOnContent?: (event: MouseEvent) => boolean
  /**
   * Data attribute to check for content clicks.
   * Alternative to isClickOnContent for simple cases.
   * Example: 'data-story-card' - if any ancestor has this attribute, click is ignored.
   */
  contentDataAttribute?: string
  /** Whether cells are disabled (no interaction) */
  disabled?: boolean
}

/**
 * Props to spread on a cell element for consistent interaction behavior.
 * Use the getCellProps function from useGridCellInteraction to generate these props.
 */
export interface CellInteractionProps {
  /** Click handler for cell selection */
  onClick: (e: React.MouseEvent) => void
  /** Keyboard handler for Enter/Space selection and arrow key navigation */
  onKeyDown: (e: React.KeyboardEvent) => void
  /** Tab index for keyboard focus (-1 when disabled, 0 otherwise) */
  tabIndex: number
  /** ARIA role for grid cell semantics */
  role: string
  /** Accessible label describing the cell position */
  'aria-label': string
  /** Whether this cell is currently selected */
  'aria-selected'?: boolean
  /** Data attribute for cell key, used for arrow key navigation focus */
  'data-cell-key': string
}

/**
 * Return value from useGridCellInteraction hook.
 * Provides a function to generate consistent cell interaction props.
 */
export interface UseGridCellInteractionReturn {
  /**
   * Get props to spread on a cell element for consistent interaction behavior.
   * Includes click handler, keyboard handler, and accessibility attributes.
   */
  getCellProps: (
    columnId: string,
    layerId: string,
    options?: {
      isSelected?: boolean
      columnName?: string
      layerName?: string
    }
  ) => CellInteractionProps
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for consistent cell interaction handling across canvas components.
 * Provides click and keyboard handlers with accessibility support.
 *
 * Features:
 * - Click handling with content detection (e.g., don't select cell when clicking story card)
 * - Keyboard navigation (Enter/Space to select, Arrow keys for grid navigation)
 * - Accessibility attributes (role, tabIndex, aria-label, data-cell-key)
 *
 * @example
 * ```tsx
 * const { getCellProps } = useGridCellInteraction({
 *   onCellClick: (columnId, layerId) => selectCell(columnId, layerId),
 *   contentDataAttribute: 'data-story-card',
 *   onNavigate: (columnId, layerId, direction) => {
 *     // Return target cell coordinates based on direction
 *     return getAdjacentCell(columnId, layerId, direction)
 *   },
 * })
 *
 * // In cell rendering:
 * <div {...getCellProps(activity.id, layer.id, {
 *   isSelected: isSelected(activity.id, layer.id),
 *   columnName: activity.name,
 *   layerName: layer.name,
 * })}>
 *   {cellContent}
 * </div>
 * ```
 */
export function useGridCellInteraction(
  options: UseGridCellInteractionOptions
): UseGridCellInteractionReturn {
  const {
    onCellClick,
    onCellKeyDown,
    onNavigate,
    isClickOnContent,
    contentDataAttribute,
    disabled = false,
  } = options

  // Check if click should be ignored (clicked on content within cell)
  const shouldIgnoreClick = useCallback(
    (event: MouseEvent): boolean => {
      // Custom function check
      if (isClickOnContent?.(event)) {
        return true
      }

      // Data attribute check
      if (contentDataAttribute) {
        const target = event.target as HTMLElement
        // Check if target or any ancestor has the data attribute
        const contentElement = target.closest(`[${contentDataAttribute}]`)
        if (contentElement) {
          return true
        }
      }

      return false
    },
    [isClickOnContent, contentDataAttribute]
  )

  // Get props for a cell
  const getCellProps = useCallback(
    (
      columnId: string,
      layerId: string,
      options?: {
        isSelected?: boolean
        columnName?: string
        layerName?: string
      }
    ): CellInteractionProps => {
      const { isSelected, columnName, layerName } = options ?? {}

      const columnLabel = columnName ?? `column ${columnId}`
      const layerLabel = layerName ?? `row ${layerId}`
      const ariaLabel = `Cell at ${columnLabel}, ${layerLabel}${isSelected ? ' (selected)' : ''}`

      return {
        onClick: (e: React.MouseEvent) => {
          if (disabled) return

          // Check if click should be ignored
          if (shouldIgnoreClick(e.nativeEvent)) {
            return
          }

          onCellClick?.(columnId, layerId)
        },
        onKeyDown: (e: React.KeyboardEvent) => {
          if (disabled) return

          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onCellKeyDown?.(columnId, layerId, e.key)
            // Also trigger click behavior on Enter/Space
            onCellClick?.(columnId, layerId)
            return
          }

          // Arrow key navigation
          const arrowKeyMap: Record<string, NavigationDirection> = {
            ArrowUp: 'up',
            ArrowDown: 'down',
            ArrowLeft: 'left',
            ArrowRight: 'right',
          }

          const direction = arrowKeyMap[e.key]
          if (direction && onNavigate) {
            e.preventDefault()
            const target = onNavigate(columnId, layerId, direction)
            if (target) {
              // Focus the target cell element
              const targetCell = document.querySelector(
                `[data-cell-key="${target.columnId}:${target.layerId}"]`
              ) as HTMLElement | null
              targetCell?.focus()
            }
          }
        },
        tabIndex: disabled ? -1 : 0,
        role: 'gridcell',
        'aria-label': ariaLabel,
        'data-cell-key': `${columnId}:${layerId}`,
        ...(isSelected !== undefined && { 'aria-selected': isSelected }),
      }
    },
    [disabled, shouldIgnoreClick, onCellClick, onCellKeyDown, onNavigate]
  )

  return { getCellProps }
}

// ============================================================================
// Utility: Check for content data attribute
// ============================================================================

/**
 * Check if an element or any of its ancestors has the specified data attribute.
 * Useful for determining if a click was on cell content (e.g., story card).
 *
 * @example
 * ```tsx
 * const isOnStoryCard = hasDataAttribute(event.target, 'data-story-card')
 * ```
 */
export function hasDataAttribute(
  element: HTMLElement | null,
  attribute: string
): boolean {
  if (!element) return false
  return element.closest(`[${attribute}]`) !== null
}
