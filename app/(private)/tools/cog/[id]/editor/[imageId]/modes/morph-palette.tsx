'use client'

import { FloatingPalette } from '../../../floating-palette'
import { PaletteSlider } from '../palette/palette-slider'
import { ToolToggle } from '../palette/tool-toggle'
import { ActionBar } from '../palette/action-bar'
import { PaletteHint } from '../palette/palette-hint'
import type { useMorphMode } from './use-morph-mode'

interface MorphPaletteProps {
  morph: ReturnType<typeof useMorphMode>
}

const TOOL_OPTIONS = [
  { value: 'bloat' as const, label: 'Bloat' },
  { value: 'pucker' as const, label: 'Pucker' },
]

export function MorphPalette({ morph }: MorphPaletteProps) {
  return (
    <FloatingPalette id="morph" title="Morph" anchor="bottom-left" className="w-[360px]">
      <div className="space-y-3">
        <ToolToggle
          label="Tool"
          options={TOOL_OPTIONS}
          value={morph.tool}
          onChange={morph.setTool}
        />
        <PaletteSlider
          label="Strength"
          value={morph.strength}
          min={10}
          max={100}
          onChange={morph.setStrength}
        />
        <PaletteSlider
          label="Radius"
          value={morph.radius}
          min={20}
          max={200}
          onChange={morph.setRadius}
        />
        <ActionBar
          primaryLabel="Save Morph"
          loadingLabel="Saving..."
          onPrimary={morph.handleSave}
          onClear={morph.handleClear}
          isPrimaryDisabled={!morph.canSubmit}
          isClearDisabled={!morph.hasMorphed}
          isLoading={morph.isSaving}
        />
        <PaletteHint>
          Click image to apply {morph.tool}
        </PaletteHint>
      </div>
    </FloatingPalette>
  )
}
