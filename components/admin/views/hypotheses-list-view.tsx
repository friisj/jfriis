'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Hypothesis {
  id: string
  project_id: string
  statement: string
  validation_criteria: string | null
  sequence: number
  status: string
  created_at: string
  project?: {
    id: string
    name: string
  }
}

interface HypothesesListViewProps {
  hypotheses: Hypothesis[]
  projects: { id: string; name: string }[]
}

const statusColors: Record<string, string> = {
  proposed: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
  testing: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  validated: 'bg-green-500/10 text-green-700 dark:text-green-300',
  invalidated: 'bg-red-500/10 text-red-700 dark:text-red-300',
}

export function HypothesesListView({ hypotheses, projects }: HypothesesListViewProps) {
  const [filterProject, setFilterProject] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  const filtered = hypotheses.filter((h) => {
    if (filterProject && h.project_id !== filterProject) return false
    if (filterStatus && h.status !== filterStatus) return false
    return true
  })

  // Group by project for better organization
  const groupedByProject = filtered.reduce(
    (acc, h) => {
      const projectName = h.project?.name || 'Unknown Project'
      if (!acc[projectName]) acc[projectName] = []
      acc[projectName].push(h)
      return acc
    },
    {} as Record<string, Hypothesis[]>
  )

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Project</label>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-background text-sm"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-background text-sm"
          >
            <option value="">All Statuses</option>
            <option value="proposed">Proposed</option>
            <option value="testing">Testing</option>
            <option value="validated">Validated</option>
            <option value="invalidated">Invalidated</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {hypotheses.length} hypotheses
      </p>

      {/* Grouped list */}
      {Object.entries(groupedByProject).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No hypotheses found. Create your first hypothesis to get started.
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByProject)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([projectName, projectHypotheses]) => (
              <div key={projectName}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">{projectName}</h3>
                <div className="space-y-2">
                  {projectHypotheses
                    .sort((a, b) => a.sequence - b.sequence)
                    .map((h) => (
                      <Link
                        key={h.id}
                        href={`/admin/hypotheses/${h.id}/edit`}
                        className="block p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-muted-foreground">
                                #{h.sequence}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[h.status] || ''}`}
                              >
                                {h.status}
                              </span>
                            </div>
                            <p className="text-sm line-clamp-2">{h.statement}</p>
                            {h.validation_criteria && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                Criteria: {h.validation_criteria}
                              </p>
                            )}
                          </div>
                          <svg
                            className="w-5 h-5 text-muted-foreground flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
