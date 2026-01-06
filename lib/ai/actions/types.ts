/**
 * AI Action Type Definitions
 *
 * Actions are discrete LLM operations with typed inputs and outputs.
 */

import { z } from 'zod'

// Task types determine default model selection
export type TaskType = 'classification' | 'extraction' | 'generation' | 'analysis'

// Action definition
export interface Action<TInput = unknown, TOutput = unknown> {
  id: string
  name: string
  description: string

  // What entities this action applies to
  entityTypes: string[]

  // Model selection
  taskType: TaskType
  model?: string // Override default for task type

  // Schemas for validation
  inputSchema: z.ZodType<TInput>
  outputSchema: z.ZodType<TOutput>

  // Prompt construction
  buildPrompt: (input: TInput) => {
    system: string
    user: string
  }
}

// Context passed to actions during execution
export interface ActionContext {
  entityType: string
  entityId?: string
  fieldName?: string
  userId?: string
}

// Result of action execution
export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: ActionError
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    webSearchRequests?: number
  }
  durationMs: number
  model: string
}

// Error types for field generation
export type ActionErrorCode =
  | 'unauthorized'
  | 'rate_limited'
  | 'provider_error'
  | 'timeout'
  | 'invalid_context'
  | 'content_filtered'
  | 'network_error'
  | 'cancelled'
  | 'validation_error'

export interface ActionError {
  code: ActionErrorCode
  message: string
  retryable: boolean
  retryAfter?: number // Seconds until retry (for rate limits)
}

// Field generation specific types
export interface FieldGenerationInput {
  fieldName: string
  entityType: string
  currentValue?: string
  context: Record<string, unknown>
  instructions?: string
}

export interface FieldGenerationOutput {
  content: string
  confidence?: number
}

// Default models by task type
export const taskTypeModels: Record<TaskType, string> = {
  classification: 'claude-haiku',
  extraction: 'claude-haiku',
  generation: 'claude-sonnet',
  analysis: 'claude-sonnet',
}
