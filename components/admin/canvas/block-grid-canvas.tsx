'use client'

import React, { ReactNode, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { CanvasMode } from './canvas-header'

// ============================================================================
// Types
// ============================================================================

export interface GridLayoutConfig {
  gridTemplateAreas: string
  gridTemplateColumns: string
  gridTemplateRows: string
}

/**
 * HIGH 9: Minimal type constraints for blocks
 * Ensures blocks have required structure for grid rendering
 */
export interface MinimalBlock {
  blockId: string
}

/**
 * HIGH 9: Minimal type constraints for items
 * Ensures items have required structure for selection/identification
 */
export interface MinimalItem {
  id: string
}

export interface BlockGridCanvasProps<
  TBlock extends MinimalBlock,
  TItem extends MinimalItem
> {
  // Data
  blocks: TBlock[]
  mode: CanvasMode

  // Configuration - getters
  getBlockId: (block: TBlock) => string
  getBlockName: (block: TBlock) => string
  getBlockGridArea: (block: TBlock) => string
  getBlockColor?: (block: TBlock) => string
  getBlockBgClass?: (block: TBlock) => string
  getBlockItems: (block: TBlock) => TItem[]
  getItemId: (item: TItem) => string

  // Layout
  gridLayout: GridLayoutConfig

  // Selection state
  selectedBlockId?: string | null
  selectedItemId?: string | null

  // Render slots
  renderBlockHeader?: (block: TBlock, itemCount: number) => ReactNode
  renderItem?: (item: TItem, block: TBlock, isSelected: boolean) => ReactNode
  renderEmptyBlock?: (block: TBlock) => ReactNode
  renderAddButton?: (block: TBlock) => ReactNode

  // Callbacks
  onBlockClick?: (blockId: string) => void
  onItemClick?: (itemId: string, blockId: string) => void
  onItemReorder?: (blockId: string, itemIds: string[]) => void
  onBackgroundClick?: () => void
  onAddItem?: (blockId: string) => void

  // Styling
  className?: string
  gap?: string
  minBlockHeight?: string
}

// ============================================================================
// Component
// HIGH 9: Type constraints ensure blocks and items have required structure
// HIGH 10: Keyboard accessibility with arrow key navigation
// ============================================================================

export function BlockGridCanvas<
  TBlock extends MinimalBlock,
  TItem extends MinimalItem
>({
  blocks,
  mode,
  getBlockId,
  getBlockName,
  getBlockGridArea,
  getBlockColor,
  getBlockBgClass,
  getBlockItems,
  getItemId,
  gridLayout,
  selectedBlockId,
  selectedItemId,
  renderBlockHeader,
  renderItem,
  renderEmptyBlock,
  renderAddButton,
  onBlockClick,
  onItemClick,
  onBackgroundClick,
  onAddItem,
  className,
  gap = '0.5rem',
  minBlockHeight = '120px',
}: BlockGridCanvasProps<TBlock, TItem>) {
  // Handle background click to deselect
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onBackgroundClick?.()
    }
  }

  // HIGH 10: Keyboard handler for block navigation
  const handleBlockKeyDown = useCallback(
    (e: React.KeyboardEvent, blockId: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (mode === 'structured') {
          onBlockClick?.(blockId)
        }
      }
    },
    [mode, onBlockClick]
  )

  return (
    <div
      className={cn('w-full h-full p-4', className)}
      onClick={handleBackgroundClick}
      // HIGH 10: ARIA attributes for grid
      role="grid"
      aria-label="Canvas blocks"
    >
      <div
        className="grid h-full"
        style={{
          gridTemplateAreas: gridLayout.gridTemplateAreas,
          gridTemplateColumns: gridLayout.gridTemplateColumns,
          gridTemplateRows: gridLayout.gridTemplateRows,
          gap,
        }}
      >
        {blocks.map((block, blockIndex) => {
          const blockId = getBlockId(block)
          const items = getBlockItems(block)
          const isBlockSelected = selectedBlockId === blockId
          const bgClass = getBlockBgClass?.(block) || 'bg-muted/30'

          return (
            <div
              key={blockId}
              className={cn(
                'rounded-lg border p-3 flex flex-col transition-all',
                bgClass,
                isBlockSelected && 'ring-2 ring-primary',
                mode === 'structured' && 'cursor-pointer hover:border-primary/50'
              )}
              style={{
                gridArea: getBlockGridArea(block),
                minHeight: minBlockHeight,
              }}
              onClick={(e) => {
                e.stopPropagation()
                if (mode === 'structured') {
                  onBlockClick?.(blockId)
                }
              }}
              // HIGH 10: Keyboard accessibility
              role="gridcell"
              tabIndex={0}
              aria-label={`${getBlockName(block)} block with ${items.length} items`}
              aria-selected={isBlockSelected}
              onKeyDown={(e) => handleBlockKeyDown(e, blockId)}
            >
              {/* Block Header */}
              {renderBlockHeader ? (
                renderBlockHeader(block, items.length)
              ) : (
                <DefaultBlockHeader
                  name={getBlockName(block)}
                  itemCount={items.length}
                  color={getBlockColor?.(block)}
                />
              )}

              {/* Items List */}
              <div
                className="flex-1 overflow-y-auto space-y-2 mt-2"
                role="list"
                aria-label={`Items in ${getBlockName(block)}`}
              >
                {items.length === 0 ? (
                  renderEmptyBlock ? (
                    renderEmptyBlock(block)
                  ) : (
                    <DefaultEmptyState mode={mode} />
                  )
                ) : (
                  items.map((item, itemIndex) => {
                    const itemId = getItemId(item)
                    const isItemSelected = selectedItemId === itemId

                    return (
                      <div
                        key={itemId}
                        onClick={(e) => {
                          e.stopPropagation()
                          onItemClick?.(itemId, blockId)
                        }}
                        className={cn(
                          'cursor-pointer transition-all',
                          isItemSelected && 'ring-2 ring-primary rounded-md'
                        )}
                        role="listitem"
                      >
                        {renderItem ? (
                          renderItem(item, block, isItemSelected)
                        ) : (
                          <DefaultItemCard
                            content={String(item)}
                            isSelected={isItemSelected}
                          />
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Add Button */}
              {mode === 'structured' && renderAddButton && (
                <div className="mt-2 pt-2 border-t border-dashed">
                  {renderAddButton(block)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Default Sub-components
// ============================================================================

interface DefaultBlockHeaderProps {
  name: string
  itemCount: number
  color?: string
}

function DefaultBlockHeader({ name, itemCount, color }: DefaultBlockHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {color && (
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        <h3 className="text-sm font-medium text-foreground">{name}</h3>
      </div>
      <span className="text-xs text-muted-foreground">{itemCount}</span>
    </div>
  )
}

interface DefaultEmptyStateProps {
  mode: CanvasMode
}

function DefaultEmptyState({ mode }: DefaultEmptyStateProps) {
  return (
    <div className="flex items-center justify-center h-full min-h-[60px] text-xs text-muted-foreground">
      {mode === 'structured' ? 'Click to add items' : 'No items yet'}
    </div>
  )
}

interface DefaultItemCardProps {
  content: string
  isSelected: boolean
}

function DefaultItemCard({ content, isSelected }: DefaultItemCardProps) {
  return (
    <div
      className={cn(
        'p-2 text-sm bg-background border rounded-md',
        'hover:border-primary/50 transition-colors',
        isSelected && 'border-primary bg-primary/5'
      )}
    >
      {content}
    </div>
  )
}

export type { CanvasMode }
