export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { AdminFormLayout } from '@/components/admin'
import { JourneyForm } from '@/components/admin/journey-form'

export default async function NewJourneyPage() {
  const supabase = await createClient()

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
      title="Create User Journey"
      description="Map a customer's experience through stages and touchpoints"
      backHref="/admin/journeys"
      backLabel="Back to Journeys"
    >
      <JourneyForm
        customerProfiles={customerProfiles || []}
        studioProjects={studioProjects || []}
      />
    </AdminFormLayout>
  )
}
