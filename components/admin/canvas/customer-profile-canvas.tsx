'use client'

import React, { useMemo, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BlockGridCanvas, type CanvasMode } from './block-grid-canvas'
import { CustomerProfileItemCard } from './customer-profile-item'
import type {
  CustomerProfileCanvas as CustomerProfileCanvasType,
  ProfileBlock,
  ProfileItem,
  ProfileBlockId,
  ProfileBlockConfig,
} from '@/lib/boundary-objects/customer-profile-canvas'
import {
  PROFILE_BLOCK_IDS,
  PROFILE_BLOCK_CONFIG,
  PROFILE_GRID_TEMPLATE,
  PROFILE_GRID_COLUMNS,
  PROFILE_GRID_ROWS,
  getCanvasBlock,
} from '@/lib/boundary-objects/customer-profile-canvas'

// ============================================================================
// Types
// ============================================================================

interface BlockWithConfig {
  blockId: ProfileBlockId
  block: ProfileBlock<ProfileItem>
  config: ProfileBlockConfig
}

export interface CustomerProfileCanvasProps {
  canvas: CustomerProfileCanvasType
  mode: CanvasMode
  selectedBlockId: ProfileBlockId | null
  selectedItemId: string | null
  onBlockClick: (blockId: ProfileBlockId) => void
  onItemClick: (itemId: string, blockId: ProfileBlockId) => void
  onAddItem: (blockId: ProfileBlockId) => void
  onBackgroundClick: () => void
}

// ============================================================================
// Component
// ============================================================================

export function CustomerProfileCanvas({
  canvas,
  mode,
  selectedBlockId,
  selectedItemId,
  onBlockClick,
  onItemClick,
  onAddItem,
  onBackgroundClick,
}: CustomerProfileCanvasProps) {
  // Build blocks array with their configs
  const blocks: BlockWithConfig[] = useMemo(() => {
    return PROFILE_BLOCK_IDS.map((blockId) => ({
      blockId,
      block: getCanvasBlock(canvas, blockId),
      config: PROFILE_BLOCK_CONFIG[blockId],
    }))
  }, [canvas])

  // Grid layout configuration
  const gridLayout = useMemo(
    () => ({
      gridTemplateAreas: PROFILE_GRID_TEMPLATE,
      gridTemplateColumns: PROFILE_GRID_COLUMNS,
      gridTemplateRows: PROFILE_GRID_ROWS,
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
    (item: ProfileItem, blockWithConfig: BlockWithConfig, isSelected: boolean) => {
      return (
        <CustomerProfileItemCard
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
    <BlockGridCanvas<BlockWithConfig, ProfileItem>
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
      onBlockClick={(id) => onBlockClick(id as ProfileBlockId)}
      onItemClick={(itemId, blockId) => onItemClick(itemId, blockId as ProfileBlockId)}
      onBackgroundClick={onBackgroundClick}
      minBlockHeight="200px"
    />
  )
}
