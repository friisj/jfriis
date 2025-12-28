/**
 * Palette Generator
 *
 * Generates a balanced color palette from 1-2 seed/brand colors using OKLCH color space
 * for perceptually uniform results.
 */

import type { ScaleShade } from './tailwind-colors'
import type { ColorSystemConfig } from '@/components/studio/design-system-tool'

export interface SeedColor {
  l: number  // Lightness: 0-100
  c: number  // Chroma: 0-0.4
  h: number  // Hue: 0-360
}

export interface PaletteGeneratorInput {
  primary: SeedColor
  secondary?: SeedColor  // Optional: if not provided, will be derived from primary
}

/**
 * Converts OKLCH values to a ScaleShade with custom OKLCH
 */
function toScaleShade(l: number, c: number, h: number): ScaleShade {
  return {
    scale: 'custom',
    shade: 500,
    customOklch: { l, c, h }
  }
}

/**
 * Shift hue by degrees, wrapping around 360
 */
function shiftHue(h: number, degrees: number): number {
  return (h + degrees + 360) % 360
}

/**
 * Generate complementary color (180 degrees)
 */
function complementary(h: number): number {
  return shiftHue(h, 180)
}

/**
 * Generate analogous colors (±30 degrees)
 */
function analogous(h: number): [number, number] {
  return [shiftHue(h, -30), shiftHue(h, 30)]
}

/**
 * Generate triadic colors (120 degrees apart)
 */
function triadic(h: number): [number, number] {
  return [shiftHue(h, 120), shiftHue(h, 240)]
}

/**
 * Generate a complete color palette from seed colors
 */
export function generatePalette(input: PaletteGeneratorInput): ColorSystemConfig {
  const { primary } = input

  // Derive secondary from primary if not provided (analogous or complementary)
  const secondary = input.secondary || {
    l: primary.l,
    c: primary.c * 0.7,
    h: shiftHue(primary.h, 180) // Complementary by default
  }

  // Derive accent from primary (triadic)
  const accentHue = shiftHue(primary.h, 120)

  // Derive destructive (red range: 0-30 hue)
  const destructiveHue = 25

  return {
    // Backgrounds - very light/dark neutrals with subtle primary tint
    background: {
      light: toScaleShade(99, 0.005, primary.h),
      dark: toScaleShade(15, 0.01, primary.h)
    },

    // Foreground - high contrast text
    foreground: {
      light: toScaleShade(15, 0.01, primary.h),
      dark: toScaleShade(95, 0.005, primary.h)
    },

    // Card - slightly elevated from background
    card: {
      light: toScaleShade(100, 0, 0),
      dark: toScaleShade(20, 0.015, primary.h)
    },

    // Card foreground
    cardForeground: {
      light: toScaleShade(15, 0.01, primary.h),
      dark: toScaleShade(95, 0.005, primary.h)
    },

    // Primary - main brand color
    primary: {
      light: toScaleShade(primary.l, primary.c, primary.h),
      dark: toScaleShade(Math.min(primary.l + 15, 80), primary.c, primary.h)
    },

    // Primary foreground - contrasting text on primary
    primaryForeground: {
      light: toScaleShade(primary.l > 60 ? 15 : 98, 0.01, primary.h),
      dark: toScaleShade(primary.l > 50 ? 15 : 98, 0.01, primary.h)
    },

    // Secondary - muted version of secondary color
    secondary: {
      light: toScaleShade(92, secondary.c * 0.3, secondary.h),
      dark: toScaleShade(25, secondary.c * 0.2, secondary.h)
    },

    // Secondary foreground
    secondaryForeground: {
      light: toScaleShade(20, secondary.c * 0.3, secondary.h),
      dark: toScaleShade(95, secondary.c * 0.2, secondary.h)
    },

    // Muted - subtle backgrounds
    muted: {
      light: toScaleShade(96, 0.01, primary.h),
      dark: toScaleShade(25, 0.015, primary.h)
    },

    // Muted foreground - subdued text
    mutedForeground: {
      light: toScaleShade(45, 0.02, primary.h),
      dark: toScaleShade(65, 0.02, primary.h)
    },

    // Accent - highlight color
    accent: {
      light: toScaleShade(92, 0.04, accentHue),
      dark: toScaleShade(28, 0.05, accentHue)
    },

    // Accent foreground
    accentForeground: {
      light: toScaleShade(20, 0.03, accentHue),
      dark: toScaleShade(95, 0.02, accentHue)
    },

    // Destructive - error/danger red
    destructive: {
      light: toScaleShade(55, 0.22, destructiveHue),
      dark: toScaleShade(65, 0.2, destructiveHue)
    },

    // Destructive foreground
    destructiveForeground: {
      light: toScaleShade(98, 0.01, destructiveHue),
      dark: toScaleShade(98, 0.01, destructiveHue)
    },

    // Border - subtle dividers
    border: {
      light: toScaleShade(90, 0.01, primary.h),
      dark: toScaleShade(30, 0.02, primary.h)
    },

    // Input - form element borders
    input: {
      light: toScaleShade(88, 0.015, primary.h),
      dark: toScaleShade(32, 0.02, primary.h)
    },

    // Ring - focus outline
    ring: {
      light: toScaleShade(primary.l, primary.c * 0.8, primary.h),
      dark: toScaleShade(Math.min(primary.l + 10, 75), primary.c * 0.8, primary.h)
    }
  }
}

/**
 * Preset palette styles
 */
export type PaletteStyle = 'vibrant' | 'muted' | 'monochrome' | 'complementary'

/**
 * Generate a palette with a specific style
 */
export function generateStyledPalette(
  brandColor: SeedColor,
  style: PaletteStyle
): ColorSystemConfig {
  switch (style) {
    case 'vibrant':
      return generatePalette({
        primary: brandColor,
        secondary: {
          l: brandColor.l,
          c: brandColor.c * 0.9,
          h: shiftHue(brandColor.h, 60) // Split complementary
        }
      })

    case 'muted':
      return generatePalette({
        primary: {
          l: brandColor.l,
          c: brandColor.c * 0.6, // Reduce saturation
          h: brandColor.h
        },
        secondary: {
          l: brandColor.l,
          c: brandColor.c * 0.4,
          h: shiftHue(brandColor.h, 30) // Analogous
        }
      })

    case 'monochrome':
      return generatePalette({
        primary: brandColor,
        secondary: {
          l: brandColor.l,
          c: brandColor.c * 0.3, // Very desaturated
          h: brandColor.h // Same hue
        }
      })

    case 'complementary':
    default:
      return generatePalette({
        primary: brandColor,
        secondary: {
          l: brandColor.l,
          c: brandColor.c * 0.8,
          h: complementary(brandColor.h)
        }
      })
  }
}
