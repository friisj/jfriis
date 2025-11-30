'use client'

import { useState } from 'react'
import type { DesignSystemConfig } from './design-system-tool'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NestedRadiusProvider, NestedRadiusContainer, useNestedRadius, NestedRadiusDebug } from './nested-radius-context'
import { generateNestingMap, getMaxNestingDepth } from '@/lib/nested-radius'

export function NestedRadiusTemplate({ config }: { config: DesignSystemConfig }) {
  const [selectedSemanticToken, setSelectedSemanticToken] = useState<'interactive' | 'surface' | 'dialog'>('surface')
  const [selectedPadding, setSelectedPadding] = useState(16)
  const [showDebug, setShowDebug] = useState(false)
  const [comparisonMode, setComparisonMode] = useState<'correct' | 'incorrect' | 'both'>('both')

  const sans = config.primitives.typography.fontFamilies.sans.stack
  const sizes = config.primitives.typography.typeScale.sizes

  // Calculate nesting information
  const baseRadius = config.semantic.radius[selectedSemanticToken]
  const nestingMap = generateNestingMap(baseRadius, 6, selectedPadding)
  const maxDepth = getMaxNestingDepth(baseRadius, selectedPadding)

  return (
    <div className="space-y-12" style={{ fontFamily: sans }}>
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-3">Nested Radius System</h1>
        <p className="text-muted-foreground" style={{ fontSize: sizes.lg }}>
          Mathematically correct border radius for nested containers
        </p>
      </div>

      {/* Controls */}
      <section className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Adjust settings to see how nested radius calculation works
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Semantic Token Selector */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Semantic Token</label>
              <div className="flex gap-2">
                {(['interactive', 'surface', 'dialog'] as const).map((token) => (
                  <button
                    key={token}
                    onClick={() => setSelectedSemanticToken(token)}
                    className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                      selectedSemanticToken === token
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {token}
                    <span className="ml-2 text-xs opacity-70">
                      ({config.semantic.radius[token]})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Padding Selector */}
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Padding Between Levels: <span className="font-mono">{selectedPadding}px</span>
              </label>
              <input
                type="range"
                min="4"
                max="32"
                step="4"
                value={selectedPadding}
                onChange={(e) => setSelectedPadding(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>4px</span>
                <span>32px</span>
              </div>
            </div>

            {/* Info Display */}
            <div className="pt-4 border-t space-y-2">
              <div className="text-sm">
                Base Radius: <span className="font-mono font-medium">{baseRadius}</span>
              </div>
              <div className="text-sm">
                Max Nesting Depth: <span className="font-mono font-medium">{maxDepth} levels</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Formula: <code className="px-1 py-0.5 bg-muted rounded text-xs">inner = max(0, outer - padding)</code>
              </div>
            </div>

            {/* View Options */}
            <div className="pt-4 border-t space-y-3">
              <label className="text-sm font-medium">Comparison Mode</label>
              <div className="flex gap-2">
                {(['both', 'correct', 'incorrect'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setComparisonMode(mode)}
                    className={`px-3 py-1 rounded text-xs border transition-colors ${
                      comparisonMode === mode
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {mode === 'both' ? 'Side by Side' : mode === 'correct' ? 'Correct Only' : 'Incorrect Only'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs px-3 py-1 border rounded hover:bg-accent transition-colors"
              >
                {showDebug ? 'Hide' : 'Show'} Debug Info
              </button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Nesting Map Visualization */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Calculated Nesting Map</h2>
          <p className="text-muted-foreground">
            Radius values for each nesting level
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nestingMap.map(({ level, radius, css }) => (
            <div
              key={level}
              className="p-4 border rounded-lg bg-muted/30"
            >
              <div className="flex items-center justify-between mb-3">
                <Badge variant={radius === 0 ? 'destructive' : 'default'}>
                  Level {level}
                </Badge>
                <span className="font-mono text-sm font-medium">{css}</span>
              </div>
              <div
                className="w-full h-16 bg-primary/20 border border-primary/40"
                style={{ borderRadius: css }}
              />
              {radius === 0 && (
                <p className="text-xs text-destructive mt-2">
                  Maximum depth reached
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Side-by-Side Comparison */}
      {comparisonMode !== 'incorrect' && comparisonMode !== 'correct' && (
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Correct vs Incorrect</h2>
            <p className="text-muted-foreground">
              Compare mathematically correct nesting (left) with uniform radius (right)
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Correct Implementation */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="default">Correct</Badge>
                <span className="text-sm text-muted-foreground">Using calculated nested radius</span>
              </div>
              <NestedRadiusProvider config={config} semanticToken={selectedSemanticToken} padding={selectedPadding}>
                <CorrectExample />
              </NestedRadiusProvider>
            </div>

            {/* Incorrect Implementation */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">Incorrect</Badge>
                <span className="text-sm text-muted-foreground">Using uniform radius</span>
              </div>
              <IncorrectExample baseRadius={baseRadius} padding={selectedPadding} />
            </div>
          </div>
        </section>
      )}

      {/* Interactive Demo: Dashboard Layout */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Dashboard Example</h2>
          <p className="text-muted-foreground">
            Real-world example showing nested cards with automatic radius calculation
          </p>
        </div>

        <NestedRadiusProvider config={config} semanticToken={selectedSemanticToken} padding={selectedPadding}>
          <DashboardExample />
        </NestedRadiusProvider>
      </section>

      {/* Interactive Demo: Form Layout */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Form Example</h2>
          <p className="text-muted-foreground">
            Form with grouped sections demonstrating 3-level nesting
          </p>
        </div>

        <NestedRadiusProvider config={config} semanticToken="interactive" padding={selectedPadding}>
          <FormExample />
        </NestedRadiusProvider>
      </section>

      {/* Usage Example */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Usage in Code</h2>
          <p className="text-muted-foreground">
            How to use the nested radius system in your components
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
              <code>{`import { NestedRadiusProvider, NestedRadiusContainer } from '@/components/studio/nested-radius-context'

// Wrap your component tree
<NestedRadiusProvider config={config} semanticToken="surface" padding={16}>
  <NestedRadiusContainer className="p-4 bg-card">
    <NestedRadiusContainer className="p-4 bg-muted">
      <NestedRadiusContainer className="p-4 bg-accent">
        Content with automatically calculated radius
      </NestedRadiusContainer>
    </NestedRadiusContainer>
  </NestedRadiusContainer>
</NestedRadiusProvider>`}</code>
            </pre>

            <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
              <code>{`// Or use the hook for custom styling
import { useNestedRadius } from '@/components/studio/nested-radius-context'

function MyComponent() {
  const borderRadius = useNestedRadius()
  return <div style={{ borderRadius }}>Content</div>
}`}</code>
            </pre>
          </CardContent>
        </Card>
      </section>

      {/* Debug Overlay */}
      {showDebug && <NestedRadiusDebug />}
    </div>
  )
}

// Example component showing correct nesting
function CorrectExample() {
  return (
    <NestedRadiusContainer className="p-6 bg-card border border-border">
      <div className="space-y-4">
        <div className="font-medium">Outer Container</div>
        <NestedRadiusContainer className="p-4 bg-muted">
          <div className="text-sm mb-3">Middle Container</div>
          <NestedRadiusContainer className="p-3 bg-background border border-border">
            <div className="text-sm mb-2">Inner Container</div>
            <NestedRadiusContainer className="p-2 bg-accent text-xs">
              Deepest Level
            </NestedRadiusContainer>
          </NestedRadiusContainer>
        </NestedRadiusContainer>
      </div>
    </NestedRadiusContainer>
  )
}

// Example showing incorrect uniform radius
function IncorrectExample({ baseRadius, padding }: { baseRadius: string; padding: number }) {
  return (
    <div className="p-6 bg-card border border-border" style={{ borderRadius: baseRadius }}>
      <div className="space-y-4">
        <div className="font-medium">Outer Container</div>
        <div className="p-4 bg-muted" style={{ borderRadius: baseRadius }}>
          <div className="text-sm mb-3">Middle Container</div>
          <div className="p-3 bg-background border border-border" style={{ borderRadius: baseRadius }}>
            <div className="text-sm mb-2">Inner Container</div>
            <div className="p-2 bg-accent text-xs" style={{ borderRadius: baseRadius }}>
              Deepest Level
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Dashboard example with stats cards
function DashboardExample() {
  return (
    <NestedRadiusContainer className="p-6 bg-card border border-border">
      <h3 className="font-semibold text-lg mb-4">Analytics Dashboard</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Users', value: '12,345', change: '+12%' },
          { label: 'Revenue', value: '$45,678', change: '+8%' },
          { label: 'Active Sessions', value: '1,234', change: '+23%' }
        ].map((stat, idx) => (
          <NestedRadiusContainer key={idx} className="p-4 bg-muted">
            <div className="text-sm text-muted-foreground mb-1">{stat.label}</div>
            <div className="text-2xl font-bold mb-2">{stat.value}</div>
            <NestedRadiusContainer className="px-2 py-1 bg-green-500/10 border border-green-500/20 inline-block">
              <span className="text-xs text-green-600 dark:text-green-400">{stat.change}</span>
            </NestedRadiusContainer>
          </NestedRadiusContainer>
        ))}
      </div>
    </NestedRadiusContainer>
  )
}

// Form example with grouped inputs
function FormExample() {
  return (
    <NestedRadiusContainer className="p-6 bg-card border border-border">
      <h3 className="font-semibold text-lg mb-4">User Profile</h3>
      <div className="space-y-4">
        <NestedRadiusContainer className="p-4 bg-muted">
          <div className="font-medium text-sm mb-3">Personal Information</div>
          <div className="space-y-2">
            <NestedRadiusContainer className="p-3 bg-background border border-border">
              <div className="text-xs text-muted-foreground mb-1">Full Name</div>
              <div className="text-sm">John Doe</div>
            </NestedRadiusContainer>
            <NestedRadiusContainer className="p-3 bg-background border border-border">
              <div className="text-xs text-muted-foreground mb-1">Email</div>
              <div className="text-sm">john@example.com</div>
            </NestedRadiusContainer>
          </div>
        </NestedRadiusContainer>

        <NestedRadiusContainer className="p-4 bg-muted">
          <div className="font-medium text-sm mb-3">Preferences</div>
          <div className="space-y-2">
            <NestedRadiusContainer className="p-3 bg-background border border-border">
              <div className="text-xs text-muted-foreground mb-1">Theme</div>
              <div className="text-sm">Auto</div>
            </NestedRadiusContainer>
            <NestedRadiusContainer className="p-3 bg-background border border-border">
              <div className="text-xs text-muted-foreground mb-1">Language</div>
              <div className="text-sm">English</div>
            </NestedRadiusContainer>
          </div>
        </NestedRadiusContainer>
      </div>
    </NestedRadiusContainer>
  )
}
