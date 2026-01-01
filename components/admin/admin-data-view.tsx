'use client'

import { ReactNode } from 'react'
import { TableView, TableViewConfig } from './views/table-view'
import { GridView, GridViewConfig } from './views/grid-view'
import { KanbanView, KanbanViewConfig } from './views/kanban-view'
import { ViewSwitcher } from './views/view-switcher'
import { ViewErrorBoundary } from './views/view-error-boundary'
import { ViewType } from './types'

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

/**
 * Default empty state component
 */
function DefaultEmptyState() {
  return (
    <div className="rounded-lg border bg-card p-8 text-center">
      <p className="text-muted-foreground">No items to display</p>
    </div>
  )
}

export function AdminDataView<T extends { id: string }>({
  data,
  views,
  defaultView = 'table',
  persistenceKey,
  emptyState,
}: AdminDataViewProps<T>) {
  // Get list of available views
  const availableViews = Object.keys(views).filter((key) => views[key as ViewType]) as ViewType[]

  // Show empty state if no data
  if (!data || data.length === 0) {
    return emptyState ? <>{emptyState}</> : <DefaultEmptyState />
  }

  return (
    <div>
      <ViewSwitcher
        availableViews={availableViews}
        defaultView={defaultView}
        persistenceKey={persistenceKey}
      >
        {(activeView) => (
          <ViewErrorBoundary viewType={`${activeView} view`}>
            {activeView === 'table' && views.table && (
              <TableView {...views.table} data={data} />
            )}

            {activeView === 'grid' && views.grid && (
              <GridView {...views.grid} data={data} />
            )}

            {activeView === 'kanban' && views.kanban && (
              <KanbanView {...views.kanban} data={data} />
            )}

            {activeView === 'canvas' && views.canvas && (
              <div className="rounded-lg border bg-card p-8 text-center">
                <p className="text-muted-foreground">Canvas view coming soon...</p>
              </div>
            )}
          </ViewErrorBoundary>
        )}
      </ViewSwitcher>
    </div>
  )
}
