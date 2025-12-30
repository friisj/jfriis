'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AdminTable,
  AdminTableColumn,
  AdminEmptyState,
  StatusBadge,
} from '@/components/admin'
import { formatDate } from '@/lib/utils'

interface Assumption {
  id: string
  slug: string
  statement: string
  category: string
  importance: string
  evidence_level: string
  status: string
  is_leap_of_faith: boolean | null
  source_type: string | null
  source_block: string | null
  studio_project_id: string | null
  created_at: string
  updated_at: string
  studio_project?: { name: string } | null
}

interface AssumptionsListViewProps {
  assumptions: Assumption[]
}

const categoryLabels: Record<string, string> = {
  desirability: 'Desirability',
  viability: 'Viability',
  feasibility: 'Feasibility',
  usability: 'Usability',
  ethical: 'Ethical',
}

const categoryColors: Record<string, string> = {
  desirability: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  viability: 'bg-green-500/10 text-green-700 dark:text-green-400',
  feasibility: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  usability: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  ethical: 'bg-red-500/10 text-red-700 dark:text-red-400',
}

const importanceLabels: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const evidenceLabels: Record<string, string> = {
  none: 'None',
  weak: 'Weak',
  moderate: 'Moderate',
  strong: 'Strong',
}

type ViewMode = 'table' | 'matrix'
type FilterCategory = 'all' | 'desirability' | 'viability' | 'feasibility' | 'usability' | 'ethical'

