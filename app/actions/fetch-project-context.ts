'use server'

/**
 * Server Action: Fetch Project Boundary Context
 *
 * Fetches all linked boundary objects for a studio project and builds
 * a structured context summary for prompt injection into AI generation.
 *
 * Handles two JSONB formats for canvas blocks:
 * - Block format: { items: [{ id, content, priority, created_at }], assumptions: [], validation_status }
 * - Legacy plain array: ["string1", "string2"]
 */

import { createClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/supabase'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_SUMMARY_LENGTH = 2000

export interface BoundaryObjectContext {
  assumptions: Array<{ title: string; statement: string; status: string; category: string | null; risk_level: string | null }>
  businessModelCanvases: Array<{ name: string; description: string | null }>
  valuePropositionCanvases: Array<{ name: string; description: string | null; products_services: unknown; pain_relievers: unknown; gain_creators: unknown }>
  customerProfiles: Array<{ name: string; description: string | null; jobs: unknown; pains: unknown; gains: unknown }>
  userJourneys: Array<{ name: string; description: string | null }>
  serviceBlueprints: Array<{ name: string; description: string | null; blueprint_type: string | null }>
  storyMaps: Array<{ name: string; description: string | null; map_type: string | null }>
  hypotheses: Array<{ statement: string; status: string; validation_criteria: string | null }>
}

export interface ProjectContextResult {
  context: BoundaryObjectContext
  hasContext: boolean
  summary: string
}

export async function fetchProjectBoundaryContext(
  projectId: string
): Promise<ProjectContextResult> {
  // C3: Validate UUID format at application boundary
  if (!UUID_REGEX.test(projectId)) {
    return { context: emptyContext(), hasContext: false, summary: '' }
  }

  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { context: emptyContext(), hasContext: false, summary: '' }
  }

  // C1: Verify user has access to this project (RLS enforces ownership)
  const { data: project, error: projectError } = await supabase
    .from('studio_projects')
    .select('id')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    return { context: emptyContext(), hasContext: false, summary: '' }
  }

  // Fetch outbound entity links from this studio project
  const { data: links } = await supabase
    .from('entity_links')
    .select('target_type, target_id')
    .eq('source_type', 'studio_project')
    .eq('source_id', projectId)

  if (!links || links.length === 0) {
    // Still fetch hypotheses (they're related but not via entity_links)
    const hypotheses = await fetchHypotheses(supabase, projectId)
    const context = { ...emptyContext(), hypotheses }
    return {
      context,
      hasContext: hypotheses.length > 0,
      summary: buildSummary(context),
    }
  }

  // Group links by target type
  const linksByType: Record<string, string[]> = {}
  for (const link of links) {
    const type = link.target_type as string
    if (!linksByType[type]) linksByType[type] = []
    linksByType[type].push(link.target_id)
  }

  // H4: Fetch each entity type with individual error handling
  const [assumptions, bmcs, vpcs, profiles, journeys, blueprints, storyMaps, hypotheses] = await Promise.all([
    fetchSafe(() => fetchByIds(supabase, 'assumptions', linksByType['assumption'] || [], ['title', 'statement', 'status', 'category', 'risk_level']), 'assumptions'),
    fetchSafe(() => fetchByIds(supabase, 'business_model_canvases', linksByType['business_model_canvas'] || [], ['name', 'description']), 'BMCs'),
    fetchSafe(() => fetchByIds(supabase, 'value_proposition_canvases', linksByType['value_proposition_canvas'] || [], ['name', 'description', 'products_services', 'pain_relievers', 'gain_creators']), 'VPCs'),
    fetchSafe(() => fetchByIds(supabase, 'customer_profiles', linksByType['customer_profile'] || [], ['name', 'description', 'jobs', 'pains', 'gains']), 'customer profiles'),
    fetchSafe(() => fetchByIds(supabase, 'user_journeys', linksByType['user_journey'] || [], ['name', 'description']), 'user journeys'),
    fetchSafe(() => fetchByIds(supabase, 'service_blueprints', linksByType['service_blueprint'] || [], ['name', 'description', 'blueprint_type']), 'service blueprints'),
    fetchSafe(() => fetchByIds(supabase, 'story_maps', linksByType['story_map'] || [], ['name', 'description', 'map_type']), 'story maps'),
    fetchSafe(() => fetchHypotheses(supabase, projectId), 'hypotheses'),
  ])

  const context: BoundaryObjectContext = {
    assumptions: assumptions as BoundaryObjectContext['assumptions'],
    businessModelCanvases: bmcs as BoundaryObjectContext['businessModelCanvases'],
    valuePropositionCanvases: vpcs as BoundaryObjectContext['valuePropositionCanvases'],
    customerProfiles: profiles as BoundaryObjectContext['customerProfiles'],
    userJourneys: journeys as BoundaryObjectContext['userJourneys'],
    serviceBlueprints: blueprints as BoundaryObjectContext['serviceBlueprints'],
    storyMaps: storyMaps as BoundaryObjectContext['storyMaps'],
    hypotheses: hypotheses as BoundaryObjectContext['hypotheses'],
  }

  const hasContext = assumptions.length > 0 || bmcs.length > 0 || vpcs.length > 0 ||
    profiles.length > 0 || journeys.length > 0 || blueprints.length > 0 || storyMaps.length > 0

  return {
    context,
    hasContext,
    summary: buildSummary(context),
  }
}

