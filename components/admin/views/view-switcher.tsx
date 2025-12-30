'use client'

import { ReactNode, useEffect, useTransition, useState } from 'react'
import { ViewToolbar } from './view-toolbar'
import { useViewPreference } from '../hooks/useViewPreference'
import { ViewType } from '../types'

interface ViewSwitcherProps {
  availableViews: ViewType[]
  defaultView: ViewType
  persistenceKey?: string
  children: (currentView: ViewType) => ReactNode
}

/**
 * Loading spinner component for view transitions
 */
function ViewLoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8" role="status" aria-live="polite">
      <div className="inline-flex items-center gap-2">
        <svg
          className="animate-spin h-5 w-5 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm text-muted-foreground">Loading view...</span>
      </div>
    </div>
  )
}

/**
 * Client component that manages view switching and persistence.
 * Separated from AdminDataView to maintain server component benefits.
 */
export function ViewSwitcher({
  availableViews,
  defaultView,
  persistenceKey,
  children,
}: ViewSwitcherProps) {
  const [currentView, setCurrentView] = useViewPreference(persistenceKey, defaultView)
  const [isPending, startTransition] = useTransition()
  const [displayView, setDisplayView] = useState(currentView)

  // If current view is not available, fall back to first available or default
  const activeView = availableViews.includes(currentView) ? currentView : (availableViews[0] || defaultView)

  // Update preference if we had to fall back (use effect to avoid render-time setState)
  useEffect(() => {
    if (activeView !== currentView && availableViews.length > 0) {
      setCurrentView(activeView)
    }
  }, [activeView, currentView, setCurrentView, availableViews.length])

  // Update displayed view when active view changes
  useEffect(() => {
    if (activeView !== displayView) {
      startTransition(() => {
        setDisplayView(activeView)
      })
    }
  }, [activeView, displayView])

  const handleViewChange = (view: ViewType) => {
    startTransition(() => {
      setCurrentView(view)
    })
  }

  return (
    <>
      <ViewToolbar
        currentView={activeView}
        availableViews={availableViews}
        onViewChange={handleViewChange}
      />
      {isPending ? <ViewLoadingSpinner /> : children(displayView)}
    </>
  )
}
