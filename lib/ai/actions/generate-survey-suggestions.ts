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

// Sanitization limits
const MAX_QUESTION_LENGTH = 1000
const MAX_PROJECT_NAME_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_RESPONSE_LENGTH = 5000
const MAX_RESPONSES = 50

/**
 * Sanitize text input to prevent prompt injection
 * - Removes XML/HTML-like tags that could manipulate the prompt
 * - Truncates to max length
 * - Removes control characters
 */
function sanitizeText(text: string | undefined | null, maxLength: number): string {
  if (!text) return ''

  return (
    text
      // Remove potential XML/HTML tags and angle brackets
      .replace(/<[^>]*>/g, '')
      // Remove common prompt injection markers
      .replace(/\[\/?(system|user|assistant|human|ai)\]/gi, '')
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Truncate
      .slice(0, maxLength)
      .trim()
  )
}

/**
 * Sanitize response values for safe inclusion in prompts
 */
function sanitizeResponseValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return sanitizeText(value, MAX_RESPONSE_LENGTH)
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map((v) => (typeof v === 'string' ? sanitizeText(v, 200) : String(v)))
      .join(', ')
  }
  return ''
}

// Input schema with max lengths
const GenerateSuggestionsInputSchema = z.object({
  question: z.string().max(MAX_QUESTION_LENGTH),
  question_type: z.string().max(50),
  question_category: z.string().max(50).optional(),
  previous_responses: z.record(z.string(), z.unknown()),
  project_context: z.object({
    name: z.string().max(MAX_PROJECT_NAME_LENGTH),
    description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
    temperature: z.string().max(20).optional(),
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

  buildPrompt: (input: GenerateSuggestionsInput) => {
    // Sanitize all user-provided input before including in prompt
    const sanitizedQuestion = sanitizeText(input.question, MAX_QUESTION_LENGTH)
    const sanitizedQuestionType = sanitizeText(input.question_type, 50)
    const sanitizedCategory = sanitizeText(input.question_category, 50) || 'general'
    const sanitizedProjectName = sanitizeText(input.project_context.name, MAX_PROJECT_NAME_LENGTH)
    const sanitizedDescription = sanitizeText(input.project_context.description, MAX_DESCRIPTION_LENGTH)
    const sanitizedTemperature = sanitizeText(input.project_context.temperature, 20)

    // Sanitize previous responses (limit count and content)
    const sanitizedResponses = Object.entries(input.previous_responses)
      .slice(0, MAX_RESPONSES)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => {
        const sanitizedKey = sanitizeText(k, 100)
        const sanitizedValue = sanitizeResponseValue(v)
        return `- ${sanitizedKey}: ${sanitizedValue}`
      })
      .join('\n') || '(none yet)'

    return {
      system: `You are helping a user complete a project discovery survey. Generate 3-5 helpful suggestions for the current question.

Your suggestions should be:
- Specific and actionable (not generic platitudes)
- Appropriate for the question type (${sanitizedQuestionType})
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

      user: `Project: ${sanitizedProjectName}
${sanitizedDescription ? `Description: ${sanitizedDescription}` : ''}
${sanitizedTemperature ? `Temperature: ${sanitizedTemperature}` : ''}

Question: ${sanitizedQuestion}
Category: ${sanitizedCategory}
Type: ${sanitizedQuestionType}

Previous responses:
${sanitizedResponses}

Generate 3-5 specific suggestions for this question:`,
    }
  },
}

// Register the action
registerAction(generateSurveySuggestions)
