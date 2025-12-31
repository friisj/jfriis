export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { AdminListLayout } from '@/components/admin'
import { JourneysListView } from '@/components/admin/views/journeys-list-view'

export default async function AdminJourneysPage() {
  const supabase = await createClient()

  const { data: journeys, error } = await supabase
    .from('user_journeys')
    .select(`
      id,
      slug,
      name,
      description,
      status,
      validation_status,
      journey_type,
      goal,
      customer_profile_id,
      studio_project_id,
      tags,
      created_at,
      updated_at,
      customer_profile:customer_profiles(name),
      studio_project:studio_projects(name)
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching journeys:', error)
    return <div className="p-8">Error loading journeys</div>
  }

  return (
    <AdminListLayout
      title="User Journeys"
      description="Map customer experiences through stages and touchpoints"
      actionHref="/admin/journeys/new"
      actionLabel="New Journey"
    >
      <JourneysListView journeys={journeys || []} />
    </AdminListLayout>
  )
}
