import { z } from 'zod'
import { registerAction } from './index'
import type { Action } from './types'
import { createClient } from '@/lib/supabase-server'

const inputSchema = z.object({
  title: z.string().optional(),
  excerpt: z.string().optional(),
  context: z.string().optional().default('entry content'),
  styleGuideId: z.string().optional(),
  styleGuidePrompt: z.string().optional(),
})

const outputSchema = z.object({
  content: z.string(),
})

type Input = z.infer<typeof inputSchema>
type Output = z.infer<typeof outputSchema>

function buildPrompt(input: Input) {
  const { title, excerpt } = input

  let user = 'Create engaging, informative content for a glossary entry'
  if (title) user += ` titled "${title}"`
  if (excerpt) user += `. Based on this excerpt: "${excerpt}"`

  const instructions = input.styleGuidePrompt || (input as Record<string, unknown>)._styleGuidePrompt as string | undefined
  if (instructions) {
    user += `\n\nIMPORTANT - STYLE GUIDE:\n${instructions}\n\nPlease follow these style instructions precisely while creating the content.`
  }

  user += `

The content should:
- Be comprehensive yet accessible
- Provide detailed explanation and context
- Include relevant background information
- Use clear, engaging prose
- Support Markdown formatting
- Be substantial enough for a full entry (aim for 300-800 words)
- Include specific details and examples where appropriate

Focus on creating content that would be valuable in a curated glossary of interesting and esoteric terms.

Respond with JSON: {"content": "your markdown content here"}`

  return {
    system: 'You are an expert content writer creating engaging glossary entries. Your writing is informative, well-structured, and accessible. Always respond with valid JSON.',
    user,
  }
}

const action: Action<Input, Output> = {
  id: 'verbivore-generate-content',
  name: 'Generate Entry Content',
  description: 'Generate full entry content with optional style guide',
  entityTypes: ['verbivore_entries'],
  taskType: 'generation',
  inputSchema,
  outputSchema,
  buildPrompt,
}

registerAction(action)

// Helper to fetch style guide and inject into input before execution
export async function prepareContentGenerationInput(input: Input): Promise<Input & { _styleGuidePrompt?: string }> {
  if (!input.styleGuideId) return input

  try {
    const supabase = await createClient()
    const { data: styleGuide } = await supabase
      .from('verbivore_style_guides')
      .select('name, prompt')
      .eq('id', input.styleGuideId)
      .eq('is_active', true)
      .single()

    if (styleGuide) {
      return { ...input, _styleGuidePrompt: `"${styleGuide.name}"\n${styleGuide.prompt}` } as Input & { _styleGuidePrompt: string }
    }
  } catch {
    // Continue without style guide
  }
  return input
}

export { action as verbivoreGenerateContentAction }
