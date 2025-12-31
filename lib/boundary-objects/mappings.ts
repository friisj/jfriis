/**
 * CRUD Operations for Touchpoint Mappings, Assumptions, and Evidence
 *
 * Phase 2 of Boundary Objects implementation
 */

import { supabase } from '@/lib/supabase'
import type {
  TouchpointMapping,
  TouchpointAssumption,
  TouchpointEvidence,
} from '@/lib/types/boundary-objects'

// ============================================================================
// TYPES - Extended with joins
// ============================================================================

export interface TouchpointMappingInsert {
  touchpoint_id: string
  target_type: 'canvas_item' | 'customer_profile' | 'value_proposition_canvas'
  target_id: string
  mapping_type: 'addresses_job' | 'triggers_pain' | 'delivers_gain' | 'tests_assumption' | 'delivers_value_prop'
  strength?: 'weak' | 'moderate' | 'strong'
  validated?: boolean
  notes?: string
  metadata?: Record<string, unknown>
}

export interface TouchpointAssumptionInsert {
  touchpoint_id: string
  assumption_id: string
  relationship_type?: 'tests' | 'depends_on' | 'validates' | 'challenges'
  notes?: string
}

export interface TouchpointEvidenceInsert {
  touchpoint_id: string
  evidence_type: 'user_test' | 'interview' | 'survey' | 'analytics' | 'observation' | 'prototype' | 'ab_test' | 'heuristic_eval'
  title: string
  summary?: string
  url?: string
  supports_design?: boolean | null
  confidence?: 'low' | 'medium' | 'high'
  collected_at?: string
  metadata?: Record<string, unknown>
}

export interface TouchpointEvidenceUpdate {
  evidence_type?: 'user_test' | 'interview' | 'survey' | 'analytics' | 'observation' | 'prototype' | 'ab_test' | 'heuristic_eval'
  title?: string
  summary?: string
  url?: string
  supports_design?: boolean | null
  confidence?: 'low' | 'medium' | 'high'
  collected_at?: string
  metadata?: Record<string, unknown>
}

// Extended types with related data
export interface TouchpointMappingWithTarget extends TouchpointMapping {
  canvas_item?: {
    id: string
    title: string
    item_type: string
  } | null
}

export interface TouchpointAssumptionWithDetails extends TouchpointAssumption {
  assumption?: {
    id: string
    statement: string
    status: string
    risk_level: string | null
  } | null
}

// ============================================================================
// TOUCHPOINT MAPPINGS
// ============================================================================

export async function createTouchpointMapping(
  data: TouchpointMappingInsert
): Promise<TouchpointMapping> {
  const { data: mapping, error } = await supabase
    .from('touchpoint_mappings')
    .insert({
      ...data,
      validated: data.validated ?? false,
      metadata: data.metadata ?? {},
    })
    .select()
    .single()

  if (error) throw error
  return mapping
}

export async function deleteTouchpointMapping(id: string): Promise<void> {
  const { error } = await supabase
    .from('touchpoint_mappings')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function listTouchpointMappings(
  touchpointId: string
): Promise<TouchpointMappingWithTarget[]> {
  const { data: mappings, error } = await supabase
    .from('touchpoint_mappings')
    .select('*')
    .eq('touchpoint_id', touchpointId)
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!mappings || mappings.length === 0) return []

  // Batch fetch canvas items in a single query (fixes N+1)
  const canvasItemIds = mappings
    .filter((m) => m.target_type === 'canvas_item')
    .map((m) => m.target_id)

  let canvasItemsMap: Map<string, { id: string; title: string; item_type: string }> = new Map()

  if (canvasItemIds.length > 0) {
    const { data: canvasItems } = await supabase
      .from('canvas_items')
      .select('id, title, item_type')
      .in('id', canvasItemIds)

    if (canvasItems) {
      canvasItemsMap = new Map(canvasItems.map((item) => [item.id, item]))
    }
  }

  // Join in memory
  return mappings.map((mapping) => ({
    ...mapping,
    canvas_item: mapping.target_type === 'canvas_item'
      ? canvasItemsMap.get(mapping.target_id) || null
      : null,
  }))
}

