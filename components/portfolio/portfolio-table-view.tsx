'use client'

import Link from 'next/link'
import type { Project } from '@/lib/types/database'
import { AdminDataView, AdminTableColumn, AdminEmptyState, StatusBadge } from '@/components/admin'
import { formatDate } from '@/lib/utils'
import {
  getEvidenceColor,
  getRiskColor,
  getPortfolioTypeColor,
  BADGE_BASE_CLASSES,
} from '@/lib/portfolio/colors'

interface PortfolioTableViewProps {
  projects: Project[]
}

export function PortfolioTableView({ projects }: PortfolioTableViewProps) {
  const columns: AdminTableColumn<Project>[] = [
    {
      key: 'title',
      header: 'Project',
      cell: (project) => (
        <div className="flex flex-col">
          <span className="font-medium">{project.title}</span>
          <span className="text-sm text-muted-foreground">/{project.slug}</span>
        </div>
      ),
    },
    {
      key: 'portfolio_type',
      header: 'Portfolio',
      cell: (project) => {
        if (!project.portfolio_type) {
          return <span className="text-sm text-muted-foreground">—</span>
        }
        return (
          <span className={`${BADGE_BASE_CLASSES} ${getPortfolioTypeColor(project.portfolio_type)}`}>
            {project.portfolio_type}
          </span>
        )
      },
    },
    {
      key: 'horizon',
      header: 'Horizon',
      cell: (project) => {
        if (!project.horizon) {
          return <span className="text-sm text-muted-foreground">—</span>
        }
        return (
          <span className="text-sm font-medium">
            {project.horizon.toUpperCase()}
          </span>
        )
      },
    },
    {
      key: 'stage',
      header: 'Stage',
      cell: (project) => {
        const stage = project.explore_stage || project.exploit_stage
        if (!stage) {
          return <span className="text-sm text-muted-foreground">—</span>
        }
        return <StatusBadge value={stage} />
      },
    },
    {
      key: 'evidence',
      header: 'Evidence',
      cell: (project) => {
        const strength = project.evidence_strength || 'none'
        return (
          <span className={`${BADGE_BASE_CLASSES} ${getEvidenceColor(strength)}`}>
            {strength}
          </span>
        )
      },
    },
    {
      key: 'risk',
      header: 'Risk',
      cell: (project) => {
        if (!project.innovation_risk) {
          return <span className="text-sm text-muted-foreground">—</span>
        }
        return (
          <span className={`${BADGE_BASE_CLASSES} ${getRiskColor(project.innovation_risk)}`}>
            {project.innovation_risk}
          </span>
        )
      },
    },
    {
      key: 'value',
      header: 'Value',
      cell: (project) => {
        const value = project.expected_return || project.profitability
        if (!value) {
          return <span className="text-sm text-muted-foreground">—</span>
        }
        return (
          <div className="text-sm">
            <div className="capitalize">{value}</div>
            {project.strategic_value_score && (
              <div className="text-xs text-muted-foreground">Score: {project.strategic_value_score}/10</div>
            )}
          </div>
        )
      },
    },
    {
      key: 'investment',
      header: 'Investment',
      cell: (project) => {
        if (!project.total_investment) {
          return <span className="text-sm text-muted-foreground">—</span>
        }
        return (
          <div className="text-sm">
            <div className="font-medium">${(project.total_investment / 1000).toFixed(0)}K</div>
            {project.allocated_fte && (
              <div className="text-xs text-muted-foreground">{project.allocated_fte} FTE</div>
            )}
          </div>
        )
      },
    },
    {
      key: 'review',
      header: 'Next Review',
      cell: (project) => {
        if (!project.next_review_due_at) {
          return <span className="text-sm text-muted-foreground">—</span>
        }
        const dueDate = new Date(project.next_review_due_at)
        const isPastDue = dueDate <= new Date()
        return (
          <span className={`text-sm ${isPastDue ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-muted-foreground'}`}>
            {formatDate(project.next_review_due_at)}
            {isPastDue && ' ⚠️'}
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (project) => (
        <Link
          href={`/admin/projects/${project.id}/edit`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
        >
          Edit
        </Link>
      ),
    },
  ]

  return (
    <AdminDataView
      data={projects}
      views={{
        table: {
          columns,
        },
      }}
      defaultView="table"
      persistenceKey="admin-portfolio-view"
      emptyState={
        <AdminEmptyState
          icon={
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
          title="No portfolio projects found"
          description="Try adjusting your filters or add projects to the portfolio"
          actionHref="/admin/projects/new"
          actionLabel="Create Project"
        />
      }
    />
  )
}
