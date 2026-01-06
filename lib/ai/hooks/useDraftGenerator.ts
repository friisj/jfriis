'use client'

/**
 * useDraftGenerator Hook
 *
 * Manages LLM-assisted draft content generation.
 * Simpler than useEntityGenerator - returns content for parent to handle.
 */

import { useState, useCallback, useRef } from 'react'
import type { ActionError, ActionResult } from '../actions/types'
import type { DraftGenerationOutput } from '../actions/generate-draft'

export type DraftGeneratorState = 'idle' | 'generating' | 'success' | 'error'

export interface DraftGeneratorOptions {
  mode: 'rewrite' | 'additive'
  instructions?: string
  temperature?: number
  model?: 'claude-sonnet' | 'claude-opus'
}

export interface DraftGeneratorResult {
  content: string
  suggestedTitle?: string
}

export interface UseDraftGeneratorReturn {
  state: DraftGeneratorState
  error: ActionError | null
  generate: (
    currentContent: string,
    context: { title: string; type?: string; tags?: string[] },
    options: DraftGeneratorOptions
  ) => Promise<DraftGeneratorResult | null>
  stop: () => void
  clearError: () => void
}

export function useDraftGenerator(): UseDraftGeneratorReturn {
  const [state, setState] = useState<DraftGeneratorState>('idle')
  const [error, setError] = useState<ActionError | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const clearError = useCallback(() => {
    setError(null)
    setState('idle')
  }, [])

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setState('idle')
  }, [])

  const generate = useCallback(
    async (
      currentContent: string,
      context: { title: string; type?: string; tags?: string[] },
      options: DraftGeneratorOptions
    ): Promise<DraftGeneratorResult | null> => {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()
      setState('generating')
      setError(null)

      try {
        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate-draft',
            input: {
              currentContent,
              mode: options.mode,
              instructions: options.instructions,
              temperature: options.temperature,
              model: options.model,
              title: context.title,
              type: context.type,
              tags: context.tags,
            },
          }),
          signal: abortControllerRef.current.signal,
        })

        const result: ActionResult<DraftGenerationOutput> = await response.json()

        if (!result.success || !result.data) {
          const actionError = result.error || {
            code: 'provider_error' as const,
            message: 'Failed to generate content',
            retryable: true,
          }
          setError(actionError)
          setState('error')
          return null
        }

        setState('success')

        // Reset to idle after brief success state
        setTimeout(() => {
          setState((current) => (current === 'success' ? 'idle' : current))
        }, 1000)

        // For additive mode, append to existing content
        if (options.mode === 'additive') {
          const separator = currentContent.trim() ? '\n\n' : ''
          return {
            content: currentContent + separator + result.data.content,
            suggestedTitle: result.data.suggested_title,
          }
        }

        return {
          content: result.data.content,
          suggestedTitle: result.data.suggested_title,
        }
      } catch (err) {
        // Handle abort
        if (err instanceof Error && err.name === 'AbortError') {
          setState('idle')
          return null
        }

        const actionError: ActionError = {
          code: 'network_error',
          message: 'Connection failed. Check your internet and try again.',
          retryable: true,
        }
        setError(actionError)
        setState('error')
        return null
      } finally {
        abortControllerRef.current = null
      }
    },
    []
  )

  return {
    state,
    error,
    generate,
    stop,
    clearError,
  }
}
