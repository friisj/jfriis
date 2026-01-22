'use client'

import React, { useMemo, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BlockGridCanvas, type CanvasMode } from './block-grid-canvas'
import { BMCItemCard } from './bmc-item'
import type {
  BMCCanvas as BMCCanvasType,
  BMCBlock,
  BMCItem,
  BMCBlockId,
  BMCBlockConfig,
} from '@/lib/boundary-objects/bmc-canvas'
import {
  BMC_BLOCK_IDS,
  BMC_BLOCK_CONFIG,
  BMC_GRID_TEMPLATE,
  BMC_GRID_COLUMNS,
  BMC_GRID_ROWS,
  getCanvasBlock,
} from '@/lib/boundary-objects/bmc-canvas'

// ============================================================================
// Types
// ============================================================================

interface BlockWithConfig {
  blockId: BMCBlockId
  block: BMCBlock
  config: BMCBlockConfig
}

export interface BMCCanvasProps {
  canvas: BMCCanvasType
  mode: CanvasMode
  selectedBlockId: BMCBlockId | null
  selectedItemId: string | null
  onBlockClick: (blockId: BMCBlockId) => void
  onItemClick: (itemId: string, blockId: BMCBlockId) => void
  onAddItem: (blockId: BMCBlockId) => void
  onBackgroundClick: () => void
}

// ============================================================================
// Component
// ============================================================================

export function BMCCanvas({
  canvas,
  mode,
  selectedBlockId,
  selectedItemId,
  onBlockClick,
  onItemClick,
  onAddItem,
  onBackgroundClick,
}: BMCCanvasProps) {
  // Build blocks array with their configs
  const blocks: BlockWithConfig[] = useMemo(() => {
    return BMC_BLOCK_IDS.map((blockId) => ({
      blockId,
      block: getCanvasBlock(canvas, blockId),
      config: BMC_BLOCK_CONFIG[blockId],
    }))
  }, [canvas])

  // Grid layout configuration
  const gridLayout = useMemo(
    () => ({
      gridTemplateAreas: BMC_GRID_TEMPLATE,
      gridTemplateColumns: BMC_GRID_COLUMNS,
      gridTemplateRows: BMC_GRID_ROWS,
    }),
    []
  )

  // MEDIUM 18: Render validation status badge
  const renderValidationBadge = useCallback(
    (status: string) => {
      if (status === 'untested') return null

      const badgeStyles = {
        testing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
        validated: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
        invalidated: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
      }

      const style = badgeStyles[status as keyof typeof badgeStyles] || ''
      if (!style) return null

      return (
        <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-medium uppercase', style)}>
          {status}
        </span>
      )
    },
    []
  )

  // Render block header with color indicator and validation status
  const renderBlockHeader = useCallback(
    (blockWithConfig: BlockWithConfig, itemCount: number) => {
      const { config, block } = blockWithConfig

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
            {/* MEDIUM 18: Validation status badge */}
            {renderValidationBadge(block.validation_status)}
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {itemCount}
          </span>
        </div>
      )
    },
    [renderValidationBadge]
  )

  // Render individual item
  const renderItem = useCallback(
    (item: BMCItem, blockWithConfig: BlockWithConfig, isSelected: boolean) => {
      return (
        <BMCItemCard
          item={item}
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
    <BlockGridCanvas<BlockWithConfig, BMCItem>
      blocks={blocks}
      mode={mode}
      getBlockId={(b) => b.blockId}
      getBlockName={(b) => b.config.name}
      getBlockGridArea={(b) => b.config.gridArea}
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
      onBlockClick={(id) => onBlockClick(id as BMCBlockId)}
      onItemClick={(itemId, blockId) => onItemClick(itemId, blockId as BMCBlockId)}
      onBackgroundClick={onBackgroundClick}
      minBlockHeight="140px"
    />
  )
}
