/**
 * CRUD Operations for Service Blueprints
 *
 * Handles service blueprints and blueprint steps
 * Phase 3 of Boundary Objects Entity System
 */

import { supabase } from '@/lib/supabase'
import type {
  ServiceBlueprint,
  ServiceBlueprintInsert,
  ServiceBlueprintUpdate,
  BlueprintStep,
  BlueprintStepInsert,
  BlueprintStepUpdate,
  BlueprintWithSteps,
  BlueprintStepWithRelations,
  BlueprintSummaryView,
  BlueprintFilters,
  SortConfig,
  BlueprintSortField,
  PaginationParams,
  PaginatedResponse,
} from '@/lib/types/boundary-objects'
import { getLinkedEntities } from '@/lib/entity-links'

// ============================================================================
// SERVICE BLUEPRINTS
// ============================================================================

export async function createBlueprint(data: ServiceBlueprintInsert): Promise<ServiceBlueprint> {
  const { data: blueprint, error } = await supabase
    .from('service_blueprints')
    .insert(data as any)
    .select()
    .single()

  if (error) throw error
  return blueprint as unknown as ServiceBlueprint
}

export async function getBlueprint(id: string): Promise<ServiceBlueprint> {
  const { data, error } = await supabase
    .from('service_blueprints')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as unknown as ServiceBlueprint
}

export async function getBlueprintBySlug(
  slug: string,
  projectId?: string
): Promise<ServiceBlueprint | null> {
  let query = supabase.from('service_blueprints').select('*').eq('slug', slug)

  if (projectId) {
    query = query.eq('studio_project_id', projectId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) throw error
  return data as unknown as ServiceBlueprint | null
}

export async function getBlueprintWithSteps(id: string): Promise<BlueprintWithSteps> {
  const { data: blueprint, error: blueprintError } = await supabase
    .from('service_blueprints')
    .select('*')
    .eq('id', id)
    .single()

  if (blueprintError) throw blueprintError

  const { data: steps, error: stepsError } = await supabase
    .from('blueprint_steps')
    .select('*')
    .eq('service_blueprint_id', id)
    .order('sequence', { ascending: true })

  if (stepsError) throw stepsError

  // Count linked journeys via entity_links
  const journeyLinks = await getLinkedEntities(
    { type: 'service_blueprint', id },
    { targetType: 'user_journey' }
  )

  return {
    ...(blueprint as unknown as ServiceBlueprint),
    steps: (steps || []) as unknown as BlueprintStep[],
    step_count: steps?.length || 0,
    linked_journey_count: journeyLinks.length,
  }
}

/**
 * List blueprints with pagination and filtering
 */
export async function listBlueprints(
  filters?: BlueprintFilters,
  sort?: SortConfig<BlueprintSortField>,
  pagination?: PaginationParams
): Promise<PaginatedResponse<ServiceBlueprint>> {
  const limit = pagination?.limit || 50

  let query = supabase
    .from('service_blueprints')
    .select('*')
    .limit(limit + 1)

  // Apply cursor
  if (pagination?.cursor) {
    query = query.gt('id', pagination.cursor)
  }

  // Apply filters
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  }
  if (filters?.validation_status && filters.validation_status.length > 0) {
    query = query.in('validation_status', filters.validation_status)
  }
  if (filters?.blueprint_type && filters.blueprint_type.length > 0) {
    query = query.in('blueprint_type', filters.blueprint_type)
  }
  if (filters?.studio_project_id) {
    query = query.eq('studio_project_id', filters.studio_project_id)
  }
  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags)
  }
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    )
  }

  // Apply sorting
  if (sort) {
    query = query.order(sort.field, { ascending: sort.direction === 'asc' })
  } else {
    query = query.order('updated_at', { ascending: false })
  }

  const { data, error } = await query

  if (error) throw error

  const hasMore = (data?.length || 0) > limit
  const results = hasMore ? data!.slice(0, limit) : data || []
  const nextCursor = hasMore && results.length > 0 ? results[results.length - 1].id : undefined

  return {
    data: results as unknown as ServiceBlueprint[],
    nextCursor,
    hasMore,
  }
}

/**
 * List blueprints for a specific project
 */
export async function listBlueprintsByProject(projectId: string): Promise<ServiceBlueprint[]> {
  const { data, error } = await supabase
    .from('service_blueprints')
    .select('*')
    .eq('studio_project_id', projectId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []) as unknown as ServiceBlueprint[]
}

export async function updateBlueprint(
  id: string,
  updates: ServiceBlueprintUpdate
): Promise<ServiceBlueprint> {
  const { data, error } = await supabase
    .from('service_blueprints')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as unknown as ServiceBlueprint
}

export async function deleteBlueprint(id: string): Promise<void> {
  const { error } = await supabase.from('service_blueprints').delete().eq('id', id)

  if (error) throw error
}

