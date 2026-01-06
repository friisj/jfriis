/**
 * Process Survey Action
 *
 * Generates project artifacts from completed survey responses.
 * Used by streaming endpoint to create hypotheses, customer profiles,
 * assumptions, and experiments in real-time.
 */

import { z } from 'zod'
import type { Action } from './types'
import { registerAction } from './index'
import { SURVEY_PROMPTS } from '@/lib/ai/prompts/surveys'

// Input schema
const ProcessSurveyInputSchema = z.object({
  survey_id: z.string(),
  project_id: z.string(),
  responses: z.array(
    z.object({
      question_id: z.string(),
      question_text: z.string(),
      response_text: z.string(),
      response_value: z.unknown(),
    })
  ),
})

// Output schema - defines all artifacts that will be generated
export const ProcessSurveyOutputSchema = z.object({
  project_updates: z.object({
    problem_statement: z.string().optional(),
    success_criteria: z.string().optional(),
    current_focus: z.string().optional(),
    scope_out: z.string().optional(),
  }),
  hypotheses: z.array(
    z.object({
      statement: z.string(),
      rationale: z.string().optional(),
      validation_criteria: z.string().optional(),
      source_questions: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    })
  ),
  customer_profiles: z.array(
    z.object({
      name: z.string(),
      type: z.string(), // persona, segment, ICP
      jobs: z.string().optional(),
      pains: z.string().optional(),
      gains: z.string().optional(),
      source_questions: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    })
  ),
  assumptions: z.array(
    z.object({
      statement: z.string(),
      category: z.enum(['desirability', 'viability', 'feasibility', 'usability']),
      importance: z.enum(['critical', 'high', 'medium', 'low']),
      is_leap_of_faith: z.boolean(),
      source_questions: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    })
  ),
  experiments: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      type: z.enum(['spike', 'discovery_interviews', 'landing_page', 'prototype']),
      expected_outcome: z.string(),
      source_questions: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    })
  ),
})

export type ProcessSurveyInput = z.infer<typeof ProcessSurveyInputSchema>
export type ProcessSurveyOutput = z.infer<typeof ProcessSurveyOutputSchema>

export const processSurvey: Action<ProcessSurveyInput, ProcessSurveyOutput> = {
  id: 'process-survey-responses',
  name: 'Process Survey Responses',
  description: 'Generates project artifacts from completed survey',
  entityTypes: ['studio_surveys', 'studio_projects', 'studio_hypotheses', 'customer_profiles'],
  taskType: 'generation',

  inputSchema: ProcessSurveyInputSchema,
  outputSchema: ProcessSurveyOutputSchema,

  buildPrompt: (input: ProcessSurveyInput) => ({
    system: SURVEY_PROMPTS.processing.system,
    user: SURVEY_PROMPTS.processing.userTemplate(input),
  }),
}

// Register the action
registerAction(processSurvey)
