/**
 * Theme Configuration
 *
 * This file defines all available themes with their color scales and typography.
 * Themes can be applied globally or to individual components/specimens.
 */

export type ThemeMode = 'light' | 'dark'

export interface ThemeColors {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  border: string
  input: string
  ring: string
  // Chart colors
  chart1?: string
  chart2?: string
  chart3?: string
  chart4?: string
  chart5?: string
}

export interface ThemeTypography {
  fontFamily?: string
  fontSans?: string
  fontMono?: string
  fontDisplay?: string
  fontBody?: string
}

export interface Theme {
  name: string
  colors: {
    light: ThemeColors
    dark: ThemeColors
  }
  typography?: ThemeTypography
  radius?: string
}

// Default theme (from globals.css)
export const defaultTheme: Theme = {
  name: 'default',
  colors: {
    light: {
      background: 'oklch(1 0 0)',
      foreground: 'oklch(0.145 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.145 0 0)',
      popover: 'oklch(1 0 0)',
      popoverForeground: 'oklch(0.145 0 0)',
      primary: 'oklch(0.205 0 0)',
      primaryForeground: 'oklch(0.985 0 0)',
      secondary: 'oklch(0.97 0 0)',
      secondaryForeground: 'oklch(0.205 0 0)',
      muted: 'oklch(0.97 0 0)',
      mutedForeground: 'oklch(0.556 0 0)',
      accent: 'oklch(0.97 0 0)',
      accentForeground: 'oklch(0.205 0 0)',
      destructive: 'oklch(0.577 0.245 27.325)',
      border: 'oklch(0.922 0 0)',
      input: 'oklch(0.922 0 0)',
      ring: 'oklch(0.708 0 0)',
      chart1: 'oklch(0.646 0.222 41.116)',
      chart2: 'oklch(0.6 0.118 184.704)',
      chart3: 'oklch(0.398 0.07 227.392)',
      chart4: 'oklch(0.828 0.189 84.429)',
      chart5: 'oklch(0.769 0.188 70.08)',
    },
    dark: {
      background: 'oklch(0.145 0 0)',
      foreground: 'oklch(0.985 0 0)',
      card: 'oklch(0.205 0 0)',
      cardForeground: 'oklch(0.985 0 0)',
      popover: 'oklch(0.205 0 0)',
      popoverForeground: 'oklch(0.985 0 0)',
      primary: 'oklch(0.922 0 0)',
      primaryForeground: 'oklch(0.205 0 0)',
      secondary: 'oklch(0.269 0 0)',
      secondaryForeground: 'oklch(0.985 0 0)',
      muted: 'oklch(0.269 0 0)',
      mutedForeground: 'oklch(0.708 0 0)',
      accent: 'oklch(0.269 0 0)',
      accentForeground: 'oklch(0.985 0 0)',
      destructive: 'oklch(0.704 0.191 22.216)',
      border: 'oklch(1 0 0 / 10%)',
      input: 'oklch(1 0 0 / 15%)',
      ring: 'oklch(0.556 0 0)',
      chart1: 'oklch(0.488 0.243 264.376)',
      chart2: 'oklch(0.696 0.17 162.48)',
      chart3: 'oklch(0.769 0.188 70.08)',
      chart4: 'oklch(0.627 0.265 303.9)',
      chart5: 'oklch(0.645 0.246 16.439)',
    },
  },
  radius: '0.625rem',
}

// Example: Blue theme
export const blueTheme: Theme = {
  name: 'blue',
  colors: {
    light: {
      background: 'oklch(0.99 0.005 240)',
      foreground: 'oklch(0.2 0.02 240)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.2 0.02 240)',
      popover: 'oklch(1 0 0)',
      popoverForeground: 'oklch(0.2 0.02 240)',
      primary: 'oklch(0.5 0.2 240)',
      primaryForeground: 'oklch(1 0 0)',
      secondary: 'oklch(0.95 0.01 240)',
      secondaryForeground: 'oklch(0.2 0.02 240)',
      muted: 'oklch(0.95 0.01 240)',
      mutedForeground: 'oklch(0.5 0.01 240)',
      accent: 'oklch(0.95 0.01 240)',
      accentForeground: 'oklch(0.2 0.02 240)',
      destructive: 'oklch(0.577 0.245 27.325)',
      border: 'oklch(0.9 0.01 240)',
      input: 'oklch(0.9 0.01 240)',
      ring: 'oklch(0.5 0.2 240)',
    },
    dark: {
      background: 'oklch(0.15 0.02 240)',
      foreground: 'oklch(0.95 0.01 240)',
      card: 'oklch(0.2 0.02 240)',
      cardForeground: 'oklch(0.95 0.01 240)',
      popover: 'oklch(0.2 0.02 240)',
      popoverForeground: 'oklch(0.95 0.01 240)',
      primary: 'oklch(0.6 0.2 240)',
      primaryForeground: 'oklch(0.1 0.02 240)',
      secondary: 'oklch(0.25 0.02 240)',
      secondaryForeground: 'oklch(0.95 0.01 240)',
      muted: 'oklch(0.25 0.02 240)',
      mutedForeground: 'oklch(0.6 0.01 240)',
      accent: 'oklch(0.25 0.02 240)',
      accentForeground: 'oklch(0.95 0.01 240)',
      destructive: 'oklch(0.704 0.191 22.216)',
      border: 'oklch(0.3 0.02 240)',
      input: 'oklch(0.3 0.02 240)',
      ring: 'oklch(0.6 0.2 240)',
    },
  },
  radius: '0.5rem',
}

// Theme registry
export const themes: Record<string, Theme> = {
  default: defaultTheme,
  blue: blueTheme,
}

// Helper to get a theme by name
export function getTheme(name: string): Theme {
  return themes[name] || defaultTheme
}

// Helper to register a new theme
export function registerTheme(theme: Theme) {
  themes[theme.name] = theme
}
