export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { SpikesFilter } from './spikes-filter'

export default async function SpikesPage() {
  const supabase = await createClient()

  // Fetch all spikes, projects, and entity links in parallel
  const [spikesRes, projectsRes, linksRes] = await Promise.all([
    supabase
      .from('studio_asset_spikes')
      .select('id, slug, name, description, project_id, component_key, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('studio_projects')
      .select('id, slug, name'),
    supabase
      .from('entity_links')
      .select('source_id, target_id')
      .eq('source_type', 'experiment')
      .eq('target_type', 'asset_spike'),
  ])

  const spikes = spikesRes.data ?? []
  const projects = projectsRes.data ?? []

  // Build spike→experiment mapping from entity_links
  const spikeToExperimentId = new Map<string, string>()
  for (const link of linksRes.data ?? []) {
    spikeToExperimentId.set(link.target_id, link.source_id)
  }

  // Fetch experiments that are linked to spikes
  const experimentIds = [...new Set(spikeToExperimentId.values())]
  let experiments: { id: string; slug: string; name: string; type: string; project_id: string }[] = []
  if (experimentIds.length > 0) {
    const { data } = await supabase
      .from('studio_experiments')
      .select('id, slug, name, type, project_id')
      .in('id', experimentIds)
    experiments = data ?? []
  }

  const experimentMap = new Map(experiments.map(e => [e.id, e]))
  const projectMap = new Map(projects.map(p => [p.id, p]))

  // Build enriched spike list
  const enrichedSpikes = spikes.map(spike => {
    const project = projectMap.get(spike.project_id)
    const experimentId = spikeToExperimentId.get(spike.id)
    const experiment = experimentId ? experimentMap.get(experimentId) : null

    return {
      ...spike,
      projectSlug: project?.slug ?? null,
      projectName: project?.name ?? null,
      experimentSlug: experiment?.slug ?? null,
      experimentName: experiment?.name ?? null,
      experimentType: experiment?.type ?? null,
    }
  })

  // Unique projects for filter
  const projectsWithSpikes = [...new Set(spikes.map(s => s.project_id))]
    .map(id => projectMap.get(id))
    .filter(Boolean)
    .sort((a, b) => a!.name.localeCompare(b!.name)) as { id: string; slug: string; name: string }[]

  return (
    <div className="min-h-screen overflow-y-scroll">
      <div className="max-w-5xl mx-auto p-8">
        <nav className="mb-6 text-sm">
          <Link href="/studio" className="text-blue-600 hover:underline">Studio</Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">Spikes</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Spikes</h1>
          <p className="text-gray-500">{enrichedSpikes.length} spikes across {projectsWithSpikes.length} projects</p>
        </header>

        <SpikesFilter
          spikes={enrichedSpikes}
          projects={projectsWithSpikes}
        />
      </div>
    </div>
  )
}
