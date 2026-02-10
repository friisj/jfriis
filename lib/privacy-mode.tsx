'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface PrivacyModeContextType {
  isPrivacyMode: boolean
  togglePrivacyMode: () => void
}

const PrivacyModeContext = createContext<PrivacyModeContextType | null>(null)

const STORAGE_KEY = 'privacy-mode'

export function PrivacyModeProvider({ children }: { children: ReactNode }) {
  const [isPrivacyMode, setIsPrivacyMode] = useState(false)

  // Load initial state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') {
      setIsPrivacyMode(true)
    }
  }, [])

  const togglePrivacyMode = () => {
    setIsPrivacyMode(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <PrivacyModeContext.Provider value={{ isPrivacyMode, togglePrivacyMode }}>
      {children}
    </PrivacyModeContext.Provider>
  )
}

export function usePrivacyMode() {
  const context = useContext(PrivacyModeContext)
  if (!context) {
    throw new Error('usePrivacyMode must be used within PrivacyModeProvider')
  }
  return context
}

/**
 * Helper for server-side queries
 * Call this in your query builders to filter private records when privacy mode is on
 */
export function shouldShowPrivate(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: always show all (privacy filtering happens client-side)
    return true
  }
  // Client-side: check localStorage
  return localStorage.getItem(STORAGE_KEY) !== 'true'
}

/**
 * Filter an array of records based on privacy mode
 * Use this to filter data arrays after fetching
 */
export function filterPrivateRecords<T extends { is_private?: boolean | null }>(
  records: T[],
  isPrivacyMode: boolean
): T[] {
  if (!isPrivacyMode) {
    // Privacy mode off: show everything
    return records
  }
  // Privacy mode on: hide private records
  return records.filter(record => !record.is_private)
}
