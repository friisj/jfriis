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
      updated_at,
      venture_specimens (count),
      log_entry_ventures (count)
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching ventures:', error)
    return <div className="p-8">Error loading ventures</div>
  }

  console.log('Ventures fetched:', ventures?.length || 0)

  return (
    <AdminListLayout
      title="Ventures"
      description="Manage portfolio ventures and businesses"
      actionHref="/admin/ventures/new"
      actionLabel="New Venture"
    >
      <VenturesListView ventures={ventures || []} />
    </AdminListLayout>
  )
}
