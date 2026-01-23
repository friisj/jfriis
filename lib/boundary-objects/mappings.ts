/**
 * CRUD Operations for Touchpoint Mappings, Assumptions, and Evidence
 *
 * Phase 2B: Migrated to use entity_links universal relationship table
 */

import { supabase } from '@/lib/supabase'
import type {
  TouchpointMapping,
  TouchpointAssumption,
  TouchpointEvidence,
} from '@/lib/types/boundary-objects'
import {
  linkEntities,
  unlinkEntities,
  getLinkedEntitiesWithData,
  getLinkedEntities,
} from '@/lib/entity-links'
import type {
  EntityRef,
  LinkType,
  LinkStrength,
  EntityLink,
} from '@/lib/types/entity-relationships'

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
// TOUCHPOINT MAPPINGS (via entity_links)
// ============================================================================

/**
 * Helper to convert mapping_type to LinkType
 */
function mapMappingTypeToLinkType(
  mappingType: 'addresses_job' | 'triggers_pain' | 'delivers_gain' | 'tests_assumption' | 'delivers_value_prop'
): LinkType {
  const typeMap: Record<string, LinkType> = {
    addresses_job: 'addresses_job',
    triggers_pain: 'triggers_pain',
    delivers_gain: 'delivers_gain',
    tests_assumption: 'tests',
    delivers_value_prop: 'delivers',
  }
  return typeMap[mappingType] || 'related'
}

/**
 * Helper to convert LinkType back to mapping_type
 */
function linkTypeToMappingType(linkType: LinkType | string): string {
  const reverseMap: Record<string, string> = {
    addresses_job: 'addresses_job',
    triggers_pain: 'triggers_pain',
    delivers_gain: 'delivers_gain',
    tests: 'tests_assumption',
    delivers: 'delivers_value_prop',
    relieves_pain: 'triggers_pain', // Backwards compat
  }
  return reverseMap[linkType] || linkType
}

/**
 * Helper to convert strength string to LinkStrength
 */
function strengthToLinkStrength(strength?: 'weak' | 'moderate' | 'strong'): LinkStrength | undefined {
  return strength as LinkStrength | undefined
}

export async function createTouchpointMapping(
  data: TouchpointMappingInsert
): Promise<TouchpointMapping> {
  const linkType = mapMappingTypeToLinkType(data.mapping_type)
  const strength = strengthToLinkStrength(data.strength)

  const link = await linkEntities(
    { type: 'touchpoint', id: data.touchpoint_id },
    { type: data.target_type as any, id: data.target_id },
    linkType,
    {
      strength,
      notes: data.notes,
      metadata: {
        ...data.metadata,
        validated: data.validated ?? false,
      },
    }
  )

  // Convert EntityLink to TouchpointMapping format for backwards compatibility
  return {
    id: link.id,
    touchpoint_id: link.source_id,
    target_type: link.target_type as any,
    target_id: link.target_id,
    mapping_type: linkTypeToMappingType(link.link_type) as any,
    strength: link.strength as any,
    validated: (link.metadata as any)?.validated ?? false,
    notes: link.notes ?? null,
    metadata: link.metadata,
    created_at: link.created_at,
    updated_at: link.created_at, // entity_links doesn't have updated_at
  } as TouchpointMapping
}

