/**
 * Survey TypeScript types
 * Type definitions for survey UI and data structures
 */

export type QuestionType = 'text' | 'textarea' | 'select' | 'multiselect' | 'scale' | 'boolean' | 'entity_suggest' | 'entity_create'

export type QuestionCategory = 'problem' | 'customer' | 'solution' | 'market' | 'business_model' | 'execution' | 'meta'

export interface SelectOption {
  value: string
  label: string
}

export interface QuestionConfig {
  // For text/textarea
  placeholder?: string
  min_length?: number
  max_length?: number

  // For select/multiselect
  options?: SelectOption[]
  allow_other?: boolean
  min_selections?: number
  max_selections?: number

  // For scale
  min?: number
  max?: number
  labels?: { min: string; max: string }

  // For entity types
  entity_type?: string
  suggestion_prompt?: string
}

export interface ArtifactHint {
  type: string
  field?: string
  block?: string
  weight: number
}

export interface SurveyQuestion {
  id: string
  sequence: number
  question: string
  help_text?: string
  category: QuestionCategory
  type: QuestionType
  config: QuestionConfig
  required: boolean
  informs: ArtifactHint[]
  suggestions?: {
    enabled: boolean
    source: 'llm' | 'existing_entities' | 'web_search'
    prompt?: string
    entity_type?: string
  }
  show_if?: {
    question_id: string
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
    value: unknown
  }
}

export interface SurveyDefinition {
  id: string
  version: number
  title: string
  description: string
  estimated_minutes: number
  questions: SurveyQuestion[]
  target_artifacts: Array<Record<string, unknown>>
}

export interface SurveyResponse {
  id?: string
  survey_id: string
  question_id: string
  response_value: unknown
  response_text: string
  skipped?: boolean
  time_spent_seconds?: number
}

export interface Survey {
  id: string
  project_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'expired'
  version: number
  questions: SurveyDefinition
  generation_context: unknown
  generation_model: string
  started_at?: string
  completed_at?: string
  current_question_index: number
  processing_status?: 'processing' | 'completed' | 'failed'
  processing_error?: string
  created_at: string
  updated_at: string
  responses?: SurveyResponse[]
}

// Response value types
export type ResponseValue = string | number | boolean | string[] | null
