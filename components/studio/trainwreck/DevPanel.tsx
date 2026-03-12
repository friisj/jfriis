'use client'

import { useState } from 'react'
import { DevControls } from '@/lib/studio/trainwreck/types'

interface SliderParam {
  key: keyof DevControls
  label: string
  min: number
  max: number
  step: number
}

const PARAMS: SliderParam[] = [
  { key: 'speedMultiplier', label: 'Speed', min: 0.1, max: 3, step: 0.1 },
  { key: 'derailForce', label: 'Derail Force', min: 0.5, max: 8, step: 0.25 },
  { key: 'derailSpread', label: 'Derail Spread', min: 0.1, max: 5, step: 0.1 },
  { key: 'brakeRate', label: 'Brake Rate', min: 0.1, max: 3, step: 0.1 },
  { key: 'gravity', label: 'Gravity', min: 2, max: 30, step: 0.5 },
  { key: 'bounceRestitution', label: 'Bounce', min: 0, max: 0.9, step: 0.05 },
  { key: 'toolUses', label: 'Tool Uses', min: 1, max: 10, step: 1 },
]

export function DevPanel({
  controls,
  onChange,
  onReset,
}: {
  controls: DevControls
  onChange: (key: keyof DevControls, value: number) => void
  onReset: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute top-4 left-4 pointer-events-auto" style={{ top: '60px' }}>
      <button
        onClick={() => setOpen(!open)}
        className="bg-black/70 text-white/70 px-3 py-1.5 rounded-lg text-xs font-mono hover:bg-black/90 hover:text-white transition-colors"
      >
        {open ? 'x' : 'DEV'}
      </button>

      {open && (
        <div className="mt-2 bg-black/85 backdrop-blur-sm rounded-lg p-3 w-56 space-y-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/60 text-[10px] font-mono uppercase tracking-wider">Physics Tuning</span>
            <button
              onClick={onReset}
              className="text-[10px] text-white/40 hover:text-white/70 font-mono"
            >
              reset
            </button>
          </div>

          {PARAMS.map(({ key, label, min, max, step }) => (
            <div key={key}>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-white/60 font-mono">{label}</span>
                <span className="text-yellow-400/80 font-mono tabular-nums">{controls[key].toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0)}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={controls[key]}
                onChange={(e) => onChange(key, parseFloat(e.target.value))}
                className="w-full h-1 appearance-none bg-white/10 rounded-full cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-400"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
