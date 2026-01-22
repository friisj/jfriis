'use client'

import { useState, useRef } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// P1-1: Validation constants
const INSTRUCTIONS_MAX_LENGTH = 1000

export interface AIGenerateOption {
  id: string
  label: string
  description: string
  defaultCount?: number
}

export interface GenerateSettings {
  count: number
  instructions?: string
  temperature?: number
  model?: 'claude-sonnet' | 'claude-opus'
}

interface AIGenerateMenuProps {
  label?: string
  options: AIGenerateOption[]
  onGenerate: (option: AIGenerateOption, settings: GenerateSettings) => Promise<void>
  disabled?: boolean
}

// P1-1: Sanitize instructions input
function sanitizeInstructions(input: string): string {
  // Trim whitespace
  let sanitized = input.trim()
  // Truncate to max length
  if (sanitized.length > INSTRUCTIONS_MAX_LENGTH) {
    sanitized = sanitized.substring(0, INSTRUCTIONS_MAX_LENGTH)
  }
  // Remove any control characters except newlines
  sanitized = sanitized.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
  return sanitized
}

export function AIGenerateMenu({
  label = 'Generate',
  options,
  onGenerate,
  disabled = false,
}: AIGenerateMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedOption, setSelectedOption] = useState<AIGenerateOption | null>(null)
  const [count, setCount] = useState(3)
  const [instructions, setInstructions] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [temperature, setTemperature] = useState(0.7)
  const [model, setModel] = useState<'claude-sonnet' | 'claude-opus'>('claude-sonnet')

  // P1-6: Ref to prevent concurrent requests
  const generationInProgressRef = useRef(false)

  const handleOptionSelect = (option: AIGenerateOption) => {
    setSelectedOption(option)
    setCount(option.defaultCount || 3)
    setError(null)
  }

  const handleGenerate = async () => {
    if (!selectedOption) return

    // P1-6: Guard against concurrent requests
    if (generationInProgressRef.current || isGenerating) {
      return
    }

    generationInProgressRef.current = true
    setIsGenerating(true)
    setError(null)

    try {
      // P1-1: Sanitize instructions before sending
      const sanitizedInstructions = instructions ? sanitizeInstructions(instructions) : undefined

      await onGenerate(selectedOption, {
        count,
        instructions: sanitizedInstructions || undefined,
        temperature: showAdvanced ? temperature : undefined,
        model: showAdvanced ? model : undefined,
      })
      setIsOpen(false)
      setSelectedOption(null)
      setInstructions('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
      generationInProgressRef.current = false
    }
  }

  const handleBack = () => {
    setSelectedOption(null)
    setError(null)
  }

  const handleClose = () => {
    // Don't allow closing while generating
    if (isGenerating) return
    setIsOpen(false)
    setSelectedOption(null)
    setInstructions('')
    setError(null)
  }

  // P1-1: Handle instructions change with validation
  const handleInstructionsChange = (value: string) => {
    // Prevent exceeding max length in the UI
    if (value.length <= INSTRUCTIONS_MAX_LENGTH) {
      setInstructions(value)
    }
  }

  const instructionsRemaining = INSTRUCTIONS_MAX_LENGTH - instructions.length

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose()
      else setIsOpen(true)
    }}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled || isGenerating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        {!selectedOption ? (
          // Option selection view
          <div>
            <div className="font-medium mb-3">What would you like to generate?</div>
            <div className="space-y-2">
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(option)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors"
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Configuration view
          <div>
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={handleBack}
                className="p-1 rounded hover:bg-muted"
                disabled={isGenerating}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="font-medium">{selectedOption.label}</span>
            </div>

            {/* Count slider */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-1 block">
                How many? <span className="text-muted-foreground">({count})</span>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                disabled={isGenerating}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>5</span>
              </div>
            </div>

            {/* Instructions */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-1 block">
                Focus instructions <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                value={instructions}
                onChange={(e) => handleInstructionsChange(e.target.value)}
                placeholder="e.g., Focus on mobile-first interactions..."
                disabled={isGenerating}
                rows={2}
                className="w-full px-2 py-1.5 text-sm border rounded-md resize-none disabled:opacity-50"
                maxLength={INSTRUCTIONS_MAX_LENGTH}
              />
              {/* P1-1: Show character count when approaching limit */}
              {instructionsRemaining < 200 && (
                <div className={`text-xs mt-1 ${instructionsRemaining < 50 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                  {instructionsRemaining} characters remaining
                </div>
              )}
            </div>

            {/* Advanced toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1"
              disabled={isGenerating}
            >
              <svg
                className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              Advanced options
            </button>

            {/* Advanced options */}
            {showAdvanced && (
              <div className="space-y-3 mb-4 p-3 bg-muted/50 rounded-md">
                {/* Temperature */}
                <div>
                  <label className="text-xs font-medium mb-1 block">
                    Creativity <span className="text-muted-foreground">({temperature.toFixed(1)})</span>
                  </label>
                  <input
                    type="range"
                    min="0.3"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    disabled={isGenerating}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Focused</span>
                    <span>Creative</span>
                  </div>
                </div>

                {/* Model */}
                <div>
                  <label className="text-xs font-medium mb-1 block">Model</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value as 'claude-sonnet' | 'claude-opus')}
                    disabled={isGenerating}
                    className="w-full px-2 py-1 text-sm border rounded-md"
                  >
                    <option value="claude-sonnet">Claude Sonnet (faster)</option>
                    <option value="claude-opus">Claude Opus (smarter)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="text-sm text-red-600 mb-3 p-2 bg-red-50 rounded-md">{error}</div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-2 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  Generate {count} {selectedOption.label.toLowerCase()}
                </>
              )}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
