'use client'

import Link from 'next/link'
import { StatusBadge } from '@/components/admin'
import { formatDate } from '@/lib/utils'

interface LogEntry {
  id: string
  title: string
  slug: string
  entry_date: string
  type: string | null
  published: boolean
  created_at: string
  updated_at: string
  specimenCount?: number
  projectCount?: number
}

interface LogEntryCardProps {
  entry: LogEntry
}

export function LogEntryCard({ entry }: LogEntryCardProps) {
  return (
    <Link
      href={`/admin/log/${entry.id}/edit`}
      className="block rounded-lg border bg-card p-4 hover:bg-accent/50 hover:border-primary/30 hover:shadow-md transition-all duration-200"
    >
      <div className="flex flex-col gap-3">
        {/* Title and slug */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{entry.title}</h3>
          <p className="text-sm text-muted-foreground truncate">/{entry.slug}</p>
        </div>

        {/* Entry date */}
        <div className="text-sm font-medium text-foreground">
          {formatDate(entry.entry_date)}
        </div>

        {/* Type and published */}
        <div className="flex items-center gap-2 flex-wrap">
          {entry.type && <StatusBadge value={entry.type} />}
          {entry.published && (
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
          <span>{entry.specimenCount || 0} specimens</span>
          <span>{entry.projectCount || 0} projects</span>
        </div>
      </div>
    </Link>
  )
}
