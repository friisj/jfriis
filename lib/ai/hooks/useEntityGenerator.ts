'use client'

/**
 * useEntityGenerator Hook
 *
 * Manages LLM-assisted entity generation with localStorage pending state.
 * Generated items are stored in localStorage until parent entity is saved.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ActionError, ActionResult } from '../actions/types'
import type { EntityGenerationOutput } from '../actions/generate-entity'

export type GeneratorState = 'idle' | 'generating' | 'success' | 'error'

export interface PendingEntity {
  _pendingId: string // Temporary ID for tracking
  _createdAt: number // Timestamp for ordering
  [key: string]: unknown
}

export interface UseEntityGeneratorOptions {
  /** Source entity type (e.g., 'studio_projects') */
  sourceType: string
  /** Source entity ID */
  sourceId: string
  /** Source entity data (for context) */
  sourceData: Record<string, unknown>
  /** Target entity type (e.g., 'studio_hypotheses') */
  targetType: string
  /** Default values for generated entities */
  defaultValues?: Record<string, unknown>
  /** Callback when generation succeeds */
  onSuccess?: (entities: PendingEntity[]) => void
  /** Callback when generation fails */
  onError?: (error: ActionError) => void
}

export interface UseEntityGeneratorReturn {
  // State
  state: GeneratorState
  error: ActionError | null
  pendingItems: PendingEntity[]

  // Actions
  generate: (instructions?: string) => Promise<PendingEntity[] | null>
  generateBatch: (count: number, instructions?: string) => Promise<PendingEntity[] | null>
  updatePending: (pendingId: string, updates: Record<string, unknown>) => void
  deletePending: (pendingId: string) => void
  clearPending: () => void
  flush: () => PendingEntity[]
  stop: () => void
  clearError: () => void
}

// Generate localStorage key
function getStorageKey(sourceType: string, sourceId: string, targetType: string): string {
  return `entity-generator:${sourceType}:${sourceId}:${targetType}`
}

// Generate unique pending ID
function generatePendingId(): string {
  return `pending-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function useEntityGenerator({
  sourceType,
  sourceId,
  sourceData,
  targetType,
  defaultValues = {},
  onSuccess,
  onError,
}: UseEntityGeneratorOptions): UseEntityGeneratorReturn {
  const [state, setState] = useState<GeneratorState>('idle')
  const [error, setError] = useState<ActionError | null>(null)
  const [pendingItems, setPendingItems] = useState<PendingEntity[]>([])

  const abortControllerRef = useRef<AbortController | null>(null)

  // Load pending items from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const key = getStorageKey(sourceType, sourceId, targetType)
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const items = JSON.parse(stored) as PendingEntity[]
        setPendingItems(items)
      }
    } catch (err) {
      console.error('[useEntityGenerator] Failed to load from localStorage:', err)
    }
  }, [sourceType, sourceId, targetType])

  // Save pending items to localStorage when they change
  useEffect(() => {
    if (typeof window === 'undefined') return

    const key = getStorageKey(sourceType, sourceId, targetType)
    try {
      if (pendingItems.length > 0) {
        localStorage.setItem(key, JSON.stringify(pendingItems))
      } else {
        localStorage.removeItem(key)
      }
    } catch (err) {
      console.error('[useEntityGenerator] Failed to save to localStorage:', err)
    }
  }, [pendingItems, sourceType, sourceId, targetType])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])

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

  const executeGeneration = useCallback(
    async (count: number, instructions?: string): Promise<PendingEntity[] | null> => {
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
            action: 'generate-entity',
            input: {
              sourceType,
              sourceData,
              targetType,
              existingItems: [], // TODO: pass existing DB items
              pendingItems,
              instructions,
              count,
            },
          }),
          signal: abortControllerRef.current.signal,
        })

        const result: ActionResult<EntityGenerationOutput> = await response.json()

        if (!result.success || !result.data) {
          const actionError = result.error || {
            code: 'provider_error' as const,
            message: 'Failed to generate entities',
            retryable: true,
          }
          setError(actionError)
          setState('error')
          onError?.(actionError)
          return null
        }

        // Convert to pending entities with IDs and defaults
        const newPendingItems: PendingEntity[] = result.data.entities.map((entity) => ({
          ...defaultValues,
          ...entity,
          _pendingId: generatePendingId(),
          _createdAt: Date.now(),
        }))

        // Add to pending items
        setPendingItems((prev) => [...prev, ...newPendingItems])

        setState('success')
        onSuccess?.(newPendingItems)

        // Reset to idle after brief success state
        setTimeout(() => {
          setState((current) => (current === 'success' ? 'idle' : current))
        }, 1000)

        return newPendingItems
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
    [sourceType, sourceData, targetType, pendingItems, defaultValues, onSuccess, onError]
  )

  const generate = useCallback(
    (instructions?: string) => executeGeneration(1, instructions),
    [executeGeneration]
  )

  const generateBatch = useCallback(
    (count: number, instructions?: string) => executeGeneration(count, instructions),
    [executeGeneration]
  )

  const updatePending = useCallback((pendingId: string, updates: Record<string, unknown>) => {
    setPendingItems((prev) =>
      prev.map((item) =>
        item._pendingId === pendingId ? { ...item, ...updates } : item
      )
    )
  }, [])

  const deletePending = useCallback((pendingId: string) => {
    setPendingItems((prev) => prev.filter((item) => item._pendingId !== pendingId))
  }, [])

  const clearPending = useCallback(() => {
    setPendingItems([])
  }, [])

  const flush = useCallback(() => {
    const items = [...pendingItems]
    setPendingItems([])
    return items
  }, [pendingItems])

  return {
    state,
    error,
    pendingItems,
    generate,
    generateBatch,
    updatePending,
    deletePending,
    clearPending,
    flush,
    stop,
    clearError,
  }
}
