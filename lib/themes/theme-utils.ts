/**
 * Theme Utilities
 *
 * Helper functions for working with themes, including CSS variable generation
 * and theme application.
 */

import { Theme, ThemeMode, ThemeColors } from './theme-config'

/**
 * Converts a ThemeColors object to CSS custom properties
 */
export function colorsToCSSVars(colors: ThemeColors): Record<string, string> {
  return {
    '--background': colors.background,
    '--foreground': colors.foreground,
    '--card': colors.card,
    '--card-foreground': colors.cardForeground,
    '--popover': colors.popover,
    '--popover-foreground': colors.popoverForeground,
    '--primary': colors.primary,
    '--primary-foreground': colors.primaryForeground,
    '--secondary': colors.secondary,
    '--secondary-foreground': colors.secondaryForeground,
    '--muted': colors.muted,
    '--muted-foreground': colors.mutedForeground,
    '--accent': colors.accent,
    '--accent-foreground': colors.accentForeground,
    '--destructive': colors.destructive,
    '--border': colors.border,
    '--input': colors.input,
    '--ring': colors.ring,
    ...(colors.chart1 && { '--chart-1': colors.chart1 }),
    ...(colors.chart2 && { '--chart-2': colors.chart2 }),
    ...(colors.chart3 && { '--chart-3': colors.chart3 }),
    ...(colors.chart4 && { '--chart-4': colors.chart4 }),
    ...(colors.chart5 && { '--chart-5': colors.chart5 }),
  }
}

/**
 * Converts a Theme object to inline CSS styles
 */
export function themeToStyles(theme: Theme, mode: ThemeMode): React.CSSProperties {
  const colors = colorsToCSSVars(theme.colors[mode])
  const styles: Record<string, string> = {
    ...colors,
  }

  if (theme.radius) {
    styles['--radius'] = theme.radius
  }

  if (theme.typography?.fontSans) {
    styles['--font-sans'] = theme.typography.fontSans
  }

  if (theme.typography?.fontMono) {
    styles['--font-mono'] = theme.typography.fontMono
  }

  if (theme.typography?.fontDisplay) {
    styles['--font-display'] = theme.typography.fontDisplay
  }

  if (theme.typography?.fontBody) {
    styles['--font-body'] = theme.typography.fontBody
  }

  return styles as React.CSSProperties
}

/**
 * Generates a data attribute for theme application
 */
export function getThemeDataAttribute(themeName: string, mode: ThemeMode) {
  return {
    'data-theme': themeName,
    'data-mode': mode,
  }
}

/**
 * Combines multiple themes (useful for specimens)
 * Later themes override earlier ones
 */
export function mergeThemes(...themes: Partial<Theme>[]): Partial<Theme> {
  return themes.reduce((acc, theme) => {
    return {
      ...acc,
      ...theme,
      colors: {
        light: { ...acc.colors?.light, ...theme.colors?.light },
        dark: { ...acc.colors?.dark, ...theme.colors?.dark },
      } as any,
      typography: { ...acc.typography, ...theme.typography },
    }
  }, {} as Partial<Theme>)
}
