'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { DesignSystemConfig } from './design-system-tool'
import { getColorValue } from '@/lib/tailwind-colors'

interface ThemeExportProps {
  config: DesignSystemConfig
  onBack: () => void
}

export function ThemeExport({ config, onBack }: ThemeExportProps) {
  const [copied, setCopied] = useState(false)

  const generateFontFaceRules = () => {
    const { fontFamilies } = config.primitives.typography
    const allFiles: Array<{ family: string; files: any[] }> = []

    // Collect all custom font files
    if (fontFamilies.sans.source === 'custom' && fontFamilies.sans.files) {
      allFiles.push({ family: fontFamilies.sans.name, files: fontFamilies.sans.files })
    }
    if (fontFamilies.serif.source === 'custom' && fontFamilies.serif.files) {
      allFiles.push({ family: fontFamilies.serif.name, files: fontFamilies.serif.files })
    }
    if (fontFamilies.mono.source === 'custom' && fontFamilies.mono.files) {
      allFiles.push({ family: fontFamilies.mono.name, files: fontFamilies.mono.files })
    }

    if (allFiles.length === 0) return ''

    // Generate @font-face rules for each font file
    const fontFaceRules = allFiles
      .flatMap(({ family, files }) =>
        files.map((file) => {
          return `@font-face {
  font-family: '${family}';
  src: url('${file.path}') format('${file.format}');
  font-weight: ${file.weight};
  font-style: ${file.style};
  font-display: swap;
}`
        })
      )
      .join('\n\n')

    return `/* ===== CUSTOM FONT DECLARATIONS ===== */\n${fontFaceRules}\n\n`
  }

  const generateTailwindTheme = () => {
    const { primitives, semantic } = config

    // Generate spacing tokens
    const spacingTokens = primitives.spacing.values.map((value, index) => {
      const key = index === 0 ? '0' : String(index)
      return `  --spacing-${key}: ${value / 16}rem; /* ${value}px */`
    }).join('\n')

    // Generate radius tokens
    const radiusTokens = primitives.radius.values
      .filter(v => v !== 9999)
      .map((value, index) => {
        const keys = ['none', 'sm', 'DEFAULT', 'md', 'lg', 'xl', '2xl', '3xl']
        const key = keys[index] || String(index)
        return `  --radius-${key}: ${value / 16}rem; /* ${value}px */`
      }).join('\n')

    // Full radius
    const fullRadius = `  --radius-full: 9999px;`

    // Semantic spacing
    const semanticSpacing = Object.entries(semantic.spacing)
      .map(([key, value]) => `  --spacing-${key}: ${value};`)
      .join('\n')

    // Semantic radius
    const semanticRadius = Object.entries(semantic.radius)
      .map(([key, value]) => `  --radius-${key}: ${value};`)
      .join('\n')

    // Typography tokens
    const fontFamilyTokens = `  --font-sans: ${primitives.typography.fontFamilies.sans.stack};
  --font-serif: ${primitives.typography.fontFamilies.serif.stack};
  --font-mono: ${primitives.typography.fontFamilies.mono.stack};`

    const typeSizeTokens = Object.entries(primitives.typography.typeScale.sizes)
      .map(([name, size]) => `  --font-size-${name}: ${size};`)
      .join('\n')

    const fontWeightTokens = Object.entries(primitives.typography.fontWeights)
      .map(([name, weight]) => `  --font-weight-${name}: ${weight};`)
      .join('\n')

    const lineHeightTokens = Object.entries(primitives.typography.lineHeights)
      .map(([name, height]) => `  --line-height-${name}: ${height};`)
      .join('\n')

    const letterSpacingTokens = Object.entries(primitives.typography.letterSpacing)
      .map(([name, spacing]) => `  --letter-spacing-${name}: ${spacing};`)
      .join('\n')

    // Color tokens
    const colorTokens = Object.entries(primitives.colors)
      .map(([name, colorPair]) => {
        const cssKey = name.replace(/([A-Z])/g, '-$1').toLowerCase()
        const lightColor = getColorValue(colorPair.light)
        const darkColor = getColorValue(colorPair.dark)

        const lightLabel = colorPair.light.scale === 'custom'
          ? 'custom'
          : `${colorPair.light.scale}-${colorPair.light.shade}`
        const darkLabel = colorPair.dark.scale === 'custom'
          ? 'custom'
          : `${colorPair.dark.scale}-${colorPair.dark.shade}`

        return `  --${cssKey}: ${lightColor}; /* ${lightLabel} */
  /* Dark mode: ${darkColor} (${darkLabel}) */`
      })
      .join('\n')

    // Motion tokens - Semantic profiles
    const motionMode = `  --motion-mode: ${primitives.motion.mode};`

    const profileTokens = Object.entries(primitives.motion.profiles)
      .flatMap(([name, profile]) => {
        const tokens = [
          `  --motion-${name}-duration: ${profile.duration}ms;`,
          `  --motion-${name}-easing: ${profile.easing};`
        ]
        if (profile.spring) {
          tokens.push(
            `  --motion-${name}-stiffness: ${profile.spring.stiffness};`,
            `  --motion-${name}-damping: ${profile.spring.damping};`,
            `  --motion-${name}-mass: ${profile.spring.mass};`
          )
        }
        return tokens
      })
      .join('\n')

    const easingTokens = Object.entries(primitives.motion.easings)
      .map(([name, value]) => `  --easing-${name}: ${value};`)
      .join('\n')

    const springTokens = Object.entries(primitives.motion.springs)
      .flatMap(([name, spring]) => [
        `  --spring-${name}-stiffness: ${spring.stiffness};`,
        `  --spring-${name}-damping: ${spring.damping};`,
        `  --spring-${name}-mass: ${spring.mass};`
      ])
      .join('\n')

    const fontFaceRules = generateFontFaceRules()

    return `/* Add this to your globals.css */

${fontFaceRules}@theme inline {
  /* ===== SPACING PRIMITIVES ===== */
${spacingTokens}

  /* ===== RADIUS PRIMITIVES ===== */
${radiusTokens}
${fullRadius}

  /* ===== TYPOGRAPHY PRIMITIVES ===== */
  /* Font Families */
${fontFamilyTokens}

  /* Type Scale */
${typeSizeTokens}

  /* Font Weights */
${fontWeightTokens}

  /* Line Heights */
${lineHeightTokens}

  /* Letter Spacing */
${letterSpacingTokens}

  /* ===== COLOR PRIMITIVES ===== */
${colorTokens}

  /* ===== MOTION PRIMITIVES ===== */
  /* Motion Mode (productive | expressive) */
${motionMode}

  /* Semantic Motion Profiles */
${profileTokens}

  /* Easing Curves (intent-based) */
${easingTokens}

  /* Spring Physics Presets (platform-agnostic) */
${springTokens}

  /* ===== SEMANTIC SPACING ===== */
${semanticSpacing}

  /* ===== SEMANTIC RADIUS ===== */
${semanticRadius}
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Grid configuration (add to your layout component) */
/*
  Max width: ${primitives.grid.maxWidth}px
  Columns: ${primitives.grid.columns}
  Gutter: ${primitives.grid.gutter}px
  Margins:
    - Mobile: ${primitives.grid.margins.mobile}px
    - Tablet: ${primitives.grid.margins.tablet}px
    - Desktop: ${primitives.grid.margins.desktop}px

  Breakpoints:
    - sm: ${primitives.breakpoints.sm}px
    - md: ${primitives.breakpoints.md}px
    - lg: ${primitives.breakpoints.lg}px
    - xl: ${primitives.breakpoints.xl}px
    - 2xl: ${primitives.breakpoints['2xl']}px

  Elevation: ${primitives.elevation.levels} levels (${primitives.elevation.strategy})
*/`
  }

  const generateJSON = () => {
    return JSON.stringify(config, null, 2)
  }

  const generateFramerMotion = () => {
    const { motion } = config.primitives

    // Helper to parse cubic-bezier strings to number arrays
    const parseCubicBezier = (easing: string): string => {
      const match = easing.match(/cubic-bezier\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/)
      return match ? `[${match[1]}, ${match[2]}, ${match[3]}, ${match[4]}]` : '[0.4, 0, 0.2, 1]'
    }

    return `// motion.ts - Semantic motion tokens for Framer Motion
// These values are exported from your design system

import type { Transition } from 'framer-motion'

// Motion mode: ${motion.mode}
// ${motion.mode === 'productive' ? 'Fast, efficient, task-focused' : 'Slower, delightful, brand-focused'}
export const MOTION_MODE = '${motion.mode}' as const

// ===== SEMANTIC MOTION PROFILES =====
// Use these for consistent timing across your application

export const profiles = {
  // Micro-interactions: hover, focus, press states
  interaction: {
    duration: ${motion.profiles.interaction.duration / 1000}, // ${motion.profiles.interaction.duration}ms
    ease: ${parseCubicBezier(motion.profiles.interaction.easing)}${motion.profiles.interaction.spring ? `,
    spring: {
      type: 'spring' as const,
      stiffness: ${motion.profiles.interaction.spring.stiffness},
      damping: ${motion.profiles.interaction.spring.damping},
      mass: ${motion.profiles.interaction.spring.mass}
    }` : ''}
  },

  // Toggle, switch, checkbox, radio button transitions
  stateChange: {
    duration: ${motion.profiles.stateChange.duration / 1000}, // ${motion.profiles.stateChange.duration}ms
    ease: ${parseCubicBezier(motion.profiles.stateChange.easing)}${motion.profiles.stateChange.spring ? `,
    spring: {
      type: 'spring' as const,
      stiffness: ${motion.profiles.stateChange.spring.stiffness},
      damping: ${motion.profiles.stateChange.spring.damping},
      mass: ${motion.profiles.stateChange.spring.mass}
    }` : ''}
  },

  // Menu open/close, dialog show/hide, dropdown animations
  transition: {
    duration: ${motion.profiles.transition.duration / 1000}, // ${motion.profiles.transition.duration}ms
    ease: ${parseCubicBezier(motion.profiles.transition.easing)}${motion.profiles.transition.spring ? `,
    spring: {
      type: 'spring' as const,
      stiffness: ${motion.profiles.transition.spring.stiffness},
      damping: ${motion.profiles.transition.spring.damping},
      mass: ${motion.profiles.transition.spring.mass}
    }` : ''}
  },

  // Accordion expand/collapse, disclosure, progressive reveal
  reveal: {
    duration: ${motion.profiles.reveal.duration / 1000}, // ${motion.profiles.reveal.duration}ms
    ease: ${parseCubicBezier(motion.profiles.reveal.easing)}${motion.profiles.reveal.spring ? `,
    spring: {
      type: 'spring' as const,
      stiffness: ${motion.profiles.reveal.spring.stiffness},
      damping: ${motion.profiles.reveal.spring.damping},
      mass: ${motion.profiles.reveal.spring.mass}
    }` : ''}
  },

  // Page transitions, route changes, view swaps
  navigation: {
    duration: ${motion.profiles.navigation.duration / 1000}, // ${motion.profiles.navigation.duration}ms
    ease: ${parseCubicBezier(motion.profiles.navigation.easing)}${motion.profiles.navigation.spring ? `,
    spring: {
      type: 'spring' as const,
      stiffness: ${motion.profiles.navigation.spring.stiffness},
      damping: ${motion.profiles.navigation.spring.damping},
      mass: ${motion.profiles.navigation.spring.mass}
    }` : ''}
  },

  // Success messages, errors, celebrations, important feedback
  emphasis: {
    duration: ${motion.profiles.emphasis.duration / 1000}, // ${motion.profiles.emphasis.duration}ms
    ease: ${parseCubicBezier(motion.profiles.emphasis.easing)}${motion.profiles.emphasis.spring ? `,
    spring: {
      type: 'spring' as const,
      stiffness: ${motion.profiles.emphasis.spring.stiffness},
      damping: ${motion.profiles.emphasis.spring.damping},
      mass: ${motion.profiles.emphasis.spring.mass}
    }` : ''}
  }
} as const

// ===== SPRING PHYSICS PRESETS =====
// Universal spring configurations adaptable to any platform

export const springs = {
  tight: {
    type: 'spring' as const,
    stiffness: ${motion.springs.tight.stiffness},
    damping: ${motion.springs.tight.damping},
    mass: ${motion.springs.tight.mass}
  },
  balanced: {
    type: 'spring' as const,
    stiffness: ${motion.springs.balanced.stiffness},
    damping: ${motion.springs.balanced.damping},
    mass: ${motion.springs.balanced.mass}
  },
  loose: {
    type: 'spring' as const,
    stiffness: ${motion.springs.loose.stiffness},
    damping: ${motion.springs.loose.damping},
    mass: ${motion.springs.loose.mass}
  },
  bouncy: {
    type: 'spring' as const,
    stiffness: ${motion.springs.bouncy.stiffness},
    damping: ${motion.springs.bouncy.damping},
    mass: ${motion.springs.bouncy.mass}
  }
} as const

// ===== EASING CURVES =====
// Intent-based timing functions

export const easings = {
  enter: ${parseCubicBezier(motion.easings.enter)}, // Elements entering view
  exit: ${parseCubicBezier(motion.easings.exit)},   // Elements exiting view
  standard: ${parseCubicBezier(motion.easings.standard)}, // State transitions
  linear: ${parseCubicBezier(motion.easings.linear)}  // Mechanical motion
} as const

// ===== COMMON MOTION VARIANTS =====

export const variants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: profiles.transition.duration, ease: profiles.transition.ease }
  },
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: profiles.transition.spring || { duration: profiles.transition.duration, ease: profiles.transition.ease }
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: profiles.emphasis.spring || { duration: profiles.emphasis.duration, ease: profiles.emphasis.ease }
  },
  slideInRight: {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 100 },
    transition: profiles.navigation.spring || { duration: profiles.navigation.duration, ease: profiles.navigation.ease }
  },
  slideInLeft: {
    initial: { opacity: 0, x: -100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
    transition: profiles.navigation.spring || { duration: profiles.navigation.duration, ease: profiles.navigation.ease }
  }
} as const

// ===== GESTURE INTERACTIONS =====

export const gestures = {
  tap: {
    scale: 0.95,
    transition: { duration: profiles.interaction.duration, ease: profiles.interaction.ease }
  },
  hover: {
    scale: 1.02,
    transition: profiles.interaction.spring || { duration: profiles.interaction.duration, ease: profiles.interaction.ease }
  },
  press: {
    scale: 0.98,
    transition: { duration: profiles.interaction.duration, ease: profiles.interaction.ease }
  }
} as const

// ===== CUSTOM HOOK =====

export function useMotion() {
  return {
    mode: MOTION_MODE,
    profiles,
    springs,
    easings,
    variants,
    gestures
  }
}

// ===== EXAMPLE USAGE =====
/*
import { motion } from 'framer-motion'
import { profiles, variants, gestures } from './motion'

// Using semantic profiles
<motion.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    duration: profiles.emphasis.duration,
    ease: profiles.emphasis.ease
  }}
>
  Success notification
</motion.div>

// Using variants
<motion.div
  variants={variants.fadeInUp}
  initial="initial"
  animate="animate"
  exit="exit"
>
  Content
</motion.div>

// Using gestures
<motion.button
  whileHover={gestures.hover}
  whileTap={gestures.tap}
>
  Button
</motion.button>
*/
`
  }

  const handleCopyTheme = async () => {
    await navigator.clipboard.writeText(generateTailwindTheme())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyJSON = async () => {
    await navigator.clipboard.writeText(generateJSON())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyFramerMotion = async () => {
    await navigator.clipboard.writeText(generateFramerMotion())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadJSON = () => {
    const blob = new Blob([generateJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'design-system-config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">

      {/* Option 1: Tailwind Theme CSS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Tailwind v4 Theme (CSS)</h3>
            <p className="text-sm text-muted-foreground">
              Copy and paste into your globals.css file
            </p>
          </div>
          <button
            onClick={handleCopyTheme}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>

        <div className="rounded-lg border bg-muted/50 overflow-hidden">
          <div className="p-4 border-b bg-muted/80 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">globals.css</span>
          </div>
          <pre className="p-4 text-xs overflow-x-auto max-h-96">
            <code>{generateTailwindTheme()}</code>
          </pre>
        </div>
      </div>

      {/* Option 2: JSON Config */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">JSON Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Raw configuration data for programmatic use
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopyJSON}
              className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors text-sm font-medium"
            >
              Copy JSON
            </button>
            <button
              onClick={handleDownloadJSON}
              className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors text-sm font-medium"
            >
              Download
            </button>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/50 overflow-hidden">
          <div className="p-4 border-b bg-muted/80 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">design-system-config.json</span>
          </div>
          <pre className="p-4 text-xs overflow-x-auto max-h-96">
            <code>{generateJSON()}</code>
          </pre>
        </div>
      </div>

      {/* Option 3: Framer Motion Export */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Framer Motion Tokens (React)</h3>
            <p className="text-sm text-muted-foreground">
              Ready-to-use motion tokens, variants, and hooks for React projects
            </p>
          </div>
          <button
            onClick={handleCopyFramerMotion}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>

        <div className="rounded-lg border bg-muted/50 overflow-hidden">
          <div className="p-4 border-b bg-muted/80 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">motion.ts</span>
            <span className="text-xs text-muted-foreground">TypeScript + Framer Motion</span>
          </div>
          <pre className="p-4 text-xs overflow-x-auto max-h-96">
            <code>{generateFramerMotion()}</code>
          </pre>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="font-semibold mb-3">How to Use</h3>
        <ol className="space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="font-medium text-foreground">1.</span>
            <span>Copy the Tailwind theme CSS above</span>
          </li>
          <li className="flex gap-3">
            <span className="font-medium text-foreground">2.</span>
            <span>Paste it into your <code className="px-1.5 py-0.5 bg-muted rounded text-xs">app/globals.css</code> file</span>
          </li>
          <li className="flex gap-3">
            <span className="font-medium text-foreground">3.</span>
            <span>Use standard Tailwind classes like <code className="px-1.5 py-0.5 bg-muted rounded text-xs">p-4</code>, <code className="px-1.5 py-0.5 bg-muted rounded text-xs">rounded</code>, etc.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-medium text-foreground">4.</span>
            <span>Save the JSON config for future reference or programmatic use</span>
          </li>
        </ol>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-6 border-t">
        <button
          onClick={onBack}
          className="px-6 py-2.5 border rounded-lg hover:bg-accent transition-colors font-medium"
        >
          ← Back to Preview
        </button>
        <div className="flex-1" />
        <Link
          href="/studio/design-system-tool"
          className="px-6 py-2.5 border rounded-lg hover:bg-accent transition-colors font-medium inline-block"
        >
          Start New Configuration
        </Link>
      </div>
    </div>
  )
}
