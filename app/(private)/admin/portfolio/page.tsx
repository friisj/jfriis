export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { PortfolioDashboard } from '@/components/portfolio/portfolio-dashboard'
import { PortfolioErrorState } from '@/components/portfolio/portfolio-error-state'
import { PortfolioErrorBoundary } from '@/components/portfolio/portfolio-error-boundary'

export default async function AdminPortfolioPage() {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      throw new Error(`Authentication error: ${authError.message}`)
    }

    console.log('Portfolio page - User:', user?.email)

    // Query the materialized view which already includes all project data + evidence summaries
    const { data: projects, error: projectsError } = await supabase
      .from('portfolio_evidence_summary')
      .select('*')
      .order('refreshed_at', { ascending: false })

    if (projectsError) {
      console.error('Error fetching portfolio data:', projectsError)
      throw new Error(`Failed to load portfolio projects: ${projectsError.message}`)
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

          <PortfolioErrorBoundary>
            <PortfolioDashboard projects={projects || []} />
          </PortfolioErrorBoundary>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Portfolio page error:', error)
    return (
      <div className="p-8">
        <div className="max-w-[1600px] mx-auto">
          <PortfolioErrorState
            error={error instanceof Error ? error.message : 'An unexpected error occurred'}
          />
        </div>
      </div>
    )
  }
}
