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
import type { CanvasItemType, Importance, ValidationStatus } from '@/lib/types/canvas-items'

interface CanvasItem {
  id: string
  title: string
  description: string | null
  item_type: CanvasItemType
  importance: Importance
  validation_status: ValidationStatus
  tags: string[] | null
  created_at: string
  updated_at: string
  studio_project?: { name: string } | null
  // Aggregated counts (from joins/views)
  placement_count?: number
  assumption_count?: number
  evidence_count?: number
}

interface ItemsListViewProps {
  items: CanvasItem[]
}

const itemTypeLabels: Record<CanvasItemType, string> = {
  partner: 'Partner',
  activity: 'Activity',
  resource: 'Resource',
  value_proposition: 'Value Prop',
  segment: 'Segment',
  relationship: 'Relationship',
  channel: 'Channel',
  cost: 'Cost',
  revenue: 'Revenue',
  job: 'Job',
  pain: 'Pain',
  gain: 'Gain',
  product_service: 'Product/Service',
  pain_reliever: 'Pain Reliever',
  gain_creator: 'Gain Creator',
}

const itemTypeCategories: Record<string, CanvasItemType[]> = {
  'Business Model Canvas': [
    'partner',
    'activity',
    'resource',
    'value_proposition',
    'segment',
    'relationship',
    'channel',
    'cost',
    'revenue',
  ],
  'Customer Profile': ['job', 'pain', 'gain'],
  'Value Map': ['product_service', 'pain_reliever', 'gain_creator'],
}

const itemTypeColors: Record<CanvasItemType, string> = {
  partner: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  activity: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  resource: 'bg-green-500/10 text-green-700 dark:text-green-400',
  value_proposition: 'bg-red-500/10 text-red-700 dark:text-red-400',
  segment: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  relationship: 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
  channel: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  cost: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  revenue: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  job: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  pain: 'bg-red-500/10 text-red-700 dark:text-red-400',
  gain: 'bg-green-500/10 text-green-700 dark:text-green-400',
  product_service: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  pain_reliever: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  gain_creator: 'bg-teal-500/10 text-teal-700 dark:text-teal-400',
}

const importanceLabels: Record<Importance, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

type GroupMode = 'none' | 'type' | 'canvas'

export function ItemsListView({ items }: ItemsListViewProps) {
  const [groupMode, setGroupMode] = useState<GroupMode>('none')
  const [filterType, setFilterType] = useState<CanvasItemType | 'all'>('all')
  const [filterValidation, setFilterValidation] = useState<ValidationStatus | 'all'>('all')
  const [filterImportance, setFilterImportance] = useState<Importance | 'all'>('all')

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filterType !== 'all' && item.item_type !== filterType) return false
    if (filterValidation !== 'all' && item.validation_status !== filterValidation) return false
    if (filterImportance !== 'all' && item.importance !== filterImportance) return false
    return true
  })

  const columns: AdminTableColumn<CanvasItem>[] = [
    {
      key: 'title',
      header: 'Item',
      cell: (item) => (
        <div className="max-w-md">
          <div className="font-medium">{item.title}</div>
          {item.description && (
            <div className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
              {item.description}
            </div>
          )}
          {item.tags && item.tags.length > 0 && (
            <div className="flex gap-1 mt-1">
              {item.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">+{item.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (item) => (
        <span className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap ${itemTypeColors[item.item_type]}`}>
          {itemTypeLabels[item.item_type]}
        </span>
      ),
    },
    {
      key: 'importance',
      header: 'Importance',
      cell: (item) => (
        <span
          className={`text-sm ${
            item.importance === 'critical'
              ? 'text-red-600 dark:text-red-400 font-medium'
              : item.importance === 'high'
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-muted-foreground'
          }`}
        >
          {importanceLabels[item.importance]}
        </span>
      ),
    },
    {
      key: 'validation',
      header: 'Status',
      cell: (item) => <StatusBadge value={item.validation_status} />,
    },
    {
      key: 'counts',
      header: 'Linked',
      cell: (item) => (
        <div className="flex items-center gap-3 text-sm">
          {typeof item.placement_count === 'number' && (
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <span className="text-muted-foreground">{item.placement_count}</span>
            </div>
          )}
          {typeof item.assumption_count === 'number' && item.assumption_count > 0 && (
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-muted-foreground">{item.assumption_count}</span>
            </div>
          )}
          {typeof item.evidence_count === 'number' && item.evidence_count > 0 && (
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-muted-foreground">{item.evidence_count}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'project',
      header: 'Project',
      cell: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.studio_project?.name || '-'}
        </span>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      cell: (item) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {formatDate(item.updated_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (item) => (
        <Link
          href={`/admin/items/${item.id}/edit`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
        >
          Edit
        </Link>
      ),
    },
  ]

  // Group items by type
  const groupedByType = groupMode === 'type'
    ? Object.entries(itemTypeCategories).map(([category, types]) => ({
        category,
        items: filteredItems.filter((item) => types.includes(item.item_type)),
      }))
    : []

  if (items.length === 0) {
    return (
      <AdminEmptyState
        icon={
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        }
        title="No canvas items yet"
        description="Create reusable items that can be placed across multiple canvases"
        actionHref="/admin/items/new"
        actionLabel="Create Item"
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Group:</label>
          <select
            value={groupMode}
            onChange={(e) => setGroupMode(e.target.value as GroupMode)}
            className="px-3 py-1.5 text-sm rounded-lg border bg-background"
          >
            <option value="none">No grouping</option>
            <option value="type">By type</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Type:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as CanvasItemType | 'all')}
            className="px-3 py-1.5 text-sm rounded-lg border bg-background"
          >
            <option value="all">All types</option>
            <optgroup label="Business Model Canvas">
              {itemTypeCategories['Business Model Canvas'].map((type) => (
                <option key={type} value={type}>
                  {itemTypeLabels[type]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Customer Profile">
              {itemTypeCategories['Customer Profile'].map((type) => (
                <option key={type} value={type}>
                  {itemTypeLabels[type]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Value Map">
              {itemTypeCategories['Value Map'].map((type) => (
                <option key={type} value={type}>
                  {itemTypeLabels[type]}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status:</label>
          <select
            value={filterValidation}
            onChange={(e) => setFilterValidation(e.target.value as ValidationStatus | 'all')}
            className="px-3 py-1.5 text-sm rounded-lg border bg-background"
          >
            <option value="all">All statuses</option>
            <option value="untested">Untested</option>
            <option value="testing">Testing</option>
            <option value="validated">Validated</option>
            <option value="invalidated">Invalidated</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Importance:</label>
          <select
            value={filterImportance}
            onChange={(e) => setFilterImportance(e.target.value as Importance | 'all')}
            className="px-3 py-1.5 text-sm rounded-lg border bg-background"
          >
            <option value="all">All levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-muted-foreground">
          {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      {/* Table or Grouped View */}
      {groupMode === 'type' ? (
        <div className="space-y-6">
          {groupedByType.map(({ category, items: groupItems }) => {
            if (groupItems.length === 0) return null
            return (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-3 border-b pb-2">{category}</h3>
                <AdminTable data={groupItems} columns={columns} />
              </div>
            )
          })}
          {groupedByType.every((g) => g.items.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              No items match the current filters
            </div>
          )}
        </div>
      ) : (
        <>
          {filteredItems.length > 0 ? (
            <AdminTable data={filteredItems} columns={columns} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No items match the current filters
            </div>
          )}
        </>
      )}
    </div>
  )
}
