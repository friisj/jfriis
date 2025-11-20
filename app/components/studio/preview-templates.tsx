'use client'

import { useState } from 'react'
import type { DesignSystemConfig } from './design-system-tool'

interface PreviewTemplatesProps {
  config: DesignSystemConfig
}

type Template = 'card' | 'form' | 'typography' | 'layout'

export function PreviewTemplates({ config }: PreviewTemplatesProps) {
  const [activeTemplate, setActiveTemplate] = useState<Template>('card')

  const templates: { id: Template; label: string }[] = [
    { id: 'card', label: 'Card' },
    { id: 'form', label: 'Form' },
    { id: 'typography', label: 'Typography' },
    { id: 'layout', label: 'Layout' }
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Template Selector */}
      <div className="border-b bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-2">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => setActiveTemplate(template.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTemplate === template.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-accent'
              }`}
            >
              {template.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto p-8 bg-background">
        {activeTemplate === 'card' && <CardTemplate config={config} />}
        {activeTemplate === 'form' && <FormTemplate config={config} />}
        {activeTemplate === 'typography' && <TypographyTemplate config={config} />}
        {activeTemplate === 'layout' && <LayoutTemplate config={config} />}
      </div>
    </div>
  )
}

function CardTemplate({ config }: { config: DesignSystemConfig }) {
  const spacing = config.semantic.spacing['component-padding']
  const radius = config.semantic.radius.surface
  const gapValue = config.semantic.spacing['component-gap']

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div
        className="border bg-card text-card-foreground"
        style={{ borderRadius: radius, padding: spacing }}
      >
        <h3
          className="font-semibold mb-2"
          style={{
            fontFamily: config.primitives.typography.fontFamilies.sans.stack,
            fontSize: config.primitives.typography.typeScale.sizes.lg,
            lineHeight: config.primitives.typography.lineHeights.tight
          }}
        >
          Product Card Example
        </h3>
        <p
          className="text-muted-foreground mb-4"
          style={{
            fontFamily: config.primitives.typography.fontFamilies.sans.stack,
            fontSize: config.primitives.typography.typeScale.sizes.sm,
            lineHeight: config.primitives.typography.lineHeights.normal
          }}
        >
          This card demonstrates your spacing, radius, and typography configuration in action.
        </p>
        <div className="flex gap-3" style={{ gap: gapValue }}>
          <button
            className="px-4 py-2 bg-primary text-primary-foreground font-medium"
            style={{
              borderRadius: config.semantic.radius.interactive,
              fontFamily: config.primitives.typography.fontFamilies.sans,
              fontSize: config.primitives.typography.typeScale.sizes.sm
            }}
          >
            Primary Action
          </button>
          <button
            className="px-4 py-2 border font-medium"
            style={{
              borderRadius: config.semantic.radius.interactive,
              fontFamily: config.primitives.typography.fontFamilies.sans,
              fontSize: config.primitives.typography.typeScale.sizes.sm
            }}
          >
            Secondary
          </button>
        </div>
      </div>

      <div
        className="border bg-card text-card-foreground"
        style={{ borderRadius: radius, padding: spacing }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3
              className="font-semibold"
              style={{
                fontFamily: config.primitives.typography.fontFamilies.sans,
                fontSize: config.primitives.typography.typeScale.sizes.base,
                lineHeight: config.primitives.typography.lineHeights.tight
              }}
            >
              Settings Panel
            </h3>
            <p
              className="text-muted-foreground"
              style={{
                fontFamily: config.primitives.typography.fontFamilies.sans,
                fontSize: config.primitives.typography.typeScale.sizes.xs,
                lineHeight: config.primitives.typography.lineHeights.normal
              }}
            >
              Configure your preferences
            </p>
          </div>
          <button
            className="text-muted-foreground hover:text-foreground"
            style={{
              fontSize: config.primitives.typography.typeScale.sizes.sm
            }}
          >
            ✕
          </button>
        </div>
        <div className="space-y-3" style={{ gap: gapValue }}>
          <div className="flex items-center justify-between py-2 border-b">
            <span
              style={{
                fontFamily: config.primitives.typography.fontFamilies.sans,
                fontSize: config.primitives.typography.typeScale.sizes.sm
              }}
            >
              Enable notifications
            </span>
            <div className="w-10 h-6 bg-primary rounded-full" style={{ borderRadius: '9999px' }} />
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span
              style={{
                fontFamily: config.primitives.typography.fontFamilies.sans,
                fontSize: config.primitives.typography.typeScale.sizes.sm
              }}
            >
              Dark mode
            </span>
            <div className="w-10 h-6 bg-muted rounded-full" style={{ borderRadius: '9999px' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function FormTemplate({ config }: { config: DesignSystemConfig }) {
  const spacing = config.semantic.spacing['component-padding']
  const radius = config.semantic.radius.surface
  const interactiveRadius = config.semantic.radius.interactive

  return (
    <div className="max-w-lg mx-auto">
      <div
        className="border bg-card text-card-foreground"
        style={{ borderRadius: radius, padding: spacing }}
      >
        <h2
          className="font-semibold mb-2"
          style={{
            fontFamily: config.primitives.typography.fontFamilies.sans.stack,
            fontSize: config.primitives.typography.typeScale.sizes.xl,
            lineHeight: config.primitives.typography.lineHeights.tight
          }}
        >
          Contact Form
        </h2>
        <p
          className="text-muted-foreground mb-6"
          style={{
            fontFamily: config.primitives.typography.fontFamilies.sans.stack,
            fontSize: config.primitives.typography.typeScale.sizes.sm,
            lineHeight: config.primitives.typography.lineHeights.normal
          }}
        >
          Fill out the form below to get in touch
        </p>

        <div className="space-y-4">
          <div>
            <label
              className="block mb-2 font-medium"
              style={{
                fontFamily: config.primitives.typography.fontFamilies.sans,
                fontSize: config.primitives.typography.typeScale.sizes.sm
              }}
            >
              Full Name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border bg-background"
              style={{
                borderRadius: interactiveRadius,
                fontFamily: config.primitives.typography.fontFamilies.sans,
                fontSize: config.primitives.typography.typeScale.sizes.sm
              }}
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label
              className="block mb-2 font-medium"
              style={{
                fontFamily: config.primitives.typography.fontFamilies.sans,
                fontSize: config.primitives.typography.typeScale.sizes.sm
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 border bg-background"
              style={{
                borderRadius: interactiveRadius,
                fontFamily: config.primitives.typography.fontFamilies.sans,
                fontSize: config.primitives.typography.typeScale.sizes.sm
              }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              className="block mb-2 font-medium"
              style={{
                fontFamily: config.primitives.typography.fontFamilies.sans,
                fontSize: config.primitives.typography.typeScale.sizes.sm
              }}
            >
              Message
            </label>
            <textarea
              className="w-full px-3 py-2 border bg-background"
              style={{
                borderRadius: interactiveRadius,
                fontFamily: config.primitives.typography.fontFamilies.sans,
                fontSize: config.primitives.typography.typeScale.sizes.sm,
                lineHeight: config.primitives.typography.lineHeights.normal
              }}
              rows={4}
              placeholder="Your message here..."
            />
          </div>

          <button
            className="w-full px-4 py-2 bg-primary text-primary-foreground font-medium"
            style={{
              borderRadius: interactiveRadius,
              fontFamily: config.primitives.typography.fontFamilies.sans,
              fontSize: config.primitives.typography.typeScale.sizes.sm
            }}
          >
            Send Message
          </button>
        </div>
      </div>
    </div>
  )
}

function TypographyTemplate({ config }: { config: DesignSystemConfig }) {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-4">TYPE SCALE</h4>
        <div className="space-y-3">
          {Object.entries(config.primitives.typography.typeScale.sizes).map(([name, size]) => (
            <div key={name} className="flex items-baseline gap-4 pb-2 border-b border-border/50">
              <div className="w-20 text-xs text-muted-foreground font-mono">{name}</div>
              <div
                style={{
                  fontSize: size,
                  fontFamily: config.primitives.typography.fontFamilies.sans,
                  lineHeight: config.primitives.typography.lineHeights.normal
                }}
              >
                The quick brown fox jumps over the lazy dog
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-4">FONT WEIGHTS</h4>
        <div className="space-y-2">
          {Object.entries(config.primitives.typography.fontWeights).map(([name, weight]) => (
            <div
              key={name}
              style={{
                fontFamily: config.primitives.typography.fontFamilies.sans,
                fontSize: config.primitives.typography.typeScale.sizes.base,
                fontWeight: weight
              }}
            >
              {name} ({weight}) - The quick brown fox jumps over the lazy dog
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-4">LINE HEIGHTS</h4>
        <div className="space-y-4">
          {Object.entries(config.primitives.typography.lineHeights).map(([name, height]) => (
            <div key={name} className="border-b pb-4">
              <div className="text-xs text-muted-foreground mb-2">{name} ({height})</div>
              <p
                style={{
                  fontFamily: config.primitives.typography.fontFamilies.sans,
                  fontSize: config.primitives.typography.typeScale.sizes.sm,
                  lineHeight: height
                }}
              >
                Design systems are the backbone of consistent user interfaces. They provide a shared
                language and reusable components that help teams build products faster and more
                efficiently. A well-designed system scales across products and platforms.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LayoutTemplate({ config }: { config: DesignSystemConfig }) {
  const spacing = config.semantic.spacing
  const radius = config.semantic.radius

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-4">SPACING SCALE</h4>
        <div className="space-y-2">
          {config.primitives.spacing.values.slice(0, 9).map((value, index) => (
            <div key={value} className="flex items-center gap-4">
              <div className="w-20 text-xs text-muted-foreground font-mono">{value}px</div>
              <div
                className="bg-primary/20 border border-primary/50"
                style={{
                  width: `${value}px`,
                  height: '24px',
                  borderRadius: config.primitives.radius.values[1] + 'px'
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-4">BORDER RADIUS</h4>
        <div className="flex flex-wrap gap-4">
          {config.primitives.radius.values.filter(v => v !== 9999).map((value) => (
            <div key={value} className="text-center">
              <div
                className="w-20 h-20 bg-primary/20 border border-primary/50 mb-2"
                style={{ borderRadius: `${value}px` }}
              />
              <div className="text-xs text-muted-foreground font-mono">{value}px</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-4">SEMANTIC SPACING</h4>
        <div className="space-y-2">
          {Object.entries(spacing).map(([name, value]) => (
            <div key={name} className="flex items-center gap-4">
              <div className="w-40 text-xs text-muted-foreground font-mono">{name}</div>
              <div className="text-xs text-muted-foreground">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-4">GRID SYSTEM</h4>
        <div className="border rounded-lg p-4 space-y-2 text-sm">
          <div>Columns: {config.primitives.grid.columns}</div>
          <div>Gutter: {config.primitives.grid.gutter}px</div>
          <div>Max Width: {config.primitives.grid.maxWidth}px</div>
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-1">Margins</div>
            <div className="pl-4 space-y-1 text-xs">
              <div>Mobile: {config.primitives.grid.margins.mobile}px</div>
              <div>Tablet: {config.primitives.grid.margins.tablet}px</div>
              <div>Desktop: {config.primitives.grid.margins.desktop}px</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
