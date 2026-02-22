/**
 * Feedback Helper Functions
 *
 * Utilities for working with the universal feedback table.
 * Evolved from the evidence table as part of the feedback entity upgrade.
 */

import { supabase } from './supabase'
import type {
  FeedbackEntityType,
  Feedback,
  FeedbackInsert,
  FeedbackSourceType,
  PendingFeedback,
} from './types/entity-relationships'

// Feedback table isn't in generated Supabase types until migration is applied to remote.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const feedbackTable = () => (supabase as any).from('feedback')

/**
 * Entity reference for feedback operations
 */
interface FeedbackEntityRef {
  type: FeedbackEntityType
  id: string
}

// ============================================================================
// OBSERVABILITY
// ============================================================================

const ENABLE_QUERY_LOGGING = process.env.NODE_ENV === 'development' ||
  process.env.FEEDBACK_DEBUG === 'true'

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

  const message = `[feedback] ${log.operation}: ${log.entityType} (${log.duration}ms, ${log.resultCount} results)`

  if (logLevel === 'warn') {
    console.warn(`⚠️ SLOW QUERY ${message}`)
  } else if (process.env.FEEDBACK_VERBOSE === 'true') {
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
 * Add feedback to an entity
 */
export async function addFeedback(
  entity: FeedbackEntityRef,
  feedback: Omit<FeedbackInsert, 'entity_type' | 'entity_id'>
): Promise<Feedback> {
  const { data, error } = await feedbackTable()
    .insert({
      entity_type: entity.type,
      entity_id: entity.id,
      ...feedback,
    })
    .select()
    .single()

  if (error) throw error
  return data as unknown as Feedback
}

/**
 * Get all feedback for an entity
 */
export async function getFeedback(
  entity: FeedbackEntityRef,
  options?: {
    feedbackType?: FeedbackSourceType
    hatType?: string
    supportsOnly?: boolean
    refutesOnly?: boolean
    orderBy?: 'created_at' | 'collected_at' | 'confidence'
    ascending?: boolean
  }
): Promise<Feedback[]> {
  return withTiming('getFeedback', entity.type, async () => {
    let query = feedbackTable()
      .select('*')
      .eq('entity_type', entity.type)
      .eq('entity_id', entity.id)

    if (options?.feedbackType) {
      query = query.eq('feedback_type', options.feedbackType)
    }

    if (options?.hatType) {
      query = query.eq('hat_type', options.hatType)
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
    return (data || []) as unknown as Feedback[]
  })
}

/**
 * Get feedback count for an entity
 */
export async function getFeedbackCount(entity: FeedbackEntityRef): Promise<number> {
  const { count, error } = await feedbackTable()
    .select('*', { count: 'exact', head: true })
    .eq('entity_type', entity.type)
    .eq('entity_id', entity.id)

  if (error) throw error
  return count || 0
}

/**
 * Get feedback summary (counts by type, hat, and support status)
 */
export async function getFeedbackSummary(entity: FeedbackEntityRef): Promise<{
  total: number
  supporting: number
  refuting: number
  byType: Record<string, number>
  byHat: Record<string, number>
}> {
  return withTiming('getFeedbackSummary', entity.type, async () => {
    const { data, error } = await feedbackTable()
      .select('feedback_type, hat_type, supports')
      .eq('entity_type', entity.type)
      .eq('entity_id', entity.id)

    if (error) throw error
    if (!data) return { total: 0, supporting: 0, refuting: 0, byType: {}, byHat: {} }

    const byType: Record<string, number> = {}
    const byHat: Record<string, number> = {}
    let supporting = 0
    let refuting = 0

    for (const item of data) {
      byType[item.feedback_type] = (byType[item.feedback_type] || 0) + 1
      byHat[item.hat_type] = (byHat[item.hat_type] || 0) + 1
      if (item.supports === true) supporting++
      else if (item.supports === false) refuting++
    }

    return {
      total: data.length,
      supporting,
      refuting,
      byType,
      byHat,
    }
  })
}

/**
 * Update feedback
 */
export async function updateFeedback(
  feedbackId: string,
  updates: Partial<Omit<FeedbackInsert, 'entity_type' | 'entity_id'>>
): Promise<Feedback> {
  const { data, error } = await feedbackTable()
    .update(updates)
    .eq('id', feedbackId)
    .select()
    .single()

  if (error) throw error
  return data as unknown as Feedback
}

/**
 * Delete feedback
 */
export async function deleteFeedback(feedbackId: string): Promise<void> {
  const { error } = await feedbackTable()
    .delete()
    .eq('id', feedbackId)

  if (error) throw error
}

/**
 * Delete all feedback for an entity
 */
export async function deleteAllFeedback(entity: FeedbackEntityRef): Promise<void> {
  const { error } = await feedbackTable()
    .delete()
    .eq('entity_type', entity.type)
    .eq('entity_id', entity.id)

  if (error) throw error
}

/**
 * Sync pending feedback to an entity
 * Inserts new feedback items (for use after entity creation)
 */
export async function syncPendingFeedback(
  entity: FeedbackEntityRef,
  pendingFeedback: PendingFeedback[]
): Promise<Feedback[]> {
  if (pendingFeedback.length === 0) return []

  const feedbackToInsert = pendingFeedback.map(f => ({
    entity_type: entity.type,
    entity_id: entity.id,
    hat_type: f.hat_type,
    feedback_type: f.feedback_type,
    title: f.title,
    content: f.content,
    source_url: f.source_url,
    confidence: f.confidence,
    supports: f.supports,
    tags: [],
    metadata: {},
  }))

  const { data, error } = await feedbackTable()
    .insert(feedbackToInsert)
    .select()

  if (error) throw error
  return (data || []) as unknown as Feedback[]
}

/**
 * Calculate average confidence for an entity's feedback
 */
export async function getAverageConfidence(entity: FeedbackEntityRef): Promise<number | null> {
  const { data, error } = await feedbackTable()
    .select('confidence')
    .eq('entity_type', entity.type)
    .eq('entity_id', entity.id)
    .not('confidence', 'is', null)

  if (error) throw error
  if (!data || data.length === 0) return null

  const sum = data.reduce((acc: number, item: { confidence?: number }) => acc + (item.confidence || 0), 0)
  return sum / data.length
}
