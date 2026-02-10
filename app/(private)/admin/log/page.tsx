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
      is_private,
      created_at,
      updated_at
    `)
    .order('entry_date', { ascending: false })

  // Fetch link counts from entity_links
  const entryIds = logEntries?.map(e => e.id) || []
  const linkCounts: Record<string, { specimens: number; projects: number }> = {}

  if (entryIds.length > 0) {
    const { data: specimenLinks } = await supabase
      .from('entity_links')
      .select('source_id')
      .eq('source_type', 'log_entry')
      .eq('target_type', 'specimen')
      .in('source_id', entryIds)

    const { data: projectLinks } = await supabase
      .from('entity_links')
      .select('source_id')
      .eq('source_type', 'log_entry')
      .eq('target_type', 'project')
      .in('source_id', entryIds)

    for (const id of entryIds) {
      linkCounts[id] = {
        specimens: specimenLinks?.filter(l => l.source_id === id).length || 0,
        projects: projectLinks?.filter(l => l.source_id === id).length || 0,
      }
    }
  }

  // Add link counts to entries for the view component
  const entriesWithCounts = logEntries?.map(entry => ({
    ...entry,
    specimenCount: linkCounts[entry.id]?.specimens || 0,
    projectCount: linkCounts[entry.id]?.projects || 0,
  })) || []

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
      <LogListView entries={entriesWithCounts} />
    </AdminListLayout>
  )
}
