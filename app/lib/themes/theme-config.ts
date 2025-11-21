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
  typography: {
    fontSans: 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  radius: '0.625rem',
}

// Blue theme - Rich blue tones for high contrast
export const blueTheme: Theme = {
  name: 'blue',
  colors: {
    light: {
      background: 'oklch(0.98 0.01 240)',
      foreground: 'oklch(0.25 0.05 240)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.25 0.05 240)',
      popover: 'oklch(1 0 0)',
      popoverForeground: 'oklch(0.25 0.05 240)',
      primary: 'oklch(0.5 0.18 250)',      // Rich blue
      primaryForeground: 'oklch(0.99 0 0)',
      secondary: 'oklch(0.88 0.05 240)',   // Light blue-gray
      secondaryForeground: 'oklch(0.25 0.05 240)',
      muted: 'oklch(0.92 0.03 240)',       // Subtle blue tint
      mutedForeground: 'oklch(0.48 0.05 240)',
      accent: 'oklch(0.85 0.08 240)',      // Stronger blue accent
      accentForeground: 'oklch(0.25 0.05 240)',
      destructive: 'oklch(0.577 0.245 27.325)',
      border: 'oklch(0.86 0.04 240)',      // Blue-tinted borders
      input: 'oklch(0.86 0.04 240)',
      ring: 'oklch(0.5 0.18 250)',
      chart1: 'oklch(0.55 0.2 250)',       // Blue
      chart2: 'oklch(0.65 0.15 200)',      // Cyan
      chart3: 'oklch(0.45 0.18 280)',      // Indigo
      chart4: 'oklch(0.7 0.12 220)',       // Sky blue
      chart5: 'oklch(0.5 0.15 260)',       // Purple-blue
    },
    dark: {
      background: 'oklch(0.18 0.03 240)',
      foreground: 'oklch(0.95 0.02 240)',
      card: 'oklch(0.22 0.035 240)',
      cardForeground: 'oklch(0.95 0.02 240)',
      popover: 'oklch(0.22 0.035 240)',
      popoverForeground: 'oklch(0.95 0.02 240)',
      primary: 'oklch(0.65 0.18 250)',     // Bright blue
      primaryForeground: 'oklch(0.15 0.03 240)',
      secondary: 'oklch(0.28 0.04 240)',
      secondaryForeground: 'oklch(0.95 0.02 240)',
      muted: 'oklch(0.28 0.04 240)',
      mutedForeground: 'oklch(0.65 0.04 240)',
      accent: 'oklch(0.35 0.08 240)',
      accentForeground: 'oklch(0.95 0.02 240)',
      destructive: 'oklch(0.704 0.191 22.216)',
      border: 'oklch(0.32 0.04 240)',
      input: 'oklch(0.32 0.04 240)',
      ring: 'oklch(0.65 0.18 250)',
      chart1: 'oklch(0.6 0.2 250)',
      chart2: 'oklch(0.7 0.15 200)',
      chart3: 'oklch(0.5 0.18 280)',
      chart4: 'oklch(0.75 0.12 220)',
      chart5: 'oklch(0.55 0.15 260)',
    },
  },
  typography: {
    fontSans: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
    fontSerif: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
    fontMono: 'var(--font-geist-mono), ui-monospace, monospace',
  },
  radius: '0.75rem',  // Slightly more rounded than default
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
