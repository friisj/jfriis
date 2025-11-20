'use client'

import { useState } from 'react'
import { PreviewTemplates } from './preview-templates'
import { ConfigPanel } from './config-panel'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { ChevronRight, Download } from 'lucide-react'
import { ThemeExport } from './theme-export'

import type { FontWeight } from '@/lib/fonts/font-scanner'

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
            name: 'Soehne',
            stack: 'Soehne, system-ui, sans-serif',
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
            name: 'Untitled Serif',
            stack: 'Untitled Serif, Georgia, serif',
            source: 'custom',
            weights: {
              normal: 400,
              medium: 500,
              bold: 700
            }
          },
          mono: {
            name: 'Soehne Mono',
            stack: 'Soehne Mono, Courier New, monospace',
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
  const [config, setConfig] = useState<DesignSystemConfig>(getDefaultConfig())
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showExport, setShowExport] = useState(false)

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
                <ConfigPanel config={config} onConfigChange={setConfig} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
