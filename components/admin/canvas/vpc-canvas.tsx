'use client'

import React, { useMemo, useCallback } from 'react'
import { Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BlockGridCanvas, type CanvasMode } from './block-grid-canvas'
import { CustomerProfileItemCard } from './customer-profile-item'
import { ValueMapItemCard } from './value-map-item'
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
  getCanvasBlock as getProfileBlock,
} from '@/lib/boundary-objects/customer-profile-canvas'
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
  getCanvasBlock as getValueMapBlock,
} from '@/lib/boundary-objects/value-map-canvas'
import type { AddressedBlock } from '@/lib/boundary-objects/vpc-canvas'
import { isItemAddressed } from '@/lib/boundary-objects/vpc-canvas'

// ============================================================================
// Types
// ============================================================================

interface ProfileBlockWithConfig {
  blockId: ProfileBlockId
  block: ProfileBlock<ProfileItem>
  config: ProfileBlockConfig
}

interface ValueMapBlockWithConfig {
  blockId: ValueMapBlockId
  block: ValueMapBlock<ValueMapItem>
  config: ValueMapBlockConfig
}

export interface VPCCanvasProps {
  customerProfile: CustomerProfileCanvasType
  valueMap: ValueMapCanvasType
  addressedJobs: AddressedBlock
  addressedPains: AddressedBlock
  addressedGains: AddressedBlock
  mode: CanvasMode
  // Profile selection
  selectedProfileBlockId: ProfileBlockId | null
  selectedProfileItemId: string | null
  onProfileBlockClick: (blockId: ProfileBlockId) => void
  onProfileItemClick: (itemId: string, blockId: ProfileBlockId) => void
  onAddProfileItem: (blockId: ProfileBlockId) => void
  // Value Map selection
  selectedValueMapBlockId: ValueMapBlockId | null
  selectedValueMapItemId: string | null
  onValueMapBlockClick: (blockId: ValueMapBlockId) => void
  onValueMapItemClick: (itemId: string, blockId: ValueMapBlockId) => void
  onAddValueMapItem: (blockId: ValueMapBlockId) => void
  // Fit toggle
  onToggleAddressed?: (blockType: 'pains' | 'gains' | 'jobs', itemId: string) => void
  // Background
  onBackgroundClick: () => void
}

// ============================================================================
// Component
// ============================================================================

