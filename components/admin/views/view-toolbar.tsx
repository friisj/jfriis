'use client'

import { KeyboardEvent } from 'react'
import { ViewType } from '../types'

interface ViewToolbarProps {
  currentView: ViewType
  availableViews: ViewType[]
  onViewChange: (view: ViewType) => void
}

const viewIcons: Record<ViewType, React.ReactNode> = {
  table: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  grid: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
  kanban: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  ),
  canvas: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
}

const viewLabels: Record<ViewType, string> = {
  table: 'Table',
  grid: 'Grid',
  kanban: 'Kanban',
  canvas: 'Canvas',
}

export function ViewToolbar({ currentView, availableViews, onViewChange }: ViewToolbarProps) {
  if (availableViews.length <= 1) {
    // Don't show toolbar if only one view is available
    return null
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = availableViews.indexOf(currentView)
    let newIndex = currentIndex

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        newIndex = currentIndex > 0 ? currentIndex - 1 : availableViews.length - 1
        break
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        newIndex = currentIndex < availableViews.length - 1 ? currentIndex + 1 : 0
        break
      case 'Home':
        event.preventDefault()
        newIndex = 0
        break
      case 'End':
        event.preventDefault()
        newIndex = availableViews.length - 1
        break
      default:
        return
    }

    onViewChange(availableViews[newIndex])
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <span id="view-toolbar-label" className="text-sm text-muted-foreground mr-2">
        View:
      </span>
      <div
        className="inline-flex rounded-lg border bg-card p-1"
        role="tablist"
        aria-labelledby="view-toolbar-label"
      >
        {availableViews.map((view) => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            onKeyDown={handleKeyDown}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              currentView === view
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
            role="tab"
            aria-selected={currentView === view}
            aria-label={`${viewLabels[view]} view`}
            aria-current={currentView === view ? 'page' : undefined}
            tabIndex={currentView === view ? 0 : -1}
          >
            {viewIcons[view]}
            <span className="hidden sm:inline">{viewLabels[view]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
