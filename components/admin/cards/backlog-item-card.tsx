'use client'

import Link from 'next/link'
import { StatusBadge } from '@/components/admin'
import { formatDate } from '@/lib/utils'

interface BacklogItem {
  id: string
  title?: string
  content?: string
  status: 'inbox' | 'in-progress' | 'shaped' | 'archived'
  tags?: string[]
  created_at: string
  updated_at: string
}

interface BacklogItemCardProps {
  item: BacklogItem
}

export function BacklogItemCard({ item }: BacklogItemCardProps) {
  return (
    <Link
      href={`/admin/backlog/${item.id}/edit`}
      className="block rounded-lg border bg-card p-4 hover:bg-accent/50 hover:border-primary/30 hover:shadow-md transition-all duration-200"
    >
      <div className="flex flex-col gap-3">
        {/* Title and preview */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{item.title || 'Untitled'}</h3>
          {item.content && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {item.content.substring(0, 120)}...
            </p>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <StatusBadge value={item.status} />
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{item.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
          <span>Updated {formatDate(item.updated_at)}</span>
        </div>
      </div>
    </Link>
  )
}
