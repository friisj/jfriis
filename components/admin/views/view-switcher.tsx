'use client'

import { ReactNode, useEffect, useTransition, useState } from 'react'
import { IconLoader2 } from '@tabler/icons-react'
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
        <IconLoader2 size={20} className="animate-spin text-muted-foreground" />
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
