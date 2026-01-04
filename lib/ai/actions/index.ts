/**
 * AI Action Registry and Executor
 *
 * Central registry for all AI actions and the executor that runs them.
 */

import { generateText } from 'ai'
import { getModel } from '../models'
import type {
  Action,
  ActionContext,
  ActionResult,
  ActionError,
  ActionErrorCode,
  taskTypeModels,
} from './types'
import { taskTypeModels as defaultModels } from './types'

// Action registry
const actions = new Map<string, Action>()

/**
 * Register an action
 */
export function registerAction<TInput, TOutput>(action: Action<TInput, TOutput>) {
  actions.set(action.id, action as Action)
}

/**
 * Get a registered action
 */
export function getAction(actionId: string): Action | undefined {
  return actions.get(actionId)
}

/**
 * List all registered actions
 */
export function listActions(): Action[] {
  return Array.from(actions.values())
}

/**
 * List actions for a specific entity type
 */
export function getActionsForEntity(entityType: string): Action[] {
  return Array.from(actions.values()).filter((action) =>
    action.entityTypes.includes(entityType) || action.entityTypes.includes('*')
  )
}

/**
 * Map error to ActionError
 */
function mapError(error: unknown): ActionError {
  const message = error instanceof Error ? error.message : 'Unknown error'

  // Detect specific error types
  if (message.includes('rate limit') || message.includes('429')) {
    return {
      code: 'rate_limited',
      message: 'Rate limited. Please try again in a moment.',
      retryable: true,
      retryAfter: 30,
    }
  }

  if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    return {
      code: 'timeout',
      message: 'Request timed out. Try again or use shorter content.',
      retryable: true,
    }
  }

  if (message.includes('network') || message.includes('ECONNREFUSED')) {
    return {
      code: 'network_error',
      message: 'Connection failed. Check your internet and try again.',
      retryable: true,
    }
  }

  if (message.includes('content') && message.includes('filter')) {
    return {
      code: 'content_filtered',
      message: 'Could not generate content for this input.',
      retryable: false,
    }
  }

  if (message.includes('abort') || message.includes('cancel')) {
    return {
      code: 'cancelled',
      message: 'Generation stopped.',
      retryable: true,
    }
  }

  // Default to provider error
  return {
    code: 'provider_error',
    message: 'AI service temporarily unavailable.',
    retryable: true,
  }
}

/**
 * Execute an action
 */
export async function executeAction<TInput, TOutput>(
  actionId: string,
  input: TInput,
  context?: ActionContext,
  abortSignal?: AbortSignal
): Promise<ActionResult<TOutput>> {
  const startTime = Date.now()
  const action = actions.get(actionId) as Action<TInput, TOutput> | undefined

  if (!action) {
    return {
      success: false,
      error: {
        code: 'validation_error',
        message: `Unknown action: ${actionId}`,
        retryable: false,
      },
      durationMs: Date.now() - startTime,
      model: 'none',
    }
  }

  // Validate input
  const inputResult = action.inputSchema.safeParse(input)
  if (!inputResult.success) {
    return {
      success: false,
      error: {
        code: 'validation_error',
        message: `Invalid input: ${inputResult.error.message}`,
        retryable: false,
      },
      durationMs: Date.now() - startTime,
      model: 'none',
    }
  }

  // Get model - check for input override first
  const inputData = inputResult.data as Record<string, unknown>
  const modelOverride = inputData.model as string | undefined
  const modelKey = modelOverride || action.model || defaultModels[action.taskType]

  // Get temperature - check for input override first
  const temperatureOverride = inputData.temperature as number | undefined
  const temperature = temperatureOverride ?? 0.7

  try {
    // Build prompt
    const { system, user } = action.buildPrompt(inputResult.data)

    // Execute
    const result = await generateText({
      model: getModel(modelKey) as Parameters<typeof generateText>[0]['model'],
      system,
      prompt: user,
      maxOutputTokens: 2000,
      temperature,
      abortSignal,
    })

    // Parse output
    let output: TOutput
    try {
      // Strip markdown code fences if present (common LLM behavior)
      let jsonText = result.text.trim()
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7) // Remove ```json
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3) // Remove ```
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3) // Remove trailing ```
      }
      jsonText = jsonText.trim()

      // Try to parse as JSON
      output = JSON.parse(jsonText) as TOutput
    } catch (parseError) {
      // If not JSON, wrap in expected structure
      console.warn('[ai:action] JSON parse failed, wrapping as content:', {
        action: actionId,
        rawText: result.text.substring(0, 200),
        error: parseError instanceof Error ? parseError.message : 'Unknown',
      })
      output = { content: result.text } as TOutput
    }

    // Validate output
    const outputResult = action.outputSchema.safeParse(output)
    if (!outputResult.success) {
      console.error('[ai:action] Output validation failed:', {
        action: actionId,
        rawText: result.text.substring(0, 500),
        parsedOutput: output,
        zodError: outputResult.error.format(),
      })
      return {
        success: false,
        error: {
          code: 'validation_error',
          message: 'Invalid response from AI',
          retryable: true,
        },
        durationMs: Date.now() - startTime,
        model: modelKey,
        usage: {
          inputTokens: result.usage?.inputTokens ?? 0,
          outputTokens: result.usage?.outputTokens ?? 0,
          totalTokens: result.usage?.totalTokens ?? 0,
        },
      }
    }

    return {
      success: true,
      data: outputResult.data,
      durationMs: Date.now() - startTime,
      model: modelKey,
      usage: {
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: mapError(error),
      durationMs: Date.now() - startTime,
      model: modelKey,
    }
  }
}

// Re-export types
export * from './types'
