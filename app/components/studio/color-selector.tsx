'use client'

import { TAILWIND_SCALES, SHADES, getTailwindColor, getScaleLabel, getShadeLabel } from '@/lib/tailwind-colors'
import type { ScaleShade } from '@/lib/tailwind-colors'

interface ColorSelectorProps {
  value: ScaleShade
  onChange: (value: ScaleShade) => void
  label: string
}

export function ColorSelector({ value, onChange, label }: ColorSelectorProps) {
  const currentColor = getTailwindColor(value.scale, value.shade)

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
          title={`${getScaleLabel(value.scale)} ${getShadeLabel(value.shade)}`}
        />

        {/* Scale Selector */}
        <select
          value={value.scale}
          onChange={(e) => onChange({ ...value, scale: e.target.value as any })}
          className="flex-1 px-3 py-2 border rounded-md bg-background text-sm hover:bg-accent transition-colors"
        >
          {TAILWIND_SCALES.map((scale) => (
            <option key={scale} value={scale}>
              {getScaleLabel(scale)}
            </option>
          ))}
        </select>

        {/* Shade Selector */}
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
      </div>

      {/* Color value display */}
      <div className="text-xs text-muted-foreground font-mono">
        {currentColor}
      </div>
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
