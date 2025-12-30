export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { ExperimentsListView } from '@/components/admin/views/experiments-list-view'

export default async function ExperimentsPage() {
  const supabase = await createClient()

  const [experimentsRes, projectsRes] = await Promise.all([
    supabase
      .from('studio_experiments')
      .select(`
        *,
        project:studio_projects(id, name),
        hypothesis:studio_hypotheses(id, statement, sequence)
      `)
      .order('created_at', { ascending: false }),
    supabase.from('studio_projects').select('id, name').order('name'),
  ])

  const experiments = experimentsRes.data || []
  const projects = projectsRes.data || []

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Experiments</h1>
            <p className="text-muted-foreground">
              Manage your experiments, spikes, and prototypes
            </p>
          </div>
          <Link
            href="/admin/experiments/new"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            New Experiment
          </Link>
        </div>

        <ExperimentsListView experiments={experiments} projects={projects} />
      </div>
    </div>
  )
}
