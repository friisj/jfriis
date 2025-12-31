'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/admin'
import { formatDate } from '@/lib/utils'

interface Touchpoint {
  id: string
  name: string
  description?: string | null
  sequence: number
  channel_type?: string | null
  interaction_type?: string | null
  importance?: string | null
  pain_level?: string | null
  current_experience_quality?: string | null
  validation_status: string
}

interface Stage {
  id: string
  name: string
  description?: string | null
  sequence: number
  stage_type?: string | null
  customer_emotion?: string | null
  customer_mindset?: string | null
  customer_goal?: string | null
  validation_status: string
  touchpoints: Touchpoint[]
}

interface Journey {
  id: string
  name: string
  description?: string | null
  status: string
  validation_status: string
  journey_type: string
  goal?: string | null
  duration_estimate?: string | null
  tags: string[]
  created_at: string
  updated_at: string
  customer_profile?: { id: string; name: string; slug: string } | null
  studio_project?: { id: string; name: string; slug: string } | null
  hypothesis?: { id: string; statement: string } | null
}

interface JourneyDetailViewProps {
  journey: Journey
  stages: Stage[]
}

const painColors: Record<string, string> = {
  none: 'bg-gray-500/10 text-gray-700',
  minor: 'bg-yellow-500/10 text-yellow-700',
  moderate: 'bg-orange-500/10 text-orange-700',
  major: 'bg-red-500/10 text-red-700',
  critical: 'bg-red-700/20 text-red-800 font-semibold',
}

const importanceColors: Record<string, string> = {
  low: 'bg-gray-500/10 text-gray-700',
  medium: 'bg-blue-500/10 text-blue-700',
  high: 'bg-purple-500/10 text-purple-700',
  critical: 'bg-purple-700/20 text-purple-800 font-semibold',
}

export function JourneyDetailView({ journey, stages }: JourneyDetailViewProps) {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(
    new Set(stages.map((s) => s.id))
  )

  const toggleStage = (stageId: string) => {
    const newExpanded = new Set(expandedStages)
    if (newExpanded.has(stageId)) {
      newExpanded.delete(stageId)
    } else {
      newExpanded.add(stageId)
    }
    setExpandedStages(newExpanded)
  }

  const totalTouchpoints = stages.reduce((sum, stage) => sum + stage.touchpoints.length, 0)
  const highPainTouchpoints = stages.reduce(
    (sum, stage) =>
      sum +
      stage.touchpoints.filter((t) => t.pain_level === 'major' || t.pain_level === 'critical')
        .length,
    0
  )

  return (
    <div className="space-y-8">
      {/* Journey Overview */}
      <div className="rounded-lg border bg-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-4">Journey Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={journey.status} />
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Validation Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={journey.validation_status} />
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Type</dt>
                <dd className="mt-1 text-sm">{journey.journey_type.replace(/_/g, ' ')}</dd>
              </div>
              {journey.duration_estimate && (
                <div>
                  <dt className="text-sm text-muted-foreground">Duration Estimate</dt>
                  <dd className="mt-1 text-sm">{journey.duration_estimate}</dd>
                </div>
              )}
            </dl>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Relationships</h3>
            <dl className="space-y-3">
              {journey.customer_profile && (
                <div>
                  <dt className="text-sm text-muted-foreground">Customer Profile</dt>
                  <dd className="mt-1 text-sm font-medium">{journey.customer_profile.name}</dd>
                </div>
              )}
              {journey.studio_project && (
                <div>
                  <dt className="text-sm text-muted-foreground">Studio Project</dt>
                  <dd className="mt-1 text-sm font-medium">{journey.studio_project.name}</dd>
                </div>
              )}
              {journey.hypothesis && (
                <div>
                  <dt className="text-sm text-muted-foreground">Hypothesis</dt>
                  <dd className="mt-1 text-sm">{journey.hypothesis.statement}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {journey.goal && (
          <div className="mt-6 pt-6 border-t">
            <dt className="text-sm text-muted-foreground mb-2">Customer Goal</dt>
            <dd className="text-sm">{journey.goal}</dd>
          </div>
        )}

        {journey.tags && journey.tags.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <dt className="text-sm text-muted-foreground mb-2">Tags</dt>
            <dd className="flex flex-wrap gap-2">
              {journey.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </dd>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Stages</div>
          <div className="text-2xl font-bold mt-1">{stages.length}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Touchpoints</div>
          <div className="text-2xl font-bold mt-1">{totalTouchpoints}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">High Pain Points</div>
          <div className="text-2xl font-bold mt-1 text-red-600">{highPainTouchpoints}</div>
        </div>
      </div>

      {/* Stages & Touchpoints */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Journey Stages & Touchpoints</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setExpandedStages(new Set(stages.map((s) => s.id)))}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Expand All
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              onClick={() => setExpandedStages(new Set())}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Collapse All
            </button>
          </div>
        </div>

        {stages.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <p className="text-muted-foreground">No stages yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Edit this journey to add stages and touchpoints
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {stages.map((stage) => {
              const isExpanded = expandedStages.has(stage.id)

              return (
                <div key={stage.id} className="rounded-lg border bg-card">
                  {/* Stage Header */}
                  <button
                    onClick={() => toggleStage(stage.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground font-mono">
                        #{stage.sequence}
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{stage.name}</div>
                        {stage.customer_emotion && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Emotion: {stage.customer_emotion}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        {stage.touchpoints.length}{' '}
                        {stage.touchpoints.length === 1 ? 'touchpoint' : 'touchpoints'}
                      </div>
                      <svg
                        className={`w-5 h-5 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  {/* Touchpoints */}
                  {isExpanded && (
                    <div className="border-t">
                      {stage.touchpoints.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No touchpoints in this stage
                        </div>
                      ) : (
                        <div className="divide-y">
                          {stage.touchpoints.map((touchpoint) => (
                            <Link
                              key={touchpoint.id}
                              href={`/admin/journeys/${journey.id}/touchpoints/${touchpoint.id}`}
                              className="block p-4 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground font-mono">
                                      {stage.sequence}.{touchpoint.sequence}
                                    </span>
                                    <span className="font-medium">{touchpoint.name}</span>
                                    <svg
                                      className="w-4 h-4 text-muted-foreground"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5l7 7-7 7"
                                      />
                                    </svg>
                                  </div>
                                  {touchpoint.description && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                      {touchpoint.description}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {touchpoint.channel_type && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-muted">
                                        {touchpoint.channel_type.replace(/_/g, ' ')}
                                      </span>
                                    )}
                                    {touchpoint.importance && (
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded ${
                                          importanceColors[touchpoint.importance]
                                        }`}
                                      >
                                        {touchpoint.importance} importance
                                      </span>
                                    )}
                                    {touchpoint.pain_level && touchpoint.pain_level !== 'none' && (
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded ${
                                          painColors[touchpoint.pain_level]
                                        }`}
                                      >
                                        {touchpoint.pain_level} pain
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
