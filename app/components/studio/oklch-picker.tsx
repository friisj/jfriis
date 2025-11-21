'use client'

import { formatOklch } from '@/lib/tailwind-colors'

interface OklchPickerProps {
  l: number  // 0-100
  c: number  // 0-0.4
  h: number  // 0-360
  onChange: (l: number, c: number, h: number) => void
  label?: string
}

export function OklchPicker({ l, c, h, onChange, label }: OklchPickerProps) {
  const colorValue = formatOklch(l, c, h)

  return (
    <div className="space-y-3">
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      {/* Color Preview */}
      <div className="flex items-center gap-3">
        <div
          className="w-16 h-16 rounded-md border border-border shadow-sm"
          style={{ backgroundColor: colorValue }}
          title={colorValue}
        />
        <div className="flex-1">
          <div className="text-xs font-mono text-muted-foreground break-all">
            {colorValue}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(colorValue)}
            className="text-xs text-primary hover:underline mt-1"
          >
            Copy
          </button>
        </div>
      </div>

      {/* OKLCH Inputs */}
      <div className="space-y-3">
        {/* Lightness */}
        <div>
          <label className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Lightness (L)</span>
            <span className="font-mono">{l.toFixed(1)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={l}
            onChange={(e) => onChange(parseFloat(e.target.value), c, h)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
            <span>Black (0%)</span>
            <span>White (100%)</span>
          </div>
        </div>

        {/* Chroma */}
        <div>
          <label className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Chroma (C)</span>
            <span className="font-mono">{c.toFixed(3)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="0.4"
            step="0.001"
            value={c}
            onChange={(e) => onChange(l, parseFloat(e.target.value), h)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
            <span>Gray (0)</span>
            <span>Vibrant (0.4)</span>
          </div>
        </div>

        {/* Hue */}
        <div>
          <label className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Hue (H)</span>
            <span className="font-mono">{h.toFixed(1)}°</span>
          </label>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={h}
            onChange={(e) => onChange(l, c, parseFloat(e.target.value))}
            className="w-full"
            style={{
              background: `linear-gradient(to right,
                oklch(${l/100} ${c} 0),
                oklch(${l/100} ${c} 60),
                oklch(${l/100} ${c} 120),
                oklch(${l/100} ${c} 180),
                oklch(${l/100} ${c} 240),
                oklch(${l/100} ${c} 300),
                oklch(${l/100} ${c} 360)
              )`
            }}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
            <span>Red (0°)</span>
            <span>Full spectrum</span>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
        <p className="font-medium mb-1">OKLCH Color Space:</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li><strong>L</strong>: Perceptually uniform lightness</li>
          <li><strong>C</strong>: Colorfulness/saturation intensity</li>
          <li><strong>H</strong>: Hue angle around color wheel</li>
        </ul>
      </div>
    </div>
  )
}
