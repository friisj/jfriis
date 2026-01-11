/**
 * Entity Links Helper Functions
 *
 * Utilities for working with the universal entity_links table.
 * Part of Entity Relationship Simplification (OJI-5)
 */

import { supabase } from './supabase'
import type {
  LinkableEntityType,
  LinkType,
  LinkStrength,
  EntityLink,
  EntityRef,
  LinkedEntity,
  PendingLink,
} from './types/entity-relationships'
import { getTableNameForType, isEntityTypeImplemented } from './types/entity-relationships'
import { isValidLinkType, getValidLinkTypes, validateLink } from './entity-links-validation'

// Re-export validation functions
export { isValidLinkType, getValidLinkTypes, validateLink }

// ============================================================================
// OBSERVABILITY
// ============================================================================

/**
 * Observability logging for polymorphic queries.
 * Logs query patterns, timing, and result counts for debugging.
 */
const ENABLE_QUERY_LOGGING = process.env.NODE_ENV === 'development' ||
  process.env.ENTITY_LINKS_DEBUG === 'true'

interface QueryLog {
  operation: string
  entityTypes: string[]
  duration: number
  resultCount: number
  cached?: boolean
}

function logQuery(log: QueryLog) {
  if (!ENABLE_QUERY_LOGGING) return

  const slowThreshold = 100 // ms
  const logLevel = log.duration > slowThreshold ? 'warn' : 'debug'

  const message = `[entity_links] ${log.operation}: ${log.entityTypes.join(' → ')} (${log.duration}ms, ${log.resultCount} results)`

  if (logLevel === 'warn') {
    console.warn(`⚠️ SLOW QUERY ${message}`)
  } else if (process.env.ENTITY_LINKS_VERBOSE === 'true') {
    console.log(message)
  }
}

async function withTiming<T>(
  operation: string,
  entityTypes: string[],
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now()
  try {
    const result = await fn()
    const duration = performance.now() - start
    const resultCount = Array.isArray(result) ? result.length : (result ? 1 : 0)
    logQuery({ operation, entityTypes, duration, resultCount })
    return result
  } catch (error) {
    const duration = performance.now() - start
    logQuery({ operation, entityTypes, duration, resultCount: 0 })
    throw error
  }
}

/**
 * Options for creating a link
 */
interface LinkOptions {
  strength?: LinkStrength
  notes?: string
  metadata?: Record<string, unknown>
  position?: number
}

/**
 * Create a link between two entities
 */
