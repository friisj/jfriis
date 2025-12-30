'use client'

/**
 * AIFieldControls Component
 *
 * Renders AI generation controls for a form field:
 * - Quick generate button [✨]
 * - Custom instructions dropdown [⚙️ ▾]
 */

import { useState, useRef, useEffect } from 'react'
import { useGenerate, type FieldState } from '@/lib/ai/hooks/useGenerate'
import { FieldError } from './FieldError'
import type { ActionError } from '@/lib/ai/actions/types'

interface AIFieldControlsProps {
  fieldName: string
  entityType: string
  context: Record<string, unknown>
  currentValue?: string
  onGenerate: (content: string) => void
  disabled?: boolean
}

export function AIFieldControls({
  fieldName,
  entityType,
  context,
  currentValue,
  onGenerate,
  disabled = false,
}: AIFieldControlsProps) {
  const [showInstructions, setShowInstructions] = useState(false)
  const [instructions, setInstructions] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { state, error, generate, generateWithInstructions, stop, clearError } = useGenerate({
    entityType,
    fieldName,
    onSuccess: onGenerate,
  })

  const isGenerating = state === 'generating'
  const hasError = state === 'error' && error

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowInstructions(false)
      }
    }

    if (showInstructions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showInstructions])

  const handleQuickGenerate = async () => {
    if (isGenerating) {
      stop()
      return
    }
    await generate(context, currentValue)
  }

  const handleGenerateWithInstructions = async () => {
    if (!instructions.trim()) {
      await generate(context, currentValue)
    } else {
      await generateWithInstructions(context, instructions.trim(), currentValue)
    }
    setShowInstructions(false)
    setInstructions('')
  }

  return (
    <div className="relative inline-flex items-center gap-1">
      {/* Quick generate button */}
      <button
        type="button"
        onClick={handleQuickGenerate}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center
          w-7 h-7 rounded-md
          text-sm font-medium
          transition-colors
          ${isGenerating
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={isGenerating ? 'Stop generation' : 'Generate content'}
      >
        {isGenerating ? (
          <span className="animate-spin">◌</span>
        ) : (
          <span>✨</span>
        )}
      </button>

      {/* Custom instructions button */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setShowInstructions(!showInstructions)}
          disabled={disabled || isGenerating}
          className={`
            inline-flex items-center justify-center
            w-7 h-7 rounded-md
            text-sm font-medium
            transition-colors
            hover:bg-muted text-muted-foreground hover:text-foreground
            ${disabled || isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title="Custom instructions"
        >
          <span>⚙️</span>
          <span className="text-[10px] ml-0.5">▾</span>
        </button>

        {/* Instructions dropdown */}
        {showInstructions && (
          <div className="absolute right-0 top-full mt-1 z-50 w-72 p-3 rounded-lg border bg-popover shadow-lg">
            <label className="block text-sm font-medium mb-2">
              Instructions
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Keep it under 2 sentences, focus on the problem..."
              className="w-full h-20 px-3 py-2 text-sm rounded-md border bg-background resize-none"
              autoFocus
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleGenerateWithInstructions}
                className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Generate
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {hasError && (
        <div className="absolute left-0 top-full mt-1 z-40">
          <FieldError
            error={error}
            onRetry={() => generate(context, currentValue)}
            onDismiss={clearError}
          />
        </div>
      )}
    </div>
  )
}
