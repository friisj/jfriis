import { z } from 'zod'
import { registerAction } from './index'
import type { Action } from './types'

const inputSchema = z.object({
  content: z.string(),
  title: z.string().optional(),
  manualTerms: z.array(z.string()).optional().default([]),
  excludeTerms: z.array(z.string()).optional().default([]),
  rejectedTerms: z.array(z.string()).optional().default([]),
  customPrompt: z.string().optional(),
})

const outputSchema = z.object({
  content: z.string(), // JSON array of suggestions as a string
})

type Input = z.infer<typeof inputSchema>
type Output = z.infer<typeof outputSchema>

function buildPrompt(input: Input) {
  const { content, title, manualTerms, excludeTerms, rejectedTerms, customPrompt } = input

  let user = 'Analyze the following text and suggest 3-5 technical terms that could benefit from definition in a glossary.'

  if (customPrompt) {
    user += `\n\nIMPORTANT USER INSTRUCTIONS: ${customPrompt}\nPlease prioritize these specific instructions while maintaining the quality and relevance of term suggestions.`
  }

  user += `\n\nGeneral Guidelines:
- Technical jargon or specialized terminology
- Terms that may be unfamiliar to a general audience
- Concepts that would benefit from explanation
- Domain-specific language

Title: ${title || 'Untitled'}
Content: ${content}`

  if (excludeTerms && excludeTerms.length > 0) {
    user += `\n\nDO NOT suggest these terms as they are already linked to this entry: ${excludeTerms.join(', ')}`
  }

  if (rejectedTerms && rejectedTerms.length > 0) {
    user += `\n\nIMPORTANT - USER PREFERENCE LEARNING: The user has previously rejected these suggestions: ${rejectedTerms.join(', ')}
This indicates the user is NOT interested in these types of terms. Avoid suggesting similar terms.`
  }

  if (manualTerms && manualTerms.length > 0) {
    user += `\n\nThe user has already identified these terms: ${manualTerms.join(', ')}
Please suggest ADDITIONAL complementary terms that work well with these, avoiding duplicates.`
  }

  user += '\n\nRespond with JSON: {"content": "[\\"term1\\", \\"term2\\", \\"term3\\"]"}'

  return {
    system: 'You are a lexicography assistant identifying terms that deserve glossary entries. Always respond with valid JSON where content is a JSON array string.',
    user,
  }
}

const action: Action<Input, Output> = {
  id: 'verbivore-suggest-terms',
  name: 'Suggest Terms',
  description: 'Suggest glossary terms from entry content',
  entityTypes: ['verbivore_entries'],
  taskType: 'extraction',
  inputSchema,
  outputSchema,
  buildPrompt,
}

registerAction(action)

// Helper to parse suggestions from action result
export function parseSuggestions(content: string): string[] {
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed) && parsed.every(s => typeof s === 'string')) {
      return parsed.slice(0, 5)
    }
  } catch {
    // Fallback: split by newlines
    return content
      .split('\n')
      .map(line => line.replace(/^[-*•]\s*/, '').replace(/["\[\]]/g, '').trim())
      .filter(line => line && line.length < 50)
      .slice(0, 5)
  }
  return []
}

export { action as verbivoreSuggestTermsAction }
