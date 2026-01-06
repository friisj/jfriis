/**
 * Survey Processor Hook
 *
 * React hook for triggering survey artifact generation.
 * Parses streaming response to track progress in real-time.
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import type { ProcessSurveyOutput } from '@/lib/ai/actions/process-survey'

interface UseSurveyProcessorOptions {
  surveyId: string
}

interface ErrorType {
  message: string
}

// Progress state tracking
interface ProcessingProgress {
  projectUpdates: boolean
  hypotheses: number
  customerProfiles: number
  assumptions: number
  experiments: number
}

/**
 * Parse partial JSON from streaming response
 * Returns parsed object or null if parsing fails
 */
function tryParsePartialJson(text: string): Partial<ProcessSurveyOutput> | null {
  try {
    // Try parsing as complete JSON first
    return JSON.parse(text)
  } catch {
    // Try adding closing braces for partial JSON
    let attempt = text
    let depth = 0
    for (const char of text) {
      if (char === '{' || char === '[') depth++
      if (char === '}' || char === ']') depth--
    }
    // Add closing brackets
    for (let i = 0; i < depth; i++) {
      if (attempt.lastIndexOf('{') > attempt.lastIndexOf('[')) {
        attempt += '}'
      } else {
        attempt += ']'
      }
    }
    try {
      return JSON.parse(attempt)
    } catch {
      return null
    }
  }
}

export function useSurveyProcessor({ surveyId }: UseSurveyProcessorOptions) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<ErrorType | null>(null)
  const [artifacts, setArtifacts] = useState<Partial<ProcessSurveyOutput> | null>(null)
  const [progress, setProgress] = useState<ProcessingProgress>({
    projectUpdates: false,
    hypotheses: 0,
    customerProfiles: 0,
    assumptions: 0,
    experiments: 0,
  })
  const abortControllerRef = useRef<AbortController | null>(null)

  const startProcessing = useCallback(async () => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsProcessing(true)
    setError(null)
    setProgress({
      projectUpdates: false,
      hypotheses: 0,
      customerProfiles: 0,
      assumptions: 0,
      experiments: 0,
    })

    try {
      const response = await fetch(`/api/surveys/${surveyId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to process survey')
      }

      // Parse streaming response for progress tracking
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          // Decode and accumulate chunks
          accumulated += decoder.decode(value, { stream: true })

          // Try to parse partial JSON for progress updates
          const parsed = tryParsePartialJson(accumulated)
          if (parsed) {
            setArtifacts(parsed)
            setProgress({
              projectUpdates: !!parsed.project_updates && Object.keys(parsed.project_updates).length > 0,
              hypotheses: parsed.hypotheses?.length ?? 0,
              customerProfiles: parsed.customer_profiles?.length ?? 0,
              assumptions: parsed.assumptions?.length ?? 0,
              experiments: parsed.experiments?.length ?? 0,
            })
          }
        }

        // Final decode
        accumulated += decoder.decode()
        const finalParsed = tryParsePartialJson(accumulated)
        if (finalParsed) {
          setArtifacts(finalParsed)
          setProgress({
            projectUpdates: !!finalParsed.project_updates && Object.keys(finalParsed.project_updates).length > 0,
            hypotheses: finalParsed.hypotheses?.length ?? 0,
            customerProfiles: finalParsed.customer_profiles?.length ?? 0,
            assumptions: finalParsed.assumptions?.length ?? 0,
            experiments: finalParsed.experiments?.length ?? 0,
          })
        }
      }

      // Processing complete
      setIsProcessing(false)
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      setError({
        message: err instanceof Error ? err.message : 'Processing failed',
      })
      setIsProcessing(false)
    }
  }, [surveyId])

  // Helper to check if specific artifact types are generated
  const hasArtifact = (type: keyof ProcessSurveyOutput): boolean => {
    if (!artifacts) return false

    const artifact = artifacts[type]
    if (Array.isArray(artifact)) {
      return artifact.length > 0
    }
    if (typeof artifact === 'object' && artifact !== null) {
      return Object.keys(artifact).length > 0
    }
    return false
  }

  // Get count of generated items (now using real progress)
  const getCount = (type: 'hypotheses' | 'customer_profiles' | 'assumptions' | 'experiments'): number => {
    return progress[type === 'customer_profiles' ? 'customerProfiles' : type] ?? 0
  }

  return {
    // Streaming state
    artifacts,
    isProcessing,
    error,
    progress,

    // Actions
    startProcessing,

    // Helper methods
    hasArtifact,
    getCount,

    // Individual artifact access
    projectUpdates: artifacts?.project_updates,
    hypotheses: artifacts?.hypotheses ?? [],
    customerProfiles: artifacts?.customer_profiles ?? [],
    assumptions: artifacts?.assumptions ?? [],
    experiments: artifacts?.experiments ?? [],

    // Progress indicators (now based on actual parsing)
    hasProjectUpdates: progress.projectUpdates,
    hasHypotheses: progress.hypotheses > 0,
    hasCustomerProfiles: progress.customerProfiles > 0,
    hasAssumptions: progress.assumptions > 0,
    hasExperiments: progress.experiments > 0,
  }
}
