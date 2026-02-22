'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { AdminDetailLayout, StatusBadge, FeedbackManager } from '@/components/admin'
import { TouchpointAssumptionLinker } from '@/components/admin/touchpoint-assumption-linker'
import { TouchpointMappingLinker } from '@/components/admin/touchpoint-mapping-linker'
import { getTouchpoint } from '@/lib/boundary-objects/journeys'
import {
  getTouchpointWithAllRelations,
  type TouchpointMappingWithTarget,
  type TouchpointAssumptionWithDetails,
} from '@/lib/boundary-objects/mappings'
import type { Touchpoint } from '@/lib/types/boundary-objects'
import { supabase } from '@/lib/supabase'

interface TouchpointDetailPageProps {
  params: Promise<{ id: string; touchpointId: string }>
}

interface JourneyStageInfo {
  id: string
  name: string
  sequence: number
  user_journey: {
    id: string
    name: string
    studio_project_id: string | null
  }
}

const painLevels = [
  { value: 'none', label: 'None', color: 'text-gray-600' },
  { value: 'minor', label: 'Minor', color: 'text-yellow-600' },
  { value: 'moderate', label: 'Moderate', color: 'text-orange-600' },
  { value: 'major', label: 'Major', color: 'text-red-600' },
  { value: 'critical', label: 'Critical', color: 'text-red-700 font-semibold' },
]

export default function TouchpointDetailPage({ params }: TouchpointDetailPageProps) {
  const { id: journeyId, touchpointId } = use(params)

  const [touchpoint, setTouchpoint] = useState<Touchpoint | null>(null)
  const [stageInfo, setStageInfo] = useState<JourneyStageInfo | null>(null)
  const [mappings, setMappings] = useState<TouchpointMappingWithTarget[]>([])
  const [assumptions, setAssumptions] = useState<TouchpointAssumptionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'mappings' | 'assumptions' | 'feedback'>('overview')

  const loadTouchpoint = useCallback(async () => {
    try {
      setLoading(true)

      // Load touchpoint
      const tp = await getTouchpoint(touchpointId)
      setTouchpoint(tp)

      // Load all relations
      const relations = await getTouchpointWithAllRelations(touchpointId)
      setMappings(relations.mappings)
      setAssumptions(relations.assumptions)

      // Load stage and journey info
      const { data: stage, error: stageError } = await supabase
        .from('journey_stages')
        .select(`
          id,
          name,
          sequence,
          user_journey:user_journeys!inner (
            id,
            name,
            studio_project_id
          )
        `)
        .eq('id', tp.journey_stage_id)
        .single()

      if (stageError) throw stageError
      setStageInfo(stage as unknown as JourneyStageInfo)
    } catch (err) {
      console.error('Error loading touchpoint:', err)
      setError(err instanceof Error ? err.message : 'Failed to load touchpoint')
    } finally {
      setLoading(false)
    }
  }, [touchpointId])

  useEffect(() => {
    loadTouchpoint()
  }, [loadTouchpoint])

  const handleRefresh = useCallback(() => {
    loadTouchpoint()
  }, [loadTouchpoint])

  if (loading) {
    return (
      <AdminDetailLayout
        title="Loading..."
        backHref={`/admin/journeys/${journeyId}`}
        backLabel="Back to Journey"
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminDetailLayout>
    )
  }

  if (error || !touchpoint) {
    return (
      <AdminDetailLayout
        title="Error"
        backHref={`/admin/journeys/${journeyId}`}
        backLabel="Back to Journey"
      >
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-600 dark:text-red-400">{error || 'Touchpoint not found'}</p>
        </div>
      </AdminDetailLayout>
    )
  }

  const projectId = stageInfo?.user_journey?.studio_project_id || undefined

  return (
    <AdminDetailLayout
      title={touchpoint.name}
      backHref={`/admin/journeys/${journeyId}`}
      backLabel="Back to Journey"
      editHref={`/admin/journeys/${journeyId}/edit`}
    >
      <div className="space-y-6">
        {/* Breadcrumb */}
        {stageInfo && (
          <div className="text-sm text-muted-foreground">
            <Link href={`/admin/journeys/${journeyId}`} className="hover:text-foreground">
              {stageInfo.user_journey.name}
            </Link>
            <span className="mx-2">→</span>
            <span>Stage {stageInfo.sequence}: {stageInfo.name}</span>
            <span className="mx-2">→</span>
            <span className="text-foreground">{touchpoint.name}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {(['overview', 'mappings', 'assumptions', 'feedback'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'mappings' && mappings.length > 0 && (
                <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {mappings.length}
                </span>
              )}
              {tab === 'assumptions' && assumptions.length > 0 && (
                <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {assumptions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Details */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-4">Touchpoint Details</h3>
              <dl className="space-y-4">
                {touchpoint.description && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Description</dt>
                    <dd className="mt-1">{touchpoint.description}</dd>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Validation Status</dt>
                    <dd className="mt-1">
                      <StatusBadge value={touchpoint.validation_status || '-'} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Sequence</dt>
                    <dd className="mt-1 font-mono">#{touchpoint.sequence}</dd>
                  </div>
                </div>
                {touchpoint.channel_type && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Channel Type</dt>
                    <dd className="mt-1 capitalize">{touchpoint.channel_type.replace(/_/g, ' ')}</dd>
                  </div>
                )}
                {touchpoint.interaction_type && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Interaction Type</dt>
                    <dd className="mt-1 capitalize">{touchpoint.interaction_type.replace(/_/g, ' ')}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Pain & Importance */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-4">Assessment</h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Pain Level</dt>
                  <dd className="mt-1">
                    <span className={painLevels.find(p => p.value === touchpoint.pain_level)?.color || ''}>
                      {touchpoint.pain_level ? touchpoint.pain_level.charAt(0).toUpperCase() + touchpoint.pain_level.slice(1) : 'Not set'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Importance</dt>
                  <dd className="mt-1 capitalize">
                    {touchpoint.importance || 'Not set'}
                  </dd>
                </div>
                {touchpoint.current_experience_quality && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Current Experience Quality</dt>
                    <dd className="mt-1 capitalize">
                      {touchpoint.current_experience_quality.replace(/_/g, ' ')}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Quick Stats */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div className="rounded-lg border bg-card p-4 text-center">
                <div className="text-2xl font-bold">{mappings.length}</div>
                <div className="text-sm text-muted-foreground">Canvas Mappings</div>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <div className="text-2xl font-bold">{assumptions.length}</div>
                <div className="text-sm text-muted-foreground">Linked Assumptions</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mappings' && (
          <div className="rounded-lg border bg-card p-6">
            <TouchpointMappingLinker
              touchpointId={touchpointId}
              projectId={projectId}
              mappings={mappings}
              onMappingChange={handleRefresh}
            />
          </div>
        )}

        {activeTab === 'assumptions' && (
          <div className="rounded-lg border bg-card p-6">
            <TouchpointAssumptionLinker
              touchpointId={touchpointId}
              projectId={projectId}
              linkedAssumptions={assumptions}
              onAssumptionChange={handleRefresh}
            />
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="rounded-lg border bg-card p-6">
            <FeedbackManager
              entityType="touchpoint"
              entityId={touchpointId}
            />
          </div>
        )}
      </div>
    </AdminDetailLayout>
  )
}
