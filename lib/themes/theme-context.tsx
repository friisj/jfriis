'use client'

/**
 * Theme Context
 *
 * Provides theme state and controls throughout the application.
 * Supports both global theme switching and component-level theme overrides.
 */

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Theme, ThemeMode, getTheme } from './theme-config'

interface ThemeContextValue {
  theme: Theme
  mode: ThemeMode
  setTheme: (themeName: string) => void
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: string
  defaultMode?: ThemeMode
  storageKey?: string
}

// Helper to get initial values from localStorage (SSR-safe)
function getInitialThemeState(
  storageKey: string,
  defaultThemeName: string,
  defaultMode: ThemeMode
): { theme: Theme; mode: ThemeMode } {
  if (typeof window === 'undefined') {
    return { theme: getTheme(defaultThemeName), mode: defaultMode }
  }
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const { themeName, mode: storedMode } = JSON.parse(stored)
      return {
        theme: themeName ? getTheme(themeName) : getTheme(defaultThemeName),
        mode: storedMode || defaultMode,
      }
    }
  } catch (error) {
    console.error('Failed to load theme from localStorage:', error)
  }
  return { theme: getTheme(defaultThemeName), mode: defaultMode }
}

export function ThemeProvider({
  children,
  defaultTheme: defaultThemeName = 'default',
  defaultMode = 'light',
  storageKey = 'jf-theme',
}: ThemeProviderProps) {
  // Use lazy initialization to avoid setState in useEffect
  const [theme, setThemeState] = useState<Theme>(() =>
    getInitialThemeState(storageKey, defaultThemeName, defaultMode).theme
  )
  const [mode, setModeState] = useState<ThemeMode>(() =>
    getInitialThemeState(storageKey, defaultThemeName, defaultMode).mode
  )

  // Save theme to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ themeName: theme.name, mode })
      )
    } catch (error) {
      console.error('Failed to save theme to localStorage:', error)
    }
  }, [theme, mode, storageKey])

  // Apply mode class to document
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(mode)
  }, [mode])

  const setTheme = (themeName: string) => {
    setThemeState(getTheme(themeName))
  }

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode)
  }

  const toggleMode = () => {
    setModeState((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeContext.Provider value={{ theme, mode, setTheme, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
