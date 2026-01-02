'use client'

import Link from 'next/link'
import { StatusBadge } from '@/components/admin'
import { formatDate } from '@/lib/utils'

interface Venture {
  id: string
  title: string
  slug: string
  status: string
  type: string | null
  published: boolean
  created_at: string
  updated_at: string
  venture_specimens?: Array<{ count: number }>
  log_entry_ventures?: Array<{ count: number }>
}

interface VentureCardProps {
  venture: Venture
}

export function VentureCard({ venture }: VentureCardProps) {
  return (
    <Link
      href={`/admin/ventures/${venture.id}/edit`}
      className="block rounded-lg border bg-card p-4 hover:bg-accent/50 hover:border-primary/30 hover:shadow-md transition-all duration-200"
    >
      <div className="flex flex-col gap-3">
        {/* Title and slug */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{venture.title}</h3>
          <p className="text-sm text-muted-foreground truncate">/{venture.slug}</p>
        </div>

        {/* Status and type */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge value={venture.status} />
          {venture.type && (
            <span className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
              {venture.type}
            </span>
          )}
          {venture.published && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Published
            </span>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
          <span>{venture.venture_specimens?.[0]?.count || 0} specimens</span>
          <span>{venture.log_entry_ventures?.[0]?.count || 0} logs</span>
          <span className="ml-auto">{formatDate(venture.updated_at)}</span>
        </div>
      </div>
    </Link>
  )
}
