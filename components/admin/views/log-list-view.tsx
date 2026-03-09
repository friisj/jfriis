'use client'

import Link from 'next/link'
import { IconCheck, IconBook } from '@tabler/icons-react'
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
            <IconCheck size={16} />
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
            <IconBook size={32} className="text-muted-foreground" />
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
