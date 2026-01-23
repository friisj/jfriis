'use client'

import { useState } from 'react'
import type { DesignSystemConfig } from './design-system-tool'

interface StructuralCalibrationProps {
  onComplete: (config: DesignSystemConfig) => void
  initialConfig: DesignSystemConfig | null
}

export function StructuralCalibration({ onComplete, initialConfig }: StructuralCalibrationProps) {
  const [spacingScale, setSpacingScale] = useState<'4pt' | '8pt' | 'custom'>(
    initialConfig?.primitives.spacing.scale || '8pt'
  )
  const [radiusStyle, setRadiusStyle] = useState<'sharp' | 'moderate' | 'rounded'>(
    (initialConfig?.primitives.radius.style as 'sharp' | 'moderate' | 'rounded') || 'moderate'
  )
  const [gridColumns, setGridColumns] = useState(initialConfig?.primitives.grid.columns || 12)
  const [gutter, setGutter] = useState(initialConfig?.primitives.grid.gutter || 24)
  const [marginMobile, setMarginMobile] = useState(initialConfig?.primitives.grid.margins.mobile || 16)
  const [marginTablet, setMarginTablet] = useState(initialConfig?.primitives.grid.margins.tablet || 32)
  const [marginDesktop, setMarginDesktop] = useState(initialConfig?.primitives.grid.margins.desktop || 64)
  const [maxWidth, setMaxWidth] = useState(initialConfig?.primitives.grid.maxWidth || 1280)
  const [elevationLevels, setElevationLevels] = useState(initialConfig?.primitives.elevation.levels || 5)
  const [elevationStrategy, setElevationStrategy] = useState<'shadow' | 'border' | 'both'>(
    initialConfig?.primitives.elevation.strategy || 'shadow'
  )

  // Typography state
  const [fontSans, setFontSans] = useState(
    initialConfig?.primitives.typography.fontFamilies.sans || 'Soehne, system-ui, sans-serif'
  )
  const [fontSerif, setFontSerif] = useState(
    initialConfig?.primitives.typography.fontFamilies.serif || 'Untitled Serif, Georgia, serif'
  )
  const [fontMono, setFontMono] = useState(
    initialConfig?.primitives.typography.fontFamilies.mono || 'Soehne Mono, Courier New, monospace'
  )
  const [typeScaleBase, setTypeScaleBase] = useState(
    initialConfig?.primitives.typography.typeScale.base || 16
  )
  const [typeScaleRatio, setTypeScaleRatio] = useState(
    initialConfig?.primitives.typography.typeScale.ratio || 1.25
  )
  const [lineHeightTight, setLineHeightTight] = useState(
    initialConfig?.primitives.typography.lineHeights.tight || 1.25
  )
  const [lineHeightNormal, setLineHeightNormal] = useState(
    initialConfig?.primitives.typography.lineHeights.normal || 1.5
  )
  const [lineHeightRelaxed, setLineHeightRelaxed] = useState(
    initialConfig?.primitives.typography.lineHeights.relaxed || 1.75
  )

  const generateTypeScale = (base: number, ratio: number) => {
    const sizes: Record<string, string> = {}
    const steps = {
      'xs': -2,
      'sm': -1,
      'base': 0,
      'lg': 1,
      'xl': 2,
      '2xl': 3,
      '3xl': 4,
      '4xl': 5,
      '5xl': 6,
      '6xl': 7,
      '7xl': 8,
      '8xl': 9,
      '9xl': 10
    }

    Object.entries(steps).forEach(([name, step]) => {
      const size = base * Math.pow(ratio, step)
      sizes[name] = `${(size / 16).toFixed(4)}rem`
    })

    return sizes
  }

  const generateConfig = (): DesignSystemConfig => {
    // Generate spacing values based on scale
    const spacingValues = spacingScale === '8pt'
      ? [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128]
      : spacingScale === '4pt'
      ? [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128]
      : [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128] // custom starts same as 8pt

    // Generate radius values based on style
    const radiusValues = radiusStyle === 'sharp'
      ? [0, 2, 4, 8, 9999]
      : radiusStyle === 'moderate'
      ? [0, 4, 8, 12, 16, 9999]
      : [0, 8, 12, 16, 24, 32, 9999] // rounded

    return ({
      primitives: {
        spacing: {
          scale: spacingScale,
          values: spacingValues
        },
        radius: {
          style: radiusStyle,
          values: radiusValues
        },
        grid: {
          columns: gridColumns,
          gutter,
          margins: {
            mobile: marginMobile,
            tablet: marginTablet,
            desktop: marginDesktop
          },
          maxWidth
        },
        breakpoints: {
          sm: 640,
          md: 768,
          lg: 1024,
          xl: 1280,
          '2xl': 1536
        },
        elevation: {
          levels: elevationLevels,
          strategy: elevationStrategy
        },
        typography: {
          fontFamilies: {
            sans: fontSans as any,
            serif: fontSerif as any,
            mono: fontMono as any
          },
          typeScale: {
            base: typeScaleBase,
            ratio: typeScaleRatio,
            sizes: generateTypeScale(typeScaleBase, typeScaleRatio)
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
            tight: lineHeightTight,
            normal: lineHeightNormal,
            relaxed: lineHeightRelaxed
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
    } as any)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const config = generateConfig()
    onComplete(config)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      {/* Spacing Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Spacing System</h2>
          <p className="text-sm text-muted-foreground">
            Define the spatial rhythm and scale for your design system
          </p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium mb-3 block">Spacing Scale</span>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSpacingScale('4pt')}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  spacingScale === '4pt'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-medium mb-1">4pt Grid</div>
                <div className="text-xs text-muted-foreground">Fine-grained control</div>
                <div className="text-xs text-muted-foreground mt-2">4, 8, 12, 16, 20...</div>
              </button>

              <button
                type="button"
                onClick={() => setSpacingScale('8pt')}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  spacingScale === '8pt'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-medium mb-1">8pt Grid</div>
                <div className="text-xs text-muted-foreground">Recommended</div>
                <div className="text-xs text-muted-foreground mt-2">8, 16, 24, 32...</div>
              </button>

              <button
                type="button"
                onClick={() => setSpacingScale('custom')}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  spacingScale === 'custom'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-medium mb-1">Custom</div>
                <div className="text-xs text-muted-foreground">Define your own</div>
                <div className="text-xs text-muted-foreground mt-2">Advanced</div>
              </button>
            </div>
          </label>
        </div>
      </section>

      {/* Border Radius Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Border Radius</h2>
          <p className="text-sm text-muted-foreground">
            Visual softness and corner treatment
          </p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium mb-3 block">Radius Style</span>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setRadiusStyle('sharp')}
                className={`p-4 border rounded-none text-left transition-colors ${
                  radiusStyle === 'sharp'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-medium mb-1">Sharp</div>
                <div className="text-xs text-muted-foreground">0-4px</div>
                <div className="text-xs text-muted-foreground mt-2">Technical, precise</div>
              </button>

              <button
                type="button"
                onClick={() => setRadiusStyle('moderate')}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  radiusStyle === 'moderate'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-medium mb-1">Moderate</div>
                <div className="text-xs text-muted-foreground">4-16px</div>
                <div className="text-xs text-muted-foreground mt-2">Balanced, modern</div>
              </button>

              <button
                type="button"
                onClick={() => setRadiusStyle('rounded')}
                className={`p-4 border rounded-2xl text-left transition-colors ${
                  radiusStyle === 'rounded'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-medium mb-1">Rounded</div>
                <div className="text-xs text-muted-foreground">8-32px</div>
                <div className="text-xs text-muted-foreground mt-2">Friendly, soft</div>
              </button>
            </div>
          </label>
        </div>
      </section>

      {/* Grid Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Layout Grid</h2>
          <p className="text-sm text-muted-foreground">
            Column system and container configuration
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <label className="block">
            <span className="text-sm font-medium mb-2 block">Columns</span>
            <select
              value={gridColumns}
              onChange={(e) => setGridColumns(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg bg-background"
            >
              <option value={12}>12 columns (standard)</option>
              <option value={16}>16 columns (detailed)</option>
              <option value={8}>8 columns (simple)</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium mb-2 block">Gutter (px)</span>
            <input
              type="number"
              value={gutter}
              onChange={(e) => setGutter(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg bg-background"
              min={8}
              max={64}
              step={4}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium mb-2 block">Mobile Margin (px)</span>
            <input
              type="number"
              value={marginMobile}
              onChange={(e) => setMarginMobile(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg bg-background"
              min={8}
              max={64}
              step={4}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium mb-2 block">Tablet Margin (px)</span>
            <input
              type="number"
              value={marginTablet}
              onChange={(e) => setMarginTablet(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg bg-background"
              min={16}
              max={96}
              step={8}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium mb-2 block">Desktop Margin (px)</span>
            <input
              type="number"
              value={marginDesktop}
              onChange={(e) => setMarginDesktop(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg bg-background"
              min={32}
              max={128}
              step={8}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium mb-2 block">Max Container Width (px)</span>
            <input
              type="number"
              value={maxWidth}
              onChange={(e) => setMaxWidth(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg bg-background"
              min={1024}
              max={1920}
              step={64}
            />
          </label>
        </div>
      </section>

      {/* Elevation Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Elevation & Depth</h2>
          <p className="text-sm text-muted-foreground">
            Surface hierarchy and layering strategy
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <label className="block">
            <span className="text-sm font-medium mb-2 block">Elevation Levels</span>
            <select
              value={elevationLevels}
              onChange={(e) => setElevationLevels(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg bg-background"
            >
              <option value={3}>3 levels (simple)</option>
              <option value={5}>5 levels (standard)</option>
              <option value={7}>7 levels (detailed)</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium mb-2 block">Strategy</span>
            <select
              value={elevationStrategy}
              onChange={(e) => setElevationStrategy(e.target.value as 'shadow' | 'border' | 'both')}
              className="w-full px-3 py-2 border rounded-lg bg-background"
            >
              <option value="shadow">Shadows only</option>
              <option value="border">Borders only</option>
              <option value="both">Shadows + Borders</option>
            </select>
          </label>
        </div>
      </section>

      {/* Typography Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Typography System</h2>
          <p className="text-sm text-muted-foreground">
            Font families, type scale, and text styling
          </p>
        </div>

        {/* Font Families */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Font Families</h3>
          <div className="grid grid-cols-1 gap-4">
            <label className="block">
              <span className="text-sm font-medium mb-2 block">Sans Serif</span>
              <input
                type="text"
                value={fontSans as any}
                onChange={(e) => setFontSans(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background font-mono text-sm"
                placeholder="Inter, system-ui, sans-serif"
              />
              <span className="text-xs text-muted-foreground mt-1 block">
                UI text, body copy, headings
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-medium mb-2 block">Serif</span>
              <input
                type="text"
                value={fontSerif as any}
                onChange={(e) => setFontSerif(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background font-mono text-sm"
                placeholder="Georgia, serif"
              />
              <span className="text-xs text-muted-foreground mt-1 block">
                Editorial content, formal text
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-medium mb-2 block">Monospace</span>
              <input
                type="text"
                value={fontMono as any}
                onChange={(e) => setFontMono(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background font-mono text-sm"
                placeholder="Courier New, monospace"
              />
              <span className="text-xs text-muted-foreground mt-1 block">
                Code blocks, technical content
              </span>
            </label>
          </div>
        </div>

        {/* Type Scale */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Type Scale</h3>
          <div className="grid grid-cols-2 gap-6">
            <label className="block">
              <span className="text-sm font-medium mb-2 block">Base Size (px)</span>
              <input
                type="number"
                value={typeScaleBase}
                onChange={(e) => setTypeScaleBase(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg bg-background"
                min={12}
                max={20}
                step={1}
              />
              <span className="text-xs text-muted-foreground mt-1 block">
                Typically 16px (1rem)
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-medium mb-2 block">Scale Ratio</span>
              <select
                value={typeScaleRatio}
                onChange={(e) => setTypeScaleRatio(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg bg-background"
              >
                <option value={1.2}>1.200 - Minor Third</option>
                <option value={1.25}>1.250 - Major Third</option>
                <option value={1.333}>1.333 - Perfect Fourth</option>
                <option value={1.414}>1.414 - Augmented Fourth</option>
                <option value={1.5}>1.500 - Perfect Fifth</option>
                <option value={1.618}>1.618 - Golden Ratio</option>
              </select>
              <span className="text-xs text-muted-foreground mt-1 block">
                Multiplier for each step in scale
              </span>
            </label>
          </div>
        </div>

        {/* Line Heights */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Line Heights</h3>
          <div className="grid grid-cols-3 gap-6">
            <label className="block">
              <span className="text-sm font-medium mb-2 block">Tight</span>
              <input
                type="number"
                value={lineHeightTight}
                onChange={(e) => setLineHeightTight(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg bg-background"
                min={1}
                max={2}
                step={0.05}
              />
              <span className="text-xs text-muted-foreground mt-1 block">
                Headings (1.25)
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-medium mb-2 block">Normal</span>
              <input
                type="number"
                value={lineHeightNormal}
                onChange={(e) => setLineHeightNormal(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg bg-background"
                min={1}
                max={2}
                step={0.05}
              />
              <span className="text-xs text-muted-foreground mt-1 block">
                Body text (1.5)
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-medium mb-2 block">Relaxed</span>
              <input
                type="number"
                value={lineHeightRelaxed}
                onChange={(e) => setLineHeightRelaxed(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg bg-background"
                min={1}
                max={2.5}
                step={0.05}
              />
              <span className="text-xs text-muted-foreground mt-1 block">
                Long-form (1.75)
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* Submit */}
      <div className="flex items-center gap-4 pt-6 border-t">
        <button
          type="submit"
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          Generate Configuration
        </button>
        <p className="text-sm text-muted-foreground">
          Creates structural primitives and semantic tokens
        </p>
      </div>
    </form>
  )
}
