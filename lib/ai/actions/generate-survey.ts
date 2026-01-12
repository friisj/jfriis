/**
 * Generate Survey Action
 *
 * Generates contextual survey questions for project onboarding
 * based on minimal user input (project name, description, temperature).
 */

import { z } from 'zod'
import type { Action } from './types'
import { registerAction } from './index'
import { SURVEY_PROMPTS } from '@/lib/ai/prompts/surveys'

// Zod schemas for validation
const SurveyQuestionSchema = z.object({
  id: z.string(),
  sequence: z.number(),
  question: z.string(),
  help_text: z.string().optional(),
  category: z.enum(['problem', 'customer', 'solution', 'market', 'business_model', 'execution', 'meta']),
  type: z.enum(['text', 'textarea', 'select', 'multiselect', 'scale', 'boolean', 'entity_suggest', 'entity_create']),
  config: z.record(z.string(), z.unknown()),
  required: z.boolean(),
  informs: z.array(
    z.object({
      type: z.string(),
      field: z.string().optional(),
      block: z.string().optional(),
      weight: z.number().min(0).max(1),
    })
  ),
  suggestions: z
    .object({
      enabled: z.boolean(),
      source: z.enum(['llm', 'existing_entities', 'web_search']),
      prompt: z.string().optional(),
      entity_type: z.string().optional(),
    })
    .optional(),
  show_if: z
    .object({
      question_id: z.string(),
      operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']),
      value: z.unknown(),
    })
    .optional(),
})

const GenerateSurveyInputSchema = z.object({
  project_name: z.string().min(1, 'Project name is required'),
  project_description: z.string().optional(),
  project_temperature: z.enum(['hot', 'warm', 'cold']).optional(),
  existing_fields: z.record(z.string(), z.string()).optional(),
})

const SurveyDefinitionSchema = z.object({
  id: z.string(),
  version: z.number(),
  title: z.string(),
  description: z.string(),
  estimated_minutes: z.number().min(1).max(60),
  questions: z.array(SurveyQuestionSchema).min(3).max(15),
  target_artifacts: z.array(z.string()),
})

export type GenerateSurveyInput = z.infer<typeof GenerateSurveyInputSchema>
export type SurveyDefinition = z.infer<typeof SurveyDefinitionSchema>
export type SurveyQuestion = z.infer<typeof SurveyQuestionSchema>

export const generateSurvey: Action<GenerateSurveyInput, SurveyDefinition> = {
  id: 'generate-survey',
  name: 'Generate Project Survey',
  description: 'Generates contextual survey questions from project data',
  entityTypes: ['studio_projects', 'studio_surveys'],
  taskType: 'generation',

  inputSchema: GenerateSurveyInputSchema,
  outputSchema: SurveyDefinitionSchema,

  buildPrompt: (input: GenerateSurveyInput) => ({
    system: SURVEY_PROMPTS.generation.system,
    user: SURVEY_PROMPTS.generation.userTemplate(input),
  }),
}

// Register the action
registerAction(generateSurvey)
