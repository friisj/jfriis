'use client'

/**
 * StudioProjectSidebar Component
 *
 * Client-side sidebar for studio project edit page.
 * Uses EntityGeneratorField for hypotheses and experiments.
 * Supports context enrichment from linked boundary objects.
 */

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EntityGeneratorField } from './entity-generator-field'
import {
  flushPendingHypotheses,
  flushPendingExperiments,
  deleteHypothesis,
  deleteExperiment,
} from '@/app/actions/entity-generator'
import { fetchProjectBoundaryContext } from '@/app/actions/fetch-project-context'
import type { PendingEntity } from '@/lib/ai/hooks/useEntityGenerator'
import type { EntitySubtypeOption } from './entity-generator-field'

// Hypothesis types - conceptual categories to guide generation
const HYPOTHESIS_TYPE_OPTIONS: EntitySubtypeOption[] = [
  { value: 'value', label: 'Value Hypothesis' },
  { value: 'growth', label: 'Growth Hypothesis' },
  { value: 'usability', label: 'Usability Hypothesis' },
  { value: 'feasibility', label: 'Feasibility Hypothesis' },
  { value: 'desirability', label: 'Desirability Hypothesis' },
  { value: 'viability', label: 'Viability Hypothesis' },
]

// Experiment types - matches StudioExperimentType in database
const EXPERIMENT_TYPE_OPTIONS: EntitySubtypeOption[] = [
  { value: 'spike', label: 'Spike' },
  { value: 'experiment', label: 'Experiment' },
  { value: 'prototype', label: 'Prototype' },
  { value: 'interview', label: 'Interview' },
  { value: 'smoke_test', label: 'Smoke Test' },
]

interface StudioProjectSidebarProps {
  project: {
    id: string
    slug: string
    name: string
    description: string | null
    problem_statement: string | null
    success_criteria: string | null
    current_focus: string | null
    has_pending_survey?: boolean
  }
  hypotheses: Array<{
    id: string
    statement: string
    rationale: string | null
    validation_criteria: string | null
    status: string
    sequence: number
  }>
  experiments: Array<{
    id: string
    name: string
    description: string | null
    type: string | null
    status: string
    expected_outcome: string | null
  }>
}

