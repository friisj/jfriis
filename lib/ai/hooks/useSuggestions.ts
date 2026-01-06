/**
 * useSuggestions Hook
 *
 * Provides inline LLM suggestions for survey questions.
 * Manages loading state, caching, and debouncing.
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { SurveyQuestion, ResponseValue } from '@/lib/types/survey'

interface UseSuggestionsOptions {
  question: SurveyQuestion
  previousResponses: Record<string, ResponseValue>
  projectContext: {
    name: string
    description?: string
    temperature?: string
  }
  enabled?: boolean
  debounceMs?: number
}

interface UseSuggestionsResult {
  suggestions: string[]
  isLoading: boolean
  error: Error | null
  fetchSuggestions: () => Promise<void>
  clearSuggestions: () => void
}

// Cache configuration
const CACHE_MAX_SIZE = 100
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry {
  suggestions: string[]
  timestamp: number
}

// LRU cache with TTL for suggestions
const suggestionsCache = new Map<string, CacheEntry>()

/**
 * Evict expired and oldest entries from cache
 */
function evictCache(): void {
  const now = Date.now()

  // First, remove expired entries
  for (const [key, entry] of suggestionsCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      suggestionsCache.delete(key)
    }
  }

  // Then, if still over limit, remove oldest entries
  if (suggestionsCache.size > CACHE_MAX_SIZE) {
    const entries = Array.from(suggestionsCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)

    const toRemove = entries.slice(0, suggestionsCache.size - CACHE_MAX_SIZE)
    for (const [key] of toRemove) {
      suggestionsCache.delete(key)
    }
  }
}

function getCacheKey(questionId: string, responses: Record<string, ResponseValue>): string {
  // Create a stable cache key from question + relevant previous responses
  const responseHash = Object.entries(responses)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
    .join('|')
  return `${questionId}::${responseHash}`
}

export function useSuggestions({
  question,
  previousResponses,
  projectContext,
  enabled = true,
  debounceMs = 500,
}: UseSuggestionsOptions): UseSuggestionsResult {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Check if suggestions are enabled for this question
  const suggestionsEnabled = enabled && question.suggestions?.enabled

  const fetchSuggestions = useCallback(async () => {
    if (!suggestionsEnabled) return

    // Check cache first (with TTL validation)
    const cacheKey = getCacheKey(question.id, previousResponses)
    const cached = suggestionsCache.get(cacheKey)
    const now = Date.now()
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      setSuggestions(cached.suggestions)
      return
    }

    // Cancel any pending request (proper cleanup)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-survey-suggestions',
          input: {
            question: question.question,
            question_type: question.type,
            question_category: question.category,
            previous_responses: previousResponses,
            project_context: projectContext,
          },
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch suggestions: ${response.statusText}`)
      }

      const result = await response.json()

      if (!result.success || !result.data?.suggestions) {
        throw new Error(result.error?.message || 'Failed to generate suggestions')
      }

      const newSuggestions = result.data.suggestions
      setSuggestions(newSuggestions)

      // Cache the results with timestamp
      evictCache() // Clean up before adding
      suggestionsCache.set(cacheKey, {
        suggestions: newSuggestions,
        timestamp: Date.now(),
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
      console.error('[useSuggestions] Error:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      // Clear the controller ref if it's the same one we created
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
      setIsLoading(false)
    }
  }, [suggestionsEnabled, question, previousResponses, projectContext])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
    setError(null)
  }, [])

  // Auto-fetch suggestions when question changes (with debounce)
  useEffect(() => {
    if (!suggestionsEnabled) {
      clearSuggestions()
      return
    }

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Debounce the fetch
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions()
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [suggestionsEnabled, question.id, fetchSuggestions, clearSuggestions, debounceMs])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    suggestions,
    isLoading,
    error,
    fetchSuggestions,
    clearSuggestions,
  }
}