function emptyContext(): BoundaryObjectContext {
  return {
    assumptions: [],
    businessModelCanvases: [],
    valuePropositionCanvases: [],
    customerProfiles: [],
    userJourneys: [],
    serviceBlueprints: [],
    storyMaps: [],
    hypotheses: [],
  }
}

// H4: Wrap fetches so one failure doesn't break the whole context
async function fetchSafe<T>(fn: () => Promise<T[]>, label: string): Promise<T[]> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[fetchProjectBoundaryContext] ${label} fetch failed:`, err)
    return []
  }
}

// C2: Properly typed Supabase client. Table name is validated by caller (known constants).
type TableName = Database['public']['Tables'] extends Record<infer K, unknown> ? K & string : never

async function fetchByIds(
  supabase: SupabaseClient<Database>,
  table: TableName,
  ids: string[],
  fields: string[]
): Promise<Record<string, unknown>[]> {
  if (ids.length === 0) return []
  const { data } = await supabase
    .from(table)
    .select(fields.join(', '))
    .in('id', ids)
  return (data as Record<string, unknown>[] | null) || []
}

// C2: Properly typed Supabase client
async function fetchHypotheses(
  supabase: SupabaseClient<Database>,
  projectId: string
): Promise<Array<{ statement: string; status: string; validation_criteria: string | null }>> {
  const { data } = await supabase
    .from('studio_hypotheses')
    .select('statement, status, validation_criteria')
    .eq('project_id', projectId)
  return data || []
}

/**
 * Extract item content from a JSONB block field.
 * Handles both formats:
 * - Block format: { items: [{ content: "..." }] }
 * - Legacy plain array: ["string1", "string2"]
 * - Gracefully handles nulls, unexpected types, and malformed data.
 */
function extractBlockItems(field: unknown): string[] {
  if (!field) return []

  // Handle plain array format
  if (Array.isArray(field)) {
    return field
      .map(item => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'content' in item) {
          const content = (item as Record<string, unknown>).content
          return typeof content === 'string' ? content : null
        }
        return null
      })
      .filter((c): c is string => c !== null && c.trim().length > 0)
  }

  // Handle block format: { items: [{ content: "..." }] }
  if (typeof field === 'object' && field !== null && 'items' in field) {
    const block = field as { items?: unknown }
    if (!Array.isArray(block.items)) return []

    return block.items
      .map(item => {
        if (item && typeof item === 'object' && 'content' in item) {
          const content = (item as Record<string, unknown>).content
          return typeof content === 'string' ? content : null
        }
        return null
      })
      .filter((c): c is string => c !== null && c.trim().length > 0)
  }

  return []
}

/**
 * Build a human-readable summary string for prompt injection.
 * Enforced max ~2000 chars to avoid bloating the prompt.
 */
function buildSummary(context: BoundaryObjectContext): string {
  const parts: string[] = []

  if (context.customerProfiles.length > 0) {
    const p = context.customerProfiles[0]
    parts.push(`Customer: ${p.name}${p.description ? ` — ${p.description}` : ''}`)
    const pains = extractBlockItems(p.pains)
    const gains = extractBlockItems(p.gains)
    const jobs = extractBlockItems(p.jobs)
    if (pains.length > 0) parts.push(`Key pains: ${pains.slice(0, 3).join('; ')}`)
    if (gains.length > 0) parts.push(`Key gains: ${gains.slice(0, 3).join('; ')}`)
    if (jobs.length > 0) parts.push(`Jobs to be done: ${jobs.slice(0, 3).join('; ')}`)
  }

  if (context.valuePropositionCanvases.length > 0) {
    const v = context.valuePropositionCanvases[0]
    const products = extractBlockItems(v.products_services)
    const relievers = extractBlockItems(v.pain_relievers)
    if (products.length > 0) parts.push(`Products/Services: ${products.slice(0, 3).join('; ')}`)
    if (relievers.length > 0) parts.push(`Pain relievers: ${relievers.slice(0, 3).join('; ')}`)
  }

  if (context.businessModelCanvases.length > 0) {
    const b = context.businessModelCanvases[0]
    parts.push(`Business Model: ${b.name}${b.description ? ` — ${b.description}` : ''}`)
  }

  if (context.assumptions.length > 0) {
    const identified = context.assumptions.filter(a => a.status === 'identified' || a.status === 'untested')
    if (identified.length > 0) {
      parts.push(`Unvalidated assumptions (${identified.length}):`)
      identified.slice(0, 5).forEach(a => {
        parts.push(`- [${a.category || 'unknown'}/${a.risk_level || 'medium'}] ${a.statement}`)
      })
    }
  }

  if (context.hypotheses.length > 0) {
    parts.push(`Existing hypotheses (${context.hypotheses.length}):`)
    context.hypotheses.slice(0, 3).forEach(h => {
      parts.push(`- [${h.status}] ${h.statement}`)
    })
  }

  if (context.userJourneys.length > 0) {
    parts.push(`User journeys: ${context.userJourneys.map(j => j.name).join(', ')}`)
  }

  if (context.serviceBlueprints.length > 0) {
    parts.push(`Service blueprints: ${context.serviceBlueprints.map(b => b.name).join(', ')}`)
  }

  if (context.storyMaps.length > 0) {
    parts.push(`Story maps: ${context.storyMaps.map(s => s.name).join(', ')}`)
  }

  // H6: Enforce max length to prevent prompt bloat
  let summary = parts.join('\n')
  if (summary.length > MAX_SUMMARY_LENGTH) {
    summary = summary.slice(0, MAX_SUMMARY_LENGTH - 50) + '\n\n[Context truncated — see full details in admin UI]'
  }

  return summary
}
