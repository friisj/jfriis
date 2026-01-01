'use client'

import { ReactNode } from 'react'

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
      className={`grid gap-${gap} grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns}`}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, 300px), 1fr))`,
        gap: `${gap * 0.25}rem`,
      }}
    >
      {data.map((item) => (
        <div key={item.id}>{renderCard(item)}</div>
      ))}
    </div>
  )
}
