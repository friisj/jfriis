import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { ExperimentStatusSelect } from '@/components/studio/experiment-status-select'
import { EXPERIMENT_TYPE_LABELS } from '@/lib/boundary-objects/studio-experiments'
import { Zap, Box } from 'lucide-react'

type ExperimentStatus = 'planned' | 'in_progress' | 'completed' | 'abandoned'

function getOutcomeDisplay(outcome?: string) {
  switch (outcome) {
    case 'success': return { text: 'Success', color: 'text-green-600', symbol: '✓' }
    case 'failure': return { text: 'Failed', color: 'text-red-600', symbol: '✗' }
    case 'inconclusive': return { text: 'Inconclusive', color: 'text-yellow-600', symbol: '?' }
    default: return null
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

  // Query linked assets via entity_links
  const { data: spikeLinks } = await supabase
    .from('entity_links')
    .select('target_id')
    .eq('source_type', 'experiment')
    .eq('source_id', experiment.id)
    .eq('target_type', 'asset_spike')

  const { data: protoLinks } = await supabase
    .from('entity_links')
    .select('target_id')
    .eq('source_type', 'experiment')
    .eq('source_id', experiment.id)
    .eq('target_type', 'asset_prototype')

  // Fetch spike assets
  const spikeIds = spikeLinks?.map(l => l.target_id) ?? []
  let spikes: { id: string; slug: string; name: string; description: string | null }[] = []
  if (spikeIds.length > 0) {
    const { data } = await supabase
      .from('studio_asset_spikes')
      .select('id, slug, name, description')
      .in('id', spikeIds)
    spikes = data ?? []
  }

  // Fetch prototype assets
  const protoIds = protoLinks?.map(l => l.target_id) ?? []
  let prototypes: { id: string; slug: string; name: string; description: string | null; app_path: string }[] = []
  if (protoIds.length > 0) {
    const { data } = await supabase
      .from('studio_asset_prototypes')
      .select('id, slug, name, description, app_path')
      .in('id', protoIds)
    prototypes = data ?? []
  }

  const hasAssets = spikes.length > 0 || prototypes.length > 0
  const typeLabel = EXPERIMENT_TYPE_LABELS[experiment.type as keyof typeof EXPERIMENT_TYPE_LABELS] ?? experiment.type
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
              {typeLabel}
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

        {/* Assets */}
        {hasAssets && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 border-b-2 border-black pb-2">Assets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {spikes.map((spike) => (
                <Link
                  key={spike.id}
                  href={`/studio/${project.slug}/${experiment.slug}/${spike.slug}`}
                  className="block p-4 border-2 border-gray-200 rounded-lg hover:border-black transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="size-4 text-purple-600" />
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-700">
                      Spike
                    </span>
                  </div>
                  <h3 className="font-bold">{spike.name}</h3>
                  {spike.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{spike.description}</p>
                  )}
                </Link>
              ))}
              {prototypes.map((proto) => (
                <Link
                  key={proto.id}
                  href={`/studio/${project.slug}/${experiment.slug}/${proto.slug}`}
                  className="block p-4 border-2 border-gray-200 rounded-lg hover:border-black transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Box className="size-4 text-emerald-600" />
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-700">
                      Prototype
                    </span>
                  </div>
                  <h3 className="font-bold">{proto.name}</h3>
                  {proto.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{proto.description}</p>
                  )}
                </Link>
              ))}
            </div>
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
