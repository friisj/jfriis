'use client'

import { ReactNode } from 'react'
import { ViewErrorBoundary } from './view-error-boundary'

export interface GridViewConfig<T> {
  renderCard: (item: T) => ReactNode
  columns?: number
  gap?: number
}

interface GridViewProps<T> {
  data: T[]
  renderCard: (item: T) => ReactNode
  columns?: number
  gap?: number
}

export function GridView<T extends { id: string }>({
  data,
  renderCard,
  columns = 3,
  gap = 4,
}: GridViewProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">No items to display</p>
      </div>
    )
  }

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, 300px), 1fr))`,
        gap: `${gap * 0.25}rem`,
      }}
    >
      {data.map((item) => (
        <ViewErrorBoundary key={item.id} viewType="card">
          <div>{renderCard(item)}</div>
        </ViewErrorBoundary>
      ))}
    </div>
  )
}
