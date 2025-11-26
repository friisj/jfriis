'use client'

import { useState } from 'react'
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

    // Motion tokens
    const durationTokens = Object.entries(primitives.motion.durations)
      .map(([name, value]) => `  --duration-${name}: ${value}ms;`)
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

    const ringTokens = [
      ...Object.entries(primitives.motion.ring.width).map(([name, value]) => `  --ring-width-${name}: ${value}px;`),
      ...Object.entries(primitives.motion.ring.offsetWidth).map(([name, value]) => `  --ring-offset-width-${name}: ${value}px;`),
      ...Object.entries(primitives.motion.ring.opacity).map(([name, value]) => `  --ring-opacity-${name}: ${value};`)
    ].join('\n')

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
  /* Duration Scale */
${durationTokens}

  /* Easing Curves */
${easingTokens}

  /* Spring Physics (for Framer Motion, iOS, Android, etc.) */
${springTokens}

  /* Ring / Focus Indicators (Tailwind-compatible) */
${ringTokens}

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

    return `// motion.ts - Universal motion tokens for Framer Motion
// These values are exported from your design system

import type { Transition } from 'framer-motion'

// Duration scale (in seconds for Framer Motion)
export const durations = {
  micro: ${motion.durations.micro / 1000},      // ${motion.durations.micro}ms - Instant feedback
  fast: ${motion.durations.fast / 1000},        // ${motion.durations.fast}ms - Quick transitions
  standard: ${motion.durations.standard / 1000},  // ${motion.durations.standard}ms - Default
  moderate: ${motion.durations.moderate / 1000},  // ${motion.durations.moderate}ms - Emphasis
  slow: ${motion.durations.slow / 1000},        // ${motion.durations.slow}ms - Deliberate
  page: ${motion.durations.page / 1000},        // ${motion.durations.page}ms - Page transitions
  deliberate: ${motion.durations.deliberate / 1000} // ${motion.durations.deliberate}ms - Intentionally slow
} as const

// Spring physics configurations
export const springs = {
  bouncy: {
    type: 'spring' as const,
    stiffness: ${motion.springs.bouncy.stiffness},
    damping: ${motion.springs.bouncy.damping},
    mass: ${motion.springs.bouncy.mass}
  },
  smooth: {
    type: 'spring' as const,
    stiffness: ${motion.springs.smooth.stiffness},
    damping: ${motion.springs.smooth.damping},
    mass: ${motion.springs.smooth.mass}
  },
  gentle: {
    type: 'spring' as const,
    stiffness: ${motion.springs.gentle.stiffness},
    damping: ${motion.springs.gentle.damping},
    mass: ${motion.springs.gentle.mass}
  },
  snappy: {
    type: 'spring' as const,
    stiffness: ${motion.springs.snappy.stiffness},
    damping: ${motion.springs.snappy.damping},
    mass: ${motion.springs.snappy.mass}
  }
} as const

// Easing curves (cubic-bezier values)
export const easings = {
  easeIn: ${JSON.stringify(motion.easings['ease-in'])},
  easeOut: ${JSON.stringify(motion.easings['ease-out'])},
  easeInOut: ${JSON.stringify(motion.easings['ease-in-out'])},
  linear: ${JSON.stringify(motion.easings['linear'])}
} as const

// Common motion variants
export const variants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: durations.fast }
  },
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: springs.smooth
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: springs.smooth
  },
  slideInRight: {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 100 },
    transition: springs.snappy
  },
  slideInLeft: {
    initial: { opacity: 0, x: -100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
    transition: springs.snappy
  }
} as const

// Gesture interactions
export const gestures = {
  tap: {
    scale: 0.95,
    transition: { duration: durations.micro }
  },
  hover: {
    scale: 1.02,
    transition: springs.gentle
  },
  press: {
    scale: 0.98,
    transition: { duration: durations.micro }
  }
} as const

// Custom hook for using motion tokens
export function useMotion() {
  return {
    durations,
    springs,
    easings,
    variants,
    gestures
  }
}

// Example usage:
// import { motion } from 'framer-motion'
// import { variants, springs } from './motion'
//
// <motion.div
//   variants={variants.fadeInUp}
//   initial="initial"
//   animate="animate"
//   exit="exit"
// >
//   Content
// </motion.div>
//
// <motion.button
//   whileHover={gestures.hover}
//   whileTap={gestures.tap}
// >
//   Button
// </motion.button>
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
        <a
          href="/studio/design-system-tool"
          className="px-6 py-2.5 border rounded-lg hover:bg-accent transition-colors font-medium inline-block"
        >
          Start New Configuration
        </a>
      </div>
    </div>
  )
}
