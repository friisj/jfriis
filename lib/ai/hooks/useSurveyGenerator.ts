/**
 * Survey Generator Hook
 *
 * React hook for generating surveys with state management.
 * Follows the same pattern as useGenerate for consistency.
 */

'use client'

import { useState } from 'react'
import { generateProjectSurvey } from '@/app/actions/surveys'

interface GenerateSurveyInput {
  name: string
  description?: string
  temperature?: 'hot' | 'warm' | 'cold'
}

interface GenerateSurveyResult {
  success: boolean
  projectId?: string
  projectSlug?: string
  surveyId?: string
  error?: string
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
}

export function useSurveyGenerator() {
  const [state, setState] = useState<'idle' | 'generating' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastGeneratedAt, setLastGeneratedAt] = useState<Date | null>(null)
  const [result, setResult] = useState<GenerateSurveyResult | null>(null)

  const generate = async (input: GenerateSurveyInput): Promise<GenerateSurveyResult | null> => {
    setState('generating')
    setError(null)
    setResult(null)

    try {
      const generationResult = await generateProjectSurvey(input)

      if (!generationResult.success) {
        const errorMessage = generationResult.error || 'Failed to generate survey'
        setError(errorMessage)
        setState('error')
        setResult(generationResult)
        return generationResult
      }

      setState('success')
      setLastGeneratedAt(new Date())
      setResult(generationResult)

      // Auto-reset success state after a delay
      setTimeout(() => {
        if (state === 'success') {
          setState('idle')
        }
      }, 2000)

      return generationResult
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setState('error')

      const errorResult: GenerateSurveyResult = { success: false, error: errorMessage }
      setResult(errorResult)
      return errorResult
    }
  }

  const clearError = () => {
    setError(null)
    if (state === 'error') {
      setState('idle')
    }
  }

  return {
    state,
    error,
    lastGeneratedAt,
    result,
    generate,
    clearError,
    isGenerating: state === 'generating',
    isSuccess: state === 'success',
    isError: state === 'error',
  }
}
