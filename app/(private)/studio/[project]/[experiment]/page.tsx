import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ExperimentPrototypeView } from '@/components/studio/experiment-prototype-view'
import { ExperimentStatusSelect } from '@/components/studio/experiment-status-select'

type ExperimentStatus = 'planned' | 'in_progress' | 'completed' | 'abandoned'
type ExperimentOutcome = 'success' | 'failure' | 'inconclusive' | null

// Dynamic prototype component registry
// Add new prototype components here as you build them
// Components should be placed in: components/studio/prototypes/{project-slug}/{experiment-slug}.tsx
const prototypeRegistry: Record<string, React.ComponentType> = {
  'putt/physics-engine': dynamic(() => import('@/components/studio/prototypes/putt/physics-engine')),
  'putt/green-outline': dynamic(() => import('@/components/studio/prototypes/putt/green-outline')),
  'putt/green-generation': dynamic(() => import('@/components/studio/prototypes/putt/green-generation')),
  'putt/undulation-system': dynamic(() => import('@/components/studio/prototypes/putt/undulation-system')),
  'putt/cup-mechanics': dynamic(() => import('@/components/studio/prototypes/putt/cup-mechanics')),
}

function getOutcomeDisplay(outcome?: string) {
  switch (outcome) {
    case 'success': return { text: 'Success', color: 'text-green-600', symbol: '✓' }
    case 'failure': return { text: 'Failed', color: 'text-red-600', symbol: '✗' }
    case 'inconclusive': return { text: 'Inconclusive', color: 'text-yellow-600', symbol: '?' }
    default: return null
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'prototype': return 'Prototype'
    case 'discovery_interviews': return 'Discovery'
    case 'landing_page': return 'Landing Page'
    default: return 'Experiment'
  }
}

interface Props {
  params: Promise<{ project: string; experiment: string }>
}

