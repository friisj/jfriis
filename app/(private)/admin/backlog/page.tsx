export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import type { BacklogItem } from '@/lib/types/database'
import { AdminListLayout } from '@/components/admin'
import { BacklogListView } from '@/components/admin/views/backlog-list-view'

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

  return (
    <AdminListLayout
      title="Backlog"
      description="Capture and manage ideas before they become projects"
      actionHref="/admin/backlog/new"
      actionLabel="New Item"
    >
      <BacklogListView items={backlogItems || []} />
    </AdminListLayout>
  )
}