export async function deleteTouchpointMapping(id: string): Promise<void> {
  const { error } = await supabase
    .from('entity_links')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function listTouchpointMappings(
  touchpointId: string
): Promise<TouchpointMappingWithTarget[]> {
  // Get all links from touchpoint to canvas_item, customer_profile, or value_proposition_canvas
  const links = await getLinkedEntities(
    { type: 'touchpoint', id: touchpointId },
    { direction: 'outgoing' }
  )

  // Filter to only include relevant target types
  const relevantLinks = links.filter(link =>
    ['canvas_item', 'customer_profile', 'value_proposition_canvas'].includes(link.target_type)
  )

  if (relevantLinks.length === 0) return []

  // Batch fetch canvas items for enrichment
  const canvasItemLinks = relevantLinks.filter(l => l.target_type === 'canvas_item')
  const canvasItemIds = canvasItemLinks.map(l => l.target_id)

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

  // Convert EntityLinks to TouchpointMapping format
  return relevantLinks.map((link) => ({
    id: link.id,
    touchpoint_id: link.source_id,
    target_type: link.target_type as any,
    target_id: link.target_id,
    mapping_type: linkTypeToMappingType(link.link_type) as any,
    strength: link.strength as any,
    validated: (link.metadata as any)?.validated ?? false,
    notes: link.notes ?? null,
    metadata: link.metadata,
    created_at: link.created_at,
    updated_at: link.created_at, // entity_links doesn't have updated_at
    canvas_item: link.target_type === 'canvas_item'
      ? canvasItemsMap.get(link.target_id) || null
      : null,
  } as TouchpointMappingWithTarget))
}

export async function listMappingsForCanvasItem(
  canvasItemId: string
): Promise<TouchpointMapping[]> {
  // Get all links TO this canvas item FROM touchpoints
  const links = await getLinkedEntities(
    { type: 'canvas_item', id: canvasItemId },
    { direction: 'incoming', targetType: 'touchpoint' }
  )

  // Convert EntityLinks to TouchpointMapping format
  return links.map((link) => ({
    id: link.id,
    touchpoint_id: link.source_id,
    target_type: link.target_type as any,
    target_id: link.target_id,
    mapping_type: linkTypeToMappingType(link.link_type) as any,
    strength: link.strength as any,
    validated: (link.metadata as any)?.validated ?? false,
    notes: link.notes ?? null,
    metadata: link.metadata,
    created_at: link.created_at,
    updated_at: link.created_at, // entity_links doesn't have updated_at
  } as TouchpointMapping))
}

// ============================================================================
// TOUCHPOINT ASSUMPTIONS (via entity_links)
// ============================================================================

/**
 * Helper to convert relationship_type to LinkType
 */
function relationshipTypeToLinkType(
  relationshipType?: 'tests' | 'depends_on' | 'validates' | 'challenges'
): LinkType {
  return (relationshipType || 'tests') as LinkType
}

export async function createTouchpointAssumption(
  data: TouchpointAssumptionInsert
): Promise<TouchpointAssumption> {
  const linkType = relationshipTypeToLinkType(data.relationship_type)

  const link = await linkEntities(
    { type: 'touchpoint', id: data.touchpoint_id },
    { type: 'assumption', id: data.assumption_id },
    linkType,
    { notes: data.notes }
  )

  // Convert EntityLink to TouchpointAssumption format for backwards compatibility
  return {
    id: link.id,
    touchpoint_id: link.source_id,
    assumption_id: link.target_id,
    relationship_type: link.link_type as any,
    notes: link.notes ?? null,
    created_at: link.created_at,
    updated_at: link.created_at, // entity_links doesn't have updated_at
  } as TouchpointAssumption
}

export async function deleteTouchpointAssumption(
  touchpointId: string,
  assumptionId: string
): Promise<void> {
  await unlinkEntities(
    { type: 'touchpoint', id: touchpointId },
    { type: 'assumption', id: assumptionId }
  )
}

export async function listTouchpointAssumptions(
  touchpointId: string
): Promise<TouchpointAssumptionWithDetails[]> {
  // Get linked assumptions with full data
  const linkedAssumptions = await getLinkedEntitiesWithData<{
    id: string
    statement: string
    status: string
    risk_level: string | null
  }>(
    { type: 'touchpoint', id: touchpointId },
    'assumption'
  )

  // Convert to TouchpointAssumptionWithDetails format
  return linkedAssumptions.map((linked) => ({
    id: linked.link.id,
    touchpoint_id: touchpointId,
    assumption_id: linked.entity.id,
    relationship_type: linked.link.link_type as any,
    notes: linked.link.notes ?? null,
    created_at: linked.link.created_at,
    updated_at: linked.link.created_at, // entity_links doesn't have updated_at
    assumption: linked.entity,
  } as TouchpointAssumptionWithDetails))
}

export async function listAssumptionTouchpoints(
  assumptionId: string
): Promise<TouchpointAssumption[]> {
  // Get all links FROM touchpoints TO this assumption
  const links = await getLinkedEntities(
    { type: 'assumption', id: assumptionId },
    { direction: 'incoming', targetType: 'touchpoint' }
  )

  // Convert EntityLinks to TouchpointAssumption format
  return links.map((link) => ({
    id: link.id,
    touchpoint_id: link.source_id,
    assumption_id: link.target_id,
    relationship_type: link.link_type as any,
    notes: link.notes ?? null,
    created_at: link.created_at,
    updated_at: link.created_at, // entity_links doesn't have updated_at
  } as TouchpointAssumption))
}

// ============================================================================
// TOUCHPOINT EVIDENCE
// ============================================================================

// NOTE: touchpoint_evidence table not in generated Supabase types - using type assertions
export async function createTouchpointEvidence(
  data: TouchpointEvidenceInsert
): Promise<TouchpointEvidence> {
  const { data: evidence, error } = await (supabase as any)
    .from('touchpoint_evidence')
    .insert({
      ...data,
      metadata: data.metadata ?? {},
    })
    .select()
    .single()

  if (error) throw error
  return evidence as TouchpointEvidence
}

export async function updateTouchpointEvidence(
  id: string,
  data: TouchpointEvidenceUpdate
): Promise<TouchpointEvidence> {
  const { data: evidence, error } = await (supabase as any)
    .from('touchpoint_evidence')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return evidence as TouchpointEvidence
}

export async function deleteTouchpointEvidence(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('touchpoint_evidence')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function listTouchpointEvidence(
  touchpointId: string
): Promise<TouchpointEvidence[]> {
  const { data, error } = await (supabase as any)
    .from('touchpoint_evidence')
    .select('*')
    .eq('touchpoint_id', touchpointId)
    .order('collected_at', { ascending: false, nullsFirst: false })

  if (error) throw error
  return (data || []) as TouchpointEvidence[]
}

export async function getTouchpointEvidence(
  id: string
): Promise<TouchpointEvidence> {
  const { data, error } = await (supabase as any)
    .from('touchpoint_evidence')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as TouchpointEvidence
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
