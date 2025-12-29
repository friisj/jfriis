'use client'

import { ReactNode } from 'react'
import { TableView, TableViewConfig } from './views/table-view'
import { ViewToolbar } from './views/view-toolbar'
import { useViewPreference } from './hooks/useViewPreference'

type ViewType = 'table' | 'grid' | 'kanban' | 'canvas'

// Placeholder configs for future views
interface GridViewConfig<T> {
  renderCard: (item: T) => ReactNode
  columns?: number
  gap?: number
}

interface KanbanViewConfig<T> {
  groupBy: keyof T | ((item: T) => string)
  groups: Array<{
    id: string
    label: string
    color?: string
  }>
  renderCard: (item: T) => ReactNode
  onMove?: (item: T, fromGroup: string, toGroup: string) => Promise<void>
}

interface CanvasViewConfig<T> {
  renderCard: (item: T) => ReactNode
  getPosition: (item: T) => { x: number; y: number }
  onPositionChange?: (item: T, position: { x: number; y: number }) => Promise<void>
}

export interface AdminDataViewProps<T extends { id: string }> {
  data: T[]
  views: {
    table?: TableViewConfig<T>
    grid?: GridViewConfig<T>
    kanban?: KanbanViewConfig<T>
    canvas?: CanvasViewConfig<T>
  }
  defaultView?: ViewType
  persistenceKey?: string
  emptyState?: ReactNode
}

export function AdminDataView<T extends { id: string }>({
  data,
  views,
  defaultView = 'table',
  persistenceKey,
  emptyState,
}: AdminDataViewProps<T>) {
  const [currentView, setCurrentView] = useViewPreference(persistenceKey, defaultView)

  // Get list of available views
  const availableViews = Object.keys(views).filter((key) => views[key as ViewType]) as ViewType[]

  // If current view is not available, fall back to first available or default
  const activeView = availableViews.includes(currentView) ? currentView : (availableViews[0] || defaultView)

  // Show empty state if no data
  if (!data || data.length === 0) {
    return emptyState ? <>{emptyState}</> : null
  }

  return (
    <div>
      <ViewToolbar
        currentView={activeView}
        availableViews={availableViews}
        onViewChange={setCurrentView}
      />

      {activeView === 'table' && views.table && (
        <TableView {...views.table} data={data} />
      )}

      {activeView === 'grid' && views.grid && (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">Grid view coming soon...</p>
        </div>
      )}

      {activeView === 'kanban' && views.kanban && (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">Kanban view coming soon...</p>
        </div>
      )}

      {activeView === 'canvas' && views.canvas && (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">Canvas view coming soon...</p>
        </div>
      )}
    </div>
  )
}
