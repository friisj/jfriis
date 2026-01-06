/**
 * Survey Processor Hook
 *
 * React hook for triggering survey artifact generation.
 * Follows existing hook pattern (manual state management).
 */

'use client'

import { useState, useCallback } from 'react'
import type { ProcessSurveyOutput } from '@/lib/ai/actions/process-survey'

interface UseSurveyProcessorOptions {
  surveyId: string
}

interface ErrorType {
  message: string
}

export function useSurveyProcessor({ surveyId }: UseSurveyProcessorOptions) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<ErrorType | null>(null)
  const [artifacts, setArtifacts] = useState<Partial<ProcessSurveyOutput> | null>(null)

  const startProcessing = useCallback(async () => {
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/surveys/${surveyId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to process survey')
      }

      // For MVP: just wait for completion
      // The streaming response will be processed server-side and saved to DB
      const reader = response.body?.getReader()
      if (reader) {
        // Read the stream to completion
        while (true) {
          const { done } = await reader.read()
          if (done) break
        }
      }

      // Processing complete
      setIsProcessing(false)
    } catch (err) {
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

  // Get count of generated items
  const getCount = (type: 'hypotheses' | 'customer_profiles' | 'assumptions' | 'experiments'): number => {
    if (!artifacts || !artifacts[type]) return 0
    return artifacts[type]?.length ?? 0
  }

  return {
    // Streaming state
    artifacts,
    isProcessing,
    error,

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

    // Progress indicators (simplified for MVP)
    hasProjectUpdates: !isProcessing && !error,
    hasHypotheses: !isProcessing && !error,
    hasCustomerProfiles: !isProcessing && !error,
    hasAssumptions: !isProcessing && !error,
    hasExperiments: !isProcessing && !error,
  }
}
