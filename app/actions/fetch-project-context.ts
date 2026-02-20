'use server'

/**
 * Server Action: Fetch Project Boundary Context
 *
 * Fetches all linked boundary objects for a studio project and builds
 * a structured context summary for prompt injection into AI generation.
 */

import { createClient } from '@/lib/supabase-server'

export interface BoundaryObjectContext {
  assumptions: Array<{ title: string; statement: string; status: string; category: string | null; risk_level: string | null }>
  businessModelCanvases: Array<{ name: string; description: string | null }>
  valuePropositionCanvases: Array<{ name: string; description: string | null; products_services: unknown; pain_relievers: unknown; gain_creators: unknown }>
  customerProfiles: Array<{ name: string; description: string | null; jobs: unknown; pains: unknown; gains: unknown }>
  userJourneys: Array<{ name: string; description: string | null }>
  hypotheses: Array<{ statement: string; status: string; validation_criteria: string | null }>
}

export interface ProjectContextResult {
  context: BoundaryObjectContext
  hasContext: boolean
  summary: string
}

// Table mapping for entity_link target_types
const TARGET_TYPE_TABLE: Record<string, string> = {
  business_model_canvas: 'business_model_canvases',
  value_proposition_canvas: 'value_proposition_canvases',
  customer_profile: 'customer_profiles',
  assumption: 'assumptions',
  user_journey: 'user_journeys',
}

export async function fetchProjectBoundaryContext(
  projectId: string
): Promise<ProjectContextResult> {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
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

  // Fetch each entity type in parallel
  const [assumptions, bmcs, vpcs, profiles, journeys, hypotheses] = await Promise.all([
    fetchByIds(supabase, 'assumptions', linksByType['assumption'] || [], ['title', 'statement', 'status', 'category', 'risk_level']),
    fetchByIds(supabase, 'business_model_canvases', linksByType['business_model_canvas'] || [], ['name', 'description']),
    fetchByIds(supabase, 'value_proposition_canvases', linksByType['value_proposition_canvas'] || [], ['name', 'description', 'products_services', 'pain_relievers', 'gain_creators']),
    fetchByIds(supabase, 'customer_profiles', linksByType['customer_profile'] || [], ['name', 'description', 'jobs', 'pains', 'gains']),
    fetchByIds(supabase, 'user_journeys', linksByType['user_journey'] || [], ['name', 'description']),
    fetchHypotheses(supabase, projectId),
  ])

  const context: BoundaryObjectContext = {
    assumptions: assumptions as BoundaryObjectContext['assumptions'],
    businessModelCanvases: bmcs as BoundaryObjectContext['businessModelCanvases'],
    valuePropositionCanvases: vpcs as BoundaryObjectContext['valuePropositionCanvases'],
    customerProfiles: profiles as BoundaryObjectContext['customerProfiles'],
    userJourneys: journeys as BoundaryObjectContext['userJourneys'],
    hypotheses: hypotheses as BoundaryObjectContext['hypotheses'],
  }

  const hasContext = assumptions.length > 0 || bmcs.length > 0 || vpcs.length > 0 ||
    profiles.length > 0 || journeys.length > 0

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
    hypotheses: [],
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchByIds(supabase: any, table: string, ids: string[], fields: string[]): Promise<Record<string, unknown>[]> {
  if (ids.length === 0) return []
  const { data } = await supabase
    .from(table)
    .select(fields.join(', '))
    .in('id', ids)
  return data || []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchHypotheses(supabase: any, projectId: string) {
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
 * - Plain array: ["string1", "string2"]
 */
function extractBlockItems(field: unknown): string[] {
  if (!field) return []
  if (Array.isArray(field)) {
    return field.map(item => typeof item === 'string' ? item : (item as Record<string, unknown>)?.content as string).filter(Boolean)
  }
  if (typeof field === 'object' && field !== null && 'items' in field) {
    const block = field as { items?: Array<{ content?: string }> }
    return (block.items || []).map(item => item.content).filter((c): c is string => !!c)
  }
  return []
}

/**
 * Build a human-readable summary string for prompt injection.
 * Kept under ~2000 chars to avoid bloating the prompt.
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

  return parts.join('\n')
}
