'use client'

/**
 * StudioProjectSidebar Component
 *
 * Client-side sidebar for studio project edit page.
 * Uses EntityGeneratorField for hypotheses and experiments.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EntityGeneratorField } from './entity-generator-field'
import {
  flushPendingHypotheses,
  flushPendingExperiments,
  deleteHypothesis,
  deleteExperiment,
} from '@/app/actions/entity-generator'
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
  { value: 'prototype', label: 'Prototype' },
  { value: 'discovery_interviews', label: 'Discovery Interviews' },
  { value: 'landing_page', label: 'Landing Page' },
  { value: 'experiment', label: 'Other Experiment' },
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
      {/* Hypotheses */}
      <div className="rounded-lg border bg-card p-4">
        <EntityGeneratorField
          label="Hypotheses"
          sourceEntity={{
            type: 'studio_projects',
            id: project.id,
            data: {
              name: project.name,
              description: project.description,
              problem_statement: project.problem_statement,
              success_criteria: project.success_criteria,
              current_focus: project.current_focus,
            },
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
            data: {
              name: project.name,
              description: project.description,
              problem_statement: project.problem_statement,
              current_focus: project.current_focus,
            },
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
