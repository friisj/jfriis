'use client'

import { useState } from 'react'
import { TAILWIND_SCALES, SHADES, getTailwindColor, getScaleLabel, getShadeLabel, getColorValue } from '@/lib/tailwind-colors'
import type { ScaleShade } from '@/lib/tailwind-colors'
import { OklchPicker } from './oklch-picker'

interface ColorSelectorProps {
  value: ScaleShade
  onChange: (value: ScaleShade) => void
  label: string
}

export function ColorSelector({ value, onChange, label }: ColorSelectorProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(value.scale === 'custom')
  const currentColor = getColorValue(value)

  const handleScaleChange = (newScale: string) => {
    if (newScale === 'custom') {
      // Initialize with default OKLCH values when switching to custom
      onChange({
        scale: 'custom',
        shade: 500, // Not used for custom but keep for type compatibility
        customOklch: value.customOklch || { l: 50, c: 0.15, h: 240 }
      })
      setShowCustomPicker(true)
    } else {
      onChange({ scale: newScale as any, shade: value.shade })
      setShowCustomPicker(false)
    }
  }

  const handleCustomOklchChange = (l: number, c: number, h: number) => {
    onChange({
      ...value,
      scale: 'custom',
      customOklch: { l, c, h }
    })
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        {label}
      </label>

      <div className="flex items-center gap-2">
        {/* Color Preview */}
        <div
          className="w-10 h-10 rounded-md border border-border shadow-sm"
          style={{ backgroundColor: currentColor }}
          title={value.scale === 'custom' ? 'Custom OKLCH' : `${getScaleLabel(value.scale as any)} ${getShadeLabel(value.shade)}`}
        />

        {/* Scale Selector */}
        <select
          value={value.scale}
          onChange={(e) => handleScaleChange(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-md bg-background text-sm hover:bg-accent transition-colors"
        >
          {TAILWIND_SCALES.map((scale) => (
            <option key={scale} value={scale}>
              {getScaleLabel(scale)}
            </option>
          ))}
          <option value="custom">Custom OKLCH</option>
        </select>

        {/* Shade Selector (hidden for custom) */}
        {!showCustomPicker && (
          <select
            value={value.shade}
            onChange={(e) => onChange({ ...value, shade: parseInt(e.target.value) as any })}
            className="w-24 px-3 py-2 border rounded-md bg-background text-sm hover:bg-accent transition-colors"
          >
            {SHADES.map((shade) => (
              <option key={shade} value={shade}>
                {shade}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Custom OKLCH Picker */}
      {showCustomPicker && value.customOklch && (
        <div className="mt-3 p-3 border rounded-md bg-muted/30">
          <OklchPicker
            l={value.customOklch.l}
            c={value.customOklch.c}
            h={value.customOklch.h}
            onChange={handleCustomOklchChange}
          />
        </div>
      )}

      {/* Color value display (for non-custom) */}
      {!showCustomPicker && (
        <div className="text-xs text-muted-foreground font-mono">
          {currentColor}
        </div>
      )}
    </div>
  )
}

/**
 * Paired color selector for light/dark mode
 */
interface ColorPairSelectorProps {
  light: ScaleShade
  dark: ScaleShade
  onChange: (light: ScaleShade, dark: ScaleShade) => void
  label: string
  description?: string
}

export function ColorPairSelector({
  light,
  dark,
  onChange,
  label,
  description
}: ColorPairSelectorProps) {
  return (
    <div className="space-y-3 p-4 border rounded-lg bg-card">
      <div>
        <h4 className="text-sm font-semibold text-foreground">{label}</h4>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <ColorSelector
            value={light}
            onChange={(newLight) => onChange(newLight, dark)}
            label="Light Mode"
          />
        </div>

        <div>
          <ColorSelector
            value={dark}
            onChange={(newDark) => onChange(light, newDark)}
            label="Dark Mode"
          />
        </div>
      </div>
    </div>
  )
}
