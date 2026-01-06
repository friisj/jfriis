/**
 * Generate Draft Name Action
 *
 * Generates a short, descriptive name for a log entry draft based on its content.
 */

import { z } from 'zod'
import { registerAction } from './index'
import type { Action } from './types'

// Input schema
const inputSchema = z.object({
  content: z.string(),
  title: z.string(),
  type: z.string().optional(),
})

type DraftNameInput = z.infer<typeof inputSchema>

// Output schema
const outputSchema = z.object({
  name: z.string().max(40),
})

type DraftNameOutput = z.infer<typeof outputSchema>

// Build the prompt
function buildPrompt(input: DraftNameInput): { system: string; user: string } {
  const { content, title, type } = input

  const system = `Generate a brief, descriptive name (2-5 words, max 40 chars) for a log entry draft.
The name should capture the draft's unique angle, perspective, or focus.
Output JSON: {"name": "..."}`

  const user = `Log Entry: ${title}${type ? ` (${type})` : ''}

Draft Content (excerpt):
${content.slice(0, 1000)}${content.length > 1000 ? '...' : ''}

Generate a short name that describes this draft's angle.`

  return { system, user }
}

// Create the action
const generateDraftNameAction: Action<DraftNameInput, DraftNameOutput> = {
  id: 'generate-draft-name',
  name: 'Generate Draft Name',
  description: 'Generate a short name for a log entry draft',
  entityTypes: ['log_entry'],
  taskType: 'generation',
  inputSchema,
  outputSchema,
  buildPrompt,
}

// Register the action
registerAction(generateDraftNameAction)

export { generateDraftNameAction }
export type { DraftNameInput, DraftNameOutput }
