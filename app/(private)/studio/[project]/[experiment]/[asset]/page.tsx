import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { ExperimentPrototypeView } from '@/components/studio/experiment-prototype-view'
import { PrototypeRenderer } from '@/components/studio/prototype-renderer'
import { ExternalLink } from 'lucide-react'

type ExperimentStatus = 'planned' | 'in_progress' | 'completed' | 'abandoned'
type ExperimentOutcome = 'success' | 'failure' | 'inconclusive' | null

interface Props {
  params: Promise<{ project: string; experiment: string; asset: string }>
}

export default async function AssetPage({ params }: Props) {
  const { project: projectSlug, experiment: experimentSlug, asset: assetSlug } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('studio_projects')
    .select('id, slug, name')
    .eq('slug', projectSlug)
    .single()

  if (!project) notFound()

  const { data: experiment } = await supabase
    .from('studio_experiments')
    .select('*')
    .eq('project_id', project.id)
    .eq('slug', experimentSlug)
    .single()

  if (!experiment) notFound()

  // Look up hypothesis for sidebar
  let hypothesis = null
  if (experiment.hypothesis_id) {
    const { data } = await supabase
      .from('studio_hypotheses')
      .select('sequence, statement, validation_criteria')
      .eq('id', experiment.hypothesis_id)
      .single()
    hypothesis = data
  }

  // Try spike asset first
  const { data: spike } = await supabase
    .from('studio_asset_spikes')
    .select('id, slug, name, description, component_key')
    .eq('project_id', project.id)
    .eq('slug', assetSlug)
    .single()

  if (spike) {
    // Verify entity link exists between experiment and spike
    const { data: link } = await supabase
      .from('entity_links')
      .select('id')
      .eq('source_type', 'experiment')
      .eq('source_id', experiment.id)
      .eq('target_type', 'asset_spike')
      .eq('target_id', spike.id)
      .limit(1)
      .single()

    if (!link) notFound()

    // Render fullscreen spike view (same as old prototype view)
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
        <PrototypeRenderer prototypeKey={spike.component_key} />
      </ExperimentPrototypeView>
    )
  }

  // Try prototype asset
  const { data: proto } = await supabase
    .from('studio_asset_prototypes')
    .select('id, slug, name, description, app_path')
    .eq('project_id', project.id)
    .eq('slug', assetSlug)
    .single()

  if (proto) {
    // Verify entity link exists
    const { data: link } = await supabase
      .from('entity_links')
      .select('id')
      .eq('source_type', 'experiment')
      .eq('source_id', experiment.id)
      .eq('target_type', 'asset_prototype')
      .eq('target_id', proto.id)
      .limit(1)
      .single()

    if (!link) notFound()

    // Render prototype metadata card with app link
    return (
      <div className="min-h-screen bg-white text-black p-8">
        <div className="max-w-2xl mx-auto">
          <nav className="mb-8 text-sm">
            <Link href={`/studio/${project.slug}`} className="text-blue-600 hover:underline">
              {project.name}
            </Link>
            <span className="mx-2 text-gray-400">/</span>
            <Link href={`/studio/${project.slug}/${experiment.slug}`} className="text-blue-600 hover:underline">
              {experiment.name}
            </Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-600">{proto.name}</span>
          </nav>

          <header className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-700">
                Prototype
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{proto.name}</h1>
            {proto.description && (
              <p className="text-lg text-gray-600">{proto.description}</p>
            )}
          </header>

          <a
            href={proto.app_path}
            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-lg font-medium"
          >
            Open App
            <ExternalLink className="size-5" />
          </a>

          <footer className="mt-16 pt-8 border-t border-gray-200 text-sm text-gray-500">
            <p>
              <span className="font-medium">Path:</span>{' '}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{proto.app_path}</code>
            </p>
          </footer>
        </div>
      </div>
    )
  }

  notFound()
}
