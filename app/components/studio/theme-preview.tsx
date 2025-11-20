'use client'

import type { DesignSystemConfig } from './design-system-tool'

interface ThemePreviewProps {
  config: DesignSystemConfig
  onEdit: () => void
  onExport: () => void
}

export function ThemePreview({ config, onEdit, onExport }: ThemePreviewProps) {
  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Configuration Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Spacing Scale</div>
            <div className="font-medium">{config.primitives.spacing.scale}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Radius Style</div>
            <div className="font-medium capitalize">{config.primitives.radius.style}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Grid Columns</div>
            <div className="font-medium">{config.primitives.grid.columns}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Max Width</div>
            <div className="font-medium">{config.primitives.grid.maxWidth}px</div>
          </div>
        </div>
      </div>

      {/* Component Previews */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Component Preview</h2>

        {/* Card Example */}
        <div>
          <div className="text-sm text-muted-foreground mb-3">Card Component</div>
          <div
            className="border rounded-lg p-6 bg-card"
            style={{
              borderRadius: config.semantic.radius.surface,
              padding: config.semantic.spacing['component-padding']
            }}
          >
            <h3 className="text-lg font-semibold mb-2">Example Card</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This card uses the structural configuration you defined.
            </p>
            <div className="flex gap-3">
              <button
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                style={{ borderRadius: config.semantic.radius.interactive }}
              >
                Primary Action
              </button>
              <button
                className="px-4 py-2 border rounded-lg text-sm font-medium"
                style={{ borderRadius: config.semantic.radius.interactive }}
              >
                Secondary
              </button>
            </div>
          </div>
        </div>

        {/* Spacing Scale Visual */}
        <div>
          <div className="text-sm text-muted-foreground mb-3">Spacing Scale</div>
          <div className="space-y-2">
            {config.primitives.spacing.values.slice(0, 9).map((value, index) => (
              <div key={value} className="flex items-center gap-4">
                <div className="w-16 text-xs text-muted-foreground font-mono">
                  {value}px
                </div>
                <div
                  className="bg-primary/20 border border-primary/50 rounded"
                  style={{ width: `${value}px`, height: '24px' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Radius Scale Visual */}
        <div>
          <div className="text-sm text-muted-foreground mb-3">Border Radius Scale</div>
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

        {/* Typography Type Scale */}
        <div>
          <div className="text-sm text-muted-foreground mb-3">Type Scale</div>
          <div className="space-y-2">
            {Object.entries(config.primitives.typography.typeScale.sizes).map(([name, size]) => (
              <div key={name} className="flex items-baseline gap-4 border-b border-border/50 pb-2">
                <div className="w-16 text-xs text-muted-foreground font-mono">{name}</div>
                <div className="w-24 text-xs text-muted-foreground font-mono">{size}</div>
                <div
                  style={{
                    fontSize: size,
                    fontFamily: config.primitives.typography.fontFamilies.sans,
                    lineHeight: config.primitives.typography.lineHeights.normal
                  }}
                >
                  The quick brown fox
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Font Families */}
        <div>
          <div className="text-sm text-muted-foreground mb-3">Font Families</div>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground mb-2 font-mono">
                Sans: {config.primitives.typography.fontFamilies.sans}
              </div>
              <div
                className="text-base"
                style={{ fontFamily: config.primitives.typography.fontFamilies.sans }}
              >
                The quick brown fox jumps over the lazy dog. 0123456789
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground mb-2 font-mono">
                Serif: {config.primitives.typography.fontFamilies.serif}
              </div>
              <div
                className="text-base"
                style={{ fontFamily: config.primitives.typography.fontFamilies.serif }}
              >
                The quick brown fox jumps over the lazy dog. 0123456789
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground mb-2 font-mono">
                Mono: {config.primitives.typography.fontFamilies.mono}
              </div>
              <div
                className="text-base"
                style={{ fontFamily: config.primitives.typography.fontFamilies.mono }}
              >
                The quick brown fox jumps over the lazy dog. 0123456789
              </div>
            </div>
          </div>
        </div>

        {/* Line Heights */}
        <div>
          <div className="text-sm text-muted-foreground mb-3">Line Heights</div>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground mb-2">
                Tight ({config.primitives.typography.lineHeights.tight})
              </div>
              <div
                style={{
                  fontFamily: config.primitives.typography.fontFamilies.sans,
                  lineHeight: config.primitives.typography.lineHeights.tight
                }}
              >
                Design systems are the backbone of consistent user interfaces. They provide a shared language and reusable components that help teams build products faster.
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground mb-2">
                Normal ({config.primitives.typography.lineHeights.normal})
              </div>
              <div
                style={{
                  fontFamily: config.primitives.typography.fontFamilies.sans,
                  lineHeight: config.primitives.typography.lineHeights.normal
                }}
              >
                Design systems are the backbone of consistent user interfaces. They provide a shared language and reusable components that help teams build products faster.
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground mb-2">
                Relaxed ({config.primitives.typography.lineHeights.relaxed})
              </div>
              <div
                style={{
                  fontFamily: config.primitives.typography.fontFamilies.sans,
                  lineHeight: config.primitives.typography.lineHeights.relaxed
                }}
              >
                Design systems are the backbone of consistent user interfaces. They provide a shared language and reusable components that help teams build products faster.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-6 border-t">
        <button
          onClick={onExport}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          Export Configuration
        </button>
        <button
          onClick={onEdit}
          className="px-6 py-2.5 border rounded-lg hover:bg-accent transition-colors font-medium"
        >
          Edit Settings
        </button>
      </div>
    </div>
  )
}
