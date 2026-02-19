'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Experiment {
  id: string
  project_id: string
  hypothesis_id: string | null
  slug: string
  name: string
  description: string | null
  type: string
  status: string
  outcome: string | null
  learnings: string | null
  created_at: string
  project?: {
    id: string
    name: string
  } | null
  hypothesis?: {
    id: string
    statement: string
    sequence: number
  } | null
}

interface ExperimentsListViewProps {
  experiments: Experiment[]
  projects: { id: string; name: string }[]
}

const typeColors: Record<string, string> = {
  spike: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  experiment: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  prototype: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  interview: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
  smoke_test: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
}

const statusColors: Record<string, string> = {
  planned: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
  in_progress: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  completed: 'bg-green-500/10 text-green-700 dark:text-green-300',
  abandoned: 'bg-red-500/10 text-red-700 dark:text-red-300',
}

const outcomeColors: Record<string, string> = {
  success: 'bg-green-500/10 text-green-700 dark:text-green-300',
  failure: 'bg-red-500/10 text-red-700 dark:text-red-300',
  inconclusive: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
}

export function ExperimentsListView({ experiments, projects }: ExperimentsListViewProps) {
  const [filterProject, setFilterProject] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  const filtered = experiments.filter((e) => {
    if (filterProject && e.project_id !== filterProject) return false
    if (filterType && e.type !== filterType) return false
    if (filterStatus && e.status !== filterStatus) return false
    return true
  })

  // Group by project for better organization
  const groupedByProject = filtered.reduce(
    (acc, e) => {
      const projectName = e.project?.name || 'Unknown Project'
      if (!acc[projectName]) acc[projectName] = []
      acc[projectName].push(e)
      return acc
    },
    {} as Record<string, Experiment[]>
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
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-background text-sm"
          >
            <option value="">All Types</option>
            <option value="spike">Spike</option>
            <option value="experiment">Experiment</option>
            <option value="prototype">Prototype</option>
            <option value="interview">Interview</option>
            <option value="smoke_test">Smoke Test</option>
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
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {experiments.length} experiments
      </p>

      {/* Grouped list */}
      {Object.entries(groupedByProject).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No experiments found. Create your first experiment to get started.
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByProject)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([projectName, projectExperiments]) => (
              <div key={projectName}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">{projectName}</h3>
                <div className="space-y-2">
                  {projectExperiments
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((e) => (
                      <Link
                        key={e.id}
                        href={`/admin/experiments/${e.id}/edit`}
                        className="block p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[e.type] || ''}`}
                              >
                                {e.type}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[e.status] || ''}`}
                              >
                                {e.status.replace('_', ' ')}
                              </span>
                              {e.outcome && (
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${outcomeColors[e.outcome] || ''}`}
                                >
                                  {e.outcome}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium">{e.name}</p>
                            {e.hypothesis && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Testing: #{e.hypothesis.sequence} {e.hypothesis.statement.slice(0, 60)}...
                              </p>
                            )}
                            {e.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {e.description}
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
