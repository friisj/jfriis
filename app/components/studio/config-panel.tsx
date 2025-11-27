'use client'

import { useState } from 'react'
import type { DesignSystemConfig, MotionMode, MotionProfile } from './design-system-tool'
import { FontFamilySelector } from './font-family-selector'
import { ColorPairSelector } from './color-selector'
import type { ScaleShade } from '@/lib/tailwind-colors'
import { generateStyledPalette, type SeedColor, type PaletteStyle } from '@/lib/palette-generator'
import { OklchPicker } from './oklch-picker'

interface ConfigPanelProps {
  config: DesignSystemConfig
  onConfigChange: (config: DesignSystemConfig) => void
}

type Section = 'spacing' | 'radius' | 'grid' | 'elevation' | 'typography' | 'colors' | 'motion' | 'interactions'

export function ConfigPanel({ config, onConfigChange }: ConfigPanelProps) {
  const [activeSection, setActiveSection] = useState<Section>('spacing')

  const updateConfig = (updates: Partial<DesignSystemConfig>) => {
    const newConfig = { ...config, ...updates }
    // Regenerate semantic tokens when primitives change
    if (updates.primitives) {
      const primitives = { ...config.primitives, ...updates.primitives }
      const spacingValues = primitives.spacing.values
      const radiusValues = primitives.radius.values

      newConfig.semantic = {
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
    onConfigChange(newConfig)
  }

  const sections: { id: Section; label: string }[] = [
    { id: 'spacing', label: 'Spacing' },
    { id: 'radius', label: 'Radius' },
    { id: 'colors', label: 'Colors' },
    { id: 'grid', label: 'Grid' },
    { id: 'elevation', label: 'Elevation' },
    { id: 'typography', label: 'Typography' },
    { id: 'motion', label: 'Motion' },
    { id: 'interactions', label: 'Interactions' }
  ]

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Section Tabs */}
      <div className="border-b bg-background p-3">
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-3 h-8 rounded-md text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Config Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeSection === 'spacing' && (
          <SpacingConfig config={config} updateConfig={updateConfig} />
        )}
        {activeSection === 'radius' && (
          <RadiusConfig config={config} updateConfig={updateConfig} />
        )}
        {activeSection === 'colors' && (
          <ColorConfig config={config} updateConfig={updateConfig} />
        )}
        {activeSection === 'grid' && (
          <GridConfig config={config} updateConfig={updateConfig} />
        )}
        {activeSection === 'elevation' && (
          <ElevationConfig config={config} updateConfig={updateConfig} />
        )}
        {activeSection === 'typography' && (
          <TypographyConfig config={config} updateConfig={updateConfig} />
        )}
        {activeSection === 'motion' && (
          <MotionConfig config={config} updateConfig={updateConfig} />
        )}
        {activeSection === 'interactions' && (
          <InteractionsConfig config={config} updateConfig={updateConfig} />
        )}
      </div>
    </div>
  )
}

