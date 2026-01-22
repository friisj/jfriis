'use client'

import React, { memo } from 'react'
import { cn } from '@/lib/utils'
import type {
  ProfileItem,
  JobItem,
  PainItem,
  GainItem,
  ProfileBlockId,
} from '@/lib/boundary-objects/customer-profile-canvas'
import { SeverityBadge, ImportanceBadge, JobTypeBadge } from './canvas-badges'

// ============================================================================
// Types
// ============================================================================

export interface CustomerProfileItemCardProps {
  item: ProfileItem
  blockId: ProfileBlockId
  isSelected?: boolean
  onClick?: () => void
  className?: string
}

// ============================================================================
// Type Guards
// ============================================================================

function isJobItem(item: ProfileItem, blockId: ProfileBlockId): item is JobItem {
  return blockId === 'jobs'
}

function isPainItem(item: ProfileItem, blockId: ProfileBlockId): item is PainItem {
  return blockId === 'pains'
}

function isGainItem(item: ProfileItem, blockId: ProfileBlockId): item is GainItem {
  return blockId === 'gains'
}

// ============================================================================
// Component
// Memoized to prevent unnecessary re-renders
// ============================================================================

export const CustomerProfileItemCard = memo(function CustomerProfileItemCard({
  item,
  blockId,
  isSelected = false,
  onClick,
  className,
}: CustomerProfileItemCardProps) {
  // Determine which badges to show based on block type
  const badges = []

  if (isJobItem(item, blockId)) {
    if (item.type) {
      badges.push(<JobTypeBadge key="type" type={item.type} />)
    }
    if (item.importance) {
      badges.push(<ImportanceBadge key="importance" importance={item.importance} />)
    }
  } else if (isPainItem(item, blockId)) {
    if (item.severity) {
      badges.push(<SeverityBadge key="severity" severity={item.severity} />)
    }
  } else if (isGainItem(item, blockId)) {
    if (item.importance) {
      badges.push(<ImportanceBadge key="importance" importance={item.importance} />)
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
