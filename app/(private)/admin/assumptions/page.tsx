export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { AdminListLayout } from '@/components/admin'
import { AssumptionsListView } from '@/components/admin/views/assumptions-list-view'

export default async function AdminAssumptionsPage() {
  const supabase = await createClient()

  const { data: assumptions, error } = await supabase
    .from('assumptions')
    .select(`
      id,
      slug,
      statement,
      category,
      importance,
      evidence_level,
      status,
      is_leap_of_faith,
      source_type,
      source_block,
      studio_project_id,
      created_at,
      updated_at,
      studio_project:studio_projects(name)
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching assumptions:', error)
    return <div className="p-8">Error loading assumptions</div>
  }

  return (
    <AdminListLayout
      title="Assumptions"
      description="Track and validate assumptions from your business model and value propositions"
      actionHref="/admin/assumptions/new"
      actionLabel="New Assumption"
    >
      <AssumptionsListView assumptions={assumptions || []} />
    </AdminListLayout>
  )
}
