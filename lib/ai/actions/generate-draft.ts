/**
 * Generate Draft Action
 *
 * Generates or rewrites log entry draft content using LLM.
 * Supports rewrite (full replacement) and additive (append sections) modes.
 */

import { z } from 'zod'
import { registerAction } from './index'
import type { Action } from './types'

// Input schema
const inputSchema = z.object({
  currentContent: z.string(),
  mode: z.enum(['rewrite', 'additive']),
  instructions: z.string().optional(),
  temperature: z.number().min(0.1).max(1.0).optional(),
  model: z.enum(['claude-sonnet', 'claude-opus']).optional(),
  // Context from log entry
  title: z.string(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

type DraftGenerationInput = z.infer<typeof inputSchema>

// Output schema
const outputSchema = z.object({
  content: z.string(),
})

type DraftGenerationOutput = z.infer<typeof outputSchema>

// Build the prompt
function buildPrompt(input: DraftGenerationInput): { system: string; user: string } {
  const { currentContent, mode, instructions, title, type, tags } = input

  const contextParts: string[] = [`Title: ${title}`]
  if (type) contextParts.push(`Type: ${type}`)
  if (tags && tags.length > 0) contextParts.push(`Tags: ${tags.join(', ')}`)
  const context = contextParts.join('\n')

  let system: string
  let user: string

  if (mode === 'rewrite') {
    system = `You are a skilled writer helping to rewrite log entry content.
Your task is to rewrite the provided content while:
- Maintaining the core information and meaning
- Applying a fresh perspective or improved style
- Following any specific instructions provided
- Keeping the content appropriate for a professional log/journal

Output only the rewritten markdown content, no explanations or preamble.`

    user = `Log Entry Context:
${context}

Current Content:
${currentContent}

${instructions ? `Instructions: ${instructions}\n\n` : ''}Rewrite this content. Output markdown only.`
  } else {
    // additive mode
    system = `You are a skilled writer helping to expand log entry content.
Your task is to add new sections/paragraphs that:
- Complement and extend what's already written
- Do NOT modify or repeat existing content
- Follow any specific instructions provided
- Maintain consistent tone and style with the existing content

Output only the NEW content to append (markdown format), no explanations.
Do not include any of the existing content in your response.`

    user = `Log Entry Context:
${context}

Existing Content:
${currentContent}

${instructions ? `Instructions: ${instructions}\n\n` : ''}Add new sections to extend this content. Output only the new content to append.`
  }

  return { system, user }
}

// Create the action
const generateDraftAction: Action<DraftGenerationInput, DraftGenerationOutput> = {
  id: 'generate-draft',
  name: 'Generate Draft',
  description: 'Generate or rewrite log entry draft content',
  entityTypes: ['log_entry'],
  taskType: 'generation',
  inputSchema,
  outputSchema,
  buildPrompt,
}

// Register the action
registerAction(generateDraftAction)

export { generateDraftAction }
export type { DraftGenerationInput, DraftGenerationOutput }
