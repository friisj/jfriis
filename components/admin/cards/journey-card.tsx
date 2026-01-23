'use client'

import Link from 'next/link'
import { StatusBadge } from '@/components/admin'
import { formatDate } from '@/lib/utils'
import {
  STATUS_COLORS,
  JOURNEY_TYPE_LABELS,
  STATUS_LABELS,
  VALIDATION_STATUS_LABELS,
} from '@/lib/theme/status-colors'
import type { JourneySummaryView } from '@/lib/types/boundary-objects'

interface JourneyCardProps {
  journey: JourneySummaryView
}

export function JourneyCard({ journey }: JourneyCardProps) {
  return (
    <Link
      href={`/admin/journeys/${journey.id}`}
      className="block rounded-lg border bg-card p-4 hover:bg-accent/50 hover:border-primary/30 transition-all duration-200"
    >
      <div className="flex flex-col gap-3">
        {/* Title and goal */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold line-clamp-1">{journey.name}</h3>
          {journey.goal && (
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
              <span className="font-medium">Goal:</span> {journey.goal}
            </p>
          )}
          {journey.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {journey.description}
            </p>
          )}
        </div>

        {/* Customer and Type */}
        <div className="flex items-center gap-2 text-sm flex-wrap">
          {journey.customer_profile_name && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {journey.customer_profile_name}
            </span>
          )}
          <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">
            {journey.journey_type ? (JOURNEY_TYPE_LABELS[journey.journey_type as keyof typeof JOURNEY_TYPE_LABELS] || journey.journey_type) : '-'}
          </span>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge
            value={journey.status ? (STATUS_LABELS[journey.status as keyof typeof STATUS_LABELS] || journey.status) : '-'}
          />
          <StatusBadge
            value={journey.validation_status ? (VALIDATION_STATUS_LABELS[journey.validation_status as keyof typeof VALIDATION_STATUS_LABELS] || journey.validation_status) : '-'}
          />
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{journey.stage_count} stages</span>
          <span>{journey.touchpoint_count} touchpoints</span>
          {(journey.high_pain_count ?? 0) > 0 && (
            <span className="text-red-600 dark:text-red-400 font-medium">
              ⚠ {journey.high_pain_count} high pain
            </span>
          )}
        </div>

        {/* Tags */}
        {journey.tags && journey.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {journey.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs rounded-full bg-gray-500/10 text-gray-700 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
            {journey.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{journey.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Updated date */}
        <div className="text-xs text-muted-foreground border-t pt-2">
          Updated {formatDate(journey.updated_at || journey.created_at || '')}
        </div>
      </div>
    </Link>
  )
}
