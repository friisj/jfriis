'use client'

import { KeyboardEvent, useEffect, useRef } from 'react'
import { IconTable, IconLayoutGrid, IconColumns3, IconPalette } from '@tabler/icons-react'
import { ViewType } from '../types'

interface ViewToolbarProps {
  currentView: ViewType
  availableViews: ViewType[]
  onViewChange: (view: ViewType) => void
}

const viewIcons: Record<ViewType, React.ReactNode> = {
  table: <IconTable size={16} />,
  grid: <IconLayoutGrid size={16} />,
  kanban: <IconColumns3 size={16} />,
  canvas: <IconPalette size={16} />,
}

const viewLabels: Record<ViewType, string> = {
  table: 'Table',
  grid: 'Grid',
  kanban: 'Kanban',
  canvas: 'Canvas',
}

export function ViewToolbar({ currentView, availableViews, onViewChange }: ViewToolbarProps) {
  const buttonRefs = useRef<Map<ViewType, HTMLButtonElement | null>>(new Map())

  // Focus management: Focus the active button when view changes
  useEffect(() => {
    const activeButton = buttonRefs.current.get(currentView)
    if (activeButton && document.activeElement?.closest('[role="tablist"]')) {
      // Only focus if the user is currently focused within the toolbar
      activeButton.focus()
    }
  }, [currentView])

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
            ref={(el) => { buttonRefs.current.set(view, el) }}
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
