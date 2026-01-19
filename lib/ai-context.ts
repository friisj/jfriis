/**
 * Centralized AI Context Builder
 *
 * Provides rich context for AI field generation by fetching related entity data
 * when relationships are selected in forms.
 *
 * Usage:
 *   const relatedContext = await buildEntityContext('service_blueprints', formData)
 *   const fullContext = { ...relatedContext, name: formData.name, ... }
 */

import { supabase } from '@/lib/supabase'

// Entity types that support AI context building
export type AIContextEntityType =
  | 'service_blueprints'
  | 'user_journeys'
  | 'story_maps'
  | 'business_model_canvases'
  | 'value_proposition_canvases'
  | 'customer_profiles'
  | 'studio_experiments'

interface RelationshipConfig {
  foreignKey: string
  table: string
  contextPrefix: string
  fields: string[]
}

/**
 * Configuration mapping entity types to their relationships and context fields.
 * When a FK is populated, the related entity's fields are fetched and added to context.
 */
const relationshipConfig: Record<AIContextEntityType, RelationshipConfig[]> = {
  service_blueprints: [
    {
      foreignKey: 'studio_project_id',
      table: 'studio_projects',
      contextPrefix: 'project',
      fields: ['name', 'description', 'problem_statement', 'success_criteria'],
    },
    {
      foreignKey: 'hypothesis_id',
      table: 'studio_hypotheses',
      contextPrefix: 'hypothesis',
      fields: ['statement', 'validation_criteria'],
    },
  ],
  user_journeys: [
    {
      foreignKey: 'studio_project_id',
      table: 'studio_projects',
      contextPrefix: 'project',
      fields: ['name', 'description', 'problem_statement', 'success_criteria'],
    },
    {
      foreignKey: 'hypothesis_id',
      table: 'studio_hypotheses',
      contextPrefix: 'hypothesis',
      fields: ['statement', 'validation_criteria'],
    },
    {
      foreignKey: 'customer_profile_id',
      table: 'customer_profiles',
      contextPrefix: 'customer',
      fields: ['name', 'description', 'jobs', 'pains', 'gains'],
    },
  ],
  story_maps: [
    {
      foreignKey: 'studio_project_id',
      table: 'studio_projects',
      contextPrefix: 'project',
      fields: ['name', 'description', 'problem_statement', 'success_criteria'],
    },
    {
      foreignKey: 'hypothesis_id',
      table: 'studio_hypotheses',
      contextPrefix: 'hypothesis',
      fields: ['statement', 'validation_criteria'],
    },
  ],
  business_model_canvases: [
    {
      foreignKey: 'studio_project_id',
      table: 'studio_projects',
      contextPrefix: 'project',
      fields: ['name', 'description', 'problem_statement', 'success_criteria'],
    },
  ],
  value_proposition_canvases: [
    {
      foreignKey: 'studio_project_id',
      table: 'studio_projects',
      contextPrefix: 'project',
      fields: ['name', 'description', 'problem_statement', 'success_criteria'],
    },
    {
      foreignKey: 'customer_profile_id',
      table: 'customer_profiles',
      contextPrefix: 'customer',
      fields: ['name', 'description', 'jobs', 'pains', 'gains'],
    },
  ],
  customer_profiles: [
    {
      foreignKey: 'studio_project_id',
      table: 'studio_projects',
      contextPrefix: 'project',
      fields: ['name', 'description', 'problem_statement', 'success_criteria'],
    },
  ],
  studio_experiments: [
    {
      foreignKey: 'project_id',
      table: 'studio_projects',
      contextPrefix: 'project',
      fields: ['name', 'description', 'problem_statement', 'success_criteria'],
    },
    {
      foreignKey: 'hypothesis_id',
      table: 'studio_hypotheses',
      contextPrefix: 'hypothesis',
      fields: ['statement', 'validation_criteria'],
    },
  ],
}

/**
 * Fetches a related entity's data. Returns null on any error (graceful degradation).
 */
async function fetchRelatedEntity(
  table: string,
  id: string,
  fields: string[]
): Promise<Record<string, unknown> | null> {
  // Validate inputs
  if (!table || !id || !fields.length) {
    console.warn(`[AI Context] Invalid fetch params: table=${table}, id=${id}, fields=${fields.length}`)
    return null
  }

  try {
    // Use explicit any to handle dynamic table access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from(table)
      .select(fields.join(', '))
      .eq('id', id)
      .single()

    if (error) {
      console.warn(`[AI Context] Failed to fetch ${table}:${id}`, error.message)
      return null
    }

    return data as Record<string, unknown> | null
  } catch (err) {
    console.warn(`[AI Context] Error fetching ${table}:${id}`, err)
    return null
  }
}

/**
 * Builds AI context by fetching related entities based on FK values in formData.
 *
 * @param entityType - The type of entity being edited (e.g., 'service_blueprints')
 * @param formData - Form data containing FK fields (e.g., { studio_project_id: '...', ... })
 * @param additionalContext - Optional extra context to merge in
 * @returns Context object with prefixed fields from related entities
 *
 * @example
 * const context = await buildEntityContext('service_blueprints', {
 *   studio_project_id: 'abc-123',
 *   hypothesis_id: 'def-456',
 * })
 * // Returns: { project_name: '...', project_description: '...', hypothesis_statement: '...' }
 */
export async function buildEntityContext(
  entityType: AIContextEntityType,
  formData: Record<string, string | null | undefined>,
  additionalContext: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  // Validate entityType
  const config = relationshipConfig[entityType]
  if (!config) {
    console.warn(`[AI Context] Unknown entity type: ${entityType}`)
    return { ...additionalContext }
  }

  const context: Record<string, unknown> = { ...additionalContext }

  // Fetch all related entities in parallel
  const fetchPromises = config
    .filter((rel) => {
      const fkValue = formData[rel.foreignKey]
      // Explicit null/undefined/empty string check
      return fkValue !== null && fkValue !== undefined && fkValue !== ''
    })
    .map(async (rel) => {
      const id = formData[rel.foreignKey]
      // Double-check id is valid (TypeScript narrowing)
      if (!id || typeof id !== 'string') return

      const data = await fetchRelatedEntity(rel.table, id, rel.fields)
      if (data) {
        // Add each field with the configured prefix
        rel.fields.forEach((field) => {
          const value = data[field]
          if (value !== null && value !== undefined) {
            context[`${rel.contextPrefix}_${field}`] = value
          }
        })
      }
    })

  await Promise.all(fetchPromises)

  return context
}

/**
 * Returns the list of FK field names that should trigger context rebuilding
 * for a given entity type. Use this for useEffect dependencies.
 *
 * @example
 * const fkFields = getContextDependencies('service_blueprints')
 * // Returns: ['studio_project_id', 'hypothesis_id']
 */
export function getContextDependencies(entityType: AIContextEntityType): string[] {
  const config = relationshipConfig[entityType] || []
  return config.map((rel) => rel.foreignKey)
}
