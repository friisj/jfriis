'use client'

import { useState, useEffect } from 'react'
import { PreviewTemplates } from './preview-templates'
import { ConfigPanel } from './config-panel'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { ChevronRight, Download, Sun, Moon } from 'lucide-react'
import { ThemeExport } from './theme-export'
import { themes } from '@/lib/themes/theme-config'
import { getColorValue } from '@/lib/tailwind-colors'

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

        // Use system fonts (predefined themes don't have custom fonts)
        baseConfig.primitives.typography.fontFamilies.sans = {
          name: 'system-ui',
          stack: 'system-ui, -apple-system, sans-serif',
          source: 'system',
          weights: { normal: 400, medium: 500, semibold: 600, bold: 700 }
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
    allStyles.push(`
/* Design System Preview Theme */
.design-system-preview {
${cssVariables.join('\n')}
}

/* Override Tailwind's default theme within preview */
.design-system-preview {
  font-family: var(--font-sans);
}

/* Theme-aware utility classes for preview */
.design-system-preview .theme-text-xs { font-size: var(--font-size-xs); }
.design-system-preview .theme-text-sm { font-size: var(--font-size-sm); }
.design-system-preview .theme-text-base { font-size: var(--font-size-base); }
.design-system-preview .theme-text-lg { font-size: var(--font-size-lg); }
.design-system-preview .theme-text-xl { font-size: var(--font-size-xl); }
.design-system-preview .theme-text-2xl { font-size: var(--font-size-2xl); }
.design-system-preview .theme-text-3xl { font-size: var(--font-size-3xl); }
.design-system-preview .theme-text-4xl { font-size: var(--font-size-4xl); }
.design-system-preview .theme-text-5xl { font-size: var(--font-size-5xl); }

.design-system-preview .theme-font-sans { font-family: var(--font-sans); }
.design-system-preview .theme-font-serif { font-family: var(--font-serif); }
.design-system-preview .theme-font-mono { font-family: var(--font-mono); }

.design-system-preview .theme-p-1 { padding: var(--spacing-1); }
.design-system-preview .theme-p-2 { padding: var(--spacing-2); }
.design-system-preview .theme-p-3 { padding: var(--spacing-3); }
.design-system-preview .theme-p-4 { padding: var(--spacing-4); }
.design-system-preview .theme-p-6 { padding: var(--spacing-6); }
.design-system-preview .theme-p-8 { padding: var(--spacing-8); }

.design-system-preview .theme-rounded { border-radius: var(--radius-DEFAULT); }
.design-system-preview .theme-rounded-sm { border-radius: var(--radius-sm); }
.design-system-preview .theme-rounded-md { border-radius: var(--radius-md); }
.design-system-preview .theme-rounded-lg { border-radius: var(--radius-lg); }
.design-system-preview .theme-rounded-xl { border-radius: var(--radius-xl); }
.design-system-preview .theme-rounded-full { border-radius: var(--radius-full); }

.design-system-preview .theme-gap-2 { gap: var(--spacing-2); }
.design-system-preview .theme-gap-3 { gap: var(--spacing-3); }
.design-system-preview .theme-gap-4 { gap: var(--spacing-4); }
.design-system-preview .theme-gap-6 { gap: var(--spacing-6); }

.design-system-preview .theme-space-y-2 > * + * { margin-top: var(--spacing-2); }
.design-system-preview .theme-space-y-3 > * + * { margin-top: var(--spacing-3); }
.design-system-preview .theme-space-y-4 > * + * { margin-top: var(--spacing-4); }
.design-system-preview .theme-space-y-6 > * + * { margin-top: var(--spacing-6); }
`)

    // Inject all styles
    if (allStyles.length > 0) {
      const styleElement = document.createElement('style')
      styleElement.id = 'design-system-preview-theme'
      styleElement.textContent = allStyles.join('\n')
      document.head.appendChild(styleElement)
    }
  }, [config, currentThemeColors, currentThemeTypography, themeMode])

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Design System Tool</h1>
          <p className="text-sm text-muted-foreground">
            Live preview with structural configuration
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Theme Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="theme-select" className="text-sm text-muted-foreground">
              Compare:
            </label>
            <select
              id="theme-select"
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-background text-sm font-medium hover:bg-accent transition-colors"
            >
              <option value="custom">Custom (Editable)</option>
              {Object.keys(themes).map((themeName) => (
                <option key={themeName} value={themeName}>
                  {themeName.charAt(0).toUpperCase() + themeName.slice(1)} Theme
                </option>
              ))}
            </select>
          </div>

          {/* Light/Dark Mode Toggle */}
          <button
            onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
            className="p-2 border rounded-lg hover:bg-accent transition-colors"
            title={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}
          >
            {themeMode === 'light' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => setShowExport(!showExport)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors text-sm font-medium flex items-center gap-2"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
            {sidebarOpen ? 'Hide' : 'Show'} Config
          </button>
        </div>
      </div>

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