export function StudioProjectSidebar({
  project,
  hypotheses,
  experiments,
}: StudioProjectSidebarProps) {
  const router = useRouter()
  const [useContext, setUseContext] = useState(false)
  const [boundaryContext, setBoundaryContext] = useState<string | null>(null)
  const [manualContext, setManualContext] = useState('')
  const [contextLoading, setContextLoading] = useState(false)
  const [contextError, setContextError] = useState<string | null>(null)

  // Fetch boundary context from server
  const loadContext = useCallback(async () => {
    setContextLoading(true)
    setContextError(null)
    try {
      const result = await fetchProjectBoundaryContext(project.id)
      if (result.hasContext) {
        setBoundaryContext(result.summary)
      } else {
        setBoundaryContext(null)
      }
    } catch {
      setContextError('Failed to load boundary context')
    } finally {
      setContextLoading(false)
    }
  }, [project.id])

  // Toggle context enrichment
  const toggleContext = useCallback(() => {
    const next = !useContext
    setUseContext(next)
    if (next && boundaryContext === null && !contextLoading) {
      loadContext()
    }
  }, [useContext, boundaryContext, contextLoading, loadContext])

  // Get the active context string (boundary objects or manual fallback)
  const activeContext = useContext
    ? (boundaryContext || manualContext || null)
    : null

  // Build enriched source data for generators
  const buildSourceData = (baseData: Record<string, unknown>) => {
    if (!activeContext) return baseData
    return { ...baseData, boundary_context: activeContext }
  }

  // Calculate next sequence number for hypotheses (defensive: handle empty array)
  const nextHypothesisSequence = hypotheses.length > 0
    ? Math.max(...hypotheses.map((h) => h.sequence ?? 0)) + 1
    : 1

  // Handle flushing pending hypotheses to DB via Server Action
  const handleFlushHypotheses = async (pending: PendingEntity[]): Promise<{ success: boolean; error?: string }> => {
    const result = await flushPendingHypotheses(project.id, pending, nextHypothesisSequence)
    if (result.success) {
      router.refresh()
    }
    return result
  }

  // Handle flushing pending experiments to DB via Server Action
  const handleFlushExperiments = async (pending: PendingEntity[]): Promise<{ success: boolean; error?: string }> => {
    const result = await flushPendingExperiments(project.id, pending)
    if (result.success) {
      router.refresh()
    }
    return result
  }

  // Handle deleting a hypothesis via Server Action
  const handleDeleteHypothesis = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const result = await deleteHypothesis(id)
    if (result.success) {
      router.refresh()
    }
    return result
  }

  // Handle deleting an experiment via Server Action
  const handleDeleteExperiment = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const result = await deleteExperiment(id)
    if (result.success) {
      router.refresh()
    }
    return result
  }

  return (
    <div className="space-y-6">
      {/* Context Enrichment Toggle */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Strategic Context</span>
          <button
            type="button"
            onClick={toggleContext}
            className={`text-xs px-2 py-1 rounded-md transition-colors ${
              useContext
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {contextLoading ? 'Loading...' : useContext ? 'Context on' : 'Add context'}
          </button>
        </div>

        {contextError && (
          <p className="mt-2 text-xs text-red-500">{contextError}</p>
        )}

        {useContext && !contextLoading && boundaryContext && (
          <p className="mt-2 text-xs text-muted-foreground">
            Boundary objects loaded. Generation will be grounded in strategic context.
          </p>
        )}

        {useContext && !contextLoading && !boundaryContext && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1">
              No linked boundary objects. Add manual context or run{' '}
              <code className="text-[10px] bg-muted px-1 rounded">/generate-boundary-objects {project.slug}</code>.
            </p>
            <textarea
              value={manualContext}
              onChange={(e) => setManualContext(e.target.value)}
              placeholder="Describe your target audience, business model, key risks..."
              className="w-full h-20 px-2 py-1.5 text-sm rounded border bg-background resize-none"
            />
          </div>
        )}
      </div>

      {/* Hypotheses */}
      <div className="rounded-lg border bg-card p-4">
        <EntityGeneratorField
          label="Hypotheses"
          sourceEntity={{
            type: 'studio_projects',
            id: project.id,
            data: buildSourceData({
              name: project.name,
              description: project.description,
              problem_statement: project.problem_statement,
              success_criteria: project.success_criteria,
              current_focus: project.current_focus,
            }),
          }}
          targetType="studio_hypotheses"
          items={hypotheses}
          defaultValues={{
            project_id: project.id,
            status: 'proposed',
            sequence: nextHypothesisSequence,
          }}
          onFlush={handleFlushHypotheses}
          onDeleteItem={handleDeleteHypothesis}
          displayField="statement"
          editableFields={['statement', 'rationale', 'validation_criteria']}
          editLinkPattern="/admin/hypotheses/{id}/edit"
          addLink={`/admin/hypotheses/new?project=${project.id}`}
          statusField="status"
          subtypeOptions={HYPOTHESIS_TYPE_OPTIONS}
          subtypeLabel="Hypothesis Type"
        />
      </div>

      {/* Experiments */}
      <div className="rounded-lg border bg-card p-4">
        <EntityGeneratorField
          label="Experiments"
          sourceEntity={{
            type: 'studio_projects',
            id: project.id,
            data: buildSourceData({
              name: project.name,
              description: project.description,
              problem_statement: project.problem_statement,
              current_focus: project.current_focus,
            }),
          }}
          targetType="studio_experiments"
          items={experiments}
          defaultValues={{
            project_id: project.id,
            status: 'planned',
            type: 'experiment', // Default type required by DB constraint
          }}
          onFlush={handleFlushExperiments}
          onDeleteItem={handleDeleteExperiment}
          displayField="name"
          editableFields={['name', 'description', 'type', 'expected_outcome']}
          editLinkPattern="/admin/experiments/{id}/edit"
          addLink={`/admin/experiments/new?project=${project.id}`}
          statusField="status"
          subtypeOptions={EXPERIMENT_TYPE_OPTIONS}
          subtypeLabel="Experiment Type"
        />
      </div>

      {/* Pending Survey Banner */}
      {project.has_pending_survey && (
        <div className="rounded-lg border border-amber-500 bg-amber-50 dark:bg-amber-950/20 p-4">
          <h3 className="font-semibold mb-2 text-amber-800 dark:text-amber-200">
            📋 Survey In Progress
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
            Complete the discovery survey to generate hypotheses and experiments.
          </p>
          <Link
            href={`/admin/studio/${project.id}/survey`}
            className="inline-block px-3 py-1.5 text-sm font-medium bg-amber-600 text-white rounded hover:bg-amber-700"
          >
            Continue Survey →
          </Link>
        </div>
      )}

      {/* Quick Links */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-semibold mb-3">Quick Links</h3>
        <div className="space-y-2 text-sm">
          <Link
            href={`/studio/${project.slug}`}
            className="block text-blue-600 hover:underline"
          >
            View Project Page →
          </Link>
        </div>
      </div>
    </div>
  )
}
