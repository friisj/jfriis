import { z } from 'zod'
import { registerAction } from './index'
import type { Action } from './types'

const termDataSchema = z.object({
  term: z.string(),
  definition: z.string(),
  difficulty_level: z.string().optional(),
  is_primary: z.boolean().optional(),
})

const inputSchema = z.object({
  entryTitle: z.string(),
  entryExcerpt: z.string().optional(),
  entryContent: z.string().optional(),
  wordCount: z.number().optional(),
  complexityScore: z.number().optional(),
  linkedTerms: z.array(termDataSchema),
})

const outputSchema = z.object({
  content: z.string(), // JSON string of the split strategy
})

type Input = z.infer<typeof inputSchema>
type Output = z.infer<typeof outputSchema>

function buildPrompt(input: Input) {
  const { entryTitle, entryExcerpt, entryContent, wordCount, complexityScore, linkedTerms } = input

  const user = `You are an expert editorial agent specializing in content optimization. Analyze this entry and propose a strategy to split it into multiple focused entries.

ENTRY TO ANALYZE:
Title: "${entryTitle}"
Content Length: ${wordCount || 'Unknown'} words
Current Complexity: ${complexityScore || 5}/10

Excerpt: "${entryExcerpt || 'No excerpt provided'}"

LINKED TERMS (${linkedTerms.length} total):
${linkedTerms.map((term, i) =>
  `${i + 1}. "${term.term}" (${term.difficulty_level || 'intermediate'}) - ${term.definition.substring(0, 100)}...`
).join('\n')}

CONTENT PREVIEW:
${entryContent ? entryContent.substring(0, 1500) + '...' : 'No content provided'}

ANALYSIS OBJECTIVES:
1. Identify natural groupings of terms that belong together thematically
2. Propose 3-5 focused entries, each with 6-12 terms
3. Determine optimal sequence/reading order for the split entries
4. Suggest compelling titles for each split entry
5. Plan cross-references between entries

SPLITTING CRITERIA:
- Maintain conceptual coherence within each group
- Optimize for readability (target 8-12 minutes reading time per entry)
- Consider term difficulty progression
- Preserve narrative or logical flow
- Ensure each entry can stand alone while referencing others

Respond with JSON: {"content": "<JSON string of strategy>"} where the strategy has this structure:
{
  "strategy_type": "thematic|temporal|complexity|domain|narrative",
  "total_groups": 3-5,
  "analysis_summary": "Brief explanation of the splitting approach",
  "groups": [
    {
      "title": "Compelling title for this split entry",
      "theme": "Core theme/focus of this group",
      "terms": ["term1", "term2"],
      "rationale": "Why these terms belong together",
      "complexity_level": 5,
      "estimated_word_count": 800,
      "suggested_excerpt": "Brief excerpt"
    }
  ],
  "sequence_rationale": "Why this reading order makes sense",
  "cross_reference_strategy": "How entries will reference each other",
  "original_entry_update": {
    "new_role": "overview",
    "updated_excerpt": "New excerpt positioning this as part of a series",
    "retained_terms": ["key terms to keep"]
  }
}`

  return {
    system: 'You are an expert editorial agent that analyzes content structure and proposes optimal splitting strategies. Always respond with valid JSON.',
    user,
  }
}

const action: Action<Input, Output> = {
  id: 'verbivore-analyze-split',
  name: 'Analyze Entry Split',
  description: 'Analyze an entry with many terms and propose a splitting strategy',
  entityTypes: ['verbivore_entries'],
  taskType: 'analysis',
  inputSchema,
  outputSchema,
  buildPrompt,
}

registerAction(action)
export { action as verbivoreAnalyzeSplitAction }
