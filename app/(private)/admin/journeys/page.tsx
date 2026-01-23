export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase-server'
import { AdminListLayout, AdminErrorBoundary, JourneysListSkeleton, ErrorState } from '@/components/admin'
import { JourneysListView } from '@/components/admin/views/journeys-list-view'
import type { BoundaryObjectStatus, ValidationStatus, JourneyType } from '@/lib/types/boundary-objects'

interface SearchParams {
  status?: string
  validation?: string
  type?: string
  search?: string
  customer?: string
  cursor?: string
}

export default async function AdminJourneysPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedParams = await searchParams
  const supabase = await createClient()

  // Build filters from search params
  const filters = {
    status: resolvedParams.status ? [resolvedParams.status as BoundaryObjectStatus] : undefined,
    validation_status: resolvedParams.validation ? [resolvedParams.validation as ValidationStatus] : undefined,
    journey_type: resolvedParams.type ? [resolvedParams.type as JourneyType] : undefined,
    customer_profile_id: resolvedParams.customer,
    search: resolvedParams.search,
  }

  const pagination = {
    cursor: resolvedParams.cursor,
    limit: 50,
  }

  // Use optimized database view instead of direct query
  // This eliminates N+1 query problem
  const { data, error } = await supabase
    .from('journey_summaries')
    .select('*')
    .then((result) => {
      // Apply filters server-side
      let query = supabase.from('journey_summaries').select('*').limit(pagination.limit + 1)

      if (pagination.cursor) {
        query = query.gt('id', pagination.cursor)
      }
      if (filters.status) {
        query = query.in('status', filters.status)
      }
      if (filters.validation_status) {
        query = query.in('validation_status', filters.validation_status)
      }
      if (filters.journey_type) {
        query = query.in('journey_type', filters.journey_type)
      }
      if (filters.customer_profile_id) {
        query = query.eq('customer_profile_id', filters.customer_profile_id)
      }
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,goal.ilike.%${filters.search}%`
        )
      }

      return query.order('updated_at', { ascending: false })
    })

  if (error) {
    console.error('Error fetching journeys:', error)
    return (
      <AdminListLayout
        title="User Journeys"
        description="Map customer experiences through stages and touchpoints"
        actionHref="/admin/journeys/new"
        actionLabel="New Journey"
      >
        <ErrorState
          title="Failed to load journeys"
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      </AdminListLayout>
    )
  }

  const hasMore = (data?.length || 0) > pagination.limit
  const journeys = hasMore ? data!.slice(0, pagination.limit) : data || []
  const nextCursor = hasMore && journeys.length > 0 ? journeys[journeys.length - 1].id : undefined

  return (
    <AdminListLayout
      title="User Journeys"
      description="Map customer experiences through stages and touchpoints"
      actionHref="/admin/journeys/new"
      actionLabel="New Journey"
    >
      <AdminErrorBoundary>
        <Suspense fallback={<JourneysListSkeleton />}>
          <JourneysListView
            journeys={journeys as any}
            initialFilters={filters}
            nextCursor={nextCursor ?? undefined}
            hasMore={hasMore}
          />
        </Suspense>
      </AdminErrorBoundary>
    </AdminListLayout>
  )
}
