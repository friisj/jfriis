import { Suspense } from 'react'
import { AdminFormLayout, AdminErrorBoundary, JourneyFormSkeleton } from '@/components/admin'
import { JourneyForm } from '@/components/admin/journey-form'

export default function NewJourneyPage() {
  return (
    <AdminFormLayout
      title="Create User Journey"
      description="Map a customer's experience through stages and touchpoints"
      backHref="/admin/journeys"
      backLabel="Back to Journeys"
    >
      <AdminErrorBoundary>
        <Suspense fallback={<JourneyFormSkeleton />}>
          <JourneyForm />
        </Suspense>
      </AdminErrorBoundary>
    </AdminFormLayout>
  )
}
