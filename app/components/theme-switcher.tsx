'use client'

/**
 * Theme Switcher Component
 *
 * UI controls for switching between light/dark modes and different themes
 */

import { useTheme } from '@/lib/themes'
import { themes } from '@/lib/themes/theme-config'

export function ThemeSwitcher() {
  const { theme, mode, setTheme, toggleMode } = useTheme()

  return (
    <div className="flex items-center gap-4">
      {/* Mode Toggle */}
      <button
        onClick={toggleMode}
        className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
        aria-label="Toggle theme mode"
      >
        {mode === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button>

      {/* Theme Selector */}
      <select
        value={theme.name}
        onChange={(e) => setTheme(e.target.value)}
        className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
        aria-label="Select theme"
      >
        {Object.keys(themes).map((themeName) => (
          <option key={themeName} value={themeName}>
            {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
          </option>
        ))}
      </select>
    </div>
  )
}

/**
 * Compact Mode Toggle (for minimal UI)
 */
export function ModeToggle() {
  const { mode, toggleMode } = useTheme()

  return (
    <button
      onClick={toggleMode}
      className="h-10 px-3 hover:bg-accent transition-colors"
      aria-label="Toggle theme mode"
    >
      {mode === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
