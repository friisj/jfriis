'use client'

import React, { memo } from 'react'
import { cn } from '@/lib/utils'
import type { BMCItem, ItemPriority } from '@/lib/boundary-objects/bmc-canvas'
import { getPriorityBadgeClass } from '@/lib/boundary-objects/bmc-canvas'

// ============================================================================
// Types
// ============================================================================

export interface BMCItemCardProps {
  item: BMCItem
  isSelected?: boolean
  onClick?: () => void
  className?: string
}

// ============================================================================
// Component
// HIGH 6: Memoized to prevent unnecessary re-renders
// ============================================================================

export const BMCItemCard = memo(function BMCItemCard({
  item,
  isSelected = false,
  onClick,
  className,
}: BMCItemCardProps) {
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
      // HIGH 10: Keyboard accessibility
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
        {item.priority && <PriorityBadge priority={item.priority} />}
      </div>
    </div>
  )
})

// ============================================================================
// Sub-components
// ============================================================================

interface PriorityBadgeProps {
  priority: ItemPriority
}

function PriorityBadge({ priority }: PriorityBadgeProps) {
  const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1)

  return (
    <span
      className={cn(
        'text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0',
        getPriorityBadgeClass(priority)
      )}
    >
      {priorityLabel}
    </span>
  )
}

export { PriorityBadge }
