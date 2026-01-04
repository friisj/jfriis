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
  /** Existing DB items (for anti-redundancy) - HIGH-3 fix */
  existingItems?: Array<Record<string, unknown>>
  /** Default values for generated entities */
  defaultValues?: Record<string, unknown>
  /** Callback when generation succeeds */
  onSuccess?: (entities: PendingEntity[]) => void
  /** Callback when generation fails */
  onError?: (error: ActionError) => void
}

/** Options for generation requests */
export interface GenerationOptions {
  instructions?: string
  temperature?: number // 0.3 - 1.0
  model?: 'claude-sonnet' | 'claude-opus'
  entitySubtype?: string // e.g., hypothesis type or experiment type
}

export interface UseEntityGeneratorReturn {
  // State
  state: GeneratorState
  error: ActionError | null
  storageError: string | null // HIGH-2: localStorage error feedback
  pendingItems: PendingEntity[]
  isLoadingPending: boolean // Loading state for localStorage

  // Actions
  generate: (options?: GenerationOptions) => Promise<PendingEntity[] | null>
  generateBatch: (count: number, options?: GenerationOptions) => Promise<PendingEntity[] | null>
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
  existingItems = [], // HIGH-3: Accept existing items
  defaultValues = {},
  onSuccess,
  onError,
}: UseEntityGeneratorOptions): UseEntityGeneratorReturn {
  const [state, setState] = useState<GeneratorState>('idle')
  const [error, setError] = useState<ActionError | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null) // HIGH-2
  const [pendingItems, setPendingItems] = useState<PendingEntity[]>([])
  const [isLoadingPending, setIsLoadingPending] = useState(true)

  const abortControllerRef = useRef<AbortController | null>(null)

  // Load pending items from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoadingPending(false)
      return
    }

    const key = getStorageKey(sourceType, sourceId, targetType)
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const items = JSON.parse(stored) as PendingEntity[]
        setPendingItems(items)
      }
      setStorageError(null)
    } catch (err) {
      console.error('[useEntityGenerator] Failed to load from localStorage:', err)
      // HIGH-2: User-visible error for localStorage issues
      if (err instanceof Error && err.name === 'SecurityError') {
        setStorageError('Storage access denied. Using private browsing? Pending items will not persist.')
      }
    } finally {
      setIsLoadingPending(false)
    }
  }, [sourceType, sourceId, targetType])

  // Save pending items to localStorage when they change
  useEffect(() => {
    if (typeof window === 'undefined' || isLoadingPending) return

    const key = getStorageKey(sourceType, sourceId, targetType)
    try {
      if (pendingItems.length > 0) {
        localStorage.setItem(key, JSON.stringify(pendingItems))
      } else {
        localStorage.removeItem(key)
      }
      setStorageError(null)
    } catch (err) {
      console.error('[useEntityGenerator] Failed to save to localStorage:', err)
      // HIGH-2: User-visible error for quota exceeded
      if (err instanceof Error && err.name === 'QuotaExceededError') {
        setStorageError('Storage full. Save your project to persist pending items.')
      } else {
        setStorageError('Unable to save pending items locally.')
      }
    }
  }, [pendingItems, sourceType, sourceId, targetType, isLoadingPending])

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
    async (count: number, options?: GenerationOptions): Promise<PendingEntity[] | null> => {
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
              existingItems, // HIGH-3: Pass existing DB items for anti-redundancy
              pendingItems,
              instructions: options?.instructions,
              count,
              temperature: options?.temperature,
              model: options?.model,
              entitySubtype: options?.entitySubtype,
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
    [sourceType, sourceData, targetType, existingItems, pendingItems, defaultValues, onSuccess, onError]
  )

  const generate = useCallback(
    (options?: GenerationOptions) => executeGeneration(1, options),
    [executeGeneration]
  )

  const generateBatch = useCallback(
    (count: number, options?: GenerationOptions) => executeGeneration(count, options),
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
    storageError,
    pendingItems,
    isLoadingPending,
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
