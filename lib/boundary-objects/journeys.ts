/**
 * CRUD Operations for User Journeys
 *
 * Handles journeys, stages, touchpoints, and their relationships
 */

import { supabase } from '@/lib/supabase'
import type {
  UserJourney,
  UserJourneyInsert,
  UserJourneyUpdate,
  JourneyStage,
  JourneyStageInsert,
  JourneyStageUpdate,
  Touchpoint,
  TouchpointInsert,
  TouchpointUpdate,
  JourneyWithStages,
  StageWithTouchpoints,
  TouchpointWithRelations,
  JourneySummary,
  JourneyFilters,
  TouchpointFilters,
  SortConfig,
  JourneySortField,
  TouchpointSortField,
} from '@/lib/types/boundary-objects'

// ============================================================================
// USER JOURNEYS
// ============================================================================

export async function createJourney(data: UserJourneyInsert): Promise<UserJourney> {
  const { data: journey, error } = await supabase
    .from('user_journeys')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return journey
}

export async function getJourney(id: string): Promise<UserJourney> {
  const { data, error } = await supabase
    .from('user_journeys')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getJourneyWithStages(id: string): Promise<JourneyWithStages> {
  const { data: journey, error: journeyError } = await supabase
    .from('user_journeys')
    .select('*')
    .eq('id', id)
    .single()

  if (journeyError) throw journeyError

  const { data: stages, error: stagesError } = await supabase
    .from('journey_stages')
    .select('*')
    .eq('user_journey_id', id)
    .order('sequence', { ascending: true })

  if (stagesError) throw stagesError

  // Count touchpoints across all stages
  const { count: touchpointCount } = await supabase
    .from('touchpoints')
    .select('*', { count: 'exact', head: true })
    .in('journey_stage_id', stages.map(s => s.id))

  return {
    ...journey,
    stages: stages || [],
    stage_count: stages?.length || 0,
    touchpoint_count: touchpointCount || 0,
  }
}

export async function listJourneys(
  filters?: JourneyFilters,
  sort?: SortConfig<JourneySortField>
): Promise<UserJourney[]> {
  let query = supabase.from('user_journeys').select('*')

  // Apply filters
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  }
  if (filters?.validation_status && filters.validation_status.length > 0) {
    query = query.in('validation_status', filters.validation_status)
  }
  if (filters?.customer_profile_id) {
    query = query.eq('customer_profile_id', filters.customer_profile_id)
  }
  if (filters?.journey_type && filters.journey_type.length > 0) {
    query = query.in('journey_type', filters.journey_type)
  }
  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags)
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,goal.ilike.%${filters.search}%`)
  }

  // Apply sorting
  if (sort) {
    query = query.order(sort.field, { ascending: sort.direction === 'asc' })
  } else {
    query = query.order('updated_at', { ascending: false })
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export async function listJourneySummaries(
  filters?: JourneyFilters,
  sort?: SortConfig<JourneySortField>
): Promise<JourneySummary[]> {
  const journeys = await listJourneys(filters, sort)

  // Fetch counts and customer profile names in parallel
  const summaries = await Promise.all(
    journeys.map(async (journey) => {
      const [stageCount, touchpointCount, highPainCount, customerProfile] = await Promise.all([
        // Count stages
        supabase
          .from('journey_stages')
          .select('*', { count: 'exact', head: true })
          .eq('user_journey_id', journey.id)
          .then(({ count }) => count || 0),

        // Count touchpoints
        supabase
          .from('journey_stages')
          .select('id')
          .eq('user_journey_id', journey.id)
          .then(async ({ data: stages }) => {
            if (!stages || stages.length === 0) return 0
            const { count } = await supabase
              .from('touchpoints')
              .select('*', { count: 'exact', head: true })
              .in('journey_stage_id', stages.map(s => s.id))
            return count || 0
          }),

        // Count high-pain touchpoints
        supabase
          .from('journey_stages')
          .select('id')
          .eq('user_journey_id', journey.id)
          .then(async ({ data: stages }) => {
            if (!stages || stages.length === 0) return 0
            const { count } = await supabase
              .from('touchpoints')
              .select('*', { count: 'exact', head: true })
              .in('journey_stage_id', stages.map(s => s.id))
              .in('pain_level', ['major', 'critical'])
            return count || 0
          }),

        // Get customer profile name
        journey.customer_profile_id
          ? supabase
              .from('customer_profiles')
              .select('name')
              .eq('id', journey.customer_profile_id)
              .single()
              .then(({ data }) => data?.name)
          : Promise.resolve(undefined),
      ])

      return {
        id: journey.id,
        slug: journey.slug,
        name: journey.name,
        status: journey.status,
        validation_status: journey.validation_status,
        customer_profile_id: journey.customer_profile_id,
        customer_profile_name: customerProfile,
        stage_count: stageCount,
        touchpoint_count: touchpointCount,
        high_pain_count: highPainCount,
        updated_at: journey.updated_at,
        tags: journey.tags,
      }
    })
  )

  return summaries
}

export async function updateJourney(id: string, updates: UserJourneyUpdate): Promise<UserJourney> {
  const { data, error } = await supabase
    .from('user_journeys')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteJourney(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_journeys')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================================
// JOURNEY STAGES
// ============================================================================

export async function createStage(data: JourneyStageInsert): Promise<JourneyStage> {
  const { data: stage, error } = await supabase
    .from('journey_stages')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return stage
}

export async function getStage(id: string): Promise<JourneyStage> {
  const { data, error } = await supabase
    .from('journey_stages')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getStageWithTouchpoints(id: string): Promise<StageWithTouchpoints> {
  const { data: stage, error: stageError } = await supabase
    .from('journey_stages')
    .select('*')
    .eq('id', id)
    .single()

  if (stageError) throw stageError

  const { data: touchpoints, error: touchpointsError } = await supabase
    .from('touchpoints')
    .select('*')
    .eq('journey_stage_id', id)
    .order('sequence', { ascending: true })

  if (touchpointsError) throw touchpointsError

  return {
    ...stage,
    touchpoints: touchpoints || [],
    touchpoint_count: touchpoints?.length || 0,
  }
}

export async function listStages(journeyId: string): Promise<JourneyStage[]> {
  const { data, error } = await supabase
    .from('journey_stages')
    .select('*')
    .eq('user_journey_id', journeyId)
    .order('sequence', { ascending: true })

  if (error) throw error
  return data || []
}

export async function updateStage(id: string, updates: JourneyStageUpdate): Promise<JourneyStage> {
  const { data, error } = await supabase
    .from('journey_stages')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteStage(id: string): Promise<void> {
  const { error } = await supabase
    .from('journey_stages')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================================
// TOUCHPOINTS
// ============================================================================

export async function createTouchpoint(data: TouchpointInsert): Promise<Touchpoint> {
  const { data: touchpoint, error } = await supabase
    .from('touchpoints')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return touchpoint
}

export async function getTouchpoint(id: string): Promise<Touchpoint> {
  const { data, error } = await supabase
    .from('touchpoints')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getTouchpointWithRelations(id: string): Promise<TouchpointWithRelations> {
  const { data: touchpoint, error: touchpointError } = await supabase
    .from('touchpoints')
    .select('*')
    .eq('id', id)
    .single()

  if (touchpointError) throw touchpointError

  const [mappings, assumptions, evidence] = await Promise.all([
    supabase
      .from('touchpoint_mappings')
      .select('*')
      .eq('touchpoint_id', id)
      .then(({ data }) => data || []),
    supabase
      .from('touchpoint_assumptions')
      .select('*')
      .eq('touchpoint_id', id)
      .then(({ data }) => data || []),
    supabase
      .from('touchpoint_evidence')
      .select('*')
      .eq('touchpoint_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => data || []),
  ])

  return {
    ...touchpoint,
    mappings,
    assumptions,
    evidence,
    mapping_count: mappings.length,
    assumption_count: assumptions.length,
    evidence_count: evidence.length,
  }
}

export async function listTouchpoints(
  stageId: string,
  filters?: TouchpointFilters,
  sort?: SortConfig<TouchpointSortField>
): Promise<Touchpoint[]> {
  let query = supabase
    .from('touchpoints')
    .select('*')
    .eq('journey_stage_id', stageId)

  // Apply filters
  if (filters?.channel_type && filters.channel_type.length > 0) {
    query = query.in('channel_type', filters.channel_type)
  }
  if (filters?.pain_level && filters.pain_level.length > 0) {
    query = query.in('pain_level', filters.pain_level)
  }
  if (filters?.importance && filters.importance.length > 0) {
    query = query.in('importance', filters.importance)
  }
  if (filters?.validation_status && filters.validation_status.length > 0) {
    query = query.in('validation_status', filters.validation_status)
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  // Apply sorting
  if (sort) {
    query = query.order(sort.field, { ascending: sort.direction === 'asc' })
  } else {
    query = query.order('sequence', { ascending: true })
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export async function updateTouchpoint(id: string, updates: TouchpointUpdate): Promise<Touchpoint> {
  const { data, error } = await supabase
    .from('touchpoints')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTouchpoint(id: string): Promise<void> {
  const { error } = await supabase
    .from('touchpoints')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export async function createJourneyWithStages(
  journey: UserJourneyInsert,
  stages: Omit<JourneyStageInsert, 'user_journey_id'>[]
): Promise<JourneyWithStages> {
  // Create journey
  const createdJourney = await createJourney(journey)

  // Create stages with journey ID
  const stagesWithJourneyId = stages.map((stage, index) => ({
    ...stage,
    user_journey_id: createdJourney.id,
    sequence: stage.sequence ?? index + 1,
  }))

  if (stagesWithJourneyId.length > 0) {
    const { data: createdStages, error: stagesError } = await supabase
      .from('journey_stages')
      .insert(stagesWithJourneyId)
      .select()

    if (stagesError) throw stagesError

    return {
      ...createdJourney,
      stages: createdStages || [],
      stage_count: createdStages?.length || 0,
      touchpoint_count: 0,
    }
  }

  return {
    ...createdJourney,
    stages: [],
    stage_count: 0,
    touchpoint_count: 0,
  }
}

export async function createStageWithTouchpoints(
  stage: JourneyStageInsert,
  touchpoints: Omit<TouchpointInsert, 'journey_stage_id'>[]
): Promise<StageWithTouchpoints> {
  // Create stage
  const createdStage = await createStage(stage)

  // Create touchpoints with stage ID
  const touchpointsWithStageId = touchpoints.map((touchpoint, index) => ({
    ...touchpoint,
    journey_stage_id: createdStage.id,
    sequence: touchpoint.sequence ?? index + 1,
  }))

  if (touchpointsWithStageId.length > 0) {
    const { data: createdTouchpoints, error: touchpointsError } = await supabase
      .from('touchpoints')
      .insert(touchpointsWithStageId)
      .select()

    if (touchpointsError) throw touchpointsError

    return {
      ...createdStage,
      touchpoints: createdTouchpoints || [],
      touchpoint_count: createdTouchpoints?.length || 0,
    }
  }

  return {
    ...createdStage,
    touchpoints: [],
    touchpoint_count: 0,
  }
}
