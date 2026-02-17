import { z } from 'zod'
import { registerAction } from './index'
import type { Action } from './types'

const inputSchema = z.object({
  currentPrompt: z.string(),
  styleName: z.string().optional(),
  description: z.string().optional(),
  evaluations: z.record(z.string(), z.number()).optional().default({}),
})

const outputSchema = z.object({
  content: z.string(), // The enhanced prompt
})

type Input = z.infer<typeof inputSchema>
type Output = z.infer<typeof outputSchema>

function buildPrompt(input: Input) {
  const { currentPrompt, styleName, description, evaluations } = input

  // Extract existing evaluations from the prompt
  const extractedEvals = extractEvaluationsFromPrompt(currentPrompt)
  const finalEvals = { ...extractedEvals, ...evaluations }

  let user = `You are an expert at creating AI writing style guides. Your task is to enhance and improve the given style guide prompt to make it more specific, actionable, and effective for AI content generation.

CURRENT CONTEXT:
Style Name: ${styleName || 'Unnamed Style'}
Description: ${description || 'No description provided'}

CURRENT PROMPT TO ENHANCE:
"${currentPrompt}"

EVALUATION CRITERIA (0-10 scale):`

  for (const [key, value] of Object.entries(finalEvals)) {
    if (typeof value === 'number' && value >= 0 && value <= 10) {
      user += `\n- ${formatEvalName(key)}: ${value}/10`
    }
  }

  user += `

ENHANCEMENT OBJECTIVES:
1. Make the prompt more specific and actionable
2. Add concrete examples where helpful
3. Clarify tone, structure, and formatting expectations
4. Incorporate the evaluation criteria above as guidance
5. Maintain the core intent while improving clarity and effectiveness

REQUIREMENTS:
- Keep the enhanced prompt focused and practical
- Preserve any evaluation criteria in the format "EVAL_NAME: X/10" at the end
- Make it comprehensive but not overly verbose

Respond with JSON: {"content": "your enhanced prompt here"}`

  return {
    system: 'You are an expert at crafting AI writing style guides. Always respond with valid JSON.',
    user,
  }
}

function extractEvaluationsFromPrompt(prompt: string): Record<string, number> {
  const evaluations: Record<string, number> = {}
  const evalRegex = /(\w+):\s*(\d+)\/10/gi
  let match
  while ((match = evalRegex.exec(prompt)) !== null) {
    const key = match[1].toLowerCase().replace(/\s+/g, '_')
    const value = parseInt(match[2])
    if (value >= 0 && value <= 10) {
      evaluations[key] = value
    }
  }
  return evaluations
}

function formatEvalName(key: string): string {
  return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const action: Action<Input, Output> = {
  id: 'verbivore-enhance-style',
  name: 'Enhance Style Prompt',
  description: 'Enhance a style guide prompt for better AI content generation',
  entityTypes: ['verbivore_style_guides'],
  taskType: 'generation',
  inputSchema,
  outputSchema,
  buildPrompt,
}

registerAction(action)
export { action as verbivoreEnhanceStyleAction }
