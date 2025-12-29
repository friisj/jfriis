'use client'

import { useSyncExternalStore } from 'react'
import { ViewType, isViewType } from '../types'

const STORAGE_KEY = 'admin-view-preferences'

interface ViewPreferences {
  [key: string]: ViewType
}

/**
 * Creates a localStorage store for view preferences
 */
function createViewPreferenceStore(persistenceKey: string | undefined) {
  return {
    getSnapshot: (): ViewType | null => {
      if (!persistenceKey || typeof window === 'undefined') {
        return null
      }

      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const preferences: ViewPreferences = JSON.parse(stored)
          const savedView = preferences[persistenceKey]

          // Validate the saved view is actually a valid ViewType
          if (isViewType(savedView)) {
            return savedView
          }
        }
      } catch (error) {
        console.warn('Failed to load view preference:', error)
      }

      return null
    },

    getServerSnapshot: (): ViewType | null => {
      return null
    },

    subscribe: (callback: () => void) => {
      // Listen to storage events from other tabs
      window.addEventListener('storage', callback)
      return () => window.removeEventListener('storage', callback)
    },
  }
}

/**
 * Hook to manage view preference persistence in localStorage
 * Uses useSyncExternalStore to avoid hydration mismatches
 * @param persistenceKey - Unique key for this entity's view preference (e.g., 'admin-projects-view')
 * @param defaultView - Default view type to use if no preference is saved
 * @returns [currentView, setCurrentView]
 */
export function useViewPreference(
  persistenceKey?: string,
  defaultView: ViewType = 'table'
): [ViewType, (view: ViewType) => void] {
  const store = createViewPreferenceStore(persistenceKey)

  // Use useSyncExternalStore to avoid hydration mismatches
  const storedView = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  )

  // Use stored view if available, otherwise use default
  const currentView = storedView ?? defaultView

  const setCurrentView = (view: ViewType) => {
    // Validate the view type
    if (!isViewType(view)) {
      console.warn(`Invalid view type: ${view}`)
      return
    }

    // Persist to localStorage
    if (persistenceKey) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        const preferences: ViewPreferences = stored ? JSON.parse(stored) : {}
        preferences[persistenceKey] = view
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))

        // Trigger storage event for other tabs
        window.dispatchEvent(new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: JSON.stringify(preferences),
        }))
      } catch (error) {
        console.warn('Failed to save view preference:', error)
      }
    }
  }

  return [currentView, setCurrentView]
}
