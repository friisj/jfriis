'use client'

import { useState, useEffect } from 'react'
import type { FontFamily, SystemFont, FontWeight, getWeightLabel } from '@/lib/fonts/font-scanner'
import type { FontFamilyConfig, FontFaceRule } from './design-system-tool'

interface FontFamilySelectorProps {
  role: 'sans' | 'serif' | 'mono'
  value: FontFamilyConfig
  onChange: (config: FontFamilyConfig) => void
}

export function FontFamilySelector({ role, value, onChange }: FontFamilySelectorProps) {
  const [availableFonts, setAvailableFonts] = useState<{
    custom: FontFamily[]
    system: SystemFont[]
  } | null>(null)
  const [mode, setMode] = useState<'simple' | 'advanced'>(value.files && value.files.length > 0 ? 'advanced' : 'simple')
  const [selectedFamily, setSelectedFamily] = useState<string>(value.name)
  const [fontLoaded, setFontLoaded] = useState<boolean | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  useEffect(() => {
    fetch('/api/fonts')
      .then(res => res.json())
      .then(data => {
        setAvailableFonts({
          custom: data.customFonts || [],
          system: data.systemFonts || []
        })
      })
      .catch(err => console.error('Failed to load fonts:', err))
  }, [])

  // Validate font loading for custom fonts
  useEffect(() => {
    if (value.source === 'system') {
      setFontLoaded(true)
      return
    }

    if (!value.files || value.files.length === 0) {
      setFontLoaded(null)
      return
    }

    setIsValidating(true)

    // Use Font Loading API to check if font is actually loaded
    const validateFont = async () => {
      try {
        // Test if the font renders differently than a fallback
        const testText = 'mmmmmmmmmmlli'
        const fallbackFont = 'monospace'

        // Create a canvas to measure text
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (!context) {
          setFontLoaded(null)
          setIsValidating(false)
          return
        }

        // Measure with fallback
        context.font = `16px ${fallbackFont}`
        const fallbackWidth = context.measureText(testText).width

        // Measure with custom font
        context.font = `16px "${value.name}", ${fallbackFont}`
        const customWidth = context.measureText(testText).width

        // If widths are different, font is loaded
        const isLoaded = Math.abs(customWidth - fallbackWidth) > 0.1

        setFontLoaded(isLoaded)
        setIsValidating(false)
      } catch (error) {
        console.error('Font validation error:', error)
        setFontLoaded(null)
        setIsValidating(false)
      }
    }

    // Wait a bit for fonts to load
    const timer = setTimeout(validateFont, 500)
    return () => clearTimeout(timer)
  }, [value.name, value.source, value.files])

  const handleFamilyChange = (familyName: string, source: 'custom' | 'system') => {
    if (!availableFonts) return

    if (source === 'system') {
      const systemFont = availableFonts.system.find(f => f.name === familyName)
      if (!systemFont) return

      const weights: FontFamilyConfig['weights'] = {
        normal: 400,
        bold: 700
      }

      if (systemFont.availableWeights.includes(300)) weights.light = 300
      if (systemFont.availableWeights.includes(500)) weights.medium = 500
      if (systemFont.availableWeights.includes(600)) weights.semibold = 600
      if (systemFont.availableWeights.includes(800)) weights.extrabold = 800

      onChange({
        name: systemFont.displayName,
        stack: systemFont.stack,
        source: 'system',
        weights
      })
    } else {
      const customFont = availableFonts.custom.find(f => f.name === familyName)
      if (!customFont) return

      // Auto-map available weights
      const weights: FontFamilyConfig['weights'] = {
        normal: 400,
        bold: 700
      }

      const files: FontFaceRule[] = []

      // Map available weights
      for (const file of customFont.files) {
        files.push({
          family: customFont.displayName,
          weight: file.weight,
          style: file.style,
          path: file.path,
          format: file.format
        })

        // Auto-assign weights
        if (file.style === 'normal') {
          if (file.weight === 300) weights.light = 300
          else if (file.weight === 400) weights.normal = 400
          else if (file.weight === 500) weights.medium = 500
          else if (file.weight === 600) weights.semibold = 600
          else if (file.weight === 700) weights.bold = 700
          else if (file.weight >= 800) weights.extrabold = file.weight as FontWeight
        }
      }

      onChange({
        name: customFont.displayName,
        stack: `${customFont.displayName}, ${role === 'mono' ? 'monospace' : role === 'serif' ? 'serif' : 'sans-serif'}`,
        source: 'custom',
        files,
        weights
      })
    }

    setSelectedFamily(familyName)
  }

  const handleWeightMapping = (key: keyof FontFamilyConfig['weights'], weight: FontWeight) => {
    onChange({
      ...value,
      weights: {
        ...value.weights,
        [key]: weight
      }
    })
  }

  if (!availableFonts) {
    return <div className="text-sm text-muted-foreground">Loading fonts...</div>
  }

  const roleLabel = role === 'sans' ? 'Sans Serif' : role === 'serif' ? 'Serif' : 'Monospace'

  // Show all fonts (no filtering by role)
  const relevantCustomFonts = availableFonts.custom
  const relevantSystemFonts = availableFonts.system

  const currentFont = value.source === 'custom'
    ? relevantCustomFonts.find(f => f.name === selectedFamily)
    : null

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{roleLabel} Font</h4>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('simple')}
            className={`px-2 py-1 text-xs rounded ${
              mode === 'simple' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            Simple
          </button>
          <button
            onClick={() => setMode('advanced')}
            className={`px-2 py-1 text-xs rounded ${
              mode === 'advanced' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            Advanced
          </button>
        </div>
      </div>

      {/* Font Family Selection */}
      <div>
        <label className="block text-xs text-muted-foreground mb-2">Font Family</label>
        <select
          value={`${value.source}:${selectedFamily}`}
          onChange={(e) => {
            const [source, family] = e.target.value.split(':')
            handleFamilyChange(family, source as 'custom' | 'system')
          }}
          className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
        >
          <optgroup label="Custom Fonts">
            {relevantCustomFonts.map((font) => (
              <option key={font.name} value={`custom:${font.name}`}>
                {font.displayName} ({font.availableWeights.length} weights)
              </option>
            ))}
          </optgroup>
          <optgroup label="System Fonts">
            {relevantSystemFonts.map((font) => (
              <option key={font.name} value={`system:${font.name}`}>
                {font.displayName}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Font Stack Preview */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-muted-foreground">Font Stack</label>
          {value.source === 'custom' && (
            <div className="flex items-center gap-1 text-xs">
              {isValidating && <span className="text-muted-foreground">Validating...</span>}
              {!isValidating && fontLoaded === true && (
                <span className="text-green-600 dark:text-green-400">✓ Loaded</span>
              )}
              {!isValidating && fontLoaded === false && (
                <span className="text-amber-600 dark:text-amber-400">⚠ Using fallback</span>
              )}
            </div>
          )}
        </div>
        <div className="px-3 py-2 border rounded-lg bg-muted/50 text-xs font-mono">
          {value.stack}
        </div>
      </div>

      {/* Simple Mode: Just show available weights */}
      {mode === 'simple' && (
        <div>
          <label className="block text-xs text-muted-foreground mb-2">Available Weights</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(value.weights).map(([key, weight]) => (
              <div key={key} className="px-2 py-1 bg-primary/10 rounded text-xs">
                {key}: {weight}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Mode: Map font files to weights */}
      {mode === 'advanced' && value.source === 'custom' && currentFont && (
        <div className="space-y-3">
          <label className="block text-xs text-muted-foreground">Weight Mappings</label>

          {(['light', 'normal', 'medium', 'semibold', 'bold', 'extrabold'] as const).map((key) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-20 text-xs text-muted-foreground capitalize">{key}</div>
              <select
                value={value.weights[key] || ''}
                onChange={(e) => {
                  const weight = e.target.value ? Number(e.target.value) as FontWeight : undefined
                  if (weight) {
                    handleWeightMapping(key, weight)
                  }
                }}
                className="flex-1 px-2 py-1 border rounded bg-background text-xs"
              >
                <option value="">None</option>
                {currentFont.availableWeights.map((weight) => (
                  <option key={weight} value={weight}>
                    {weight} ({getWeightLabel(weight)})
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Show which font files will be used */}
          <div className="mt-4 pt-4 border-t">
            <label className="block text-xs text-muted-foreground mb-2">Font Files ({value.files?.length || 0})</label>
            <div className="space-y-1 max-h-32 overflow-auto">
              {value.files?.slice(0, 8).map((file, idx) => (
                <div key={idx} className="text-xs font-mono text-muted-foreground">
                  {file.weight} ({file.style}): {file.path.split('/').pop()}
                </div>
              ))}
              {value.files && value.files.length > 8 && (
                <div className="text-xs text-muted-foreground">
                  +{value.files.length - 8} more files...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="pt-3 border-t">
        <label className="block text-xs text-muted-foreground mb-2">Preview</label>
        <div
          className="text-base"
          style={{ fontFamily: value.stack, fontWeight: value.weights.normal }}
        >
          The quick brown fox jumps over the lazy dog
        </div>
        <div
          className="text-base mt-1"
          style={{ fontFamily: value.stack, fontWeight: value.weights.bold }}
        >
          The quick brown fox jumps over the lazy dog
        </div>
      </div>
    </div>
  )
}

// Export helper function for weight label
function getWeightLabel(weight: FontWeight): string {
  const labels: Record<FontWeight, string> = {
    100: 'Thin',
    200: 'Extra Light',
    300: 'Light',
    400: 'Regular',
    500: 'Medium',
    600: 'Semi Bold',
    700: 'Bold',
    800: 'Extra Bold',
    900: 'Black'
  }
  return labels[weight]
}
