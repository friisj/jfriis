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
  // Model options: Anthropic (sonnet/opus) for standard/web search, OpenAI (o1/o3-mini) for deep reasoning
  model: z.enum(['claude-sonnet', 'claude-opus', 'o1', 'o3-mini']).optional(),
  // Enable web search for current information (Anthropic models only, $10/1000 searches)
  webSearch: z.boolean().optional(),
  // Context from log entry
  title: z.string(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

type DraftGenerationInput = z.infer<typeof inputSchema>

// Output schema
const outputSchema = z.object({
  content: z.string(),
  suggested_title: z.string().max(40).optional(),
})

type DraftGenerationOutput = z.infer<typeof outputSchema>

// Build the prompt
function buildPrompt(input: DraftGenerationInput): { system: string; user: string } {
  const { currentContent, mode, instructions, title, type, tags, webSearch } = input

  const contextParts: string[] = [`Title: ${title}`]
  if (type) contextParts.push(`Type: ${type}`)
  if (tags && tags.length > 0) contextParts.push(`Tags: ${tags.join(', ')}`)
  const context = contextParts.join('\n')

  // Web search capability notice (when enabled)
  const webSearchNotice = webSearch
    ? `\n\nYou have access to web search. Use it to find current information, recent developments, or to verify facts when relevant.

IMPORTANT for web search:
- Do NOT output any thinking, planning, or "I'll search for..." text
- Go directly to producing the JSON output after searching
- Format citations as markdown footnotes: [^1], [^2], etc.
- Include a "## Sources" section at the end with the footnote URLs
- Example: "The market is growing rapidly[^1]..." then at end: "[^1]: https://example.com/source"`
    : ''

  let system: string
  let user: string

  if (mode === 'rewrite') {
    system = `You are a skilled writer helping to rewrite log entry content.
Your task is to rewrite the provided content while:
- Maintaining the core information and meaning
- Applying a fresh perspective or improved style
- Following any specific instructions provided
- Keeping the content appropriate for a professional log/journal${webSearchNotice}

Output JSON with:
- "content": The rewritten markdown content
- "suggested_title": A brief label (2-5 words, max 40 chars) describing this draft's angle/approach`

    user = `Log Entry Context:
${context}

Current Content:
${currentContent}

${instructions ? `Instructions: ${instructions}\n\n` : ''}Rewrite this content. Output JSON: {"content": "...", "suggested_title": "..."}`
  } else {
    // additive mode
    system = `You are a skilled writer helping to expand log entry content.
Your task is to add new sections/paragraphs that:
- Complement and extend what's already written
- Do NOT modify or repeat existing content
- Follow any specific instructions provided
- Maintain consistent tone and style with the existing content${webSearchNotice}

Output JSON with:
- "content": Only the NEW content to append (markdown), not existing content
- "suggested_title": A brief label (2-5 words, max 40 chars) describing what was added`

    user = `Log Entry Context:
${context}

Existing Content:
${currentContent}

${instructions ? `Instructions: ${instructions}\n\n` : ''}Add new sections to extend this content. Output JSON: {"content": "...", "suggested_title": "..."}`
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
