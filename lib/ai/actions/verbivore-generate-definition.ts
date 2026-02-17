import { z } from 'zod'
import { registerAction } from './index'
import type { Action } from './types'

const inputSchema = z.object({
  term: z.string(),
  context: z.string().optional().default('glossary definition'),
  entryTitle: z.string().optional(),
  entryExcerpt: z.string().optional(),
  entryContent: z.string().optional(),
  termContext: z.object({
    tags: z.array(z.string()).optional(),
    origin: z.string().optional(),
    difficultyLevel: z.string().optional(),
    synonyms: z.array(z.string()).optional(),
    usageExamples: z.array(z.string()).optional(),
    relatedEntries: z.array(z.object({
      title: z.string(),
      content: z.string().optional(),
      excerpt: z.string().optional(),
    })).optional(),
  }).optional(),
})

const outputSchema = z.object({
  content: z.string(),
})

type Input = z.infer<typeof inputSchema>
type Output = z.infer<typeof outputSchema>

function buildPrompt(input: Input) {
  const { term, context, entryTitle, entryExcerpt, entryContent, termContext } = input

  let user = `Create a clear, concise definition for the term "${term}" suitable for a ${context}.`

  if (termContext) {
    user += '\n\nExisting term context to improve accuracy:'

    if (termContext.tags && termContext.tags.length > 0) {
      user += `\nTags: ${termContext.tags.join(', ')}`
      if (termContext.tags.length === 1) {
        user += `\nNote: This term is specifically categorized within the "${termContext.tags[0]}" domain. Focus the definition exclusively on this context.`
      } else {
        user += `\nNote: This term is categorized within these domains: ${termContext.tags.join(', ')}. Choose the most relevant domain and focus the definition on that specific context.`
      }
    }

    if (termContext.origin) user += `\nOrigin/Etymology: ${termContext.origin}`
    if (termContext.difficultyLevel) user += `\nDifficulty Level: ${termContext.difficultyLevel}`
    if (termContext.synonyms?.length) user += `\nSynonyms: ${termContext.synonyms.join(', ')}`
    if (termContext.usageExamples?.length) user += `\nUsage Examples: ${termContext.usageExamples.slice(0, 2).join('; ')}`

    if (termContext.relatedEntries?.length) {
      user += `\nRelated Entries: ${termContext.relatedEntries.map(e => e.title).join(', ')}`
      const entryContexts = termContext.relatedEntries.slice(0, 2).map(entry => {
        const snippet = entry.content ? entry.content.substring(0, 200) + '...' : entry.excerpt || ''
        return `"${entry.title}": ${snippet}`
      })
      if (entryContexts.length > 0) {
        user += `\nContext from related entries: ${entryContexts.join(' | ')}`
      }
    }

    user += '\n\nIMPORTANT: Use this existing context to create a definition that is SPECIFICALLY tailored to how this term is used in the associated domains/contexts.'
  }

  if (entryTitle || entryExcerpt || entryContent) {
    user += '\n\nContextual information from the related content:'
    if (entryTitle) user += `\nTitle: ${entryTitle}`
    if (entryExcerpt) user += `\nExcerpt: ${entryExcerpt}`
    if (entryContent) user += `\nContent: ${entryContent.substring(0, 1000)}${entryContent.length > 1000 ? '...' : ''}`
    user += '\n\nUse this context to provide a definition that is specifically relevant to how the term is used in this content.'
  }

  user += `

Requirements:
- Keep it under 200 words
- Make it accessible but accurate
- When specific domain context is provided, focus EXCLUSIVELY on that domain
- Do NOT provide multiple definitions for different contexts - pick the most relevant one
- Avoid overly technical jargon unless necessary

Respond with JSON: {"content": "your definition here"}`

  return {
    system: 'You are a lexicographer creating precise, domain-aware definitions for a curated glossary. Always respond with valid JSON.',
    user,
  }
}

const action: Action<Input, Output> = {
  id: 'verbivore-generate-definition',
  name: 'Generate Term Definition',
  description: 'Generate a context-aware definition for a glossary term',
  entityTypes: ['verbivore_terms'],
  taskType: 'generation',
  inputSchema,
  outputSchema,
  buildPrompt,
}

registerAction(action)
export { action as verbivoreGenerateDefinitionAction }