export function AssumptionsListView({ assumptions }: AssumptionsListViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all')
  const [showLeapOfFaithOnly, setShowLeapOfFaithOnly] = useState(false)

  // Filter assumptions
  const filteredAssumptions = assumptions.filter((a) => {
    if (filterCategory !== 'all' && a.category !== filterCategory) return false
    if (showLeapOfFaithOnly && !a.is_leap_of_faith) return false
    return true
  })

  const columns: AdminTableColumn<Assumption>[] = [
    {
      key: 'statement',
      header: 'Assumption',
      cell: (assumption) => (
        <div className="max-w-md">
          <div className="font-medium line-clamp-2">{assumption.statement}</div>
          <div className="flex items-center gap-2 mt-1">
            {assumption.is_leap_of_faith && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
                Leap of Faith
              </span>
            )}
            {assumption.source_type && (
              <span className="text-xs text-muted-foreground">
                from {assumption.source_type.replace(/_/g, ' ')}
                {assumption.source_block && ` → ${assumption.source_block.replace(/_/g, ' ')}`}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (assumption) => (
        <span className={`text-xs px-2 py-1 rounded font-medium ${categoryColors[assumption.category] || ''}`}>
          {categoryLabels[assumption.category] || assumption.category}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (assumption) => (
        <div className="text-sm">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Imp:</span>
            <span className={
              assumption.importance === 'critical' ? 'text-red-600 dark:text-red-400 font-medium' :
              assumption.importance === 'high' ? 'text-orange-600 dark:text-orange-400' :
              'text-muted-foreground'
            }>
              {importanceLabels[assumption.importance]}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Evd:</span>
            <span className={
              assumption.evidence_level === 'strong' ? 'text-green-600 dark:text-green-400' :
              assumption.evidence_level === 'moderate' ? 'text-blue-600 dark:text-blue-400' :
              'text-muted-foreground'
            }>
              {evidenceLabels[assumption.evidence_level]}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (assumption) => <StatusBadge value={assumption.status} />,
    },
    {
      key: 'project',
      header: 'Project',
      cell: (assumption) => (
        <span className="text-sm text-muted-foreground">
          {assumption.studio_project?.name || '-'}
        </span>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      cell: (assumption) => (
        <span className="text-sm text-muted-foreground">{formatDate(assumption.updated_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (assumption) => (
        <Link
          href={`/admin/assumptions/${assumption.id}/edit`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
        >
          Edit
        </Link>
      ),
    },
  ]

  // Matrix view: organize by importance (rows) and evidence (columns)
  const importanceOrder = ['critical', 'high', 'medium', 'low']
  const evidenceOrder = ['none', 'weak', 'moderate', 'strong']

  const getMatrixCell = (importance: string, evidence: string) => {
    return filteredAssumptions.filter(
      (a) => a.importance === importance && a.evidence_level === evidence
    )
  }

  if (assumptions.length === 0) {
    return (
      <AdminEmptyState
        icon={
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        title="No assumptions yet"
        description="Start by identifying assumptions from your canvases and hypotheses"
        actionHref="/admin/assumptions/new"
        actionLabel="Add Assumption"
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters and View Toggle */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as FilterCategory)}
            className="px-3 py-1.5 text-sm rounded-lg border bg-background"
          >
            <option value="all">All Categories</option>
            <option value="desirability">Desirability</option>
            <option value="viability">Viability</option>
            <option value="feasibility">Feasibility</option>
            <option value="usability">Usability</option>
            <option value="ethical">Ethical</option>
          </select>

          {/* Leap of Faith Toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showLeapOfFaithOnly}
              onChange={(e) => setShowLeapOfFaithOnly(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>Leaps of Faith only</span>
          </label>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg border bg-muted/50">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'table'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'matrix'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Matrix
          </button>
        </div>
      </div>

      {/* Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAssumptions.length} of {assumptions.length} assumptions
        {filteredAssumptions.filter((a) => a.is_leap_of_faith).length > 0 && (
          <span className="ml-2 text-amber-600 dark:text-amber-400">
            ({filteredAssumptions.filter((a) => a.is_leap_of_faith).length} leaps of faith)
          </span>
        )}
      </div>

      {viewMode === 'table' ? (
        <AdminTable columns={columns} data={filteredAssumptions} />
      ) : (
        /* Matrix View - David Bland's 2x2 */
        <div className="rounded-lg border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-5 bg-muted/50 text-sm font-medium">
            <div className="p-3 border-r">
              <div className="text-xs text-muted-foreground">Importance ↓</div>
              <div className="text-xs text-muted-foreground">Evidence →</div>
            </div>
            {evidenceOrder.map((evidence) => (
              <div key={evidence} className="p-3 text-center border-r last:border-r-0">
                {evidenceLabels[evidence]}
              </div>
            ))}
          </div>

          {/* Rows */}
          {importanceOrder.map((importance) => (
            <div key={importance} className="grid grid-cols-5 border-t">
              <div className="p-3 border-r bg-muted/30 flex items-center">
                <span className={`text-sm font-medium ${
                  importance === 'critical' ? 'text-red-600 dark:text-red-400' :
                  importance === 'high' ? 'text-orange-600 dark:text-orange-400' :
                  ''
                }`}>
                  {importanceLabels[importance]}
                </span>
              </div>
              {evidenceOrder.map((evidence) => {
                const cellAssumptions = getMatrixCell(importance, evidence)
                const isLeapOfFaithZone =
                  (importance === 'critical' || importance === 'high') &&
                  (evidence === 'none' || evidence === 'weak')

                return (
                  <div
                    key={evidence}
                    className={`p-2 border-r last:border-r-0 min-h-[100px] ${
                      isLeapOfFaithZone ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                    }`}
                  >
                    {cellAssumptions.length > 0 ? (
                      <div className="space-y-1">
                        {cellAssumptions.slice(0, 3).map((a) => (
                          <Link
                            key={a.id}
                            href={`/admin/assumptions/${a.id}/edit`}
                            className="block p-1.5 text-xs rounded bg-background border hover:border-primary/50 transition-colors line-clamp-2"
                          >
                            {a.statement}
                          </Link>
                        ))}
                        {cellAssumptions.length > 3 && (
                          <div className="text-xs text-muted-foreground px-1">
                            +{cellAssumptions.length - 3} more
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                        —
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="p-3 border-t bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-50 dark:bg-amber-950/20 border" />
              <span>Leap of Faith zone (test first)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
