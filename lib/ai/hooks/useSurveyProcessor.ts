/**
 * Survey Processor Hook
 *
 * React hook for streaming survey artifact generation.
 * Uses Vercel AI SDK's useObject for real-time updates.
 */

'use client'

import { experimental_useObject as useObject } from 'ai/react'
import { ProcessSurveyOutputSchema } from '@/lib/ai/actions/process-survey'
import type { ProcessSurveyOutput } from '@/lib/ai/actions/process-survey'

interface UseSurveyProcessorOptions {
  surveyId: string
  onComplete?: (artifacts: ProcessSurveyOutput) => void
  onError?: (error: Error) => void
}

export function useSurveyProcessor({ surveyId, onComplete, onError }: UseSurveyProcessorOptions) {
  const { object, error, isLoading, submit } = useObject<ProcessSurveyOutput>({
    api: `/api/surveys/${surveyId}/process`,
    schema: ProcessSurveyOutputSchema,
    onFinish: ({ object: finalObject, error: finishError }) => {
      if (finishError) {
        onError?.(finishError instanceof Error ? finishError : new Error(String(finishError)))
      } else if (finalObject) {
        onComplete?.(finalObject)
      }
    },
  })

  // Start processing (can be called manually or on mount)
  const startProcessing = async () => {
    await submit({})
  }

  // Helper to check if specific artifact types are generated
  const hasArtifact = (type: keyof ProcessSurveyOutput): boolean => {
    if (!object) return false

    const artifact = object[type]
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
    if (!object || !object[type]) return 0
    return object[type]?.length ?? 0
  }

  return {
    // Streaming state
    artifacts: object,
    isProcessing: isLoading,
    error,

    // Actions
    startProcessing,

    // Helper methods
    hasArtifact,
    getCount,

    // Individual artifact access
    projectUpdates: object?.project_updates,
    hypotheses: object?.hypotheses ?? [],
    customerProfiles: object?.customer_profiles ?? [],
    assumptions: object?.assumptions ?? [],
    experiments: object?.experiments ?? [],

    // Progress indicators
    hasProjectUpdates: hasArtifact('project_updates'),
    hasHypotheses: hasArtifact('hypotheses'),
    hasCustomerProfiles: hasArtifact('customer_profiles'),
    hasAssumptions: hasArtifact('assumptions'),
    hasExperiments: hasArtifact('experiments'),
  }
}
