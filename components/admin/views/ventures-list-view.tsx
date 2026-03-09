'use client'

import Link from 'next/link'
import { IconCheck, IconFilePlus } from '@tabler/icons-react'
import {
  AdminDataView,
  AdminTableColumn,
  AdminEmptyState,
  StatusBadge,
} from '@/components/admin'
import { VentureCard } from '@/components/admin/cards'
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
  specimenCount?: number
  logEntryCount?: number
}

interface VenturesListViewProps {
  ventures: Venture[]
}

export function VenturesListView({ ventures }: VenturesListViewProps) {
  const columns: AdminTableColumn<Venture>[] = [
    {
      key: 'title',
      header: 'Title',
      cell: (venture) => (
        <div className="flex flex-col">
          <span className="font-medium">{venture.title}</span>
          <span className="text-sm text-muted-foreground">/{venture.slug}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (venture) => <StatusBadge value={venture.status} />,
    },
    {
      key: 'type',
      header: 'Type',
      cell: (venture) => <span className="text-sm">{venture.type || '-'}</span>,
    },
    {
      key: 'links',
      header: 'Links',
      cell: (venture) => (
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>{venture.specimenCount || 0} specimens</span>
          <span>{venture.logEntryCount || 0} log entries</span>
        </div>
      ),
    },
    {
      key: 'published',
      header: 'Published',
      cell: (venture) =>
        venture.published ? (
          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
            <IconCheck size={16} />
            Yes
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">No</span>
        ),
    },
    {
      key: 'updated',
      header: 'Updated',
      cell: (venture) => <span className="text-sm text-muted-foreground">{formatDate(venture.updated_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (venture) => (
        <Link
          href={`/admin/ventures/${venture.id}/edit`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
        >
          Edit
        </Link>
      ),
    },
  ]

  return (
    <AdminDataView
      data={ventures}
      views={{
        table: {
          columns,
        },
        grid: {
          renderCard: (venture) => <VentureCard venture={venture} />,
        },
      }}
      defaultView="table"
      persistenceKey="admin-ventures-view"
      emptyState={
        <AdminEmptyState
          icon={
            <IconFilePlus size={32} className="text-muted-foreground" />
          }
          title="No ventures yet"
          description="Get started by creating your first portfolio venture"
          actionHref="/admin/ventures/new"
          actionLabel="Create Venture"
        />
      }
    />
  )
}
