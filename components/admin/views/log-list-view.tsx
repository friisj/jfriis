'use client'

import Link from 'next/link'
import {
  AdminDataView,
  AdminTableColumn,
  AdminEmptyState,
  StatusBadge,
} from '@/components/admin'
import { LogEntryCard } from '@/components/admin/cards'
import { formatDate } from '@/lib/utils'
import { usePrivacyMode, filterPrivateRecords } from '@/lib/privacy-mode'

interface LogEntry {
  id: string
  title: string
  slug: string
  entry_date: string
  type: string | null
  published: boolean
  is_private?: boolean | null
  created_at: string
  updated_at: string
  specimenCount?: number
  projectCount?: number
}

interface LogListViewProps {
  entries: LogEntry[]
}

export function LogListView({ entries }: LogListViewProps) {
  const { isPrivacyMode } = usePrivacyMode()

  // Filter entries based on privacy mode
  const visibleEntries = filterPrivateRecords(entries, isPrivacyMode)
  const columns: AdminTableColumn<LogEntry>[] = [
    {
      key: 'title',
      header: 'Title',
      cell: (entry) => (
        <div className="flex flex-col">
          <span className="font-medium">{entry.title}</span>
          <span className="text-sm text-muted-foreground">/{entry.slug}</span>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      cell: (entry) => <span className="text-sm">{formatDate(entry.entry_date)}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      cell: (entry) =>
        entry.type ? (
          <StatusBadge value={entry.type} />
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
    {
      key: 'links',
      header: 'Links',
      cell: (entry) => (
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>{entry.specimenCount || 0} specimens</span>
          <span>{entry.projectCount || 0} projects</span>
        </div>
      ),
    },
    {
      key: 'published',
      header: 'Published',
      cell: (entry) =>
        entry.published ? (
          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Yes
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">No</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (entry) => (
        <Link
          href={`/admin/log/${entry.id}/edit`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
        >
          Edit
        </Link>
      ),
    },
  ]

  return (
    <AdminDataView
      data={visibleEntries}
      views={{
        table: {
          columns,
        },
        grid: {
          renderCard: (entry) => <LogEntryCard entry={entry} />,
        },
      }}
      defaultView="table"
      persistenceKey="admin-log-view"
      emptyState={
        <AdminEmptyState
          icon={
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
          title="No log entries yet"
          description="Start documenting your journey with your first log entry"
          actionHref="/admin/log/new"
          actionLabel="Create Entry"
        />
      }
    />
  )
}