export async function listMappingsForCanvasItem(
  canvasItemId: string
): Promise<TouchpointMapping[]> {
  const { data, error } = await supabase
    .from('touchpoint_mappings')
    .select('*')
    .eq('target_type', 'canvas_item')
    .eq('target_id', canvasItemId)

  if (error) throw error
  return data || []
}

// ============================================================================
// TOUCHPOINT ASSUMPTIONS
// ============================================================================

export async function createTouchpointAssumption(
  data: TouchpointAssumptionInsert
): Promise<TouchpointAssumption> {
  const { data: link, error } = await supabase
    .from('touchpoint_assumptions')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return link
}

export async function deleteTouchpointAssumption(
  touchpointId: string,
  assumptionId: string
): Promise<void> {
  const { error } = await supabase
    .from('touchpoint_assumptions')
    .delete()
    .eq('touchpoint_id', touchpointId)
    .eq('assumption_id', assumptionId)

  if (error) throw error
}

export async function listTouchpointAssumptions(
  touchpointId: string
): Promise<TouchpointAssumptionWithDetails[]> {
  const { data: links, error } = await supabase
    .from('touchpoint_assumptions')
    .select('*')
    .eq('touchpoint_id', touchpointId)

  if (error) throw error
  if (!links || links.length === 0) return []

  // Batch fetch assumptions in a single query (fixes N+1)
  const assumptionIds = links.map((l) => l.assumption_id)

  const { data: assumptions } = await supabase
    .from('assumptions')
    .select('id, statement, status, risk_level')
    .in('id', assumptionIds)

  const assumptionsMap = new Map(
    (assumptions || []).map((a) => [a.id, a])
  )

  // Join in memory
  return links.map((link) => ({
    ...link,
    assumption: assumptionsMap.get(link.assumption_id) || null,
  }))
}

export async function listAssumptionTouchpoints(
  assumptionId: string
): Promise<TouchpointAssumption[]> {
  const { data, error } = await supabase
    .from('touchpoint_assumptions')
    .select('*')
    .eq('assumption_id', assumptionId)

  if (error) throw error
  return data || []
}

// ============================================================================
// TOUCHPOINT EVIDENCE
// ============================================================================

export async function createTouchpointEvidence(
  data: TouchpointEvidenceInsert
): Promise<TouchpointEvidence> {
  const { data: evidence, error } = await supabase
    .from('touchpoint_evidence')
    .insert({
      ...data,
      metadata: data.metadata ?? {},
    })
    .select()
    .single()

  if (error) throw error
  return evidence
}

export async function updateTouchpointEvidence(
  id: string,
  data: TouchpointEvidenceUpdate
): Promise<TouchpointEvidence> {
  const { data: evidence, error } = await supabase
    .from('touchpoint_evidence')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return evidence
}

export async function deleteTouchpointEvidence(id: string): Promise<void> {
  const { error } = await supabase
    .from('touchpoint_evidence')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function listTouchpointEvidence(
  touchpointId: string
): Promise<TouchpointEvidence[]> {
  const { data, error } = await supabase
    .from('touchpoint_evidence')
    .select('*')
    .eq('touchpoint_id', touchpointId)
    .order('collected_at', { ascending: false, nullsFirst: false })

  if (error) throw error
  return data || []
}

export async function getTouchpointEvidence(
  id: string
): Promise<TouchpointEvidence> {
  const { data, error } = await supabase
    .from('touchpoint_evidence')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export async function getTouchpointWithAllRelations(touchpointId: string) {
  const [mappings, assumptions, evidence] = await Promise.all([
    listTouchpointMappings(touchpointId),
    listTouchpointAssumptions(touchpointId),
    listTouchpointEvidence(touchpointId),
  ])

  return {
    mappings,
    assumptions,
    evidence,
    mapping_count: mappings.length,
    assumption_count: assumptions.length,
    evidence_count: evidence.length,
  }
}
