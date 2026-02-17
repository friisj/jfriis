'use client'

import { Slider } from '@/components/ui/slider'

interface PaletteSliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  formatValue?: (value: number) => string
  onChange: (value: number) => void
  disabled?: boolean
}

export function PaletteSlider({
  label,
  value,
  min,
  max,
  step = 1,
  formatValue,
  onChange,
  disabled,
}: PaletteSliderProps) {
  const display = formatValue ? formatValue(value) : String(value)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-white/60 font-medium">{label}</label>
        <span className="text-xs text-white/60 font-mono">{display}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        disabled={disabled}
      />
    </div>
  )
}
