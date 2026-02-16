export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { AdminListLayout } from '@/components/admin'
import { VenturesListView } from '@/components/admin/views/ventures-list-view'

export default async function AdminVenturesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  console.log('Ventures page - User:', user?.email)

  const { data: ventures, error } = await supabase
    .from('ventures')
    .select(`
      id,
      title,
      slug,
      status,
      type,
      published,
      created_at,
      updated_at
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching ventures:', error)
    return <div className="p-8">Error loading ventures</div>
  }

  // Fetch link counts from entity_links
  const ventureIds = ventures?.map(v => v.id) || []
  const linkCounts: Record<string, { specimens: number; logEntries: number }> = {}

  if (ventureIds.length > 0) {
    const { data: specimenLinks } = await supabase
      .from('entity_links')
      .select('source_id')
      .eq('source_type', 'project')
      .eq('target_type', 'specimen')
      .in('source_id', ventureIds)

    const { data: logEntryLinks } = await supabase
      .from('entity_links')
      .select('target_id')
      .eq('source_type', 'log_entry')
      .eq('target_type', 'project')
      .in('target_id', ventureIds)

    for (const id of ventureIds) {
      linkCounts[id] = {
        specimens: specimenLinks?.filter(l => l.source_id === id).length || 0,
        logEntries: logEntryLinks?.filter(l => l.target_id === id).length || 0,
      }
    }
  }

  // Add link counts to ventures
  const venturesWithCounts = ventures?.map(venture => ({
    ...venture,
    specimenCount: linkCounts[venture.id]?.specimens || 0,
    logEntryCount: linkCounts[venture.id]?.logEntries || 0,
  })) || []

  console.log('Ventures fetched:', ventures?.length || 0)

  return (
    <AdminListLayout
      title="Ventures"
      description="Manage portfolio ventures and businesses"
      actionHref="/admin/ventures/new"
      actionLabel="New Venture"
    >
      <VenturesListView ventures={venturesWithCounts} />
    </AdminListLayout>
  )
}