// ============================================================================
// BLUEPRINT STEPS
// ============================================================================

export async function createStep(data: BlueprintStepInsert): Promise<BlueprintStep> {
  const { data: step, error } = await supabase
    .from('blueprint_steps')
    .insert(data as any)
    .select()
    .single()

  if (error) throw error
  return step as unknown as BlueprintStep
}

export async function getStep(id: string): Promise<BlueprintStep> {
  const { data, error } = await supabase
    .from('blueprint_steps')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as unknown as BlueprintStep
}

export async function getStepWithRelations(id: string): Promise<BlueprintStepWithRelations> {
  const { data: step, error: stepError } = await supabase
    .from('blueprint_steps')
    .select('*')
    .eq('id', id)
    .single()

  if (stepError) throw stepError

  // Count linked touchpoints via entity_links
  const touchpointLinks = await getLinkedEntities(
    { type: 'blueprint_step', id },
    { targetType: 'touchpoint' }
  )

  // Count linked stories via entity_links
  const storyLinks = await getLinkedEntities(
    { type: 'blueprint_step', id },
    { targetType: 'user_story' }
  )

  return {
    ...(step as unknown as BlueprintStep),
    touchpoint_count: touchpointLinks.length,
    story_count: storyLinks.length,
  }
}

export async function listSteps(blueprintId: string): Promise<BlueprintStep[]> {
  const { data, error } = await supabase
    .from('blueprint_steps')
    .select('*')
    .eq('service_blueprint_id', blueprintId)
    .order('sequence', { ascending: true })

  if (error) throw error
  return (data || []) as unknown as BlueprintStep[]
}

export async function updateStep(id: string, updates: BlueprintStepUpdate): Promise<BlueprintStep> {
  const { data, error } = await supabase
    .from('blueprint_steps')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as unknown as BlueprintStep
}

export async function deleteStep(id: string): Promise<void> {
  const { error } = await supabase.from('blueprint_steps').delete().eq('id', id)

  if (error) throw error
}

/**
 * Reorder steps within a blueprint
 */
export async function reorderSteps(blueprintId: string, stepIds: string[]): Promise<void> {
  const updates = stepIds.map((id, index) => ({
    id,
    sequence: index,
    service_blueprint_id: blueprintId,
  }))

  const { error } = await supabase.from('blueprint_steps').upsert(updates as any)

  if (error) throw error
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export async function createBlueprintWithSteps(
  blueprint: ServiceBlueprintInsert,
  steps: Omit<BlueprintStepInsert, 'service_blueprint_id'>[]
): Promise<BlueprintWithSteps> {
  // Create blueprint
  const createdBlueprint = await createBlueprint(blueprint)

  // Create steps with blueprint ID
  const stepsWithBlueprintId = steps.map((step, index) => ({
    ...step,
    service_blueprint_id: createdBlueprint.id,
    sequence: step.sequence ?? index,
  }))

  if (stepsWithBlueprintId.length > 0) {
    const { data: createdSteps, error: stepsError } = await supabase
      .from('blueprint_steps')
      .insert(stepsWithBlueprintId as any)
      .select()

    if (stepsError) throw stepsError

    return {
      ...createdBlueprint,
      steps: (createdSteps || []) as unknown as BlueprintStep[],
      step_count: createdSteps?.length || 0,
      linked_journey_count: 0,
    }
  }

  return {
    ...createdBlueprint,
    steps: [],
    step_count: 0,
    linked_journey_count: 0,
  }
}

/**
 * Duplicate a blueprint with all its steps
 */
export async function duplicateBlueprint(
  id: string,
  newSlug: string,
  newName?: string
): Promise<BlueprintWithSteps> {
  const existing = await getBlueprintWithSteps(id)

  // Create new blueprint
  const newBlueprint: ServiceBlueprintInsert = {
    slug: newSlug,
    name: newName || `${existing.name} (copy)`,
    description: existing.description,
    studio_project_id: existing.studio_project_id,
    hypothesis_id: existing.hypothesis_id,
    blueprint_type: existing.blueprint_type,
    status: 'draft',
    version: 1,
    service_scope: existing.service_scope,
    service_duration: existing.service_duration,
    validation_status: 'untested',
    tags: existing.tags,
    metadata: existing.metadata,
  }

  // Copy steps without IDs
  const newSteps = existing.steps.map(step => ({
    name: step.name,
    description: step.description,
    sequence: step.sequence,
    layers: step.layers,
    actors: step.actors,
    duration_estimate: step.duration_estimate,
    cost_implication: step.cost_implication,
    customer_value_delivery: step.customer_value_delivery,
    failure_risk: step.failure_risk,
    failure_impact: step.failure_impact,
    validation_status: 'untested' as const,
    metadata: step.metadata,
  }))

  return createBlueprintWithSteps(newBlueprint, newSteps)
}
