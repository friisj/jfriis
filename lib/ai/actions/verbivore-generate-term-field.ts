import { z } from 'zod'
import { registerAction } from './index'
import type { Action } from './types'

const termContextSchema = z.object({
  term: z.string(),
  definition: z.string().optional(),
  tags: z.array(z.string()).optional(),
  origin: z.string().optional(),
  difficultyLevel: z.string().optional(),
  usageExamples: z.array(z.string()).optional(),
  synonyms: z.array(z.string()).optional(),
  relatedEntries: z.array(z.object({
    title: z.string(),
    content: z.string().optional(),
    excerpt: z.string().optional(),
  })).optional(),
})

const inputSchema = z.object({
  field: z.enum(['pronunciation', 'etymology', 'usage_examples', 'synonyms']),
  termContext: termContextSchema,
})

const outputSchema = z.object({
  content: z.string(), // Plain string for pronunciation/etymology, JSON array string for examples/synonyms
})

type Input = z.infer<typeof inputSchema>
type Output = z.infer<typeof outputSchema>

function buildContextSection(termContext: z.infer<typeof termContextSchema>): string {
  const parts: string[] = []

  if (termContext.definition) parts.push(`Current definition: ${termContext.definition}`)
  if (termContext.tags?.length) {
    parts.push(`Tags/Categories: ${termContext.tags.join(', ')}`)
    parts.push(`Note: Focus on the "${termContext.tags[0]}" domain context.`)
  }
  if (termContext.origin) parts.push(`Existing origin info: ${termContext.origin}`)
  if (termContext.difficultyLevel) parts.push(`Difficulty level: ${termContext.difficultyLevel}`)
  if (termContext.relatedEntries?.length) {
    parts.push(`Related entries: ${termContext.relatedEntries.map(e => e.title).join(', ')}`)
    const entryContexts = termContext.relatedEntries.slice(0, 2).map(entry => {
      const snippet = entry.content ? entry.content.substring(0, 200) + '...' : entry.excerpt || ''
      return `"${entry.title}": ${snippet}`
    })
    if (entryContexts.length > 0) parts.push(`Context from related entries: ${entryContexts.join(' | ')}`)
  }
  if (termContext.usageExamples?.length) parts.push(`Existing usage examples: ${termContext.usageExamples.slice(0, 2).join('; ')}`)
  if (termContext.synonyms?.length) parts.push(`Existing synonyms: ${termContext.synonyms.join(', ')}`)

  return parts.join('\n')
}

function buildPrompt(input: Input) {
  const { field, termContext } = input
  const contextSection = buildContextSection(termContext)

  let user = ''

  switch (field) {
    case 'pronunciation':
      user = `Generate accurate phonetic pronunciation for the term "${termContext.term}".

${contextSection}

Requirements:
- Use International Phonetic Alphabet (IPA) notation
- Format like: /ˈpronunciation/
- Provide only the pronunciation notation

Respond with JSON: {"content": "/ˈyour pronunciation/"}`
      break

    case 'etymology':
      user = `Generate detailed etymology and origin information for the term "${termContext.term}".

${contextSection}

Requirements:
- Include historical development and root words
- Mention language of origin
- Include approximate time period if relevant
- Explain how the meaning evolved
- Keep it informative but accessible (2-4 sentences)

Respond with JSON: {"content": "your etymology text here"}`
      break

    case 'usage_examples':
      user = `Generate 3-5 realistic usage examples for the term "${termContext.term}".

${contextSection}

Requirements:
- Create natural, contextually appropriate sentences
- Show different contexts where the term might be used
- Make examples specific to the domain suggested by tags/related entries
- Keep each example concise but clear

Respond with JSON: {"content": "[\\"example 1\\", \\"example 2\\", \\"example 3\\"]"}`
      break

    case 'synonyms':
      user = `Generate relevant synonyms and related terms for "${termContext.term}".

${contextSection}

Requirements:
- Provide 3-6 closely related terms or synonyms
- Focus on terms within the same domain as indicated by tags/context
- Avoid overly general terms unless they're truly synonymous

Respond with JSON: {"content": "[\\"synonym1\\", \\"synonym2\\", \\"synonym3\\"]"}`
      break
  }

  return {
    system: 'You are a lexicography assistant generating accurate term metadata. Always respond with valid JSON.',
    user,
  }
}

const action: Action<Input, Output> = {
  id: 'verbivore-generate-term-field',
  name: 'Generate Term Field',
  description: 'Generate a specific field for a glossary term (pronunciation, etymology, examples, synonyms)',
  entityTypes: ['verbivore_terms'],
  taskType: 'generation',
  inputSchema,
  outputSchema,
  buildPrompt,
}

registerAction(action)

// Helper to parse array results
export function parseArrayResult(content: string): string[] {
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) return parsed
  } catch {
    return content
      .split('\n')
      .map(line => line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0)
  }
  return [content]
}

export { action as verbivoreGenerateTermFieldAction }
