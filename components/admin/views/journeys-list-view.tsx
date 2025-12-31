'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AdminTable,
  AdminTableColumn,
  AdminEmptyState,
  StatusBadge,
} from '@/components/admin'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { formatDate } from '@/lib/utils'
import {
  STATUS_COLORS,
  JOURNEY_TYPE_LABELS,
  STATUS_LABELS,
  VALIDATION_STATUS_LABELS,
} from '@/lib/theme/status-colors'
import type { JourneySummaryView, JourneyFilters } from '@/lib/types/boundary-objects'

interface JourneysListViewProps {
  journeys: JourneySummaryView[]
  initialFilters: JourneyFilters
  nextCursor?: string
  hasMore: boolean
}

type FilterStatus = 'all' | 'draft' | 'active' | 'validated' | 'archived'
type FilterValidation = 'all' | 'untested' | 'testing' | 'validated' | 'invalidated'

export function JourneysListView({
  journeys,
  initialFilters,
  nextCursor,
  hasMore,
}: JourneysListViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Local state for immediate UI feedback, debounced for server updates
  const [searchInput, setSearchInput] = useState(initialFilters.search || '')
  const debouncedSearch = useDebounce(searchInput, 500)

  // Update URL params when debounced search changes
  if (debouncedSearch !== (searchParams.get('search') || '')) {
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedSearch) {
      params.set('search', debouncedSearch)
    } else {
      params.delete('search')
    }
    router.push(`?${params.toString()}`)
  }

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all' || !value) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    // Reset cursor when filters change
    params.delete('cursor')
    router.push(`?${params.toString()}`)
  }

  const loadMore = () => {
    if (!nextCursor) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('cursor', nextCursor)
    router.push(`?${params.toString()}`)
  }

  const currentStatus = (searchParams.get('status') as FilterStatus) || 'all'
  const currentValidation = (searchParams.get('validation') as FilterValidation) || 'all'

  const columns: AdminTableColumn<JourneySummaryView>[] = [
    {
      key: 'name',
      header: 'Journey',
      cell: (journey) => (
        <div className="max-w-md">
          <Link
            href={`/admin/journeys/${journey.id}`}
            className="font-medium hover:underline line-clamp-1"
          >
            {journey.name}
          </Link>
          {journey.goal && (
            <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
              Goal: {journey.goal}
            </div>
          )}
          {journey.description && (
            <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {journey.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'customer_profile',
      header: 'Customer',
      cell: (journey) =>
        journey.customer_profile_name ? (
          <span className="text-sm">{journey.customer_profile_name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: 'journey_type',
      header: 'Type',
      cell: (journey) => (
        <span className="text-sm">
          {JOURNEY_TYPE_LABELS[journey.journey_type] || journey.journey_type}
        </span>
      ),
    },
    {
      key: 'metrics',
      header: 'Metrics',
      cell: (journey) => (
        <div className="text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">Stages:</span> {journey.stage_count}
          </div>
          <div>
            <span className="text-muted-foreground">Touchpoints:</span> {journey.touchpoint_count}
          </div>
          {journey.high_pain_count > 0 && (
            <div className="text-red-600 dark:text-red-400">
              ⚠ {journey.high_pain_count} high pain
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (journey) => (
        <StatusBadge
          status={STATUS_LABELS[journey.status]}
          variant={STATUS_COLORS[journey.status]}
        />
      ),
    },
    {
      key: 'validation_status',
      header: 'Validation',
      cell: (journey) => (
        <StatusBadge
          status={VALIDATION_STATUS_LABELS[journey.validation_status]}
          variant={STATUS_COLORS[journey.validation_status]}
        />
      ),
    },
    {
      key: 'tags',
      header: 'Tags',
      cell: (journey) =>
        journey.tags && journey.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {journey.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs rounded-full bg-gray-500/10 text-gray-700 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
            {journey.tags.length > 2 && (
              <span className="text-xs text-muted-foreground">+{journey.tags.length - 2}</span>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: 'updated_at',
      header: 'Updated',
      cell: (journey) => (
        <span className="text-sm text-muted-foreground">{formatDate(journey.updated_at)}</span>
      ),
    },
  ]

  if (journeys.length === 0) {
    return (
      <AdminEmptyState
        title="No journeys found"
        description={
          searchInput || currentStatus !== 'all' || currentValidation !== 'all'
            ? 'Try adjusting your filters'
            : 'Create your first user journey to map customer experiences'
        }
        action={
          searchInput || currentStatus !== 'all' || currentValidation !== 'all'
            ? {
                label: 'Clear filters',
                onClick: () => router.push('/admin/journeys'),
              }
            : {
                label: 'New Journey',
                href: '/admin/journeys/new',
              }
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search journeys..."
            className="w-full px-3 py-2 rounded-lg border bg-background"
          />
          {debouncedSearch !== searchInput && (
            <div className="text-xs text-muted-foreground mt-1">Searching...</div>
          )}
        </div>

        <select
          value={currentStatus}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="px-3 py-2 rounded-lg border bg-background"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="validated">Validated</option>
          <option value="archived">Archived</option>
        </select>

        <select
          value={currentValidation}
          onChange={(e) => updateFilter('validation', e.target.value)}
          className="px-3 py-2 rounded-lg border bg-background"
        >
          <option value="all">All Validation</option>
          <option value="untested">Untested</option>
          <option value="testing">Testing</option>
          <option value="validated">Validated</option>
          <option value="invalidated">Invalidated</option>
        </select>
      </div>

      {/* Active filters display */}
      {(currentStatus !== 'all' ||
        currentValidation !== 'all' ||
        searchInput) && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Active filters:</span>
          {currentStatus !== 'all' && (
            <span className="px-2 py-1 rounded bg-primary/10 text-primary">
              Status: {currentStatus}
            </span>
          )}
          {currentValidation !== 'all' && (
            <span className="px-2 py-1 rounded bg-primary/10 text-primary">
              Validation: {currentValidation}
            </span>
          )}
          {searchInput && (
            <span className="px-2 py-1 rounded bg-primary/10 text-primary">
              Search: "{searchInput}"
            </span>
          )}
          <button
            onClick={() => {
              setSearchInput('')
              router.push('/admin/journeys')
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}

      <AdminTable columns={columns} data={journeys} />

      {/* Pagination */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMore}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  )
}
