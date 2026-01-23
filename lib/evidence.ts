/**
 * Evidence Helper Functions
 *
 * Utilities for working with the universal evidence table.
 * Part of Entity Relationship Simplification (OJI-5)
 */

import { supabase } from './supabase'
import type {
  EvidenceEntityType,
  UniversalEvidence,
  UniversalEvidenceInsert,
  UniversalEvidenceType,
  PendingEvidence,
} from './types/entity-relationships'

/**
 * Entity reference for evidence operations
 */
interface EvidenceEntityRef {
  type: EvidenceEntityType
  id: string
}

// ============================================================================
// OBSERVABILITY
// ============================================================================

/**
 * Observability logging for evidence queries.
 * Logs query patterns, timing, and result counts for debugging.
 */
const ENABLE_QUERY_LOGGING = process.env.NODE_ENV === 'development' ||
  process.env.EVIDENCE_DEBUG === 'true'

interface QueryLog {
  operation: string
  entityType: string
  duration: number
  resultCount: number
}

function logQuery(log: QueryLog) {
  if (!ENABLE_QUERY_LOGGING) return

  const slowThreshold = 100 // ms
  const logLevel = log.duration > slowThreshold ? 'warn' : 'debug'

  const message = `[evidence] ${log.operation}: ${log.entityType} (${log.duration}ms, ${log.resultCount} results)`

  if (logLevel === 'warn') {
    console.warn(`⚠️ SLOW QUERY ${message}`)
  } else if (process.env.EVIDENCE_VERBOSE === 'true') {
    console.log(message)
  }
}

async function withTiming<T>(
  operation: string,
  entityType: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now()
  try {
    const result = await fn()
    const duration = performance.now() - start
    const resultCount = Array.isArray(result) ? result.length : (result ? 1 : 0)
    logQuery({ operation, entityType, duration, resultCount })
    return result
  } catch (error) {
    const duration = performance.now() - start
    logQuery({ operation, entityType, duration, resultCount: 0 })
    throw error
  }
}

/**
 * Add evidence to an entity
 */
export async function addEvidence(
  entity: EvidenceEntityRef,
  evidence: Omit<UniversalEvidenceInsert, 'entity_type' | 'entity_id'>
): Promise<UniversalEvidence> {
  const { data, error } = await supabase
    .from('evidence')
    .insert({
      entity_type: entity.type,
      entity_id: entity.id,
      ...evidence,
    } as any)
    .select()
    .single()

  if (error) throw error
  return data as unknown as UniversalEvidence
}

/**
 * Get all evidence for an entity
 */
export async function getEvidence(
  entity: EvidenceEntityRef,
  options?: {
    evidenceType?: UniversalEvidenceType
    supportsOnly?: boolean
    refutesOnly?: boolean
    orderBy?: 'created_at' | 'collected_at' | 'confidence'
    ascending?: boolean
  }
): Promise<UniversalEvidence[]> {
  return withTiming('getEvidence', entity.type, async () => {
    let query = supabase
      .from('evidence')
      .select('*')
      .eq('entity_type', entity.type)
      .eq('entity_id', entity.id)

    if (options?.evidenceType) {
      query = query.eq('evidence_type', options.evidenceType)
    }

    if (options?.supportsOnly) {
      query = query.eq('supports', true)
    } else if (options?.refutesOnly) {
      query = query.eq('supports', false)
    }

    const orderField = options?.orderBy || 'created_at'
    query = query.order(orderField, { ascending: options?.ascending ?? false })

    const { data, error } = await query

    if (error) throw error
    return (data || []) as unknown as UniversalEvidence[]
  })
}

/**
 * Get evidence count for an entity
 */
export async function getEvidenceCount(entity: EvidenceEntityRef): Promise<number> {
  const { count, error } = await supabase
    .from('evidence')
    .select('*', { count: 'exact', head: true })
    .eq('entity_type', entity.type)
    .eq('entity_id', entity.id)

  if (error) throw error
  return count || 0
}

/**
 * Get evidence summary (counts by type and support status)
 */
export async function getEvidenceSummary(entity: EvidenceEntityRef): Promise<{
  total: number
  supporting: number
  refuting: number
  byType: Record<string, number>
}> {
  return withTiming('getEvidenceSummary', entity.type, async () => {
    const { data, error } = await supabase
      .from('evidence')
      .select('evidence_type, supports')
      .eq('entity_type', entity.type)
      .eq('entity_id', entity.id)

    if (error) throw error
    if (!data) return { total: 0, supporting: 0, refuting: 0, byType: {} }

    const byType: Record<string, number> = {}
    let supporting = 0
    let refuting = 0

    for (const item of data) {
      byType[item.evidence_type] = (byType[item.evidence_type] || 0) + 1
      if (item.supports === true) supporting++
      else if (item.supports === false) refuting++
    }

    return {
      total: data.length,
      supporting,
      refuting,
      byType,
    }
  })
}

/**
 * Update evidence
 */
export async function updateEvidence(
  evidenceId: string,
  updates: Partial<Omit<UniversalEvidenceInsert, 'entity_type' | 'entity_id'>>
): Promise<UniversalEvidence> {
  const { data, error } = await supabase
    .from('evidence')
    .update(updates as any)
    .eq('id', evidenceId)
    .select()
    .single()

  if (error) throw error
  return data as unknown as UniversalEvidence
}

/**
 * Delete evidence
 */
export async function deleteEvidence(evidenceId: string): Promise<void> {
  const { error } = await supabase
    .from('evidence')
    .delete()
    .eq('id', evidenceId)

  if (error) throw error
}

/**
 * Delete all evidence for an entity
 */
export async function deleteAllEvidence(entity: EvidenceEntityRef): Promise<void> {
  const { error } = await supabase
    .from('evidence')
    .delete()
    .eq('entity_type', entity.type)
    .eq('entity_id', entity.id)

  if (error) throw error
}

/**
 * Sync pending evidence to an entity
 * Inserts new evidence items (for use after entity creation)
 */
export async function syncPendingEvidence(
  entity: EvidenceEntityRef,
  pendingEvidence: PendingEvidence[]
): Promise<UniversalEvidence[]> {
  if (pendingEvidence.length === 0) return []

  const evidenceToInsert = pendingEvidence.map(e => ({
    entity_type: entity.type,
    entity_id: entity.id,
    evidence_type: e.evidence_type,
    title: e.title,
    content: e.content,
    source_url: e.source_url,
    confidence: e.confidence,
    supports: e.supports,
    tags: [],
    metadata: {},
  }))

  const { data, error } = await supabase
    .from('evidence')
    .insert(evidenceToInsert as any)
    .select()

  if (error) throw error
  return (data || []) as unknown as UniversalEvidence[]
}

/**
 * Calculate average confidence for an entity's evidence
 */
export async function getAverageConfidence(entity: EvidenceEntityRef): Promise<number | null> {
  const { data, error } = await supabase
    .from('evidence')
    .select('confidence')
    .eq('entity_type', entity.type)
    .eq('entity_id', entity.id)
    .not('confidence', 'is', null)

  if (error) throw error
  if (!data || data.length === 0) return null

  const sum = data.reduce((acc, item) => acc + (item.confidence || 0), 0)
  return sum / data.length
}
