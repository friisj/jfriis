/**
 * Studio Project Relationship Helpers
 *
 * Functions for linking studio projects to other entities via entity_links.
 * Enables easy cross-referencing and strategic framework connections.
 */

import { createClient } from '@/lib/supabase-server'
import {
  ENTITY_TYPES,
  LINK_TYPES,
  type EntityLink,
  type LinkType,
  type LinkStrength,
  type LinkableEntityType,
} from '@/lib/types/entity-relationships'

// ============================================================================
// TYPES
// ============================================================================

interface LinkProjectOptions {
  linkType: LinkType
  strength?: LinkStrength
  notes?: string
  metadata?: Record<string, unknown>
}

interface StudioProjectLink extends EntityLink {
  // Extended with project info from view
  source_project_name?: string
  source_project_slug?: string
  target_project_name?: string
  target_project_slug?: string
  relationship_category?: 'project_cross_reference' | 'project_outbound' | 'project_inbound' | 'other'
}

// ============================================================================
// STUDIO PROJECT CROSS-REFERENCES
// ============================================================================

/**
 * Get all related studio projects (bidirectional)
 * Uses entity_links with INNER JOINs to ensure both projects still exist
 * Filters orphaned relationships automatically
 */
export async function getRelatedProjects(projectId: string) {
  const supabase = await createClient()

  // Query for outbound relationships (this project → other projects)
  const { data: outbound, error: outboundError } = await supabase
    .from('entity_links')
    .select(`
      id,
      link_type,
      strength,
      notes,
      metadata,
      created_at,
      target_project:studio_projects!inner (
        id,
        slug,
        name,
        description,
        status,
        temperature
      )
    `)
    .eq('source_type', ENTITY_TYPES.STUDIO_PROJECT)
    .eq('source_id', projectId)
    .eq('target_type', ENTITY_TYPES.STUDIO_PROJECT)

  if (outboundError) throw new Error(`Failed to fetch outbound project links: ${outboundError.message}`)

  // Query for inbound relationships (other projects → this project)
  const { data: inbound, error: inboundError } = await supabase
    .from('entity_links')
    .select(`
      id,
      link_type,
      strength,
      notes,
      metadata,
      created_at,
      source_project:studio_projects!inner (
        id,
        slug,
        name,
        description,
        status,
        temperature
      )
    `)
    .eq('source_type', ENTITY_TYPES.STUDIO_PROJECT)
    .eq('target_type', ENTITY_TYPES.STUDIO_PROJECT)
    .eq('target_id', projectId)

  if (inboundError) throw new Error(`Failed to fetch inbound project links: ${inboundError.message}`)

  // Combine and format results
  const outboundLinks = (outbound || [])
    .filter(item => item.target_project !== null)
    .map(item => ({
      ...item,
      relatedProject: item.target_project,
      direction: 'outbound' as const,
    }))

  const inboundLinks = (inbound || [])
    .filter(item => item.source_project !== null)
    .map(item => ({
      ...item,
      relatedProject: item.source_project,
      direction: 'inbound' as const,
    }))

  return [...outboundLinks, ...inboundLinks].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

/**
 * Link two studio projects together
 */
export async function linkProjects(
  sourceProjectId: string,
  targetProjectId: string,
  options: LinkProjectOptions
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entity_links')
    .insert({
      source_type: ENTITY_TYPES.STUDIO_PROJECT,
      source_id: sourceProjectId,
      target_type: ENTITY_TYPES.STUDIO_PROJECT,
      target_id: targetProjectId,
      link_type: options.linkType,
      strength: options.strength,
      notes: options.notes,
      metadata: options.metadata || {},
    })
    .select()
    .single()

  if (error) throw error
  return data as EntityLink
}

/**
 * Remove a link between two studio projects
 */
export async function unlinkProjects(
  sourceProjectId: string,
  targetProjectId: string,
  linkType?: LinkType
) {
  const supabase = await createClient()

  let query = supabase
    .from('entity_links')
    .delete()
    .eq('source_type', ENTITY_TYPES.STUDIO_PROJECT)
    .eq('source_id', sourceProjectId)
    .eq('target_type', ENTITY_TYPES.STUDIO_PROJECT)
    .eq('target_id', targetProjectId)

  if (linkType) {
    query = query.eq('link_type', linkType)
  }

  const { error } = await query

  if (error) throw error
}

// ============================================================================
// LOG ENTRY RELATIONSHIPS
// ============================================================================

/**
 * Get log entries that inspired a studio project
 * Queries entity_links for inspired_by relationships
 * Only returns links where the target log entry still exists (filters orphaned links)
 */
export async function getProjectInspiration(projectId: string) {
  const supabase = await createClient()

  // Use a single query with JOIN to ensure log entries exist
  const { data, error } = await supabase
    .from('entity_links')
    .select(`
      id,
      link_type,
      strength,
      notes,
      metadata,
      created_at,
      log_entries!inner (
        id,
        title,
        slug,
        content,
        entry_date,
        published,
        created_at,
        updated_at
      )
    `)
    .eq('source_type', ENTITY_TYPES.STUDIO_PROJECT)
    .eq('source_id', projectId)
    .eq('target_type', ENTITY_TYPES.LOG_ENTRY)
    .eq('link_type', LINK_TYPES.INSPIRED_BY)

  if (error) throw new Error(`Failed to fetch project inspiration: ${error.message}`)

  // Filter out any null log entries (shouldn't happen with INNER JOIN, but defensive)
  return (data || [])
    .filter(item => item.log_entries !== null)
    .map(item => ({
      link: {
        id: item.id,
        link_type: item.link_type,
        strength: item.strength,
        notes: item.notes,
        metadata: item.metadata,
        created_at: item.created_at,
      },
      logEntry: item.log_entries,
    }))
}

/**
 * Get all log entries for a studio project
 * Includes both direct FK relationships and entity_links
 */
export async function getLogsForProject(projectId: string) {
  const supabase = await createClient()

  // Get log entries via direct FK
  const { data: directLogs, error: directError } = await supabase
    .from('log_entries')
    .select('*')
    .eq('studio_project_id', projectId)
    .order('entry_date', { ascending: false })

  if (directError) throw directError

  // Get log entries via entity_links
  const { data: links, error: linksError } = await supabase
    .from('entity_links')
    .select('*')
    .eq('target_type', ENTITY_TYPES.STUDIO_PROJECT)
    .eq('target_id', projectId)
    .eq('source_type', ENTITY_TYPES.LOG_ENTRY)

  if (linksError) throw linksError

  if (!links || links.length === 0) {
    return directLogs || []
  }

  // Fetch linked log entries
  const linkedLogIds = links.map(link => link.source_id)
  const { data: linkedLogs, error: linkedError } = await supabase
    .from('log_entries')
    .select('*')
    .in('id', linkedLogIds)

  if (linkedError) throw linkedError

  // Combine and deduplicate
  const allLogs = [...(directLogs || []), ...(linkedLogs || [])]
  const uniqueLogs = Array.from(
    new Map(allLogs.map(log => [log.id, log])).values()
  )

  return uniqueLogs.sort((a, b) =>
    new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
  )
}

/**
 * Link a log entry as inspiration for a studio project
 */
export async function linkLogAsInspiration(
  projectId: string,
  logEntryId: string,
  options?: Omit<LinkProjectOptions, 'linkType'>
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entity_links')
    .insert({
      source_type: ENTITY_TYPES.STUDIO_PROJECT,
      source_id: projectId,
      target_type: ENTITY_TYPES.LOG_ENTRY,
      target_id: logEntryId,
      link_type: LINK_TYPES.INSPIRED_BY,
      strength: options?.strength,
      notes: options?.notes,
      metadata: options?.metadata || {},
    })
    .select()
    .single()

  if (error) throw error
  return data as EntityLink
}

// ============================================================================
// STRATEGIC FRAMEWORK LINKS
// ============================================================================

/**
 * Link studio project to a business model canvas (explores)
 */
export async function linkProjectToCanvas(
  projectId: string,
  canvasId: string,
  canvasType: 'business_model_canvas' | 'value_proposition_canvas',
  options?: Omit<LinkProjectOptions, 'linkType'>
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entity_links')
    .insert({
      source_type: ENTITY_TYPES.STUDIO_PROJECT,
      source_id: projectId,
      target_type: canvasType,
      target_id: canvasId,
      link_type: LINK_TYPES.EXPLORES,
      strength: options?.strength,
      notes: options?.notes,
      metadata: options?.metadata || {},
    })
    .select()
    .single()

  if (error) throw error
  return data as EntityLink
}

/**
 * Link studio project to a user journey (improves)
 */
export async function linkProjectToJourney(
  projectId: string,
  journeyId: string,
  options?: Omit<LinkProjectOptions, 'linkType'>
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entity_links')
    .insert({
      source_type: ENTITY_TYPES.STUDIO_PROJECT,
      source_id: projectId,
      target_type: ENTITY_TYPES.USER_JOURNEY,
      target_id: journeyId,
      link_type: LINK_TYPES.IMPROVES,
      strength: options?.strength,
      notes: options?.notes,
      metadata: options?.metadata || {},
    })
    .select()
    .single()

  if (error) throw error
  return data as EntityLink
}

/**
 * Link studio project to a service blueprint (prototypes)
 */
export async function linkProjectToBlueprint(
  projectId: string,
  blueprintId: string,
  options?: Omit<LinkProjectOptions, 'linkType'>
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entity_links')
    .insert({
      source_type: ENTITY_TYPES.STUDIO_PROJECT,
      source_id: projectId,
      target_type: ENTITY_TYPES.SERVICE_BLUEPRINT,
      target_id: blueprintId,
      link_type: LINK_TYPES.PROTOTYPES,
      strength: options?.strength,
      notes: options?.notes,
      metadata: options?.metadata || {},
    })
    .select()
    .single()

  if (error) throw error
  return data as EntityLink
}

/**
 * Link studio project to a story map (informs)
 */
export async function linkProjectToStoryMap(
  projectId: string,
  storyMapId: string,
  options?: Omit<LinkProjectOptions, 'linkType'>
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entity_links')
    .insert({
      source_type: ENTITY_TYPES.STUDIO_PROJECT,
      source_id: projectId,
      target_type: ENTITY_TYPES.STORY_MAP,
      target_id: storyMapId,
      link_type: LINK_TYPES.INFORMS,
      strength: options?.strength,
      notes: options?.notes,
      metadata: options?.metadata || {},
    })
    .select()
    .single()

  if (error) throw error
  return data as EntityLink
}

/**
 * Get all strategic framework links for a studio project
 */
export async function getProjectFrameworkLinks(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entity_links')
    .select('*')
    .eq('source_type', ENTITY_TYPES.STUDIO_PROJECT)
    .eq('source_id', projectId)
    .in('link_type', [
      LINK_TYPES.EXPLORES,
      LINK_TYPES.IMPROVES,
      LINK_TYPES.PROTOTYPES,
      LINK_TYPES.INFORMS,
    ])
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as EntityLink[]
}

/**
 * Generic link creator for any entity type
 */
export async function linkProjectToEntity(
  projectId: string,
  targetType: LinkableEntityType,
  targetId: string,
  options: LinkProjectOptions
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entity_links')
    .insert({
      source_type: ENTITY_TYPES.STUDIO_PROJECT,
      source_id: projectId,
      target_type: targetType,
      target_id: targetId,
      link_type: options.linkType,
      strength: options.strength,
      notes: options.notes,
      metadata: options.metadata || {},
    })
    .select()
    .single()

  if (error) throw error
  return data as EntityLink
}

/**
 * Get all outbound links from a studio project
 */
export async function getProjectLinks(projectId: string, linkType?: LinkType) {
  const supabase = await createClient()

  let query = supabase
    .from('entity_links')
    .select('*')
    .eq('source_type', ENTITY_TYPES.STUDIO_PROJECT)
    .eq('source_id', projectId)
    .order('created_at', { ascending: false })

  if (linkType) {
    query = query.eq('link_type', linkType)
  }

  const { data, error } = await query

  if (error) throw error
  return data as EntityLink[]
}

/**
 * Get all inbound links to a studio project
 */
export async function getLinksToProject(projectId: string, linkType?: LinkType) {
  const supabase = await createClient()

  let query = supabase
    .from('entity_links')
    .select('*')
    .eq('target_type', ENTITY_TYPES.STUDIO_PROJECT)
    .eq('target_id', projectId)
    .order('created_at', { ascending: false })

  if (linkType) {
    query = query.eq('link_type', linkType)
  }

  const { data, error } = await query

  if (error) throw error
  return data as EntityLink[]
}
