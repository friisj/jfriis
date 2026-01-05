'use client'

/**
 * DraftGenerationControls Component
 *
 * LLM generation controls for log entry drafts.
 * Quick generate button + popover with full options.
 */

import { useState, useRef, useEffect } from 'react'
import { useDraftGenerator } from '@/lib/ai/hooks/useDraftGenerator'

export interface DraftGenerationControlsProps {
  currentContent: string
  context: {
    title: string
    type?: string
    tags?: string[]
  }
  onGenerated: (content: string, asNewDraft: boolean, metadata: GenerationMetadata) => void
  disabled?: boolean
}

export interface GenerationMetadata {
  instructions?: string
  model: 'claude-sonnet' | 'claude-opus'
  temperature: number
  mode: 'rewrite' | 'additive'
}

export function DraftGenerationControls({
  currentContent,
  context,
  onGenerated,
  disabled = false,
}: DraftGenerationControlsProps) {
  const [showPopover, setShowPopover] = useState(false)
  const [mode, setMode] = useState<'rewrite' | 'additive'>('rewrite')
  const [temperature, setTemperature] = useState(0.7)
  const [model, setModel] = useState<'claude-sonnet' | 'claude-opus'>('claude-sonnet')
  const [instructions, setInstructions] = useState('')
  const [asNewDraft, setAsNewDraft] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const { state, error, generate, stop, clearError } = useDraftGenerator()
  const isGenerating = state === 'generating'

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPopover(false)
      }
    }
    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPopover])

  const handleQuickGenerate = async () => {
    if (isGenerating) {
      stop()
      return
    }

    const result = await generate(currentContent, context, {
      mode: 'rewrite',
      temperature,
      model,
    })

    if (result) {
      onGenerated(result, false, {
        model,
        temperature,
        mode: 'rewrite',
      })
    }
  }

  const handlePopoverGenerate = async () => {
    const result = await generate(currentContent, context, {
      mode,
      instructions: instructions.trim() || undefined,
      temperature,
      model,
    })

    if (result) {
      onGenerated(result, asNewDraft, {
        instructions: instructions.trim() || undefined,
        model,
        temperature,
        mode,
      })
      setShowPopover(false)
      setInstructions('')
    }
  }

  return (
    <div className="relative inline-flex items-center gap-1">
      {/* Quick Generate Button */}
      <button
        type="button"
        onClick={handleQuickGenerate}
        disabled={disabled}
        aria-label={isGenerating ? 'Stop generation' : 'Rewrite content'}
        className={`
          inline-flex items-center justify-center
          w-8 h-8 rounded-md
          text-sm font-medium
          transition-colors
          ${isGenerating
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={isGenerating ? 'Stop generation' : 'Quick rewrite'}
      >
        {isGenerating ? (
          <span className="animate-spin">◌</span>
        ) : (
          <span>✨</span>
        )}
      </button>

      {/* Popover Trigger */}
      <div className="relative" ref={popoverRef}>
        <button
          type="button"
          onClick={() => setShowPopover(!showPopover)}
          disabled={disabled || isGenerating}
          aria-label="Generation options"
          className={`
            inline-flex items-center justify-center
            w-8 h-8 rounded-md
            text-sm font-medium
            transition-colors
            hover:bg-muted text-muted-foreground hover:text-foreground
            ${disabled || isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title="Generation options"
        >
          <span>⚙️</span>
        </button>

        {/* Popover */}
        {showPopover && (
          <div className="absolute right-0 top-full mt-1 z-50 w-72 p-4 rounded-lg border bg-popover shadow-lg">
            <div className="space-y-4">
              {/* Mode Toggle */}
              <div>
                <label className="block text-sm font-medium mb-2">Mode</label>
                <div className="flex rounded-md border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMode('rewrite')}
                    className={`flex-1 px-3 py-1.5 text-sm transition-colors ${
                      mode === 'rewrite'
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    Rewrite
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('additive')}
                    className={`flex-1 px-3 py-1.5 text-sm transition-colors border-l ${
                      mode === 'additive'
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    Add sections
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Instructions (optional)
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder={
                    mode === 'rewrite'
                      ? 'e.g., make it more concise...'
                      : 'e.g., add a conclusion section...'
                  }
                  className="w-full h-20 px-2 py-1.5 text-sm rounded border bg-background resize-none"
                />
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Creativity: {temperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min={0.3}
                  max={1.0}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Focused</span>
                  <span>Creative</span>
                </div>
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value as 'claude-sonnet' | 'claude-opus')}
                  className="w-full px-2 py-1.5 text-sm rounded border bg-background"
                >
                  <option value="claude-sonnet">Sonnet (faster)</option>
                  <option value="claude-opus">Opus (smarter)</option>
                </select>
              </div>

              {/* As New Draft Checkbox */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={asNewDraft}
                  onChange={(e) => setAsNewDraft(e.target.checked)}
                  className="rounded"
                />
                Generate as new draft
              </label>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handlePopoverGenerate}
                disabled={isGenerating}
                className="w-full px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="absolute top-full left-0 mt-1 p-2 rounded border border-red-200 bg-red-50 dark:bg-red-950/20 text-sm text-red-600 dark:text-red-400 flex items-center gap-2 whitespace-nowrap z-50">
          <span>{error.message}</span>
          <button
            type="button"
            onClick={clearError}
            className="text-red-400 hover:text-red-600"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