function SpacingConfig({
  config,
  updateConfig
}: {
  config: DesignSystemConfig
  updateConfig: (updates: Partial<DesignSystemConfig>) => void
}) {
  const setSpacingScale = (scale: '4pt' | '8pt' | 'custom') => {
    const spacingValues =
      scale === '8pt'
        ? [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128]
        : scale === '4pt'
        ? [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128]
        : [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128]

    updateConfig({
      primitives: {
        ...config.primitives,
        spacing: { scale, values: spacingValues }
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">Spacing Scale</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Define the spatial rhythm for your design system
        </p>
      </div>

      <div className="space-y-3">
        {(['4pt', '8pt', 'custom'] as const).map((scale) => (
          <button
            key={scale}
            type="button"
            onClick={() => setSpacingScale(scale)}
            className={`w-full p-4 border rounded-lg text-left transition-colors ${
              config.primitives.spacing.scale === scale
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="font-medium mb-1">
              {scale === '4pt' ? '4pt Grid' : scale === '8pt' ? '8pt Grid' : 'Custom'}
            </div>
            <div className="text-xs text-muted-foreground">
              {scale === '4pt'
                ? 'Fine-grained control: 4, 8, 12, 16, 20...'
                : scale === '8pt'
                ? 'Recommended: 8, 16, 24, 32...'
                : 'Define your own scale'}
            </div>
          </button>
        ))}
      </div>

      <div>
        <div className="text-sm font-medium mb-3">Current Scale</div>
        <div className="space-y-1">
          {config.primitives.spacing.values.slice(0, 9).map((value) => (
            <div key={value} className="flex items-center gap-2 text-xs">
              <div className="w-12 text-muted-foreground font-mono">{value}px</div>
              <div
                className="bg-primary/30 h-4 rounded-sm"
                style={{ width: `${Math.min(value * 2, 200)}px` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RadiusConfig({
  config,
  updateConfig
}: {
  config: DesignSystemConfig
  updateConfig: (updates: Partial<DesignSystemConfig>) => void
}) {
  const setRadiusStyle = (style: 'sharp' | 'moderate' | 'rounded') => {
    const radiusValues =
      style === 'sharp'
        ? [0, 2, 4, 8, 9999]
        : style === 'moderate'
        ? [0, 4, 8, 12, 16, 9999]
        : [0, 8, 12, 16, 24, 32, 9999]

    updateConfig({
      primitives: {
        ...config.primitives,
        radius: { style, values: radiusValues }
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">Border Radius</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Visual softness and corner treatment
        </p>
      </div>

      <div className="space-y-3">
        {(['sharp', 'moderate', 'rounded'] as const).map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => setRadiusStyle(style)}
            className={`w-full p-4 border text-left transition-colors ${
              config.primitives.radius.style === style
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            } ${style === 'sharp' ? 'rounded-none' : style === 'moderate' ? 'rounded-lg' : 'rounded-2xl'}`}
          >
            <div className="font-medium mb-1 capitalize">{style}</div>
            <div className="text-xs text-muted-foreground">
              {style === 'sharp'
                ? '0-4px: Technical, precise'
                : style === 'moderate'
                ? '4-16px: Balanced, modern'
                : '8-32px: Friendly, soft'}
            </div>
          </button>
        ))}
      </div>

      <div>
        <div className="text-sm font-medium mb-3">Current Radius Values</div>
        <div className="flex flex-wrap gap-3">
          {config.primitives.radius.values.filter((v) => v !== 9999).map((value) => (
            <div key={value} className="text-center">
              <div
                className="w-16 h-16 bg-primary/30 border border-primary/50 mb-1"
                style={{ borderRadius: `${value}px` }}
              />
              <div className="text-xs text-muted-foreground font-mono">{value}px</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function GridConfig({
  config,
  updateConfig
}: {
  config: DesignSystemConfig
  updateConfig: (updates: Partial<DesignSystemConfig>) => void
}) {
  const updateGrid = (key: string, value: number) => {
    const keys = key.split('.')
    const newGrid = { ...config.primitives.grid }

    if (keys.length === 1) {
      // @ts-ignore
      newGrid[keys[0]] = value
    } else {
      // @ts-ignore
      newGrid[keys[0]] = { ...newGrid[keys[0]], [keys[1]]: value }
    }

    updateConfig({
      primitives: { ...config.primitives, grid: newGrid }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">Layout Grid</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Column system and container configuration
        </p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium mb-2 block">Columns</span>
          <select
            value={config.primitives.grid.columns}
            onChange={(e) => updateGrid('columns', Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg bg-background"
          >
            <option value={8}>8 columns</option>
            <option value={12}>12 columns</option>
            <option value={16}>16 columns</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium mb-2 block">Gutter (px)</span>
          <input
            type="number"
            value={config.primitives.grid.gutter}
            onChange={(e) => updateGrid('gutter', Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg bg-background"
            min={8}
            max={64}
            step={4}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium mb-2 block">Max Width (px)</span>
          <input
            type="number"
            value={config.primitives.grid.maxWidth}
            onChange={(e) => updateGrid('maxWidth', Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg bg-background"
            min={1024}
            max={1920}
            step={64}
          />
        </label>

        <div className="border-t pt-4 mt-4">
          <div className="text-sm font-medium mb-3">Margins</div>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-muted-foreground mb-1 block">Mobile (px)</span>
              <input
                type="number"
                value={config.primitives.grid.margins.mobile}
                onChange={(e) => updateGrid('margins.mobile', Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                min={8}
                max={64}
                step={4}
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground mb-1 block">Tablet (px)</span>
              <input
                type="number"
                value={config.primitives.grid.margins.tablet}
                onChange={(e) => updateGrid('margins.tablet', Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                min={16}
                max={96}
                step={8}
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground mb-1 block">Desktop (px)</span>
              <input
                type="number"
                value={config.primitives.grid.margins.desktop}
                onChange={(e) => updateGrid('margins.desktop', Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                min={32}
                max={128}
                step={8}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

function ElevationConfig({
  config,
  updateConfig
}: {
  config: DesignSystemConfig
  updateConfig: (updates: Partial<DesignSystemConfig>) => void
}) {
  const updateElevation = (
    key: 'levels' | 'strategy',
    value: number | 'shadow' | 'border' | 'both'
  ) => {
    updateConfig({
      primitives: {
        ...config.primitives,
        elevation: { ...config.primitives.elevation, [key]: value }
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">Elevation & Depth</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Surface hierarchy and layering strategy
        </p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium mb-2 block">Elevation Levels</span>
          <select
            value={config.primitives.elevation.levels}
            onChange={(e) => updateElevation('levels', Number(e.target.value))}
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
            value={config.primitives.elevation.strategy}
            onChange={(e) =>
              updateElevation('strategy', e.target.value as 'shadow' | 'border' | 'both')
            }
            className="w-full px-3 py-2 border rounded-lg bg-background"
          >
            <option value="shadow">Shadows only</option>
            <option value="border">Borders only</option>
            <option value="both">Shadows + Borders</option>
          </select>
        </label>
      </div>
    </div>
  )
}

function TypographyConfig({
  config,
  updateConfig
}: {
  config: DesignSystemConfig
  updateConfig: (updates: Partial<DesignSystemConfig>) => void
}) {
  const generateTypeScale = (base: number, ratio: number) => {
    const sizes: Record<string, string> = {}
    const steps = {
      xs: -2,
      sm: -1,
      base: 0,
      lg: 1,
      xl: 2,
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

  const updateTypography = (updates: Partial<typeof config.primitives.typography>) => {
    const newTypography = { ...config.primitives.typography, ...updates }

    // Regenerate type scale if base or ratio changed
    if (updates.typeScale) {
      newTypography.typeScale = {
        ...newTypography.typeScale,
        ...updates.typeScale,
        sizes: generateTypeScale(
          updates.typeScale.base ?? newTypography.typeScale.base,
          updates.typeScale.ratio ?? newTypography.typeScale.ratio
        )
      }
    }

    updateConfig({
      primitives: { ...config.primitives, typography: newTypography }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">Typography System</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Font families, type scale, and text styling
        </p>
      </div>

      <div className="space-y-4">
        <FontFamilySelector
          role="sans"
          value={config.primitives.typography.fontFamilies.sans}
          onChange={(fontConfig) =>
            updateTypography({
              fontFamilies: { ...config.primitives.typography.fontFamilies, sans: fontConfig }
            })
          }
        />

        <FontFamilySelector
          role="serif"
          value={config.primitives.typography.fontFamilies.serif}
          onChange={(fontConfig) =>
            updateTypography({
              fontFamilies: { ...config.primitives.typography.fontFamilies, serif: fontConfig }
            })
          }
        />

        <FontFamilySelector
          role="mono"
          value={config.primitives.typography.fontFamilies.mono}
          onChange={(fontConfig) =>
            updateTypography({
              fontFamilies: { ...config.primitives.typography.fontFamilies, mono: fontConfig }
            })
          }
        />

        <div className="border-t pt-4 mt-4">
          <div className="text-sm font-medium mb-3">Type Scale</div>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-muted-foreground mb-1 block">Base Size (px)</span>
              <input
                type="number"
                value={config.primitives.typography.typeScale.base}
                onChange={(e) =>
                  updateTypography({
                    typeScale: { ...config.primitives.typography.typeScale, base: Number(e.target.value) }
                  })
                }
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                min={12}
                max={20}
                step={1}
              />
            </label>

            <label className="block">
              <span className="text-xs text-muted-foreground mb-1 block">Scale Ratio</span>
              <select
                value={config.primitives.typography.typeScale.ratio}
                onChange={(e) =>
                  updateTypography({
                    typeScale: {
                      ...config.primitives.typography.typeScale,
                      ratio: Number(e.target.value)
                    }
                  })
                }
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
              >
                <option value={1.2}>1.200 - Minor Third</option>
                <option value={1.25}>1.250 - Major Third</option>
                <option value={1.333}>1.333 - Perfect Fourth</option>
                <option value={1.414}>1.414 - Augmented Fourth</option>
                <option value={1.5}>1.500 - Perfect Fifth</option>
                <option value={1.618}>1.618 - Golden Ratio</option>
              </select>
            </label>
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="text-sm font-medium mb-3">Line Heights</div>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-muted-foreground mb-1 block">Tight</span>
              <input
                type="number"
                value={config.primitives.typography.lineHeights.tight}
                onChange={(e) =>
                  updateTypography({
                    lineHeights: {
                      ...config.primitives.typography.lineHeights,
                      tight: Number(e.target.value)
                    }
                  })
                }
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                min={1}
                max={2}
                step={0.05}
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground mb-1 block">Normal</span>
              <input
                type="number"
                value={config.primitives.typography.lineHeights.normal}
                onChange={(e) =>
                  updateTypography({
                    lineHeights: {
                      ...config.primitives.typography.lineHeights,
                      normal: Number(e.target.value)
                    }
                  })
                }
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                min={1}
                max={2}
                step={0.05}
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground mb-1 block">Relaxed</span>
              <input
                type="number"
                value={config.primitives.typography.lineHeights.relaxed}
                onChange={(e) =>
                  updateTypography({
                    lineHeights: {
                      ...config.primitives.typography.lineHeights,
                      relaxed: Number(e.target.value)
                    }
                  })
                }
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                min={1}
                max={2.5}
                step={0.05}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

function ColorConfig({
  config,
  updateConfig
}: {
  config: DesignSystemConfig
  updateConfig: (updates: Partial<DesignSystemConfig>) => void
}) {
  const [brandColor, setBrandColor] = useState<SeedColor>({ l: 50, c: 0.2, h: 240 })
  const [paletteStyle, setPaletteStyle] = useState<PaletteStyle>('complementary')

  const updateColor = (
    colorKey: keyof typeof config.primitives.colors,
    light: ScaleShade,
    dark: ScaleShade
  ) => {
    updateConfig({
      primitives: {
        ...config.primitives,
        colors: {
          ...config.primitives.colors,
          [colorKey]: { light, dark }
        }
      }
    })
  }

  const handleGeneratePalette = () => {
    const generatedColors = generateStyledPalette(brandColor, paletteStyle)
    updateConfig({
      primitives: {
        ...config.primitives,
        colors: generatedColors
      }
    })
  }

  // Format OKLCH for display
  const formatOklch = (l: number, c: number, h: number) =>
    `oklch(${(l / 100).toFixed(2)} ${c.toFixed(3)} ${h.toFixed(0)})`

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">Color System</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Generate a palette from brand colors or customize individual colors
        </p>
      </div>

      {/* Palette Generator */}
      <div className="p-4 border rounded-lg bg-card space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-1">Generate from Brand Color</h4>
          <p className="text-xs text-muted-foreground">
            Pick your primary brand color and choose a palette style
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Brand Color Picker */}
          <div className="space-y-2">
            <label className="text-xs font-medium">Brand Color</label>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-10 h-10 rounded-md border shadow-sm"
                style={{ backgroundColor: formatOklch(brandColor.l, brandColor.c, brandColor.h) }}
              />
              <span className="text-xs font-mono text-muted-foreground">
                {formatOklch(brandColor.l, brandColor.c, brandColor.h)}
              </span>
            </div>
            <OklchPicker
              l={brandColor.l}
              c={brandColor.c}
              h={brandColor.h}
              onChange={(l, c, h) => setBrandColor({ l, c, h })}
            />
          </div>

          {/* Palette Style */}
          <div className="space-y-2">
            <label className="text-xs font-medium">Palette Style</label>
            <div className="space-y-2">
              {([
                { value: 'complementary', label: 'Complementary', desc: 'Balanced contrast' },
                { value: 'vibrant', label: 'Vibrant', desc: 'High energy' },
                { value: 'muted', label: 'Muted', desc: 'Subtle & soft' },
                { value: 'monochrome', label: 'Monochrome', desc: 'Single hue' },
              ] as const).map((style) => (
                <button
                  key={style.value}
                  onClick={() => setPaletteStyle(style.value)}
                  className={`w-full text-left px-3 py-2 text-sm border rounded transition-colors ${
                    paletteStyle === style.value
                      ? 'border-primary bg-primary/10'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="font-medium">{style.label}</div>
                  <div className="text-xs text-muted-foreground">{style.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleGeneratePalette}
          className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Generate Palette
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 border-t" />
        <span className="text-xs text-muted-foreground">or customize individually</span>
        <div className="flex-1 border-t" />
      </div>

      <div className="space-y-4">
        <ColorPairSelector
          light={config.primitives.colors.background.light}
          dark={config.primitives.colors.background.dark}
          onChange={(light, dark) => updateColor('background', light, dark)}
          label="Background"
          description="Main background color for pages and surfaces"
        />

        <ColorPairSelector
          light={config.primitives.colors.foreground.light}
          dark={config.primitives.colors.foreground.dark}
          onChange={(light, dark) => updateColor('foreground', light, dark)}
          label="Foreground"
          description="Primary text color"
        />

        <ColorPairSelector
          light={config.primitives.colors.card.light}
          dark={config.primitives.colors.card.dark}
          onChange={(light, dark) => updateColor('card', light, dark)}
          label="Card"
          description="Background color for cards and elevated surfaces"
        />

        <ColorPairSelector
          light={config.primitives.colors.cardForeground.light}
          dark={config.primitives.colors.cardForeground.dark}
          onChange={(light, dark) => updateColor('cardForeground', light, dark)}
          label="Card Foreground"
          description="Text color on cards"
        />

        <ColorPairSelector
          light={config.primitives.colors.primary.light}
          dark={config.primitives.colors.primary.dark}
          onChange={(light, dark) => updateColor('primary', light, dark)}
          label="Primary"
          description="Primary brand color for buttons and interactive elements"
        />

        <ColorPairSelector
          light={config.primitives.colors.primaryForeground.light}
          dark={config.primitives.colors.primaryForeground.dark}
          onChange={(light, dark) => updateColor('primaryForeground', light, dark)}
          label="Primary Foreground"
          description="Text color on primary colored elements"
        />

        <ColorPairSelector
          light={config.primitives.colors.secondary.light}
          dark={config.primitives.colors.secondary.dark}
          onChange={(light, dark) => updateColor('secondary', light, dark)}
          label="Secondary"
          description="Secondary actions and less prominent elements"
        />

        <ColorPairSelector
          light={config.primitives.colors.secondaryForeground.light}
          dark={config.primitives.colors.secondaryForeground.dark}
          onChange={(light, dark) => updateColor('secondaryForeground', light, dark)}
          label="Secondary Foreground"
          description="Text color on secondary elements"
        />

        <ColorPairSelector
          light={config.primitives.colors.muted.light}
          dark={config.primitives.colors.muted.dark}
          onChange={(light, dark) => updateColor('muted', light, dark)}
          label="Muted"
          description="Subtle background color for hover states"
        />

        <ColorPairSelector
          light={config.primitives.colors.mutedForeground.light}
          dark={config.primitives.colors.mutedForeground.dark}
          onChange={(light, dark) => updateColor('mutedForeground', light, dark)}
          label="Muted Foreground"
          description="Muted/secondary text color"
        />

        <ColorPairSelector
          light={config.primitives.colors.accent.light}
          dark={config.primitives.colors.accent.dark}
          onChange={(light, dark) => updateColor('accent', light, dark)}
          label="Accent"
          description="Accent color for highlights and focus states"
        />

        <ColorPairSelector
          light={config.primitives.colors.accentForeground.light}
          dark={config.primitives.colors.accentForeground.dark}
          onChange={(light, dark) => updateColor('accentForeground', light, dark)}
          label="Accent Foreground"
          description="Text color on accent elements"
        />

        <ColorPairSelector
          light={config.primitives.colors.destructive.light}
          dark={config.primitives.colors.destructive.dark}
          onChange={(light, dark) => updateColor('destructive', light, dark)}
          label="Destructive"
          description="Error and destructive action colors"
        />

        <ColorPairSelector
          light={config.primitives.colors.destructiveForeground.light}
          dark={config.primitives.colors.destructiveForeground.dark}
          onChange={(light, dark) => updateColor('destructiveForeground', light, dark)}
          label="Destructive Foreground"
          description="Text color on destructive elements"
        />

        <ColorPairSelector
          light={config.primitives.colors.border.light}
          dark={config.primitives.colors.border.dark}
          onChange={(light, dark) => updateColor('border', light, dark)}
          label="Border"
          description="Default border color"
        />

        <ColorPairSelector
          light={config.primitives.colors.input.light}
          dark={config.primitives.colors.input.dark}
          onChange={(light, dark) => updateColor('input', light, dark)}
          label="Input"
          description="Border color for input elements"
        />

        <ColorPairSelector
          light={config.primitives.colors.ring.light}
          dark={config.primitives.colors.ring.dark}
          onChange={(light, dark) => updateColor('ring', light, dark)}
          label="Ring"
          description="Focus ring color"
        />

        {/* State Feedback Colors - Only show if they exist */}
        {config.primitives.colors.success && (
          <>
            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground font-semibold">State Feedback Colors</span>
              <div className="flex-1 border-t" />
            </div>

            <ColorPairSelector
              light={config.primitives.colors.success.light}
              dark={config.primitives.colors.success.dark}
              onChange={(light, dark) => updateColor('success', light, dark)}
              label="Success"
              description="Success state background (validation, confirmations)"
            />

        <ColorPairSelector
          light={config.primitives.colors.successForeground.light}
          dark={config.primitives.colors.successForeground.dark}
          onChange={(light, dark) => updateColor('successForeground', light, dark)}
          label="Success Foreground"
          description="Text color on success elements"
        />

        <ColorPairSelector
          light={config.primitives.colors.warning.light}
          dark={config.primitives.colors.warning.dark}
          onChange={(light, dark) => updateColor('warning', light, dark)}
          label="Warning"
          description="Warning state background (cautions, alerts)"
        />

        <ColorPairSelector
          light={config.primitives.colors.warningForeground.light}
          dark={config.primitives.colors.warningForeground.dark}
          onChange={(light, dark) => updateColor('warningForeground', light, dark)}
          label="Warning Foreground"
          description="Text color on warning elements"
        />

        <ColorPairSelector
          light={config.primitives.colors.info.light}
          dark={config.primitives.colors.info.dark}
          onChange={(light, dark) => updateColor('info', light, dark)}
          label="Info"
          description="Info state background (tips, information)"
        />

        <ColorPairSelector
          light={config.primitives.colors.infoForeground.light}
          dark={config.primitives.colors.infoForeground.dark}
          onChange={(light, dark) => updateColor('infoForeground', light, dark)}
          label="Info Foreground"
          description="Text color on info elements"
        />
          </>
        )}
      </div>
    </div>
  )
}

function MotionConfig({
  config,
  updateConfig
}: {
  config: DesignSystemConfig
  updateConfig: (updates: Partial<DesignSystemConfig>) => void
}) {
  const motion = config.primitives.motion

  // Safety check: ensure motion has the new structure
  if (!motion.profiles || !motion.mode) {
    console.error('Motion config is missing new structure. Expected profiles and mode.')
    return <div className="p-4 text-destructive">Motion configuration needs to be updated. Please refresh the page.</div>
  }

  const updateMotion = (updates: Partial<typeof motion>) => {
    updateConfig({
      primitives: {
        ...config.primitives,
        motion: {
          ...motion,
          ...updates
        }
      }
    })
  }

  const updateProfile = (profileName: keyof typeof motion.profiles, updates: Partial<MotionProfile>) => {
    updateMotion({
      profiles: {
        ...motion.profiles,
        [profileName]: {
          ...motion.profiles[profileName],
          ...updates
        }
      }
    })
  }

  const profileDescriptions: Record<keyof typeof motion.profiles, string> = {
    interaction: 'Micro-interactions: hover, focus, press states',
    stateChange: 'Toggle, switch, checkbox, radio button transitions',
    transition: 'Menu open/close, dialog show/hide, dropdown animations',
    reveal: 'Accordion expand/collapse, disclosure, progressive reveal',
    navigation: 'Page transitions, route changes, view swaps',
    emphasis: 'Success messages, errors, celebrations, important feedback'
  }

  return (
    <div className="space-y-8">
      {/* Semantic Motion Profiles */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Semantic Motion Profiles</h3>
          <p className="text-sm text-muted-foreground">
            Each profile defines timing for a specific use case
          </p>
        </div>

        <div className="space-y-4">
          {Object.entries(motion.profiles).map(([name, profile]) => (
            <div key={name} className="border rounded-lg p-4 space-y-3">
              <div>
                <h4 className="font-medium capitalize">{name.replace(/([A-Z])/g, ' $1').trim()}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {profileDescriptions[name as keyof typeof motion.profiles]}
                </p>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Duration: {profile.duration}ms
                </label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  value={profile.duration}
                  onChange={(e) =>
                    updateProfile(name as keyof typeof motion.profiles, {
                      duration: parseInt(e.target.value)
                    })
                  }
                  className="w-full"
                />
              </div>

              {/* Easing */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Easing Curve</label>
                <input
                  type="text"
                  value={profile.easing}
                  onChange={(e) =>
                    updateProfile(name as keyof typeof motion.profiles, {
                      easing: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md text-sm font-mono"
                  placeholder="cubic-bezier(0.4, 0.0, 0.2, 1.0)"
                />
              </div>

              {/* Spring (if present) */}
              {profile.spring && (
                <div className="space-y-2 pt-2 border-t">
                  <label className="text-xs font-medium text-muted-foreground">
                    Spring Physics (optional)
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs">Stiffness</label>
                      <input
                        type="number"
                        value={profile.spring.stiffness}
                        onChange={(e) =>
                          updateProfile(name as keyof typeof motion.profiles, {
                            spring: {
                              ...profile.spring!,
                              stiffness: parseInt(e.target.value) || 0
                            }
                          })
                        }
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs">Damping</label>
                      <input
                        type="number"
                        value={profile.spring.damping}
                        onChange={(e) =>
                          updateProfile(name as keyof typeof motion.profiles, {
                            spring: {
                              ...profile.spring!,
                              damping: parseInt(e.target.value) || 0
                            }
                          })
                        }
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs">Mass</label>
                      <input
                        type="number"
                        value={profile.spring.mass}
                        onChange={(e) =>
                          updateProfile(name as keyof typeof motion.profiles, {
                            spring: {
                              ...profile.spring!,
                              mass: parseFloat(e.target.value) || 1
                            }
                          })
                        }
                        className="w-full px-2 py-1 border rounded text-xs"
                        step="0.1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Spring Physics Presets */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Spring Physics Presets</h3>
          <p className="text-sm text-muted-foreground">
            Universal physics parameters adaptable to any platform
          </p>
        </div>

        {Object.entries(motion.springs).map(([name, spring]) => (
          <div key={name} className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium capitalize">{name}</h4>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm">
                  Stiffness: {spring.stiffness}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  value={spring.stiffness}
                  onChange={(e) =>
                    updateMotion({
                      springs: {
                        ...motion.springs,
                        [name]: {
                          ...spring,
                          stiffness: parseInt(e.target.value)
                        }
                      }
                    })
                  }
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm">
                  Damping: {spring.damping}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={spring.damping}
                  onChange={(e) =>
                    updateMotion({
                      springs: {
                        ...motion.springs,
                        [name]: {
                          ...spring,
                          damping: parseInt(e.target.value)
                        }
                      }
                    })
                  }
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm">
                  Mass: {spring.mass}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={spring.mass}
                  onChange={(e) =>
                    updateMotion({
                      springs: {
                        ...motion.springs,
                        [name]: {
                          ...spring,
                          mass: parseFloat(e.target.value)
                        }
                      }
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Easing Curves (Intent-based) */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Easing Curves</h3>
          <p className="text-sm text-muted-foreground">
            CSS timing functions organized by intent
          </p>
        </div>

        <div className="space-y-3">
          {Object.entries(motion.easings).map(([name, value]) => (
            <div key={name} className="space-y-2">
              <label className="text-sm font-medium capitalize flex items-center gap-2">
                {name}
                <span className="text-xs text-muted-foreground font-normal">
                  {name === 'enter' && '(elements entering view)'}
                  {name === 'exit' && '(elements exiting view)'}
                  {name === 'standard' && '(state transitions)'}
                  {name === 'linear' && '(mechanical motion)'}
                </span>
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) =>
                  updateMotion({
                    easings: {
                      ...motion.easings,
                      [name]: e.target.value
                    }
                  })
                }
                className="w-full px-3 py-2 border rounded-md text-sm font-mono"
                placeholder="cubic-bezier(0.4, 0.0, 0.2, 1.0)"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Reduced Motion */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={motion.reducedMotion}
              onChange={(e) => updateMotion({ reducedMotion: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">
              Reduced Motion
              <span className="block text-xs text-muted-foreground font-normal">
                Automatically detected via prefers-reduced-motion media query
              </span>
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}

function InteractionsConfig({
  config,
  updateConfig
}: {
  config: DesignSystemConfig
  updateConfig: (updates: Partial<DesignSystemConfig>) => void
}) {
  const interaction = config.primitives.interaction

  // Safety check: ensure interaction config exists with defaults
  if (!interaction || !interaction.stateOpacity || !interaction.scale || !interaction.focusRing) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>Interaction configuration needs to be initialized.</p>
        <p className="text-sm mt-2">Please refresh the page to load default interaction settings.</p>
      </div>
    )
  }

  const updateInteraction = (updates: Partial<typeof interaction>) => {
    updateConfig({
      primitives: {
        ...config.primitives,
        interaction: {
          ...interaction,
          ...updates
        }
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* State Opacity Layers */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">State Opacity Layers</h3>
          <p className="text-sm text-muted-foreground">
            Material Design 3 state layer system - opacity overlays for interactive states
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>Hover: {(interaction.stateOpacity.hover * 100).toFixed(0)}%</span>
              <span className="text-xs text-muted-foreground">
                Overlay opacity on hover
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="0.2"
              step="0.01"
              value={interaction.stateOpacity.hover}
              onChange={(e) =>
                updateInteraction({
                  stateOpacity: {
                    ...interaction.stateOpacity,
                    hover: parseFloat(e.target.value)
                  }
                })
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Material Design: 8%</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>Focus: {(interaction.stateOpacity.focus * 100).toFixed(0)}%</span>
              <span className="text-xs text-muted-foreground">
                Overlay opacity on focus
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="0.2"
              step="0.01"
              value={interaction.stateOpacity.focus}
              onChange={(e) =>
                updateInteraction({
                  stateOpacity: {
                    ...interaction.stateOpacity,
                    focus: parseFloat(e.target.value)
                  }
                })
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Material Design: 12%</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>Pressed: {(interaction.stateOpacity.pressed * 100).toFixed(0)}%</span>
              <span className="text-xs text-muted-foreground">
                Overlay opacity when pressed
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="0.2"
              step="0.01"
              value={interaction.stateOpacity.pressed}
              onChange={(e) =>
                updateInteraction({
                  stateOpacity: {
                    ...interaction.stateOpacity,
                    pressed: parseFloat(e.target.value)
                  }
                })
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Material Design: 12%</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>Disabled: {(interaction.stateOpacity.disabled * 100).toFixed(0)}%</span>
              <span className="text-xs text-muted-foreground">
                Element opacity when disabled
              </span>
            </label>
            <input
              type="range"
              min="0.1"
              max="0.7"
              step="0.01"
              value={interaction.stateOpacity.disabled}
              onChange={(e) =>
                updateInteraction({
                  stateOpacity: {
                    ...interaction.stateOpacity,
                    disabled: parseFloat(e.target.value)
                  }
                })
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Standard: 38%</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>Loading: {(interaction.stateOpacity.loading * 100).toFixed(0)}%</span>
              <span className="text-xs text-muted-foreground">
                Content opacity under loading state
              </span>
            </label>
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.05"
              value={interaction.stateOpacity.loading}
              onChange={(e) =>
                updateInteraction({
                  stateOpacity: {
                    ...interaction.stateOpacity,
                    loading: parseFloat(e.target.value)
                  }
                })
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Typical: 60%</p>
          </div>
        </div>
      </section>

      {/* Scale Transforms */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Scale Transforms</h3>
          <p className="text-sm text-muted-foreground">
            Tactile feedback through scale changes on interactive elements
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>Hover: {interaction.scale.hover}x</span>
              <span className="text-xs text-muted-foreground">
                Scale multiplier on hover
              </span>
            </label>
            <input
              type="range"
              min="1"
              max="1.1"
              step="0.01"
              value={interaction.scale.hover}
              onChange={(e) =>
                updateInteraction({
                  scale: {
                    ...interaction.scale,
                    hover: parseFloat(e.target.value)
                  }
                })
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Subtle: 1.02 (2% larger)</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>Pressed: {interaction.scale.pressed}x</span>
              <span className="text-xs text-muted-foreground">
                Scale multiplier when pressed
              </span>
            </label>
            <input
              type="range"
              min="0.9"
              max="1"
              step="0.01"
              value={interaction.scale.pressed}
              onChange={(e) =>
                updateInteraction({
                  scale: {
                    ...interaction.scale,
                    pressed: parseFloat(e.target.value)
                  }
                })
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Standard: 0.98 (2% smaller)</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>Active: {interaction.scale.active}x</span>
              <span className="text-xs text-muted-foreground">
                Scale multiplier for active state
              </span>
            </label>
            <input
              type="range"
              min="0.85"
              max="1"
              step="0.01"
              value={interaction.scale.active}
              onChange={(e) =>
                updateInteraction({
                  scale: {
                    ...interaction.scale,
                    active: parseFloat(e.target.value)
                  }
                })
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Pronounced: 0.95 (5% smaller)</p>
          </div>
        </div>
      </section>

      {/* Focus Ring */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Focus Ring</h3>
          <p className="text-sm text-muted-foreground">
            Keyboard focus indicator (WCAG 2.4.7, 1.4.11, 2.4.13 compliance)
          </p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium mb-2 block">Width</span>
            <input
              type="text"
              value={interaction.focusRing.width}
              onChange={(e) =>
                updateInteraction({
                  focusRing: {
                    ...interaction.focusRing,
                    width: e.target.value
                  }
                })
              }
              className="w-full px-3 py-2 border rounded-lg bg-background"
              placeholder="2px"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 2px for WCAG AAA (2.4.13)
            </p>
          </label>

          <label className="block">
            <span className="text-sm font-medium mb-2 block">Offset</span>
            <input
              type="text"
              value={interaction.focusRing.offset}
              onChange={(e) =>
                updateInteraction({
                  focusRing: {
                    ...interaction.focusRing,
                    offset: e.target.value
                  }
                })
              }
              className="w-full px-3 py-2 border rounded-lg bg-background"
              placeholder="2px"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Space between element and ring
            </p>
          </label>

          <label className="block">
            <span className="text-sm font-medium mb-2 block">Style</span>
            <select
              value={interaction.focusRing.style}
              onChange={(e) =>
                updateInteraction({
                  focusRing: {
                    ...interaction.focusRing,
                    style: e.target.value as 'solid' | 'dashed' | 'dotted'
                  }
                })
              }
              className="w-full px-3 py-2 border rounded-lg bg-background"
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </label>
        </div>
      </section>

      {/* Accessibility Note */}
      <section className="space-y-4">
        <div className="p-4 border rounded-lg bg-muted/30">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <span>♿</span>
            Accessibility Requirements
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>WCAG 2.4.7 (AA):</strong> Focus indicators must be visible</li>
            <li>• <strong>WCAG 1.4.11 (AA):</strong> 3:1 contrast ratio for focus indicators</li>
            <li>• <strong>WCAG 2.4.13 (AAA):</strong> Focus indicator ≥2px thick with 3:1 contrast</li>
            <li>• Never use color alone to indicate state (combine with icons, text)</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
