'use client'

import React, { memo } from 'react'
import { cn } from '@/lib/utils'
import type {
  ValueMapItem,
  ProductItem,
  PainRelieverItem,
  GainCreatorItem,
  ValueMapBlockId,
} from '@/lib/boundary-objects/value-map-canvas'
import { ProductTypeBadge, EffectivenessBadge } from './canvas-badges'

// ============================================================================
// Types
// ============================================================================

export interface ValueMapItemCardProps {
  item: ValueMapItem
  blockId: ValueMapBlockId
  isSelected?: boolean
  onClick?: () => void
  className?: string
}

// ============================================================================
// Type Guards
// ============================================================================

function isProductItem(item: ValueMapItem, blockId: ValueMapBlockId): item is ProductItem {
  return blockId === 'products_services'
}

function isPainRelieverItem(item: ValueMapItem, blockId: ValueMapBlockId): item is PainRelieverItem {
  return blockId === 'pain_relievers'
}

function isGainCreatorItem(item: ValueMapItem, blockId: ValueMapBlockId): item is GainCreatorItem {
  return blockId === 'gain_creators'
}

// ============================================================================
// Component
// Memoized to prevent unnecessary re-renders
// ============================================================================

export const ValueMapItemCard = memo(function ValueMapItemCard({
  item,
  blockId,
  isSelected = false,
  onClick,
  className,
}: ValueMapItemCardProps) {
  // Determine which badges to show based on block type
  const badges = []

  if (isProductItem(item, blockId)) {
    if (item.type) {
      badges.push(<ProductTypeBadge key="type" type={item.type} />)
    }
  } else if (isPainRelieverItem(item, blockId)) {
    if (item.effectiveness) {
      badges.push(<EffectivenessBadge key="effectiveness" effectiveness={item.effectiveness} />)
    }
  } else if (isGainCreatorItem(item, blockId)) {
    if (item.effectiveness) {
      badges.push(<EffectivenessBadge key="effectiveness" effectiveness={item.effectiveness} />)
    }
  }

  return (
    <div
      className={cn(
        'p-2 text-sm bg-background border rounded-md cursor-pointer',
        'hover:border-primary/50 transition-all',
        isSelected && 'border-primary bg-primary/5 ring-1 ring-primary',
        className
      )}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          onClick?.()
        }
      }}
      aria-selected={isSelected}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 text-foreground line-clamp-3">{item.content}</p>
        {badges.length > 0 && (
          <div className="flex flex-col gap-1 items-end shrink-0">
            {badges}
          </div>
        )}
      </div>
      {item.evidence && (
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1 italic">
          Evidence: {item.evidence}
        </p>
      )}
    </div>
  )
})
