'use client'

import React, { useMemo, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BlockGridCanvas, type CanvasMode } from './block-grid-canvas'
import { ValueMapItemCard } from './value-map-item'
import type {
  ValueMapCanvas as ValueMapCanvasType,
  ValueMapBlock,
  ValueMapItem,
  ValueMapBlockId,
  ValueMapBlockConfig,
} from '@/lib/boundary-objects/value-map-canvas'
import {
  VALUE_MAP_BLOCK_IDS,
  VALUE_MAP_BLOCK_CONFIG,
  VALUE_MAP_GRID_TEMPLATE,
  VALUE_MAP_GRID_COLUMNS,
  VALUE_MAP_GRID_ROWS,
  getCanvasBlock,
} from '@/lib/boundary-objects/value-map-canvas'

// ============================================================================
// Types
// ============================================================================

interface BlockWithConfig {
  blockId: ValueMapBlockId
  block: ValueMapBlock<ValueMapItem>
  config: ValueMapBlockConfig
}

export interface ValueMapCanvasProps {
  canvas: ValueMapCanvasType
  mode: CanvasMode
  selectedBlockId: ValueMapBlockId | null
  selectedItemId: string | null
  onBlockClick: (blockId: ValueMapBlockId) => void
  onItemClick: (itemId: string, blockId: ValueMapBlockId) => void
  onAddItem: (blockId: ValueMapBlockId) => void
  onBackgroundClick: () => void
}

// ============================================================================
// Component
// ============================================================================

export function ValueMapCanvas({
  canvas,
  mode,
  selectedBlockId,
  selectedItemId,
  onBlockClick,
  onItemClick,
  onAddItem,
  onBackgroundClick,
}: ValueMapCanvasProps) {
  // Build blocks array with their configs
  const blocks: BlockWithConfig[] = useMemo(() => {
    return VALUE_MAP_BLOCK_IDS.map((blockId) => ({
      blockId,
      block: getCanvasBlock(canvas, blockId),
      config: VALUE_MAP_BLOCK_CONFIG[blockId],
    }))
  }, [canvas])

  // Grid layout configuration
  const gridLayout = useMemo(
    () => ({
      gridTemplateAreas: VALUE_MAP_GRID_TEMPLATE,
      gridTemplateColumns: VALUE_MAP_GRID_COLUMNS,
      gridTemplateRows: VALUE_MAP_GRID_ROWS,
    }),
    []
  )

  // Render block header with color indicator
  const renderBlockHeader = useCallback(
    (blockWithConfig: BlockWithConfig, itemCount: number) => {
      const { config } = blockWithConfig

      return (
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: config.color }}
            />
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
              {config.shortName}
            </h3>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {itemCount}
          </span>
        </div>
      )
    },
    []
  )

  // Render individual item
  const renderItem = useCallback(
    (item: ValueMapItem, blockWithConfig: BlockWithConfig, isSelected: boolean) => {
      return (
        <ValueMapItemCard
          item={item}
          blockId={blockWithConfig.blockId}
          isSelected={isSelected}
          onClick={() => onItemClick(item.id, blockWithConfig.blockId)}
        />
      )
    },
    [onItemClick]
  )

  // Render empty block state
  const renderEmptyBlock = useCallback(
    (blockWithConfig: BlockWithConfig) => {
      return (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground text-center px-2">
            {mode === 'structured'
              ? 'Click + to add items'
              : 'No items yet'}
          </p>
        </div>
      )
    },
    [mode]
  )

  // Render add button
  const renderAddButton = useCallback(
    (blockWithConfig: BlockWithConfig) => {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAddItem(blockWithConfig.blockId)
          }}
          className={cn(
            'w-full flex items-center justify-center gap-1 py-1.5',
            'text-xs text-muted-foreground hover:text-foreground',
            'hover:bg-muted/50 rounded transition-colors'
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      )
    },
    [onAddItem]
  )

  return (
    <BlockGridCanvas<BlockWithConfig, ValueMapItem>
      blocks={blocks}
      mode={mode}
      getBlockId={(b) => b.blockId}
      getBlockName={(b) => b.config.name}
      getBlockGridArea={(b) => b.blockId}
      getBlockColor={(b) => b.config.color}
      getBlockBgClass={(b) => b.config.bgClass}
      getBlockItems={(b) => b.block.items}
      getItemId={(item) => item.id}
      gridLayout={gridLayout}
      selectedBlockId={selectedBlockId}
      selectedItemId={selectedItemId}
      renderBlockHeader={renderBlockHeader}
      renderItem={renderItem}
      renderEmptyBlock={renderEmptyBlock}
      renderAddButton={renderAddButton}
      onBlockClick={(id) => onBlockClick(id as ValueMapBlockId)}
      onItemClick={(itemId, blockId) => onItemClick(itemId, blockId as ValueMapBlockId)}
      onBackgroundClick={onBackgroundClick}
      minBlockHeight="200px"
    />
  )
}
