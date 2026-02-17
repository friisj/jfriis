'use client'

import { FloatingPalette } from '../../../floating-palette'
import { PaletteSlider } from '../palette/palette-slider'
import { ToolToggle } from '../palette/tool-toggle'
import { ActionBar } from '../palette/action-bar'
import { PaletteHint } from '../palette/palette-hint'
import type { useMaskEditMode } from './use-mask-edit-mode'

type EditMode = 'spot_removal' | 'guided_edit'

interface MaskEditPaletteProps {
  maskEdit: ReturnType<typeof useMaskEditMode>
  mode: EditMode
}

const BRUSH_OPTIONS = [
  { value: 'brush' as const, label: 'Brush', title: 'Brush (B)' },
  { value: 'eraser' as const, label: 'Eraser', title: 'Eraser (E)' },
]

const SHORTCUTS = [
  { key: 'B', label: 'brush' },
  { key: 'E', label: 'eraser' },
  { key: '[ ]', label: 'size' },
]

export function MaskEditPalette({ maskEdit, mode }: MaskEditPaletteProps) {
  const isSpot = mode === 'spot_removal'
  const title = isSpot ? 'Spot Removal' : 'Guided Edit'

  return (
    <FloatingPalette id="mask-edit" title={title} anchor="bottom-left" className="w-[360px]">
      <div className="space-y-3">
        <ToolToggle
          label="Tool"
          options={BRUSH_OPTIONS}
          value={maskEdit.brushTool}
          onChange={maskEdit.setBrushTool}
          disabled={maskEdit.isSaving}
        />
        <PaletteSlider
          label="Brush Size"
          value={maskEdit.brushSize}
          min={5}
          max={100}
          formatValue={(v) => `${v}px`}
          onChange={maskEdit.setBrushSize}
          disabled={maskEdit.isSaving}
        />
        <PaletteSlider
          label="Mask Opacity"
          value={maskEdit.maskOpacity}
          min={0}
          max={1}
          step={0.1}
          formatValue={(v) => `${Math.round(v * 100)}%`}
          onChange={maskEdit.setMaskOpacity}
          disabled={maskEdit.isSaving}
        />

        {/* Prompt — only for guided edit */}
        {!isSpot && (
          <div>
            <label className="text-xs text-white/60 font-medium mb-2 block">
              Edit Instruction
            </label>
            <textarea
              value={maskEdit.prompt}
              onChange={(e) => maskEdit.setPrompt(e.target.value)}
              placeholder="E.g., 'Replace with a window'"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              rows={2}
              disabled={maskEdit.isSaving}
            />
          </div>
        )}

        <ActionBar
          primaryLabel={isSpot ? 'Generate Removal' : 'Generate Edit'}
          loadingLabel="Generating..."
          onPrimary={isSpot ? maskEdit.handleSpotRemoval : maskEdit.handleGuidedEdit}
          onClear={maskEdit.handleClearMask}
          isPrimaryDisabled={isSpot ? !maskEdit.canSubmitSpot : !maskEdit.canSubmitGuided}
          isClearDisabled={!maskEdit.maskBase64}
          isLoading={maskEdit.isSaving}
        />
        <PaletteHint shortcuts={SHORTCUTS}>
          Takes 15-30 seconds
        </PaletteHint>
      </div>
    </FloatingPalette>
  )
}
