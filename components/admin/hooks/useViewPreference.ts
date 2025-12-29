'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'admin-view-preferences'

type ViewType = 'table' | 'grid' | 'kanban' | 'canvas'

interface ViewPreferences {
  [key: string]: ViewType
}

/**
 * Hook to manage view preference persistence in localStorage
 * @param persistenceKey - Unique key for this entity's view preference (e.g., 'admin-projects-view')
 * @param defaultView - Default view type to use if no preference is saved
 * @returns [currentView, setCurrentView]
 */
export function useViewPreference(
  persistenceKey?: string,
  defaultView: ViewType = 'table'
): [ViewType, (view: ViewType) => void] {
  const [currentView, setCurrentViewState] = useState<ViewType>(defaultView)

  // Load preference from localStorage on mount
  useEffect(() => {
    if (!persistenceKey) return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const preferences: ViewPreferences = JSON.parse(stored)
        const savedView = preferences[persistenceKey]
        if (savedView) {
          setCurrentViewState(savedView)
        }
      }
    } catch (error) {
      console.warn('Failed to load view preference:', error)
    }
  }, [persistenceKey])

  const setCurrentView = (view: ViewType) => {
    setCurrentViewState(view)

    // Persist to localStorage
    if (persistenceKey) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        const preferences: ViewPreferences = stored ? JSON.parse(stored) : {}
        preferences[persistenceKey] = view
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
      } catch (error) {
        console.warn('Failed to save view preference:', error)
      }
    }
  }

  return [currentView, setCurrentView]
}