export async function linkEntities(
  source: EntityRef,
  target: EntityRef,
  linkType: LinkType = 'related',
  options?: LinkOptions
): Promise<EntityLink> {
  // Validate link type
  validateLink(source.type, target.type, linkType)

  const { data, error } = await supabase
    .from('entity_links')
    .insert({
      source_type: source.type,
      source_id: source.id,
      target_type: target.type,
      target_id: target.id,
      link_type: linkType,
      strength: options?.strength,
      notes: options?.notes,
      metadata: options?.metadata || {},
      position: options?.position,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove a link between two entities
 */
export async function unlinkEntities(
  source: EntityRef,
  target: EntityRef,
  linkType?: LinkType
): Promise<void> {
  let query = supabase
    .from('entity_links')
    .delete()
    .eq('source_type', source.type)
    .eq('source_id', source.id)
    .eq('target_type', target.type)
    .eq('target_id', target.id)

  if (linkType) {
    query = query.eq('link_type', linkType)
  }

  const { error } = await query
  if (error) throw error
}

/**
 * Get all links for an entity (both directions)
 */
export async function getLinkedEntities(
  entity: EntityRef,
  options?: {
    direction?: 'outgoing' | 'incoming' | 'both'
    linkType?: LinkType
    targetType?: LinkableEntityType
  }
): Promise<EntityLink[]> {
  const direction = options?.direction || 'both'
  const entityTypes = [entity.type, options?.targetType || '*'].filter(Boolean) as string[]

  return withTiming('getLinkedEntities', entityTypes, async () => {
    const results: EntityLink[] = []

    if (direction === 'outgoing' || direction === 'both') {
      let query = supabase
        .from('entity_links')
        .select('*')
        .eq('source_type', entity.type)
        .eq('source_id', entity.id)

      if (options?.linkType) query = query.eq('link_type', options.linkType)
      if (options?.targetType) query = query.eq('target_type', options.targetType)

      const { data, error } = await query.order('position', { nullsFirst: false })
      if (error) throw error
      if (data) results.push(...data)
    }

    if (direction === 'incoming' || direction === 'both') {
      let query = supabase
        .from('entity_links')
        .select('*')
        .eq('target_type', entity.type)
        .eq('target_id', entity.id)

      if (options?.linkType) query = query.eq('link_type', options.linkType)
      if (options?.targetType) query = query.eq('source_type', options.targetType)

      const { data, error } = await query
      if (error) throw error
      if (data) results.push(...data)
    }

    return results
  })
}

/**
 * Get linked entities with their full data
 */
export async function getLinkedEntitiesWithData<T = Record<string, unknown>>(
  source: EntityRef,
  targetType: LinkableEntityType,
  linkType?: LinkType
): Promise<LinkedEntity<T>[]> {
  return withTiming('getLinkedEntitiesWithData', [source.type, targetType], async () => {
    // Safety check: Ensure target entity type is implemented
    if (!isEntityTypeImplemented(targetType)) {
      throw new Error(
        `Cannot fetch entity data for "${targetType}" - this entity type is not yet implemented. ` +
        `You can still query entity_links for this type, but cannot fetch the full entity data.`
      )
    }

    // 1. Get the links
    let query = supabase
      .from('entity_links')
      .select('*')
      .eq('source_type', source.type)
      .eq('source_id', source.id)
      .eq('target_type', targetType)

    if (linkType) {
      query = query.eq('link_type', linkType)
    }

    const { data: links, error: linksError } = await query.order('position', { nullsFirst: false })
    if (linksError) throw linksError
    if (!links?.length) return []

    // 2. Get target entity table name
    const tableName = getTableNameForType(targetType)
    const targetIds = links.map(l => l.target_id)

    // 3. Fetch the target entities
    const { data: entities, error: entitiesError } = await supabase
      .from(tableName)
      .select('*')
      .in('id', targetIds)

    if (entitiesError) throw entitiesError
    if (!entities) return []

    // 4. Combine links with entities
    const entityMap = new Map(entities.map(e => [e.id, e]))
    return links
      .map(link => ({
        link,
        entity: entityMap.get(link.target_id) as T,
      }))
      .filter((le): le is LinkedEntity<T> => le.entity !== undefined)
  })
}

/**
 * Get link counts by target type
 */
export async function getLinkedEntityCounts(
  source: EntityRef
): Promise<Record<LinkableEntityType, number>> {
  const { data, error } = await supabase
    .from('entity_links')
    .select('target_type')
    .eq('source_type', source.type)
    .eq('source_id', source.id)

  if (error) throw error
  if (!data) return {} as Record<LinkableEntityType, number>

  return data.reduce((acc, link) => {
    const type = link.target_type as LinkableEntityType
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<LinkableEntityType, number>)
}

/**
 * Update link metadata
 */
export async function updateLink(
  linkId: string,
  updates: {
    strength?: LinkStrength
    notes?: string
    metadata?: Record<string, unknown>
    position?: number
  }
): Promise<EntityLink> {
  const { data, error } = await supabase
    .from('entity_links')
    .update(updates)
    .eq('id', linkId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update link position
 */
export async function updateLinkPosition(
  linkId: string,
  newPosition: number
): Promise<void> {
  const { error } = await supabase
    .from('entity_links')
    .update({ position: newPosition })
    .eq('id', linkId)

  if (error) throw error
}

/**
 * Delete a link by ID
 */
export async function deleteLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from('entity_links')
    .delete()
    .eq('id', linkId)

  if (error) throw error
}

/**
 * Sync entity links - updates links to match a list of target IDs
 * Deletes links no longer in the list, adds new ones
 */
export async function syncEntityLinks(
  source: EntityRef,
  targetType: LinkableEntityType,
  linkType: LinkType,
  targetIds: string[]
): Promise<void> {
  // Get existing links of this type
  const { data: existing, error: fetchError } = await supabase
    .from('entity_links')
    .select('id, target_id')
    .eq('source_type', source.type)
    .eq('source_id', source.id)
    .eq('target_type', targetType)
    .eq('link_type', linkType)

  if (fetchError) throw fetchError

  const existingIds = new Set(existing?.map(e => e.target_id) || [])
  const newIds = new Set(targetIds)

  // Delete removed links
  const toDelete = existing?.filter(e => !newIds.has(e.target_id)) || []
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('entity_links')
      .delete()
      .in('id', toDelete.map(e => e.id))

    if (deleteError) throw deleteError
  }

  // Add new links
  const toAdd = targetIds.filter(id => !existingIds.has(id))
  if (toAdd.length > 0) {
    const { error: insertError } = await supabase
      .from('entity_links')
      .insert(
        toAdd.map((targetId, index) => ({
          source_type: source.type,
          source_id: source.id,
          target_type: targetType,
          target_id: targetId,
          link_type: linkType,
          position: index,
          metadata: {},
        }))
      )

    if (insertError) throw insertError
  }
}

/**
 * Sync entity links where the current entity is the TARGET
 * Useful when editing from the target's perspective (e.g., editing a specimen
 * and selecting which projects it belongs to)
 */
export async function syncEntityLinksAsTarget(
  target: EntityRef,
  sourceType: LinkableEntityType,
  linkType: LinkType,
  sourceIds: string[]
): Promise<void> {
  // Get existing links where this entity is the target
  const { data: existing, error: fetchError } = await supabase
    .from('entity_links')
    .select('id, source_id')
    .eq('source_type', sourceType)
    .eq('target_type', target.type)
    .eq('target_id', target.id)
    .eq('link_type', linkType)

  if (fetchError) throw fetchError

  const existingIds = new Set(existing?.map(e => e.source_id) || [])
  const newIds = new Set(sourceIds)

  // Delete removed links
  const toDelete = existing?.filter(e => !newIds.has(e.source_id)) || []
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('entity_links')
      .delete()
      .in('id', toDelete.map(e => e.id))

    if (deleteError) throw deleteError
  }

  // Add new links
  const toAdd = sourceIds.filter(id => !existingIds.has(id))
  if (toAdd.length > 0) {
    const { error: insertError } = await supabase
      .from('entity_links')
      .insert(
        toAdd.map((sourceId, index) => ({
          source_type: sourceType,
          source_id: sourceId,
          target_type: target.type,
          target_id: target.id,
          link_type: linkType,
          position: index,
          metadata: {},
        }))
      )

    if (insertError) throw insertError
  }
}

/**
 * Sync pending links to an entity (for use after entity creation)
 */
export async function syncPendingLinks(
  source: EntityRef,
  targetType: LinkableEntityType,
  pendingLinks: PendingLink[]
): Promise<EntityLink[]> {
  if (pendingLinks.length === 0) return []

  const linksToInsert = pendingLinks.map((link, index) => ({
    source_type: source.type,
    source_id: source.id,
    target_type: targetType,
    target_id: link.targetId,
    link_type: link.linkType,
    notes: link.notes,
    position: link.position ?? index,
    metadata: {},
  }))

  const { data, error } = await supabase
    .from('entity_links')
    .insert(linksToInsert)
    .select()

  if (error) throw error
  return data || []
}

/**
 * Check if two entities are linked
 */
export async function areEntitiesLinked(
  source: EntityRef,
  target: EntityRef,
  linkType?: LinkType
): Promise<boolean> {
  let query = supabase
    .from('entity_links')
    .select('id', { count: 'exact', head: true })
    .eq('source_type', source.type)
    .eq('source_id', source.id)
    .eq('target_type', target.type)
    .eq('target_id', target.id)

  if (linkType) {
    query = query.eq('link_type', linkType)
  }

  const { count, error } = await query
  if (error) throw error
  return (count || 0) > 0
}

/**
 * Get bidirectional related entities (for 'related' link type)
 * Queries both directions since 'related' is symmetric
 */
export async function getRelatedEntities(
  entity: EntityRef,
  targetType?: LinkableEntityType
): Promise<{
  outgoing: EntityLink[]
  incoming: EntityLink[]
}> {
  return withTiming('getRelatedEntities', [entity.type, targetType || '*'], async () => {
    const [outgoing, incoming] = await Promise.all([
      (async () => {
        let query = supabase
          .from('entity_links')
          .select('*')
          .eq('source_type', entity.type)
          .eq('source_id', entity.id)
          .eq('link_type', 'related')

        if (targetType) query = query.eq('target_type', targetType)
        const { data, error } = await query
        if (error) throw error
        return data || []
      })(),
      (async () => {
        let query = supabase
          .from('entity_links')
          .select('*')
          .eq('target_type', entity.type)
          .eq('target_id', entity.id)
          .eq('link_type', 'related')

        if (targetType) query = query.eq('source_type', targetType)
        const { data, error } = await query
        if (error) throw error
        return data || []
      })(),
    ])

    return { outgoing, incoming }
  })
}
