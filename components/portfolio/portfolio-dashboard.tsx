'use client'

import { useState } from 'react'
import type { PortfolioEvidenceSummary } from '@/lib/types/database'
import { PortfolioMetricsSummary } from './portfolio-metrics-summary'
import { PortfolioFilters, type PortfolioFilterState } from './portfolio-filters'
import { PortfolioTableView } from './portfolio-table-view'

interface PortfolioDashboardProps {
  projects: PortfolioEvidenceSummary[]
}

export function PortfolioDashboard({ projects }: PortfolioDashboardProps) {
  const [filters, setFilters] = useState<PortfolioFilterState>({
    portfolioType: 'all',
    horizon: [],
    stage: [],
    riskLevel: [],
    evidenceStrength: [],
    needsReview: false,
  })

  // Apply filters to projects
  const filteredProjects = projects.filter((project) => {
    // Portfolio type filter
    if (filters.portfolioType !== 'all' && project.portfolio_type !== filters.portfolioType) {
      return false
    }

    // Horizon filter
    if (filters.horizon.length > 0 && project.horizon && !filters.horizon.includes(project.horizon)) {
      return false
    }

    // Stage filter (check both explore and exploit stages)
    if (filters.stage.length > 0) {
      const projectStage = project.explore_stage || project.exploit_stage
      if (!projectStage || !filters.stage.includes(projectStage)) {
        return false
      }
    }

    // Risk level filter
    if (filters.riskLevel.length > 0 && project.innovation_risk && !filters.riskLevel.includes(project.innovation_risk)) {
      return false
    }

    // Evidence strength filter
    if (filters.evidenceStrength.length > 0 && project.evidence_strength && !filters.evidenceStrength.includes(project.evidence_strength)) {
      return false
    }

    // Needs review filter
    if (filters.needsReview && project.next_review_due_at) {
      const dueDate = new Date(project.next_review_due_at)
      const now = new Date()
      if (dueDate > now) {
        return false
      }
    }

    return true
  })

  return (
    <div className="space-y-6">
      {/* Portfolio Metrics Summary */}
      <PortfolioMetricsSummary projects={projects} />

      {/* Filters */}
      <PortfolioFilters
        filters={filters}
        onFiltersChange={setFilters}
        projectCount={filteredProjects.length}
        totalCount={projects.length}
      />

      {/* Table View (MVP - map visualization comes in Phase 3) */}
      <PortfolioTableView projects={filteredProjects} />
    </div>
  )
}
