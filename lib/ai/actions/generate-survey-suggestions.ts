/**
 * Generate Survey Suggestions Action
 *
 * Generates contextual suggestions for survey questions based on:
 * - The current question being asked
 * - Previous responses in the survey
 * - Project context
 *
 * Used for inline assistance during survey completion.
 */

import { z } from 'zod'
import type { Action } from './types'
import { registerAction } from './index'

// Input schema
const GenerateSuggestionsInputSchema = z.object({
  question: z.string(),
  question_type: z.string(),
  question_category: z.string().optional(),
  previous_responses: z.record(z.string(), z.unknown()),
  project_context: z.object({
    name: z.string(),
    description: z.string().optional(),
    temperature: z.string().optional(),
  }),
})

// Output schema
const GenerateSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()).min(1).max(5),
})

export type GenerateSuggestionsInput = z.infer<typeof GenerateSuggestionsInputSchema>
export type GenerateSuggestionsOutput = z.infer<typeof GenerateSuggestionsOutputSchema>

export const generateSurveySuggestions: Action<GenerateSuggestionsInput, GenerateSuggestionsOutput> = {
  id: 'generate-survey-suggestions',
  name: 'Generate Survey Suggestions',
  description: 'Generates contextual suggestions for survey questions',
  entityTypes: ['studio_surveys'],
  taskType: 'generation',

  inputSchema: GenerateSuggestionsInputSchema,
  outputSchema: GenerateSuggestionsOutputSchema,

  buildPrompt: (input: GenerateSuggestionsInput) => ({
    system: `You are helping a user complete a project discovery survey. Generate 3-5 helpful suggestions for the current question.

Your suggestions should be:
- Specific and actionable (not generic platitudes)
- Appropriate for the question type (${input.question_type})
- Based on common patterns in startup/product development
- Tailored to the project context provided

For different question categories, consider:
- problem: Focus on user pain points, market gaps, inefficiencies
- customer: Think about specific user segments, personas, use cases
- solution: Consider features, approaches, differentiators
- market: Think about competitors, trends, market size
- business_model: Consider revenue streams, pricing, distribution
- execution: Think about milestones, risks, resources needed

Return ONLY a JSON object with a "suggestions" array of strings. No explanations or commentary.`,

    user: `Project: ${input.project_context.name}
${input.project_context.description ? `Description: ${input.project_context.description}` : ''}
${input.project_context.temperature ? `Temperature: ${input.project_context.temperature}` : ''}

Question: ${input.question}
Category: ${input.question_category || 'general'}
Type: ${input.question_type}

Previous responses:
${Object.entries(input.previous_responses)
  .filter(([, v]) => v !== null && v !== undefined && v !== '')
  .map(([k, v]) => `- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
  .join('\n') || '(none yet)'}

Generate 3-5 specific suggestions for this question:`,
  }),
}

// Register the action
registerAction(generateSurveySuggestions)
