'use client'

/**
 * useGenerate Hook
 *
 * React hook for AI field generation with state management.
 */

import { useState, useCallback, useRef } from 'react'
import type { ActionError, ActionResult, FieldGenerationOutput } from '../actions/types'

export type FieldState = 'idle' | 'generating' | 'success' | 'error'

export interface UseGenerateOptions {
  entityType: string
  fieldName: string
  onSuccess?: (content: string) => void
  onError?: (error: ActionError) => void
}

export interface UseGenerateReturn {
  // State
  state: FieldState
  error: ActionError | null
  lastGeneratedAt: Date | null

  // Actions
  generate: (context: Record<string, unknown>, currentValue?: string) => Promise<string | null>
  generateWithInstructions: (
    context: Record<string, unknown>,
    instructions: string,
    currentValue?: string
  ) => Promise<string | null>
  stop: () => void
  clearError: () => void
}

export function useGenerate({
  entityType,
  fieldName,
  onSuccess,
  onError,
}: UseGenerateOptions): UseGenerateReturn {
  const [state, setState] = useState<FieldState>('idle')
  const [error, setError] = useState<ActionError | null>(null)
  const [lastGeneratedAt, setLastGeneratedAt] = useState<Date | null>(null)

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

  const executeGenerate = useCallback(
    async (
      context: Record<string, unknown>,
      currentValue?: string,
      instructions?: string
    ): Promise<string | null> => {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController()

      setState('generating')
      setError(null)

      try {
        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate-field',
            input: {
              fieldName,
              entityType,
              currentValue,
              context,
              instructions,
            },
          }),
          signal: abortControllerRef.current.signal,
        })

        const result: ActionResult<FieldGenerationOutput> = await response.json()

        if (!result.success || !result.data) {
          const actionError = result.error || {
            code: 'provider_error' as const,
            message: 'Failed to generate content',
            retryable: true,
          }
          setError(actionError)
          setState('error')
          onError?.(actionError)
          return null
        }

        setState('success')
        setLastGeneratedAt(new Date())
        onSuccess?.(result.data.content)

        // Reset to idle after brief success state
        setTimeout(() => {
          setState((current) => (current === 'success' ? 'idle' : current))
        }, 1000)

        return result.data.content
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
        onError?.(actionError)
        return null
      } finally {
        abortControllerRef.current = null
      }
    },
    [entityType, fieldName, onSuccess, onError]
  )

  const generate = useCallback(
    (context: Record<string, unknown>, currentValue?: string) => {
      return executeGenerate(context, currentValue)
    },
    [executeGenerate]
  )

  const generateWithInstructions = useCallback(
    (context: Record<string, unknown>, instructions: string, currentValue?: string) => {
      return executeGenerate(context, currentValue, instructions)
    },
    [executeGenerate]
  )

  return {
    state,
    error,
    lastGeneratedAt,
    generate,
    generateWithInstructions,
    stop,
    clearError,
  }
}
