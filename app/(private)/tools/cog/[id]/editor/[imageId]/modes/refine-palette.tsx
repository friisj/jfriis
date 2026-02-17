'use client'

import { FloatingPalette } from '../../../floating-palette'
import { ActionBar } from '../palette/action-bar'
import { PaletteHint } from '../palette/palette-hint'
import type { useRefineMode, RefinementModel, ImageSize, AspectRatio } from './use-refine-mode'

interface RefinePaletteProps {
  refine: ReturnType<typeof useRefineMode>
}

const selectClass =
  'px-3 py-2 bg-white/10 border border-white/20 rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50'

export function RefinePalette({ refine }: RefinePaletteProps) {
  return (
    <FloatingPalette id="refine" title="Refine" anchor="bottom-left" className="w-[360px]">
      <div className="space-y-3">
        {/* Prompt */}
        <div>
          <label className="text-xs text-white/60 font-medium mb-2 block">
            Describe Changes
          </label>
          <textarea
            value={refine.prompt}
            onChange={(e) => refine.setPrompt(e.target.value)}
            placeholder="E.g., 'Make the sky more dramatic' or 'Add warmer tones'"
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            rows={2}
            disabled={refine.isRefining}
          />
        </div>

        {/* Model + Size + Aspect in a grid */}
        <div className="grid grid-cols-3 gap-2">
          <select
            value={refine.model}
            onChange={(e) => refine.setModel(e.target.value as RefinementModel)}
            className={selectClass}
            disabled={refine.isRefining}
          >
            <option value="gemini-3-pro">Gemini 3 Pro</option>
            <option value="flux-2-pro">Flux 2 Pro</option>
            <option value="flux-2-dev">Flux 2 Dev</option>
          </select>
          <select
            value={refine.imageSize}
            onChange={(e) => refine.setImageSize(e.target.value as ImageSize)}
            className={selectClass}
            disabled={refine.isRefining}
          >
            <option value="1K">1K</option>
            <option value="2K">2K</option>
            <option value="4K">4K</option>
          </select>
          <select
            value={refine.aspectRatio}
            onChange={(e) => refine.setAspectRatio(e.target.value as AspectRatio)}
            className={selectClass}
            disabled={refine.isRefining}
          >
            <option value="1:1">1:1</option>
            <option value="16:9">16:9</option>
            <option value="4:3">4:3</option>
            <option value="3:2">3:2</option>
            <option value="9:16">9:16</option>
            <option value="2:3">2:3</option>
          </select>
        </div>

        <ActionBar
          primaryLabel="Generate Refinement"
          loadingLabel="Generating..."
          onPrimary={refine.handleGenerate}
          onClear={refine.handleClear}
          isPrimaryDisabled={!refine.canSubmit}
          isClearDisabled={!refine.prompt}
          isLoading={refine.isRefining}
        />
        <PaletteHint>
          Takes 30-60 seconds
        </PaletteHint>
      </div>
    </FloatingPalette>
  )
}
