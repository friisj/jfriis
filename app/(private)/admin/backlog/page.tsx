export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import type { BacklogItem } from '@/lib/types/database'
import {
  AdminListLayout,
  AdminTable,
  AdminTableColumn,
  AdminEmptyState,
  StatusBadge,
} from '@/components/admin'
import { formatDate } from '@/lib/utils'

export default async function AdminBacklogPage() {
  const supabase = await createClient()

  const { data: backlogItems, error } = await supabase
    .from('backlog_items')
    .select('id, title, content, status, tags, created_at, updated_at')
    .order('created_at', { ascending: false })
    .returns<BacklogItem[]>()

  if (error) {
    console.error('Error fetching backlog items:', error)
    return <div className="p-8">Error loading backlog items</div>
  }

  const columns: AdminTableColumn<BacklogItem>[] = [
    {
      key: 'title',
      header: 'Title',
      cell: (item) => (
        <Link
          href={`/admin/backlog/${item.id}/edit`}
          className="hover:text-primary transition-colors"
        >
          <div className="font-medium">
            {item.title || 'Untitled'}
          </div>
          {item.content && (
            <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
              {item.content.substring(0, 100)}...
            </div>
          )}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (item) => <StatusBadge value={item.status} />,
    },
    {
      key: 'tags',
      header: 'Tags',
      cell: (item) =>
        item.tags && item.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: 'created',
      header: 'Created',
      cell: (item) => <span className="text-sm text-muted-foreground">{formatDate(item.created_at)}</span>,
    },
    {
      key: 'updated',
      header: 'Updated',
      cell: (item) => <span className="text-sm text-muted-foreground">{formatDate(item.updated_at)}</span>,
    },
  ]

  return (
    <AdminListLayout
      title="Backlog"
      description="Capture and manage ideas before they become projects"
      actionHref="/admin/backlog/new"
      actionLabel="New Item"
    >
      {!backlogItems || backlogItems.length === 0 ? (
        <AdminEmptyState
          icon={
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          }
          title="No backlog items yet"
          description="Capture ideas and possibilities before shaping them into projects"
          actionHref="/admin/backlog/new"
          actionLabel="Create Item"
        />
      ) : (
        <AdminTable columns={columns} data={backlogItems} />
      )}
    </AdminListLayout>
  )
}