export default async function ExperimentPage({ params }: Props) {
  const { project: projectSlug, experiment: experimentSlug } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('studio_projects')
    .select('id, slug, name')
    .eq('slug', projectSlug)
    .single()

  if (!project) {
    notFound()
  }

  const { data: experiment } = await supabase
    .from('studio_experiments')
    .select('*')
    .eq('project_id', project.id)
    .eq('slug', experimentSlug)
    .single()

  if (!experiment) {
    notFound()
  }

  let hypothesis = null
  if (experiment.hypothesis_id) {
    const { data } = await supabase
      .from('studio_hypotheses')
      .select('sequence, statement, validation_criteria')
      .eq('id', experiment.hypothesis_id)
      .single()
    hypothesis = data
  }

  // Look up prototype component by project/experiment slug combination
  const prototypeKey = `${projectSlug}/${experimentSlug}`
  const PrototypeComponent = experiment.type === 'prototype'
    ? prototypeRegistry[prototypeKey]
    : null

  // Fullscreen prototype view
  if (PrototypeComponent) {
    return (
      <ExperimentPrototypeView
        experiment={{
          id: experiment.id,
          slug: experiment.slug,
          name: experiment.name,
          description: experiment.description,
          status: experiment.status as ExperimentStatus,
          outcome: (experiment.outcome ?? null) as ExperimentOutcome,
          learnings: experiment.learnings ?? null,
          type: experiment.type,
          created_at: experiment.created_at,
          updated_at: experiment.updated_at,
        }}
        project={{ slug: project.slug, name: project.name }}
        hypothesis={hypothesis}
      >
        <PrototypeComponent />
      </ExperimentPrototypeView>
    )
  }

  // Document layout for non-prototype experiments
  const outcomeDisplay = getOutcomeDisplay(experiment.outcome ?? undefined)

  return (
    <div className="min-h-screen bg-white text-black p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm flex items-center justify-between">
          <div>
            <Link href={`/studio/${project.slug}`} className="text-blue-600 hover:underline">
              {project.name}
            </Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-600">{experiment.name}</span>
          </div>
          <Link
            href={`/admin/experiments/${experiment.id}/edit`}
            className="text-gray-400 hover:text-gray-600 text-xs hover:underline transition-colors"
          >
            Edit
          </Link>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium uppercase text-gray-500">
              {getTypeLabel(experiment.type)}
            </span>
            <ExperimentStatusSelect experimentId={experiment.id} status={experiment.status as ExperimentStatus} />
            {outcomeDisplay && (
              <span className={`text-sm font-bold ${outcomeDisplay.color}`}>
                {outcomeDisplay.symbol} {outcomeDisplay.text}
              </span>
            )}
          </div>
          <h1 className="text-4xl font-bold mb-4">{experiment.name}</h1>
          {experiment.description && (
            <p className="text-xl text-gray-600">{experiment.description}</p>
          )}
        </header>

        {/* Parent Hypothesis */}
        {hypothesis && (
          <section className="mb-12 p-6 border-2 border-black">
            <h2 className="text-lg font-bold mb-2 uppercase tracking-wide">Testing Hypothesis</h2>
            <p className="text-lg italic mb-3">
              H{hypothesis.sequence}: {hypothesis.statement}
            </p>
            {hypothesis.validation_criteria && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Validation criteria:</span> {hypothesis.validation_criteria}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Prototype Placeholder (if prototype but no component found) */}
      {experiment.type === 'prototype' && (
        <div className="max-w-4xl mx-auto">
          <section className="mb-12 p-6 border-2 border-dashed border-gray-300">
            <h2 className="text-lg font-bold mb-4 uppercase tracking-wide text-gray-400">
              Prototype Component
            </h2>
            <p className="text-gray-400">
              Component not yet implemented. Add to prototype registry at:
              <code className="bg-gray-100 px-1 ml-1">app/(private)/studio/[project]/[experiment]/page.tsx</code>
            </p>
          </section>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Discovery Tools Placeholder */}
        {experiment.type === 'discovery_interviews' && (
          <section className="mb-12 p-6 border-2 border-dashed border-gray-300">
            <h2 className="text-lg font-bold mb-4 uppercase tracking-wide text-gray-400">
              Discovery Tools (Coming Soon)
            </h2>
            <p className="text-gray-400">Interview scheduling, note-taking, and synthesis tools</p>
          </section>
        )}

        {/* Landing Page Placeholder */}
        {experiment.type === 'landing_page' && (
          <section className="mb-12 p-6 border-2 border-dashed border-gray-300">
            <h2 className="text-lg font-bold mb-4 uppercase tracking-wide text-gray-400">
              Landing Page Metrics (Coming Soon)
            </h2>
            <p className="text-gray-400">Conversion tracking, A/B testing results, signup metrics</p>
          </section>
        )}

        {/* Outcome & Learnings */}
        {(experiment.outcome || experiment.learnings) && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 border-b-2 border-black pb-2">
              Results
            </h2>
            {experiment.outcome && outcomeDisplay && (
              <div className={`mb-6 p-4 border-l-4 ${
                experiment.outcome === 'success' ? 'border-green-500 bg-green-50' :
                experiment.outcome === 'failure' ? 'border-red-500 bg-red-50' :
                'border-yellow-500 bg-yellow-50'
              }`}>
                <h3 className="font-bold text-sm uppercase mb-1">Outcome</h3>
                <p className={`text-lg font-bold ${outcomeDisplay.color}`}>
                  {outcomeDisplay.symbol} {outcomeDisplay.text}
                </p>
              </div>
            )}
            {experiment.learnings && (
              <div>
                <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">Learnings</h3>
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{experiment.learnings}</p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t-2 border-gray-300 text-sm text-gray-500">
          <p>
            <span className="font-medium">Created:</span>{' '}
            {new Date(experiment.created_at).toLocaleDateString()}
            <span className="ml-4">
              <span className="font-medium">Updated:</span>{' '}
              {new Date(experiment.updated_at).toLocaleDateString()}
            </span>
          </p>
        </footer>
      </div>
    </div>
  )
}
