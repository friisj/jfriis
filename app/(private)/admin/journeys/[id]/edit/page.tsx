export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AdminFormLayout, AdminErrorBoundary, JourneyFormSkeleton } from '@/components/admin'
import { JourneyForm } from '@/components/admin/journey-form'

export default async function EditJourneyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch journey
  const { data: journey, error: journeyError } = await supabase
    .from('user_journeys')
    .select('*')
    .eq('id', id)
    .single()

  if (journeyError || !journey) {
    notFound()
  }

  return (
    <AdminFormLayout
      title="Edit User Journey"
      description="Update journey details"
      backHref={`/admin/journeys/${id}`}
      backLabel="Back to Journey"
    >
      <AdminErrorBoundary>
        <Suspense fallback={<JourneyFormSkeleton />}>
          <JourneyForm journey={journey as any} />
        </Suspense>
      </AdminErrorBoundary>
    </AdminFormLayout>
  )
}
