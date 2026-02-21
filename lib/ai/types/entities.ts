/**
 * Type-safe entity and field definitions for AI generation
 *
 * This provides compile-time safety for entity types and field names,
 * preventing typos and ensuring consistency across the codebase.
 */

// All supported entity types
export type EntityType =
  | 'studio_projects'
  | 'studio_hypotheses'
  | 'studio_experiments'
  | 'business_model_canvases'
  | 'customer_profiles'
  | 'value_maps'
  | 'value_proposition_canvases'
  | 'canvas_items'
  | 'assumptions'
  | 'ventures'
  | 'log_entries'
  | 'specimens'
  | 'user_journeys'
  | 'touchpoint_evidence'
  | 'service_blueprints'
  | 'story_maps'
  | 'bmc_items'
  // Canvas-specific entity types (Phase 1-4)
  | 'activities'
  | 'user_stories'
  | 'blueprint_steps'
  | 'blueprint_cells'
  | 'journey_stages'
  | 'journey_cells'
  | 'customer_profile_items'
  | 'value_map_items'

// Field names per entity type
export type FieldNameFor<T extends EntityType> = T extends 'studio_projects'
  ? 'description' | 'problem_statement' | 'hypothesis' | 'success_criteria' | 'current_focus' | 'scope_out'
  : T extends 'studio_hypotheses'
  ? 'statement' | 'validation_criteria'
  : T extends 'studio_experiments'
  ? 'name' | 'description' | 'learnings'
  : T extends 'business_model_canvases'
  ? 'description' | 'tags'
  : T extends 'customer_profiles'
  ? 'description' | 'tags'
  : T extends 'value_maps'
  ? 'description' | 'tags'
  : T extends 'value_proposition_canvases'
  ? 'description' | 'tags'
  : T extends 'canvas_items'
  ? 'title' | 'description' | 'job_context' | 'notes' | 'tags'
  : T extends 'assumptions'
  ? 'statement' | 'validation_criteria' | 'decision_notes' | 'notes' | 'tags'
  : T extends 'ventures'
  ? 'title' | 'description' | 'content' | 'tags'
  : T extends 'log_entries'
  ? 'title' | 'content' | 'tags'
  : T extends 'specimens'
  ? 'title' | 'description' | 'tags'
  : T extends 'user_journeys'
  ? 'name' | 'description' | 'goal' | 'tags'
  : T extends 'touchpoint_evidence'
  ? 'title' | 'summary'
  : T extends 'service_blueprints'
  ? 'name' | 'description' | 'service_scope' | 'service_duration' | 'tags'
  : T extends 'story_maps'
  ? 'name' | 'description' | 'tags'
  : T extends 'bmc_items'
  ? 'content' | 'priority'
  : T extends 'activities'
  ? 'name' | 'description' | 'user_goal'
  : T extends 'user_stories'
  ? 'title' | 'description' | 'acceptance_criteria' | 'story_type'
  : T extends 'blueprint_steps'
  ? 'name' | 'description' | 'step_type'
  : T extends 'blueprint_cells'
  ? 'content' | 'notes'
  : T extends 'journey_stages'
  ? 'name' | 'description'
  : T extends 'journey_cells'
  ? 'content' | 'notes' | 'emotion_score'
  : T extends 'customer_profile_items'
  ? 'content' | 'job_type' | 'severity' | 'importance'
  : T extends 'value_map_items'
  ? 'content' | 'product_type' | 'effectiveness'
  : never

// Union of all possible field names
export type AnyFieldName = FieldNameFor<EntityType>

// Serializable context value types
export type SerializableValue = string | number | boolean | null

// Context must only contain serializable values
export type AIContext = Record<string, SerializableValue>

// Validate entity type at runtime
export function isValidEntityType(type: string): type is EntityType {
  const validTypes: EntityType[] = [
    'studio_projects',
    'studio_hypotheses',
    'studio_experiments',
    'business_model_canvases',
    'customer_profiles',
    'value_maps',
    'value_proposition_canvases',
    'canvas_items',
    'assumptions',
    'ventures',
    'log_entries',
    'specimens',
    'user_journeys',
    'touchpoint_evidence',
    'service_blueprints',
    'story_maps',
    'bmc_items',
    // Canvas-specific entity types (Phase 1-4)
    'activities',
    'user_stories',
    'blueprint_steps',
    'blueprint_cells',
    'journey_stages',
    'journey_cells',
    'customer_profile_items',
    'value_map_items',
  ]
  return validTypes.includes(type as EntityType)
}

// Validate that context only contains serializable values
export function validateContext(context: Record<string, unknown>): AIContext {
  const validated: AIContext = {}

  for (const [key, value] of Object.entries(context)) {
    // Only allow serializable types
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      validated[key] = value
    } else if (value !== undefined) {
      // Log warning for non-serializable values
      console.warn(
        `[AIContext] Skipping non-serializable value for key "${key}":`,
        typeof value,
        'Only string, number, boolean, or null are allowed.'
      )
    }
  }

  return validated
}

// Estimate context size in tokens (rough approximation)
export function estimateContextSize(context: AIContext): number {
  const jsonStr = JSON.stringify(context)
  // Rough estimate: ~4 characters per token
  return Math.ceil(jsonStr.length / 4)
}

// Maximum recommended context size in tokens
export const MAX_CONTEXT_TOKENS = 500

// Validate context size
export function validateContextSize(context: AIContext): { valid: boolean; size: number; max: number } {
  const size = estimateContextSize(context)
  return {
    valid: size <= MAX_CONTEXT_TOKENS,
    size,
    max: MAX_CONTEXT_TOKENS,
  }
}
