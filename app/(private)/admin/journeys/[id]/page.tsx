export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AdminDetailLayout } from '@/components/admin'
import { JourneyDetailView } from '@/components/admin/views/journey-detail-view'

export default async function JourneyDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Fetch journey with relationships
  const { data: journey, error: journeyError } = await supabase
    .from('user_journeys')
    .select(`
      *,
      customer_profile:customer_profiles(id, name, slug),
      studio_project:studio_projects(id, name, slug),
      hypothesis:studio_hypotheses(id, statement)
    `)
    .eq('id', params.id)
    .single()

  if (journeyError || !journey) {
    notFound()
  }

  // Fetch stages with touchpoints
  const { data: stages } = await supabase
    .from('journey_stages')
    .select(`
      *,
      touchpoints(*)
    `)
    .eq('user_journey_id', params.id)
    .order('sequence', { ascending: true })

  // Enhance stages with touchpoint ordering
  const stagesWithOrderedTouchpoints = (stages || []).map((stage: any) => ({
    ...stage,
    touchpoints: (stage.touchpoints || []).sort(
      (a: any, b: any) => a.sequence - b.sequence
    ),
  }))

  return (
    <AdminDetailLayout
      title={journey.name}
      description={journey.description || ''}
      backHref="/admin/journeys"
      backLabel="Back to Journeys"
      editHref={`/admin/journeys/${params.id}/edit`}
    >
      <JourneyDetailView
        journey={journey}
        stages={stagesWithOrderedTouchpoints}
      />
    </AdminDetailLayout>
  )
}
