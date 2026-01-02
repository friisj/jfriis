export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { AdminListLayout } from '@/components/admin'
import { LogListView } from '@/components/admin/views/log-list-view'

export default async function AdminLogPage() {
  const supabase = await createClient()

  const { data: logEntries, error } = await supabase
    .from('log_entries')
    .select(`
      id,
      title,
      slug,
      entry_date,
      type,
      published,
      created_at,
      updated_at,
      log_entry_specimens (count),
      log_entry_projects (count)
    `)
    .order('entry_date', { ascending: false })

  if (error) {
    console.error('Error fetching log entries:', error)
    return <div className="p-8">Error loading log entries</div>
  }

  return (
    <AdminListLayout
      title="Log"
      description="Chronological entries, ideas, and experiments"
      actionHref="/admin/log/new"
      actionLabel="New Entry"
    >
      <LogListView entries={logEntries || []} />
    </AdminListLayout>
  )
}