export function VPCCanvas({
  customerProfile,
  valueMap,
  addressedJobs,
  addressedPains,
  addressedGains,
  mode,
  selectedProfileBlockId,
  selectedProfileItemId,
  onProfileBlockClick,
  onProfileItemClick,
  onAddProfileItem,
  selectedValueMapBlockId,
  selectedValueMapItemId,
  onValueMapBlockClick,
  onValueMapItemClick,
  onAddValueMapItem,
  onToggleAddressed,
  onBackgroundClick,
}: VPCCanvasProps) {
  // ========== Profile Blocks ==========
  const profileBlocks: ProfileBlockWithConfig[] = useMemo(() => {
    return PROFILE_BLOCK_IDS.map((blockId) => ({
      blockId,
      block: getProfileBlock(customerProfile, blockId),
      config: PROFILE_BLOCK_CONFIG[blockId],
    }))
  }, [customerProfile])

  const profileGridLayout = useMemo(
    () => ({
      gridTemplateAreas: PROFILE_GRID_TEMPLATE,
      gridTemplateColumns: PROFILE_GRID_COLUMNS,
      gridTemplateRows: PROFILE_GRID_ROWS,
    }),
    []
  )

  // ========== Value Map Blocks ==========
  const valueMapBlocks: ValueMapBlockWithConfig[] = useMemo(() => {
    return VALUE_MAP_BLOCK_IDS.map((blockId) => ({
      blockId,
      block: getValueMapBlock(valueMap, blockId),
      config: VALUE_MAP_BLOCK_CONFIG[blockId],
    }))
  }, [valueMap])

  const valueMapGridLayout = useMemo(
    () => ({
      gridTemplateAreas: VALUE_MAP_GRID_TEMPLATE,
      gridTemplateColumns: VALUE_MAP_GRID_COLUMNS,
      gridTemplateRows: VALUE_MAP_GRID_ROWS,
    }),
    []
  )

  // ========== Get addressed block for item type ==========
  const getAddressedBlock = useCallback(
    (blockId: ProfileBlockId): AddressedBlock => {
      switch (blockId) {
        case 'jobs':
          return addressedJobs
        case 'pains':
          return addressedPains
        case 'gains':
          return addressedGains
      }
    },
    [addressedJobs, addressedPains, addressedGains]
  )

  // ========== Profile Rendering ==========
  const renderProfileBlockHeader = useCallback(
    (blockWithConfig: ProfileBlockWithConfig, itemCount: number) => {
      const { config, blockId } = blockWithConfig
      const addressedBlock = getAddressedBlock(blockId)
      const addressedCount = addressedBlock.items.length

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
          <div className="flex items-center gap-2">
            {addressedCount > 0 && (
              <span className="text-xs text-green-600 font-medium">
                {addressedCount} addressed
              </span>
            )}
            <span className="text-xs text-muted-foreground font-medium">{itemCount}</span>
          </div>
        </div>
      )
    },
    [getAddressedBlock]
  )

  const renderProfileItem = useCallback(
    (item: ProfileItem, blockWithConfig: ProfileBlockWithConfig, isSelected: boolean) => {
      const addressedBlock = getAddressedBlock(blockWithConfig.blockId)
      const isAddressed = isItemAddressed(addressedBlock, item.id)

      return (
        <div className="relative">
          <CustomerProfileItemCard
            item={item}
            blockId={blockWithConfig.blockId}
            isSelected={isSelected}
            onClick={() => onProfileItemClick(item.id, blockWithConfig.blockId)}
          />
          {/* Addressed indicator */}
          {isAddressed && (
            <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </div>
          )}
          {/* Toggle addressed button in structured mode */}
          {mode === 'structured' && onToggleAddressed && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleAddressed(blockWithConfig.blockId as 'pains' | 'gains' | 'jobs', item.id)
              }}
              className={cn(
                'absolute bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center',
                'text-xs transition-colors',
                isAddressed
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
              aria-label={isAddressed ? 'Mark as not addressed' : 'Mark as addressed'}
              aria-pressed={isAddressed}
              role="switch"
              aria-checked={isAddressed}
              title={isAddressed ? 'Mark as not addressed' : 'Mark as addressed'}
            >
              <Check className="w-3 h-3" aria-hidden="true" />
              <span className="sr-only">
                {isAddressed ? 'Currently addressed' : 'Not addressed'}
              </span>
            </button>
          )}
        </div>
      )
    },
    [getAddressedBlock, mode, onProfileItemClick, onToggleAddressed]
  )

  const renderProfileEmptyBlock = useCallback(
    () => (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-muted-foreground text-center px-2">
          {mode === 'structured' ? 'Click + to add items' : 'No items yet'}
        </p>
      </div>
    ),
    [mode]
  )

  const renderProfileAddButton = useCallback(
    (blockWithConfig: ProfileBlockWithConfig) => (
      <button
        onClick={(e) => {
          e.stopPropagation()
          onAddProfileItem(blockWithConfig.blockId)
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
    ),
    [onAddProfileItem]
  )

  // ========== Value Map Rendering ==========
  const renderValueMapBlockHeader = useCallback(
    (blockWithConfig: ValueMapBlockWithConfig, itemCount: number) => {
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
          <span className="text-xs text-muted-foreground font-medium">{itemCount}</span>
        </div>
      )
    },
    []
  )

  const renderValueMapItem = useCallback(
    (item: ValueMapItem, blockWithConfig: ValueMapBlockWithConfig, isSelected: boolean) => (
      <ValueMapItemCard
        item={item}
        blockId={blockWithConfig.blockId}
        isSelected={isSelected}
        onClick={() => onValueMapItemClick(item.id, blockWithConfig.blockId)}
      />
    ),
    [onValueMapItemClick]
  )

  const renderValueMapEmptyBlock = useCallback(
    () => (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-muted-foreground text-center px-2">
          {mode === 'structured' ? 'Click + to add items' : 'No items yet'}
        </p>
      </div>
    ),
    [mode]
  )

  const renderValueMapAddButton = useCallback(
    (blockWithConfig: ValueMapBlockWithConfig) => (
      <button
        onClick={(e) => {
          e.stopPropagation()
          onAddValueMapItem(blockWithConfig.blockId)
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
    ),
    [onAddValueMapItem]
  )

  return (
    <div className="flex gap-4 h-full" onClick={onBackgroundClick}>
      {/* Left Side: Value Map */}
      <div className="flex-1 min-w-0">
        <div className="mb-2 px-1">
          <h2 className="text-sm font-semibold text-foreground">Value Map</h2>
          <p className="text-xs text-muted-foreground">What you offer</p>
        </div>
        <BlockGridCanvas<ValueMapBlockWithConfig, ValueMapItem>
          blocks={valueMapBlocks}
          mode={mode}
          getBlockId={(b) => b.blockId}
          getBlockName={(b) => b.config.name}
          getBlockGridArea={(b) => b.blockId}
          getBlockColor={(b) => b.config.color}
          getBlockBgClass={(b) => b.config.bgClass}
          getBlockItems={(b) => b.block.items}
          getItemId={(item) => item.id}
          gridLayout={valueMapGridLayout}
          selectedBlockId={selectedValueMapBlockId}
          selectedItemId={selectedValueMapItemId}
          renderBlockHeader={renderValueMapBlockHeader}
          renderItem={renderValueMapItem}
          renderEmptyBlock={renderValueMapEmptyBlock}
          renderAddButton={renderValueMapAddButton}
          onBlockClick={(id) => onValueMapBlockClick(id as ValueMapBlockId)}
          onItemClick={(itemId, blockId) => onValueMapItemClick(itemId, blockId as ValueMapBlockId)}
          onBackgroundClick={() => {}}
          minBlockHeight="180px"
        />
      </div>

      {/* Center Divider */}
      <div className="w-px bg-border self-stretch flex-shrink-0" />

      {/* Right Side: Customer Profile */}
      <div className="flex-1 min-w-0">
        <div className="mb-2 px-1">
          <h2 className="text-sm font-semibold text-foreground">Customer Profile</h2>
          <p className="text-xs text-muted-foreground">What customers need</p>
        </div>
        <BlockGridCanvas<ProfileBlockWithConfig, ProfileItem>
          blocks={profileBlocks}
          mode={mode}
          getBlockId={(b) => b.blockId}
          getBlockName={(b) => b.config.name}
          getBlockGridArea={(b) => b.blockId}
          getBlockColor={(b) => b.config.color}
          getBlockBgClass={(b) => b.config.bgClass}
          getBlockItems={(b) => b.block.items}
          getItemId={(item) => item.id}
          gridLayout={profileGridLayout}
          selectedBlockId={selectedProfileBlockId}
          selectedItemId={selectedProfileItemId}
          renderBlockHeader={renderProfileBlockHeader}
          renderItem={renderProfileItem}
          renderEmptyBlock={renderProfileEmptyBlock}
          renderAddButton={renderProfileAddButton}
          onBlockClick={(id) => onProfileBlockClick(id as ProfileBlockId)}
          onItemClick={(itemId, blockId) => onProfileItemClick(itemId, blockId as ProfileBlockId)}
          onBackgroundClick={() => {}}
          minBlockHeight="180px"
        />
      </div>
    </div>
  )
}
