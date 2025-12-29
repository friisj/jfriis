export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { PortfolioDashboard } from '@/components/portfolio/portfolio-dashboard'
import type { Project } from '@/lib/types/database'

export default async function AdminPortfolioPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  console.log('Portfolio page - User:', user?.email)

  // Fetch all projects with portfolio dimensions
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *
    `)
    .order('updated_at', { ascending: false })
    .returns<Project[]>()

  if (error) {
    console.error('Error fetching projects:', error)
    return <div className="p-8">Error loading portfolio</div>
  }

  console.log('Portfolio projects fetched:', projects?.length || 0)

  return (
    <div className="p-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Portfolio Dashboard</h1>
          <p className="text-muted-foreground">
            Strategyzer Portfolio Map visualization and evidence-based innovation management
          </p>
        </div>

        <PortfolioDashboard projects={projects || []} />
      </div>
    </div>
  )
}
