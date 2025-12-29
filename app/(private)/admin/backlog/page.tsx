export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import type { BacklogItem } from '@/lib/types/database'
import { AdminListLayout } from '@/components/admin/admin-list-layout'
import { AdminTable, AdminTableColumn } from '@/components/admin/admin-table'
import { StatusBadge } from '@/components/admin/status-badge'
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
      header: 'Status',
      cell: (item) => <StatusBadge value={item.status} />,
    },
    {
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
      header: 'Created',
      cell: (item) => <span className="text-sm text-muted-foreground">{formatDate(item.created_at)}</span>,
    },
    {
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
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground mb-4">No backlog items yet</p>
          <Link
            href="/admin/backlog/new"
            className="text-primary hover:underline"
          >
            Create your first item
          </Link>
        </div>
      ) : (
        <AdminTable columns={columns} data={backlogItems} getRowKey={(item) => item.id} />
      )}
    </AdminListLayout>
  )
}
