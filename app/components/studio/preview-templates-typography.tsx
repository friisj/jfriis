import { useState } from 'react'
import type { DesignSystemConfig } from './design-system-tool'

export function TypographyTemplate({ config }: { config: DesignSystemConfig }) {
  const sans = config.primitives.typography.fontFamilies.sans
  const serif = config.primitives.typography.fontFamilies.serif
  const mono = config.primitives.typography.fontFamilies.mono
  const sizes = config.primitives.typography.typeScale.sizes
  const lineHeights = config.primitives.typography.lineHeights

  const [typeScaleFont, setTypeScaleFont] = useState<'sans' | 'serif' | 'mono'>('sans')

  const getCurrentFont = () => {
    switch (typeScaleFont) {
      case 'sans':
        return sans
      case 'serif':
        return serif
      case 'mono':
        return mono
    }
  }

  const currentFont = getCurrentFont()

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Font Family Comparison */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-4">FONT FAMILIES</h4>
        <div className="space-y-6">
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Sans Serif</div>
              <div className="text-xs text-muted-foreground font-mono">{sans.name}</div>
            </div>
            <div
              className="text-base mb-2"
              style={{ fontFamily: sans.stack, fontWeight: sans.weights.normal }}
            >
              The quick brown fox jumps over the lazy dog 0123456789
            </div>
            <div
              className="text-base"
              style={{ fontFamily: sans.stack, fontWeight: sans.weights.bold }}
            >
              The quick brown fox jumps over the lazy dog 0123456789
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Serif</div>
              <div className="text-xs text-muted-foreground font-mono">{serif.name}</div>
            </div>
            <div
              className="text-base mb-2"
              style={{ fontFamily: serif.stack, fontWeight: serif.weights.normal }}
            >
              The quick brown fox jumps over the lazy dog 0123456789
            </div>
            <div
              className="text-base"
              style={{ fontFamily: serif.stack, fontWeight: serif.weights.bold }}
            >
              The quick brown fox jumps over the lazy dog 0123456789
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Monospace</div>
              <div className="text-xs text-muted-foreground font-mono">{mono.name}</div>
            </div>
            <div
              className="text-base mb-2"
              style={{ fontFamily: mono.stack, fontWeight: mono.weights.normal }}
            >
              The quick brown fox jumps over the lazy dog 0123456789
            </div>
            <div
              className="text-base"
              style={{ fontFamily: mono.stack, fontWeight: mono.weights.bold }}
            >
              The quick brown fox jumps over the lazy dog 0123456789
            </div>
          </div>
        </div>
      </div>

      {/* Type Scale */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-medium text-muted-foreground">TYPE SCALE</h4>
          <div className="flex gap-2">
            <button
              onClick={() => setTypeScaleFont('sans')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                typeScaleFont === 'sans'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Sans
            </button>
            <button
              onClick={() => setTypeScaleFont('serif')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                typeScaleFont === 'serif'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Serif
            </button>
            <button
              onClick={() => setTypeScaleFont('mono')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                typeScaleFont === 'mono'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Mono
            </button>
          </div>
        </div>
        <div className="mb-3 text-xs text-muted-foreground">
          Showing: <span className="font-mono">{currentFont.name}</span>
        </div>
        <div className="space-y-3">
          {Object.entries(sizes).map(([name, size]) => (
            <div key={name} className="flex items-baseline gap-4 pb-2 border-b border-border/50">
              <div className="w-20 text-xs text-muted-foreground font-mono">{name}</div>
              <div className="w-24 text-xs text-muted-foreground">{size}</div>
              <div
                style={{
                  fontSize: size,
                  fontFamily: currentFont.stack,
                  lineHeight: lineHeights.normal
                }}
              >
                The quick brown fox
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Font Weights */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-4">FONT WEIGHTS</h4>
        <div className="mb-3 text-xs text-muted-foreground">
          Using: <span className="font-mono">{currentFont.name}</span>
        </div>
        <div className="space-y-2">
          {Object.entries(config.primitives.typography.fontWeights).map(([name, weight]) => (
            <div
              key={name}
              style={{
                fontFamily: currentFont.stack,
                fontSize: sizes.base,
                fontWeight: weight
              }}
            >
              {name} ({weight}) - The quick brown fox jumps over the lazy dog
            </div>
          ))}
        </div>
      </div>

      {/* Line Heights */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-4">LINE HEIGHTS</h4>
        <div className="mb-3 text-xs text-muted-foreground">
          Using: <span className="font-mono">{currentFont.name}</span>
        </div>
        <div className="space-y-4">
          {Object.entries(lineHeights).map(([name, height]) => (
            <div key={name} className="border-b pb-4">
              <div className="text-xs text-muted-foreground mb-2">{name} ({height})</div>
              <p
                style={{
                  fontFamily: currentFont.stack,
                  fontSize: sizes.sm,
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
