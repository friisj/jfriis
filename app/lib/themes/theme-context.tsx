'use client'

/**
 * Theme Context
 *
 * Provides theme state and controls throughout the application.
 * Supports both global theme switching and component-level theme overrides.
 */

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Theme, ThemeMode, getTheme, defaultTheme } from './theme-config'

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

export function ThemeProvider({
  children,
  defaultTheme: defaultThemeName = 'default',
  defaultMode = 'light',
  storageKey = 'jf-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(getTheme(defaultThemeName))
  const [mode, setModeState] = useState<ThemeMode>(defaultMode)

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const { themeName, mode: storedMode } = JSON.parse(stored)
        if (themeName) setThemeState(getTheme(themeName))
        if (storedMode) setModeState(storedMode)
      }
    } catch (error) {
      console.error('Failed to load theme from localStorage:', error)
    }
  }, [storageKey])

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
