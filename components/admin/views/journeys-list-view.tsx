'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AdminTable,
  AdminTableColumn,
  AdminEmptyState,
  StatusBadge,
} from '@/components/admin'
import { formatDate } from '@/lib/utils'

interface Journey {
  id: string
  slug: string
  name: string
  description?: string | null
  status: string
  validation_status: string
  journey_type: string
  goal?: string | null
  customer_profile_id?: string | null
  studio_project_id?: string | null
  tags: string[]
  created_at: string
  updated_at: string
  customer_profile?: { name: string } | null
  studio_project?: { name: string } | null
}

interface JourneysListViewProps {
  journeys: Journey[]
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  active: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  validated: 'bg-green-500/10 text-green-700 dark:text-green-400',
  archived: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
}

const validationColors: Record<string, string> = {
  untested: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  testing: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  validated: 'bg-green-500/10 text-green-700 dark:text-green-400',
  invalidated: 'bg-red-500/10 text-red-700 dark:text-red-400',
}

const journeyTypeLabels: Record<string, string> = {
  end_to_end: 'End-to-End',
  sub_journey: 'Sub-Journey',
  micro_moment: 'Micro-Moment',
}

type FilterStatus = 'all' | 'draft' | 'active' | 'validated' | 'archived'
type FilterValidation = 'all' | 'untested' | 'testing' | 'validated' | 'invalidated'

export function JourneysListView({ journeys }: JourneysListViewProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterValidation, setFilterValidation] = useState<FilterValidation>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter journeys
  const filteredJourneys = journeys.filter((journey) => {
    if (filterStatus !== 'all' && journey.status !== filterStatus) return false
    if (filterValidation !== 'all' && journey.validation_status !== filterValidation) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        journey.name.toLowerCase().includes(query) ||
        journey.description?.toLowerCase().includes(query) ||
        journey.goal?.toLowerCase().includes(query) ||
        journey.customer_profile?.name?.toLowerCase().includes(query)
      )
    }
    return true
  })

  const columns: AdminTableColumn<Journey>[] = [
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
        journey.customer_profile ? (
          <span className="text-sm">{journey.customer_profile.name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: 'journey_type',
      header: 'Type',
      cell: (journey) => (
        <span className="text-sm">
          {journeyTypeLabels[journey.journey_type] || journey.journey_type}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (journey) => (
        <StatusBadge
          status={journey.status}
          variant={statusColors[journey.status] || statusColors.draft}
        />
      ),
    },
    {
      key: 'validation_status',
      header: 'Validation',
      cell: (journey) => (
        <StatusBadge
          status={journey.validation_status}
          variant={validationColors[journey.validation_status] || validationColors.untested}
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
                className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
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
        <span className="text-sm text-muted-foreground">
          {formatDate(journey.updated_at)}
        </span>
      ),
    },
  ]

  if (journeys.length === 0) {
    return (
      <AdminEmptyState
        title="No user journeys yet"
        description="Create your first user journey to start mapping customer experiences"
        actionHref="/admin/journeys/new"
        actionLabel="Create Journey"
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search journeys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
          />
        </div>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="validated">Validated</option>
          <option value="archived">Archived</option>
        </select>

        {/* Validation filter */}
        <select
          value={filterValidation}
          onChange={(e) => setFilterValidation(e.target.value as FilterValidation)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
        >
          <option value="all">All Validation</option>
          <option value="untested">Untested</option>
          <option value="testing">Testing</option>
          <option value="validated">Validated</option>
          <option value="invalidated">Invalidated</option>
        </select>

        {/* Results count */}
        <span className="text-sm text-muted-foreground">
          {filteredJourneys.length} {filteredJourneys.length === 1 ? 'journey' : 'journeys'}
        </span>
      </div>

      {/* Table */}
      {filteredJourneys.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">No journeys match your filters</p>
        </div>
      ) : (
        <AdminTable
          columns={columns}
          data={filteredJourneys}
          getRowHref={(journey) => `/admin/journeys/${journey.id}`}
        />
      )}
    </div>
  )
}
