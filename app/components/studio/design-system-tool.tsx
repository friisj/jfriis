'use client'

import { useState, useEffect } from 'react'
import { PreviewTemplates } from './preview-templates'
import { ConfigPanel } from './config-panel'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { ChevronRight, Download, Sun, Moon, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { ThemeExport } from './theme-export'
import { themes } from '@/lib/themes/theme-config'
import { getColorValue } from '@/lib/tailwind-colors'
import { usePrivateHeader } from '@/components/layout/private-header-context'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import type { FontWeight } from '@/lib/fonts/font-scanner'
import type { TailwindScale, Shade, ScaleShade } from '@/lib/tailwind-colors'

export interface FontFaceRule {
  family: string
  weight: FontWeight
  style: 'normal' | 'italic'
  path: string
  format: 'woff2' | 'woff' | 'ttf' | 'otf'
}

export interface FontFamilyConfig {
  name: string // The font-family name to use in CSS
  stack: string // Full font stack including fallbacks
  source: 'custom' | 'system' // Whether using custom files or system fonts
  files?: FontFaceRule[] // @font-face rules for custom fonts
  weights: {
    light?: FontWeight
    normal: FontWeight
    medium?: FontWeight
    semibold?: FontWeight
    bold: FontWeight
    extrabold?: FontWeight
  }
}

export interface ColorSystemConfig {
  // Semantic color roles using Tailwind scales
  background: { light: ScaleShade; dark: ScaleShade }
  foreground: { light: ScaleShade; dark: ScaleShade }
  card: { light: ScaleShade; dark: ScaleShade }
  cardForeground: { light: ScaleShade; dark: ScaleShade }
  primary: { light: ScaleShade; dark: ScaleShade }
  primaryForeground: { light: ScaleShade; dark: ScaleShade }
  secondary: { light: ScaleShade; dark: ScaleShade }
  secondaryForeground: { light: ScaleShade; dark: ScaleShade }
  muted: { light: ScaleShade; dark: ScaleShade }
  mutedForeground: { light: ScaleShade; dark: ScaleShade }
  accent: { light: ScaleShade; dark: ScaleShade }
  accentForeground: { light: ScaleShade; dark: ScaleShade }
  destructive: { light: ScaleShade; dark: ScaleShade }
  destructiveForeground: { light: ScaleShade; dark: ScaleShade }
  border: { light: ScaleShade; dark: ScaleShade }
  input: { light: ScaleShade; dark: ScaleShade }
  ring: { light: ScaleShade; dark: ScaleShade }

  // State colors for feedback
  success: { light: ScaleShade; dark: ScaleShade }
  successForeground: { light: ScaleShade; dark: ScaleShade }
  warning: { light: ScaleShade; dark: ScaleShade }
  warningForeground: { light: ScaleShade; dark: ScaleShade }
  info: { light: ScaleShade; dark: ScaleShade }
  infoForeground: { light: ScaleShade; dark: ScaleShade }
}

// Semantic motion modes define the personality and intent of motion
// Productive: Fast, efficient, focused on task completion
// Expressive: Slower, more personality, focused on delight and brand
export type MotionMode = 'productive' | 'expressive'

// Motion profile combines duration, easing, and optional spring for a use case
export interface MotionProfile {
  duration: number
  easing: string
  spring?: { stiffness: number; damping: number; mass: number }
}

// Universal motion physics configuration with semantic organization
// These tokens are platform-agnostic and can be adapted to:
// - CSS transitions/animations
// - Framer Motion (React)
// - CASpringAnimation (iOS)
// - SpringAnimation (Android)
// - Three.js, Unity, Unreal
// - AI prompt context for generative tools
export interface MotionSystemConfig {
  // Active motion mode (affects all motion profile durations)
  mode: MotionMode

  // Semantic motion profiles organized by use case intent
  // Each profile automatically adapts based on mode (productive vs expressive)
  profiles: {
    // Micro-interactions: hover, focus, press states
    interaction: MotionProfile

    // State changes: toggle, switch, checkbox, radio
    stateChange: MotionProfile

    // UI transitions: menu open/close, dialog show/hide, dropdown
    transition: MotionProfile

    // Content reveals: accordion expand/collapse, disclosure, progressive disclosure
    reveal: MotionProfile

    // Navigation: page transitions, route changes, view swaps
    navigation: MotionProfile

    // Emphasis: success messages, errors, important feedback, celebrations
    emphasis: MotionProfile
  }

  // Universal spring physics presets (adaptable to any platform)
  // Maps to: Framer Motion, iOS CASpringAnimation, Android SpringAnimation
  springs: {
    tight: {
      stiffness: number   // High stiffness, quick response
      damping: number     // High damping, no overshoot
      mass: number        // Light mass
    }
    balanced: {
      stiffness: number   // Medium stiffness
      damping: number     // Medium damping, slight overshoot
      mass: number        // Medium mass
    }
    loose: {
      stiffness: number   // Low stiffness, slower response
      damping: number     // Low damping, gentle overshoot
      mass: number        // Heavy mass
    }
    bouncy: {
      stiffness: number   // Medium-high stiffness
      damping: number     // Low damping, pronounced overshoot
      mass: number        // Light mass
    }
  }

  // CSS easing curves organized by intent (not mechanics)
  easings: {
    // Elements entering view or gaining attention
    enter: string

    // Elements exiting view or losing attention
    exit: string

    // Standard state transitions
    standard: string

    // Linear mechanical motion (progress bars, loading)
    linear: string
  }

  // Accessibility
  reducedMotion: boolean  // prefers-reduced-motion preference
}

// Interaction and state feedback configuration
// Defines how interactive elements respond to user input
export interface InteractionConfig {
  // State opacity layers (Material Design 3 state layer system)
  stateOpacity: {
    hover: number        // Overlay opacity on hover (default 0.08)
    focus: number        // Overlay opacity on focus (default 0.12)
    pressed: number      // Overlay opacity when pressed (default 0.12)
    disabled: number     // Element opacity when disabled (default 0.38)
    loading: number      // Content opacity under loading state (default 0.6)
  }

  // Scale transforms for tactile feedback
  scale: {
    hover: number        // Scale multiplier on hover (default 1.02 = 2% larger)
    pressed: number      // Scale multiplier when pressed (default 0.98 = 2% smaller)
    active: number       // Scale multiplier for active state (default 0.95 = 5% smaller)
  }

  // Focus ring configuration (WCAG 2.4.7, 1.4.11, 2.4.13 compliance)
  focusRing: {
    width: string        // Ring thickness (min 2px for WCAG AAA)
    offset: string       // Space between element and ring
    style: 'solid' | 'dashed' | 'dotted'
  }
}

export type DesignSystemConfig = {
  primitives: {
    spacing: {
      scale: '4pt' | '8pt' | 'custom'
      values: number[]
    }
    radius: {
      style: 'sharp' | 'moderate' | 'rounded'
      values: number[]
    }
    grid: {
      columns: number
      gutter: number
      margins: {
        mobile: number
        tablet: number
        desktop: number
      }
      maxWidth: number
    }
    breakpoints: {
      sm: number
      md: number
      lg: number
      xl: number
      '2xl': number
    }
    elevation: {
      levels: number
      strategy: 'shadow' | 'border' | 'both'
    }
    typography: {
      fontFamilies: {
        sans: FontFamilyConfig
        serif: FontFamilyConfig
        mono: FontFamilyConfig
      }
      typeScale: {
        base: number
        ratio: number
        sizes: Record<string, string>
      }
      fontWeights: Record<string, number>
      lineHeights: {
        tight: number
        normal: number
        relaxed: number
      }
      letterSpacing: {
        tighter: string
        normal: string
        wider: string
      }
    }
    colors: ColorSystemConfig
    motion: MotionSystemConfig
    interaction: InteractionConfig
  }
  semantic: {
    spacing: Record<string, string>
    radius: Record<string, string>
  }
}

// Generate default config
const getDefaultConfig = (): DesignSystemConfig => {
  const generateTypeScale = (base: number, ratio: number) => {
    const sizes: Record<string, string> = {}
    const steps = {
      'xs': -2, 'sm': -1, 'base': 0, 'lg': 1, 'xl': 2,
      '2xl': 3, '3xl': 4, '4xl': 5, '5xl': 6, '6xl': 7,
      '7xl': 8, '8xl': 9, '9xl': 10
    }
    Object.entries(steps).forEach(([name, step]) => {
      const size = base * Math.pow(ratio, step)
      sizes[name] = `${(size / 16).toFixed(4)}rem`
    })
    return sizes
  }

  const spacingValues = [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128]
  const radiusValues = [0, 4, 8, 12, 16, 9999]

  return {
    primitives: {
      spacing: {
        scale: '8pt',
        values: spacingValues
      },
      radius: {
        style: 'moderate',
        values: radiusValues
      },
      grid: {
        columns: 12,
        gutter: 24,
        margins: {
          mobile: 16,
          tablet: 32,
          desktop: 64
        },
        maxWidth: 1280
      },
      breakpoints: {
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
        '2xl': 1536
      },
      elevation: {
        levels: 5,
        strategy: 'shadow'
      },
      typography: {
        fontFamilies: {
          sans: {
            name: 'soehne',
            stack: 'soehne, system-ui, sans-serif',
            source: 'custom',
            weights: {
              light: 300,
              normal: 400,
              medium: 500,
              semibold: 600,
              bold: 700,
              extrabold: 800
            }
          },
          serif: {
            name: 'untitled-sans',
            stack: 'untitled-sans, Georgia, serif',
            source: 'custom',
            weights: {
              normal: 400,
              medium: 500,
              bold: 700
            }
          },
          mono: {
            name: 'soehne-mono',
            stack: 'soehne-mono, Courier New, monospace',
            source: 'custom',
            weights: {
              normal: 400,
              medium: 500,
              bold: 700
            }
          }
        },
        typeScale: {
          base: 16,
          ratio: 1.25,
          sizes: generateTypeScale(16, 1.25)
        },
        fontWeights: {
          light: 300,
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
          extrabold: 800
        },
        lineHeights: {
          tight: 1.25,
          normal: 1.5,
          relaxed: 1.75
        },
        letterSpacing: {
          tighter: '-0.05em',
          normal: '0em',
          wider: '0.05em'
        }
      },
      colors: {
        background: {
          light: { scale: 'neutral', shade: 50 },
          dark: { scale: 'neutral', shade: 950 }
        },
        foreground: {
          light: { scale: 'neutral', shade: 950 },
          dark: { scale: 'neutral', shade: 50 }
        },
        card: {
          light: { scale: 'neutral', shade: 50 },
          dark: { scale: 'neutral', shade: 900 }
        },
        cardForeground: {
          light: { scale: 'neutral', shade: 950 },
          dark: { scale: 'neutral', shade: 50 }
        },
        primary: {
          light: { scale: 'blue', shade: 600 },
          dark: { scale: 'blue', shade: 500 }
        },
        primaryForeground: {
          light: { scale: 'neutral', shade: 50 },
          dark: { scale: 'neutral', shade: 950 }
        },
        secondary: {
          light: { scale: 'neutral', shade: 200 },
          dark: { scale: 'neutral', shade: 800 }
        },
        secondaryForeground: {
          light: { scale: 'neutral', shade: 950 },
          dark: { scale: 'neutral', shade: 50 }
        },
        muted: {
          light: { scale: 'neutral', shade: 100 },
          dark: { scale: 'neutral', shade: 800 }
        },
        mutedForeground: {
          light: { scale: 'neutral', shade: 500 },
          dark: { scale: 'neutral', shade: 400 }
        },
        accent: {
          light: { scale: 'neutral', shade: 100 },
          dark: { scale: 'neutral', shade: 800 }
        },
        accentForeground: {
          light: { scale: 'neutral', shade: 950 },
          dark: { scale: 'neutral', shade: 50 }
        },
        destructive: {
          light: { scale: 'red', shade: 600 },
          dark: { scale: 'red', shade: 500 }
        },
        destructiveForeground: {
          light: { scale: 'neutral', shade: 50 },
          dark: { scale: 'neutral', shade: 950 }
        },
        border: {
          light: { scale: 'neutral', shade: 200 },
          dark: { scale: 'neutral', shade: 800 }
        },
        input: {
          light: { scale: 'neutral', shade: 200 },
          dark: { scale: 'neutral', shade: 800 }
        },
        ring: {
          light: { scale: 'blue', shade: 600 },
          dark: { scale: 'blue', shade: 500 }
        },

        // State feedback colors
        success: {
          light: { scale: 'green', shade: 600 },
          dark: { scale: 'green', shade: 500 }
        },
        successForeground: {
          light: { scale: 'neutral', shade: 50 },
          dark: { scale: 'neutral', shade: 950 }
        },
        warning: {
          light: { scale: 'amber', shade: 600 },
          dark: { scale: 'amber', shade: 500 }
        },
        warningForeground: {
          light: { scale: 'neutral', shade: 950 },
          dark: { scale: 'neutral', shade: 950 }
        },
        info: {
          light: { scale: 'sky', shade: 600 },
          dark: { scale: 'sky', shade: 500 }
        },
        infoForeground: {
          light: { scale: 'neutral', shade: 50 },
          dark: { scale: 'neutral', shade: 950 }
        }
      },
      motion: {
        // Default to productive mode (fast, efficient)
        mode: 'productive' as MotionMode,

        // Semantic motion profiles
        // Productive durations favor speed, expressive durations favor delight
        profiles: {
          // Micro-interactions (hover, focus, press)
          interaction: {
            duration: 70,  // Productive: 70ms, Expressive: 110ms
            easing: 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',  // ease-out
            spring: { stiffness: 400, damping: 25, mass: 1 }  // tight spring
          },

          // State changes (toggle, switch, checkbox)
          stateChange: {
            duration: 110,  // Productive: 110ms, Expressive: 150ms
            easing: 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',
            spring: { stiffness: 300, damping: 20, mass: 1 }  // balanced spring
          },

          // UI transitions (menu, dialog, dropdown)
          transition: {
            duration: 150,  // Productive: 150ms, Expressive: 250ms
            easing: 'cubic-bezier(0.4, 0.0, 0.2, 1.0)',  // standard
            spring: { stiffness: 200, damping: 20, mass: 1 }  // balanced spring
          },

          // Content reveals (accordion, disclosure)
          reveal: {
            duration: 250,  // Productive: 250ms, Expressive: 350ms
            easing: 'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
            spring: { stiffness: 150, damping: 20, mass: 1 }  // loose spring
          },

          // Navigation (page transitions, route changes)
          navigation: {
            duration: 350,  // Productive: 350ms, Expressive: 500ms
            easing: 'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
            spring: { stiffness: 100, damping: 20, mass: 1 }  // loose spring
          },

          // Emphasis (success, error, celebrations)
          emphasis: {
            duration: 500,  // Productive: 500ms, Expressive: 700ms
            easing: 'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
            spring: { stiffness: 300, damping: 10, mass: 1 }  // bouncy spring
          }
        },

        // Universal spring physics presets
        springs: {
          tight: {
            stiffness: 400,
            damping: 25,
            mass: 1
          },
          balanced: {
            stiffness: 200,
            damping: 20,
            mass: 1
          },
          loose: {
            stiffness: 100,
            damping: 20,
            mass: 1
          },
          bouncy: {
            stiffness: 300,
            damping: 10,
            mass: 1
          }
        },

        // CSS easing curves organized by intent
        easings: {
          enter: 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',     // ease-out (decelerate in)
          exit: 'cubic-bezier(0.4, 0.0, 1.0, 1.0)',      // ease-in (accelerate out)
          standard: 'cubic-bezier(0.4, 0.0, 0.2, 1.0)',  // ease-in-out
          linear: 'linear'
        },

        // Accessibility
        reducedMotion: false  // Will be detected at runtime
      },
      interaction: {
        // State opacity layers (Material Design 3 standard)
        stateOpacity: {
          hover: 0.08,      // 8% overlay on hover
          focus: 0.12,      // 12% overlay on focus
          pressed: 0.12,    // 12% overlay when pressed
          disabled: 0.38,   // 38% element opacity when disabled
          loading: 0.6      // 60% content opacity under loading
        },

        // Scale transforms for tactile feedback
        scale: {
          hover: 1.02,      // 2% scale up on hover
          pressed: 0.98,    // 2% scale down when pressed
          active: 0.95      // 5% scale down for active state
        },

        // Focus ring (WCAG AAA compliance)
        focusRing: {
          width: '2px',     // Minimum 2px for WCAG 2.4.13
          offset: '2px',    // Space between element and ring
          style: 'solid'    // Ring style
        }
      }
    },
    semantic: {
      spacing: {
        'component-gap': `${spacingValues[4] || 16}px`,
        'component-padding': `${spacingValues[4] || 16}px`,
        'section-gap': `${spacingValues[6] || 32}px`,
        'section-padding': `${spacingValues[7] || 48}px`,
        'page-padding': `${spacingValues[8] || 64}px`
      },
      radius: {
        'interactive': `${radiusValues[2] || 8}px`,
        'surface': `${radiusValues[3] || 12}px`,
        'dialog': `${radiusValues[4] || 16}px`
      }
    }
  }
}

export function DesignSystemTool() {
  const [selectedTheme, setSelectedTheme] = useState<'custom' | string>('custom')
  const [customConfig, setCustomConfig] = useState<DesignSystemConfig>(getDefaultConfig())
  const [config, setConfig] = useState<DesignSystemConfig>(getDefaultConfig())
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showExport, setShowExport] = useState(false)
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light')

  // Track current theme colors and typography for injection
  const [currentThemeColors, setCurrentThemeColors] = useState<any>(null)
  const [currentThemeTypography, setCurrentThemeTypography] = useState<any>(null)

  // Update config when theme selection changes
  const { setActions } = usePrivateHeader()

  useEffect(() => {
    if (selectedTheme === 'custom') {
      setConfig(customConfig)
      setCurrentThemeColors(null) // Custom doesn't override colors
      setCurrentThemeTypography(null) // Custom doesn't override typography
    } else {
      // Load predefined theme
      const theme = themes[selectedTheme]
      if (theme) {
        const baseConfig = getDefaultConfig()

        // Override radius if theme has it
        if (theme.radius) {
          const radiusValue = parseFloat(theme.radius)
          baseConfig.primitives.radius.values = [0, 4, radiusValue * 16, 12, 16, 9999]
        }

        // Override font families if theme has typography
        if (theme.typography) {
          if (theme.typography.fontSans) {
            const fontName = theme.name === 'blue' ? 'Geist' : 'System UI'
            baseConfig.primitives.typography.fontFamilies.sans = {
              name: fontName,
              stack: theme.typography.fontSans,
              source: 'system',
              weights: { normal: 400, medium: 500, semibold: 600, bold: 700 }
            }
          }
          if (theme.typography.fontSerif) {
            const serifName = theme.name === 'blue' ? 'Geist' : 'System Serif'
            baseConfig.primitives.typography.fontFamilies.serif = {
              name: serifName,
              stack: theme.typography.fontSerif,
              source: 'system',
              weights: { normal: 400, medium: 500, semibold: 600, bold: 700 }
            }
          }
          if (theme.typography.fontMono) {
            const monoName = theme.name === 'blue' ? 'Geist Mono' : 'System Mono'
            baseConfig.primitives.typography.fontFamilies.mono = {
              name: monoName,
              stack: theme.typography.fontMono,
              source: 'system',
              weights: { normal: 400, medium: 500, semibold: 600, bold: 700 }
            }
          }
        }

        setConfig(baseConfig)
        setCurrentThemeColors(theme.colors)  // Store theme colors for injection
        setCurrentThemeTypography(theme.typography || null)  // Store theme typography for injection
      }
    }
  }, [selectedTheme, customConfig])

  // Inject complete theme (fonts + CSS variables) dynamically
  useEffect(() => {
    // Remove any existing injected styles
    const existingStyle = document.getElementById('design-system-preview-theme')
    if (existingStyle) {
      existingStyle.remove()
    }

    const { primitives } = config
    const { fontFamilies } = primitives.typography
    const allStyles: string[] = []

    // 1. Generate @font-face rules for custom fonts
    if (fontFamilies.sans.source === 'custom' && fontFamilies.sans.files) {
      fontFamilies.sans.files.forEach((file) => {
        allStyles.push(`
@font-face {
  font-family: '${file.family}';
  src: url('${file.path}') format('${file.format}');
  font-weight: ${file.weight};
  font-style: ${file.style};
  font-display: swap;
}`)
      })
    }

    if (fontFamilies.serif.source === 'custom' && fontFamilies.serif.files) {
      fontFamilies.serif.files.forEach((file) => {
        allStyles.push(`
@font-face {
  font-family: '${file.family}';
  src: url('${file.path}') format('${file.format}');
  font-weight: ${file.weight};
  font-style: ${file.style};
  font-display: swap;
}`)
      })
    }

    if (fontFamilies.mono.source === 'custom' && fontFamilies.mono.files) {
      fontFamilies.mono.files.forEach((file) => {
        allStyles.push(`
@font-face {
  font-family: '${file.family}';
  src: url('${file.path}') format('${file.format}');
  font-weight: ${file.weight};
  font-style: ${file.style};
  font-display: swap;
}`)
      })
    }

    // 2. Generate CSS variables for the preview scope
    // This creates a scoped theme that Tailwind can consume
    const cssVariables: string[] = []

    // Spacing scale (map to Tailwind's spacing scale)
    primitives.spacing.values.forEach((value, index) => {
      const key = index === 0 ? '0' : String(index)
      cssVariables.push(`  --spacing-${key}: ${value / 16}rem;`)
    })

    // Radius scale
    primitives.radius.values
      .filter(v => v !== 9999)
      .forEach((value, index) => {
        const keys = ['none', 'sm', 'DEFAULT', 'md', 'lg', 'xl', '2xl', '3xl']
        const key = keys[index] || String(index)
        cssVariables.push(`  --radius-${key}: ${value / 16}rem;`)
      })
    cssVariables.push(`  --radius-full: 9999px;`)

    // Typography - Font families (use theme typography if available)
    if (currentThemeTypography) {
      // Use typography from predefined theme
      if (currentThemeTypography.fontSans) {
        cssVariables.push(`  --font-sans: ${currentThemeTypography.fontSans};`)
      }
      if (currentThemeTypography.fontSerif) {
        cssVariables.push(`  --font-serif: ${currentThemeTypography.fontSerif};`)
      }
      if (currentThemeTypography.fontMono) {
        cssVariables.push(`  --font-mono: ${currentThemeTypography.fontMono};`)
      }
    } else {
      // Use custom config font families
      cssVariables.push(`  --font-sans: ${fontFamilies.sans.stack};`)
      cssVariables.push(`  --font-serif: ${fontFamilies.serif.stack};`)
      cssVariables.push(`  --font-mono: ${fontFamilies.mono.stack};`)
    }

    // Typography - Font sizes (map to Tailwind scale)
    Object.entries(primitives.typography.typeScale.sizes).forEach(([name, size]) => {
      cssVariables.push(`  --font-size-${name}: ${size};`)
    })

    // Typography - Font weights
    Object.entries(primitives.typography.fontWeights).forEach(([name, weight]) => {
      cssVariables.push(`  --font-weight-${name}: ${weight};`)
    })

    // Typography - Line heights
    Object.entries(primitives.typography.lineHeights).forEach(([name, height]) => {
      cssVariables.push(`  --line-height-${name}: ${height};`)
    })

    // Typography - Letter spacing
    Object.entries(primitives.typography.letterSpacing).forEach(([name, spacing]) => {
      cssVariables.push(`  --letter-spacing-${name}: ${spacing};`)
    })

    // Colors - either from predefined theme or custom config
    if (currentThemeColors) {
      // We're viewing a predefined theme, inject its colors based on theme mode
      const colors = themeMode === 'dark' ? currentThemeColors.dark : currentThemeColors.light

      Object.entries(colors).forEach(([key, value]: [string, any]) => {
        // Convert camelCase to kebab-case for CSS variables
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
        cssVariables.push(`  --${cssKey}: ${value};`)
      })
    } else if (primitives.colors) {
      // We're in custom mode, use ColorSystemConfig based on theme mode
      Object.entries(primitives.colors).forEach(([key, colorPair]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
        const colorConfig = themeMode === 'dark' ? colorPair.dark : colorPair.light
        const oklchValue = getColorValue(colorConfig)
        cssVariables.push(`  --${cssKey}: ${oklchValue};`)
      })
    }

    // Wrap CSS variables in a scoped selector for the preview area
    // We need both the raw variables (--foreground) AND the Tailwind mappings (--color-foreground)
    const tailwindColorMappings = [
      '--color-background: var(--background);',
      '--color-foreground: var(--foreground);',
      '--color-card: var(--card);',
      '--color-card-foreground: var(--card-foreground);',
      '--color-popover: var(--popover);',
      '--color-popover-foreground: var(--popover-foreground);',
      '--color-primary: var(--primary);',
      '--color-primary-foreground: var(--primary-foreground);',
      '--color-secondary: var(--secondary);',
      '--color-secondary-foreground: var(--secondary-foreground);',
      '--color-muted: var(--muted);',
      '--color-muted-foreground: var(--muted-foreground);',
      '--color-accent: var(--accent);',
      '--color-accent-foreground: var(--accent-foreground);',
      '--color-destructive: var(--destructive);',
      '--color-border: var(--border);',
      '--color-input: var(--input);',
      '--color-ring: var(--ring);',
      '--color-chart-1: var(--chart-1);',
      '--color-chart-2: var(--chart-2);',
      '--color-chart-3: var(--chart-3);',
      '--color-chart-4: var(--chart-4);',
      '--color-chart-5: var(--chart-5);',
    ]

    allStyles.push(`
/* Design System Preview Theme */
.design-system-preview {
${cssVariables.join('\n')}
${tailwindColorMappings.map(m => '  ' + m).join('\n')}
  font-family: var(--font-sans);
  color: var(--foreground);
  background-color: var(--background);
}

/* Map Tailwind font classes to preview fonts */
.design-system-preview .font-sans { font-family: var(--font-sans); }
.design-system-preview .font-serif { font-family: var(--font-serif); }
.design-system-preview .font-mono { font-family: var(--font-mono); }
`)

    // Inject all styles
    if (allStyles.length > 0) {
      const styleElement = document.createElement('style')
      styleElement.id = 'design-system-preview-theme'
      styleElement.textContent = allStyles.join('\n')
      document.head.appendChild(styleElement)
    }
  }, [config, currentThemeColors, currentThemeTypography, themeMode])

  // Register header actions in the private header slot
  useEffect(() => {
    setActions(
      <div className="flex items-center divide-x divide-border h-10">
        {/* Theme Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="h-10 px-3 text-xs font-medium hover:bg-accent transition-colors flex items-center gap-1"
              type="button"
            >
              <span>
                {selectedTheme === 'custom'
                  ? 'Custom (Editable)'
                  : `${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} Theme`}
              </span>
              <ChevronRight className="size-3.5 rotate-90" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" side="bottom" className="min-w-10 p-1">
            <button
              className={`w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-accent ${
                selectedTheme === 'custom' ? 'bg-accent/60' : ''
              }`}
              type="button"
              onClick={() => setSelectedTheme('custom')}
            >
              Custom (Editable)
            </button>
            {Object.keys(themes).map((themeName) => (
              <button
                key={themeName}
                type="button"
                onClick={() => setSelectedTheme(themeName)}
                className={`w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-accent ${
                  selectedTheme === themeName ? 'bg-accent/60' : ''
                }`}
              >
                {themeName.charAt(0).toUpperCase() + themeName.slice(1)} Theme
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Light/Dark Mode Toggle */}
        <button
          onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
          className="size-10 flex items-center justify-center hover:bg-accent transition-colors"
          title={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}
        >
          {themeMode === 'light' ? (
            <Moon className="size-3.5" />
          ) : (
            <Sun className="size-3.5" />
          )}
        </button>

        <button
          onClick={() => setShowExport(!showExport)}
          className="px-3 h-10 text-foreground hover:bg-accent transition-colors text-xs font-medium flex items-center"
        >
          <Download className="size-3.5" />
          <span className="sr-only">Export</span>
        </button>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="size-10 hover:bg-accent transition-colors text-sm font-medium flex items-center justify-center"
        >
          {sidebarOpen ? (
            <PanelRightClose className="size-3.5" />
          ) : (
            <PanelRightOpen className="size-3.5" />
          )}
          <span className="sr-only">Toggle sidebar</span>
        </button>
      </div>,
    )

    return () => setActions(null)
  }, [
    setActions,
    selectedTheme,
    themeMode,
    showExport,
    sidebarOpen,
  ])

  return (
    <div className="h-screen flex flex-col">

      {/* Export Modal/Overlay */}
      {showExport && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <div className="bg-background border rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Export Configuration</h2>
              <button
                onClick={() => setShowExport(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <ThemeExport config={config} onBack={() => setShowExport(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={sidebarOpen ? 65 : 100} minSize={30}>
            <PreviewTemplates config={config} />
          </ResizablePanel>

          {sidebarOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
                {selectedTheme === 'custom' ? (
                  <ConfigPanel config={customConfig} onConfigChange={setCustomConfig} />
                ) : (
                  <div className="h-full overflow-auto p-6">
                    <div className="text-center py-12">
                      <p className="text-sm text-muted-foreground mb-4">
                        Viewing <strong>{themes[selectedTheme]?.name || selectedTheme}</strong> theme
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Switch to "Custom (Editable)" to modify the configuration
                      </p>
                    </div>
                  </div>
                )}
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
