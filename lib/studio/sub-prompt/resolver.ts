/**
 * Sub-Prompt — Resolution Engine
 *
 * Wraps generateText() with timing and token metrics.
 * Handles model routing via agent configs or direct model keys.
 */

import { generateText } from 'ai'
import { getModel, models } from '@/lib/ai/models'
import { getAgentBySlug } from './agents'
import type { SubPromptExpression, Resolution, AgentConfig } from './types'

const DEFAULT_SYSTEM_PROMPT =
  'You are a sub-prompt resolver. Answer the following query concisely and precisely. ' +
  'Return only the answer — no preamble, no explanation, no quotation marks unless they are part of the answer.'

/**
 * Resolve a single sub-prompt expression via LLM.
 */
export async function resolveExpression(
  expression: SubPromptExpression,
  modelKey: string,
  systemPrompt?: string,
): Promise<Resolution> {
  const startTime = performance.now()
  const modelName = models[modelKey]?.name ?? modelKey

  try {
    const result = await generateText({
      model: getModel(modelKey),
      system: systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
      prompt: expression.query,
      maxOutputTokens: 300,
      temperature: 0.3,
    })

    const latencyMs = Math.round(performance.now() - startTime)

    return {
      expressionId: expression.id,
      query: expression.query,
      resolvedValue: result.text.trim(),
      modelKey,
      modelName,
      latencyMs,
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      status: 'resolved',
    }
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startTime)
    return {
      expressionId: expression.id,
      query: expression.query,
      resolvedValue: expression.query, // fallback to original text
      modelKey,
      modelName,
      latencyMs,
      inputTokens: 0,
      outputTokens: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'Resolution failed',
    }
  }
}

/**
 * Determine which model and system prompt to use for an expression.
 * Priority: expression modelRoute → agent slug → model key → default.
 */
function routeExpression(
  expression: SubPromptExpression,
  defaultModelKey: string,
  agentMap: Map<string, AgentConfig>,
): { modelKey: string; systemPrompt?: string } {
  if (!expression.modelRoute) {
    return { modelKey: defaultModelKey }
  }

  // Check agent slugs first
  const agent = agentMap.get(expression.modelRoute) ?? getAgentBySlug(expression.modelRoute)
  if (agent) {
    return { modelKey: agent.defaultModelKey, systemPrompt: agent.systemPrompt }
  }

  // Check if it's a direct model key
  if (expression.modelRoute in models) {
    return { modelKey: expression.modelRoute }
  }

  // Fallback to default
  return { modelKey: defaultModelKey }
}

/**
 * Resolve all expressions, optionally in parallel.
 * Uses Promise.allSettled so individual failures don't block the batch.
 */
export async function resolveAll(
  expressions: SubPromptExpression[],
  defaultModelKey: string,
  agentMap: Map<string, AgentConfig> = new Map(),
  parallel = true,
): Promise<Resolution[]> {
  if (expressions.length === 0) return []

  const tasks = expressions.map(expr => {
    const { modelKey, systemPrompt } = routeExpression(expr, defaultModelKey, agentMap)
    return { expr, modelKey, systemPrompt }
  })

  if (parallel) {
    const results = await Promise.allSettled(
      tasks.map(({ expr, modelKey, systemPrompt }) =>
        resolveExpression(expr, modelKey, systemPrompt),
      ),
    )
    return results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : {
            expressionId: tasks[i].expr.id,
            query: tasks[i].expr.query,
            resolvedValue: tasks[i].expr.query,
            modelKey: tasks[i].modelKey,
            modelName: models[tasks[i].modelKey]?.name ?? tasks[i].modelKey,
            latencyMs: 0,
            inputTokens: 0,
            outputTokens: 0,
            status: 'error' as const,
            error: r.reason instanceof Error ? r.reason.message : 'Resolution failed',
          },
    )
  }

  // Sequential resolution
  const resolutions: Resolution[] = []
  for (const { expr, modelKey, systemPrompt } of tasks) {
    resolutions.push(await resolveExpression(expr, modelKey, systemPrompt))
  }
  return resolutions
}
