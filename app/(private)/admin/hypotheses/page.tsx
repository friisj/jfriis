export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { HypothesesListView } from '@/components/admin/views/hypotheses-list-view'

export default async function HypothesesPage() {
  const supabase = await createClient()

  const [hypothesesRes, projectsRes] = await Promise.all([
    supabase
      .from('studio_hypotheses')
      .select(`
        *,
        project:studio_projects(id, name)
      `)
      .order('created_at', { ascending: false }),
    supabase.from('studio_projects').select('id, name').order('name'),
  ])

  const hypotheses = hypothesesRes.data || []
  const projects = projectsRes.data || []

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Hypotheses</h1>
            <p className="text-muted-foreground">
              Manage your validation hypotheses across projects
            </p>
          </div>
          <Link
            href="/admin/hypotheses/new"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            New Hypothesis
          </Link>
        </div>

        <HypothesesListView hypotheses={hypotheses} projects={projects} />
      </div>
    </div>
  )
}
