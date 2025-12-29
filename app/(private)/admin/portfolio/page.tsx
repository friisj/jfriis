export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { PortfolioDashboard } from '@/components/portfolio/portfolio-dashboard'
import { PortfolioErrorState } from '@/components/portfolio/portfolio-error-state'
import { PortfolioErrorBoundary } from '@/components/portfolio/portfolio-error-boundary'
import type { Project, PortfolioEvidenceSummary } from '@/lib/types/database'

type EnrichedProject = Project & {
  evidence_summary?: PortfolioEvidenceSummary
}

export default async function AdminPortfolioPage() {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      throw new Error(`Authentication error: ${authError.message}`)
    }

    console.log('Portfolio page - User:', user?.email)

    // Fetch projects with enriched evidence summary data from materialized view
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        *,
        evidence_summary:portfolio_evidence_summary!portfolio_evidence_summary_id_fkey(
          total_hypotheses,
          validated_hypotheses,
          hypothesis_validation_rate,
          total_experiments,
          successful_experiments,
          experiment_success_rate,
          avg_bmc_fit_score,
          avg_vpc_fit_score,
          computed_evidence_score,
          refreshed_at
        )
      `)
      .order('updated_at', { ascending: false })
      .returns<EnrichedProject[]>()

    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
      throw new Error(`Failed to load portfolio projects: ${projectsError.message}`)
    }

    console.log('Portfolio projects fetched:', projects?.length || 0)
    console.log('Evidence summaries loaded:', projects?.filter(p => p.evidence_summary).length || 0)

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
