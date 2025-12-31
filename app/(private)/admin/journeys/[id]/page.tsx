export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import {
  AdminDetailLayout,
  AdminErrorBoundary,
  JourneyDetailSkeleton,
  ErrorState,
} from '@/components/admin'
import { JourneyDetailView } from '@/components/admin/views/journey-detail-view'
import type { JourneyStage, Touchpoint } from '@/lib/types/boundary-objects'

interface StageWithTouchpoints extends JourneyStage {
  touchpoints: Touchpoint[]
}

export default async function JourneyDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Fetch journey with relationships
  const { data: journey, error: journeyError } = await supabase
    .from('user_journeys')
    .select(
      `
      *,
      customer_profile:customer_profiles(id, name, slug),
      studio_project:studio_projects(id, name, slug),
      hypothesis:studio_hypotheses(id, statement)
    `
    )
    .eq('id', params.id)
    .single()

  if (journeyError || !journey) {
    notFound()
  }

  // Fetch stages with touchpoints
  const { data: stages, error: stagesError } = await supabase
    .from('journey_stages')
    .select(
      `
      *,
      touchpoints(*)
    `
    )
    .eq('user_journey_id', params.id)
    .order('sequence', { ascending: true })

  if (stagesError) {
    console.error('Error fetching stages:', stagesError)
    return (
      <AdminDetailLayout
        title="Error"
        description=""
        backHref="/admin/journeys"
        backLabel="Back to Journeys"
      >
        <ErrorState
          title="Failed to load journey stages"
          message={stagesError.message}
          onRetry={() => window.location.reload()}
        />
      </AdminDetailLayout>
    )
  }

  // Enhance stages with touchpoint ordering (properly typed)
  const stagesWithOrderedTouchpoints: StageWithTouchpoints[] = (stages || []).map((stage) => {
    const stageData = stage as StageWithTouchpoints
    return {
      ...stageData,
      touchpoints: [...(stageData.touchpoints || [])].sort(
        (a, b) => a.sequence - b.sequence
      ),
    }
  })

  return (
    <AdminDetailLayout
      title={journey.name}
      description={journey.description || ''}
      backHref="/admin/journeys"
      backLabel="Back to Journeys"
      editHref={`/admin/journeys/${params.id}/edit`}
    >
      <AdminErrorBoundary>
        <Suspense fallback={<JourneyDetailSkeleton />}>
          <JourneyDetailView journey={journey} stages={stagesWithOrderedTouchpoints} />
        </Suspense>
      </AdminErrorBoundary>
    </AdminDetailLayout>
  )
}
