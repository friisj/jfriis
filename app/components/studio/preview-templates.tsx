'use client'

import { useState } from 'react'
import type { DesignSystemConfig } from './design-system-tool'
import { TypographyTemplate as TypographyTemplateNew } from './preview-templates-typography'

interface PreviewTemplatesProps {
  config: DesignSystemConfig
}

type Template = 'card' | 'form' | 'blog' | 'typography' | 'layout'

export function PreviewTemplates({ config }: PreviewTemplatesProps) {
  const [activeTemplate, setActiveTemplate] = useState<Template>('card')

  const templates: { id: Template; label: string }[] = [
    { id: 'card', label: 'Card' },
    { id: 'form', label: 'Form' },
    { id: 'blog', label: 'Blog Post' },
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
        {activeTemplate === 'blog' && <BlogTemplate config={config} />}
        {activeTemplate === 'typography' && <TypographyTemplateNew config={config} />}
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
              fontFamily: config.primitives.typography.fontFamilies.sans.stack,
              fontSize: config.primitives.typography.typeScale.sizes.sm
            }}
          >
            Primary Action
          </button>
          <button
            className="px-4 py-2 border font-medium"
            style={{
              borderRadius: config.semantic.radius.interactive,
              fontFamily: config.primitives.typography.fontFamilies.sans.stack,
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
                fontFamily: config.primitives.typography.fontFamilies.sans.stack,
                fontSize: config.primitives.typography.typeScale.sizes.base,
                lineHeight: config.primitives.typography.lineHeights.tight
              }}
            >
              Settings Panel
            </h3>
            <p
              className="text-muted-foreground"
              style={{
                fontFamily: config.primitives.typography.fontFamilies.sans.stack,
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
                fontFamily: config.primitives.typography.fontFamilies.sans.stack,
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
                fontFamily: config.primitives.typography.fontFamilies.sans.stack,
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
                fontFamily: config.primitives.typography.fontFamilies.sans.stack,
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
                fontFamily: config.primitives.typography.fontFamilies.sans.stack,
                fontSize: config.primitives.typography.typeScale.sizes.sm
              }}
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label
              className="block mb-2 font-medium"
              style={{
                fontFamily: config.primitives.typography.fontFamilies.sans.stack,
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
                fontFamily: config.primitives.typography.fontFamilies.sans.stack,
                fontSize: config.primitives.typography.typeScale.sizes.sm
              }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              className="block mb-2 font-medium"
              style={{
                fontFamily: config.primitives.typography.fontFamilies.sans.stack,
                fontSize: config.primitives.typography.typeScale.sizes.sm
              }}
            >
              Message
            </label>
            <textarea
              className="w-full px-3 py-2 border bg-background"
              style={{
                borderRadius: interactiveRadius,
                fontFamily: config.primitives.typography.fontFamilies.sans.stack,
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
              fontFamily: config.primitives.typography.fontFamilies.sans.stack,
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

function BlogTemplate({ config }: { config: DesignSystemConfig }) {
  const sans = config.primitives.typography.fontFamilies.sans.stack
  const serif = config.primitives.typography.fontFamilies.serif.stack
  const mono = config.primitives.typography.fontFamilies.mono.stack
  const sizes = config.primitives.typography.typeScale.sizes
  const lineHeights = config.primitives.typography.lineHeights

  return (
    <article className="max-w-3xl mx-auto prose prose-lg">
      {/* Title */}
      <h1
        style={{
          fontFamily: serif,
          fontSize: sizes['4xl'],
          lineHeight: lineHeights.tight,
          fontWeight: 700,
          marginBottom: '0.5em'
        }}
      >
        The Evolution of Modern Design Systems
      </h1>

      {/* Meta */}
      <div
        className="flex items-center gap-4 text-muted-foreground pb-6 border-b mb-8"
        style={{
          fontFamily: sans,
          fontSize: sizes.sm,
          lineHeight: lineHeights.normal
        }}
      >
        <span>By Jane Designer</span>
        <span>•</span>
        <span>March 15, 2024</span>
        <span>•</span>
        <span>8 min read</span>
      </div>

      {/* Lead paragraph */}
      <p
        className="text-lg"
        style={{
          fontFamily: serif,
          fontSize: sizes.lg,
          lineHeight: lineHeights.relaxed,
          marginBottom: '1.5em'
        }}
      >
        Design systems have fundamentally transformed how teams build digital products. What started
        as simple style guides has evolved into comprehensive, living ecosystems that power modern
        user interfaces.
      </p>

      {/* Heading 2 */}
      <h2
        style={{
          fontFamily: serif,
          fontSize: sizes['2xl'],
          lineHeight: lineHeights.tight,
          fontWeight: 700,
          marginTop: '2em',
          marginBottom: '0.75em'
        }}
      >
        The Foundation: Design Tokens
      </h2>

      {/* Body paragraph */}
      <p
        style={{
          fontFamily: serif,
          fontSize: sizes.base,
          lineHeight: lineHeights.relaxed,
          marginBottom: '1.25em'
        }}
      >
        At the heart of every design system lies a carefully crafted set of design tokens. These
        atomic values define the visual DNA of your product—from spacing and typography to color
        and motion.
      </p>

      {/* Blockquote */}
      <blockquote
        className="border-l-4 border-primary pl-6 my-8"
        style={{
          fontFamily: serif,
          fontSize: sizes.lg,
          lineHeight: lineHeights.normal,
          fontStyle: 'italic'
        }}
      >
        "Design tokens are the visual design atoms of the design system—specifically, they are named
        entities that store visual design attributes."
      </blockquote>

      {/* Heading 3 */}
      <h3
        style={{
          fontFamily: serif,
          fontSize: sizes.xl,
          lineHeight: lineHeights.tight,
          fontWeight: 600,
          marginTop: '1.5em',
          marginBottom: '0.5em'
        }}
      >
        Key Components of a Token System
      </h3>

      {/* Unordered list */}
      <ul
        className="space-y-2 my-6"
        style={{
          fontFamily: serif,
          fontSize: sizes.base,
          lineHeight: lineHeights.normal,
          listStyleType: 'disc',
          paddingLeft: '1.5em'
        }}
      >
        <li>
          <strong>Primitives</strong>: Raw values like hex colors, pixel dimensions, and font weights
        </li>
        <li>
          <strong>Semantic tokens</strong>: Purpose-driven names that reference primitives
        </li>
        <li>
          <strong>Component tokens</strong>: Specific values for individual component variants
        </li>
      </ul>

      {/* Code block */}
      <div
        className="bg-muted rounded-lg p-4 my-6 border"
        style={{
          fontFamily: mono,
          fontSize: sizes.sm,
          lineHeight: lineHeights.normal
        }}
      >
        <pre>
          <code>{`// Example design token structure
const tokens = {
  color: {
    primary: '#2563eb',
    surface: '#ffffff'
  },
  spacing: {
    sm: '8px',
    md: '16px',
    lg: '24px'
  }
}`}</code>
        </pre>
      </div>

      {/* Ordered list */}
      <h3
        style={{
          fontFamily: serif,
          fontSize: sizes.xl,
          lineHeight: lineHeights.tight,
          fontWeight: 600,
          marginTop: '1.5em',
          marginBottom: '0.5em'
        }}
      >
        Implementation Steps
      </h3>

      <ol
        className="space-y-3 my-6"
        style={{
          fontFamily: serif,
          fontSize: sizes.base,
          lineHeight: lineHeights.normal,
          listStyleType: 'decimal',
          paddingLeft: '1.5em'
        }}
      >
        <li>
          <strong>Audit your existing design</strong> to identify patterns and inconsistencies
        </li>
        <li>
          <strong>Define your token structure</strong> starting with primitives
        </li>
        <li>
          <strong>Map semantic meanings</strong> to create a scalable system
        </li>
        <li>
          <strong>Document usage guidelines</strong> for your team
        </li>
        <li>
          <strong>Iterate based on feedback</strong> from designers and developers
        </li>
      </ol>

      {/* Pull quote / Callout */}
      <div
        className="bg-accent border-l-4 border-primary rounded-r-lg p-6 my-8"
        style={{
          fontFamily: sans,
          fontSize: sizes.base,
          lineHeight: lineHeights.normal
        }}
      >
        <p className="font-semibold mb-2">💡 Pro Tip</p>
        <p>
          Start small with spacing and color tokens. You can always expand your system as your team
          becomes more comfortable with the token approach.
        </p>
      </div>

      {/* Final paragraph */}
      <p
        style={{
          fontFamily: serif,
          fontSize: sizes.base,
          lineHeight: lineHeights.relaxed,
          marginTop: '2em'
        }}
      >
        Building a design system is a journey, not a destination. The most successful systems evolve
        with their products while maintaining consistency and enabling teams to move faster. By
        starting with a solid foundation of design tokens, you set yourself up for scalable,
        maintainable design at any scale.
      </p>

      {/* Footer meta */}
      <div
        className="border-t pt-6 mt-12 flex items-center justify-between text-muted-foreground"
        style={{
          fontFamily: sans,
          fontSize: sizes.sm,
          lineHeight: lineHeights.normal
        }}
      >
        <div className="flex gap-3">
          <span className="px-3 py-1 bg-muted rounded-full">Design Systems</span>
          <span className="px-3 py-1 bg-muted rounded-full">UI/UX</span>
          <span className="px-3 py-1 bg-muted rounded-full">Tokens</span>
        </div>
        <button className="hover:text-foreground">Share →</button>
      </div>
    </article>
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
                  fontFamily: config.primitives.typography.fontFamilies.sans.stack,
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
                fontFamily: config.primitives.typography.fontFamilies.sans.stack,
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
                  fontFamily: config.primitives.typography.fontFamilies.sans.stack,
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
