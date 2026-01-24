export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { AdminErrorBoundary, JourneyFormSkeleton } from '@/components/admin'
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
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back navigation */}
        <Link
          href={`/admin/journeys/${id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Journey
        </Link>

        {/* Header with Canvas View link */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Edit: {journey.name}</h1>
            <p className="text-muted-foreground">Update journey details</p>
          </div>
          <Link
            href={`/admin/journeys/${id}/canvas`}
            className="px-4 py-2 border border-primary text-primary rounded-md text-sm hover:bg-primary/10 transition-colors"
          >
            Canvas View
          </Link>
        </div>

        <AdminErrorBoundary>
          <Suspense fallback={<JourneyFormSkeleton />}>
            <JourneyForm journey={journey as any} />
          </Suspense>
        </AdminErrorBoundary>
      </div>
    </div>
  )
}
