/**
 * AI Action Registry and Executor
 *
 * Central registry for all AI actions and the executor that runs them.
 */

import { generateText, type ModelMessage } from 'ai'
import { getModel, models } from '../models'
import { getAnthropic } from '../providers'
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

  // Default to provider error — include real message in development
  return {
    code: 'provider_error',
    message: process.env.NODE_ENV === 'development'
      ? `Provider error: ${message}`
      : 'AI service temporarily unavailable.',
    retryable: true,
  }
}

/**
 * Parse raw LLM text into validated output
 */
function parseActionOutput<TOutput>(
  actionId: string,
  rawText: string,
  outputSchema: import('zod').ZodType<TOutput>,
): { success: true; data: TOutput } | { success: false; error: ActionError } {
  let output: TOutput
  try {
    let jsonText = rawText.trim()

    // Find first { and last } to extract JSON
    const jsonStart = jsonText.indexOf('{')
    const jsonEnd = jsonText.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonText = jsonText.slice(jsonStart, jsonEnd + 1)
    }

    // Handle markdown code fences
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7)
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3)
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3)
    }
    jsonText = jsonText.trim()

    output = JSON.parse(jsonText) as TOutput

    // Post-process: Convert Anthropic <cite> tags to markdown footnotes
    if (output && typeof output === 'object' && 'content' in output) {
      const content = (output as { content: string }).content
      if (content && typeof content === 'string' && content.includes('<cite')) {
        let processed = content.replace(
          /<cite\s+index="([^"]+)">([\s\S]*?)<\/cite>/g,
          '$2[^$1]'
        )
        processed = processed.replace(/\[\^([^\]]+)\]\[\^/g, '[^$1][^')
        ;(output as { content: string }).content = processed
      }
    }
  } catch (parseError) {
    console.warn('[ai:action] JSON parse failed, wrapping as content:', {
      action: actionId,
      rawText: rawText.substring(0, 200),
      error: parseError instanceof Error ? parseError.message : 'Unknown',
    })
    output = { content: rawText } as TOutput
  }

  const outputResult = outputSchema.safeParse(output)
  if (!outputResult.success) {
    console.error('[ai:action] Output validation failed:', {
      action: actionId,
      rawText: rawText.substring(0, 500),
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
    }
  }

  return { success: true, data: outputResult.data }
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

  // Check for web search option
  const webSearchEnabled = inputData.webSearch === true

  try {
    // Build tools config if web search is enabled
    // Web search only works with Anthropic models
    const modelConfig = models[modelKey]
    const isAnthropicModel = modelConfig?.provider === 'anthropic'
    const tools = webSearchEnabled && isAnthropicModel
      ? { web_search: getAnthropic().tools.webSearch_20250305({ maxUses: 5 }) }
      : undefined

    // Execute — branch on buildMessages (multimodal) vs buildPrompt (text-only)
    let result
    if (action.buildMessages) {
      const { system, messages } = action.buildMessages(inputResult.data)
      result = await generateText({
        model: getModel(modelKey) as Parameters<typeof generateText>[0]['model'],
        system,
        messages: messages as ModelMessage[],
        maxOutputTokens: 8000,
        temperature,
        abortSignal,
        ...(tools && { tools, maxSteps: 5 }),
      })
    } else {
      const { system, user } = action.buildPrompt(inputResult.data)
      result = await generateText({
        model: getModel(modelKey) as Parameters<typeof generateText>[0]['model'],
        system,
        prompt: user,
        maxOutputTokens: 4000,
        temperature,
        abortSignal,
        ...(tools && { tools, maxSteps: 5 }),
      })
    }

    // Parse and validate output
    const parsed = parseActionOutput<TOutput>(actionId, result.text, action.outputSchema)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error,
        durationMs: Date.now() - startTime,
        model: modelKey,
        usage: {
          inputTokens: result.usage?.inputTokens ?? 0,
          outputTokens: result.usage?.outputTokens ?? 0,
          totalTokens: result.usage?.totalTokens ?? 0,
        },
      }
    }

    // Count web search uses from tool calls in the response
    const webSearchRequests = webSearchEnabled
      ? (result.toolCalls?.filter(tc => tc.toolName === 'web_search').length ?? 0)
      : undefined

    return {
      success: true,
      data: parsed.data,
      durationMs: Date.now() - startTime,
      model: modelKey,
      usage: {
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
        ...(webSearchRequests !== undefined && { webSearchRequests }),
      },
    }
  } catch (error) {
    console.error('[ai:action] Execution error:', {
      action: actionId,
      model: modelKey,
      webSearchEnabled,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    })
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
