export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AdminFormLayout } from '@/components/admin'
import { JourneyForm } from '@/components/admin/journey-form'

export default async function EditJourneyPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Fetch journey
  const { data: journey, error: journeyError } = await supabase
    .from('user_journeys')
    .select('*')
    .eq('id', params.id)
    .single()

  if (journeyError || !journey) {
    notFound()
  }

  // Fetch customer profiles for the form selector
  const { data: customerProfiles } = await supabase
    .from('customer_profiles')
    .select('id, name, slug')
    .order('name')

  // Fetch studio projects for the form selector
  const { data: studioProjects } = await supabase
    .from('studio_projects')
    .select('id, name, slug')
    .order('name')

  return (
    <AdminFormLayout
      title="Edit User Journey"
      description="Update journey details"
      backHref={`/admin/journeys/${params.id}`}
      backLabel="Back to Journey"
    >
      <JourneyForm
        journey={journey}
        customerProfiles={customerProfiles || []}
        studioProjects={studioProjects || []}
      />
    </AdminFormLayout>
  )
}
