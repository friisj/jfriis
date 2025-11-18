'use client'

/**
 * Specimen Wrapper Component
 *
 * Wraps specimen components with isolated theming.
 * Allows specimens to use different themes than the global theme.
 */

import React from 'react'
import { Theme, ThemeMode, getTheme } from '@/lib/themes/theme-config'
import { themeToStyles, getThemeDataAttribute } from '@/lib/themes/theme-utils'
import { useTheme } from '@/lib/themes/theme-context'

interface SpecimenWrapperProps {
  children: React.ReactNode
  themeName?: string // Override theme
  mode?: ThemeMode // Override mode
  className?: string
  isolated?: boolean // If true, fully isolates theme from parent
}

export function SpecimenWrapper({
  children,
  themeName,
  mode: modeOverride,
  className = '',
  isolated = true,
}: SpecimenWrapperProps) {
  const { theme: globalTheme, mode: globalMode } = useTheme()

  // Use override theme or global theme
  const theme = themeName ? getTheme(themeName) : globalTheme
  const mode = modeOverride || globalMode

  // Generate inline styles for theme variables
  const styles = themeToStyles(theme, mode)

  // Generate data attributes
  const dataAttrs = getThemeDataAttribute(theme.name, mode)

  return (
    <div
      className={`specimen-wrapper ${mode} ${className}`}
      style={isolated ? styles : undefined}
      {...dataAttrs}
    >
      {children}
    </div>
  )
}

/**
 * Specimen Container with Border and Background
 *
 * Provides a contained view of a specimen with proper background/borders
 */
interface SpecimenContainerProps extends SpecimenWrapperProps {
  title?: string
  description?: string
  showControls?: boolean
}

export function SpecimenContainer({
  children,
  title,
  description,
  showControls = false,
  themeName,
  mode,
  className = '',
  isolated = true,
}: SpecimenContainerProps) {
  return (
    <div className="specimen-container border rounded-lg overflow-hidden">
      {(title || description || showControls) && (
        <div className="specimen-header border-b bg-muted/50 p-4">
          <div className="flex items-start justify-between">
            <div>
              {title && <h3 className="font-semibold mb-1">{title}</h3>}
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            {showControls && (
              <div className="text-xs text-muted-foreground">
                {themeName && <span>Theme: {themeName}</span>}
                {mode && <span className="ml-2">Mode: {mode}</span>}
              </div>
            )}
          </div>
        </div>
      )}
      <SpecimenWrapper
        themeName={themeName}
        mode={mode}
        className={className}
        isolated={isolated}
      >
        <div className="specimen-content p-6 bg-background">{children}</div>
      </SpecimenWrapper>
    </div>
  )
}
