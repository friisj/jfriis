/**
 * Canvas Items Type Definitions
 *
 * First-class entities for canvas block items, enabling:
 * - Individual validation tracking per item
 * - Assumptions linked to specific items (not just blocks)
 * - Cross-canvas item reuse
 * - FIT analysis mappings between Value Map and Customer Profile items
 * - Evidence attached directly to items
 */

// ============================================================================
// CANVAS ITEM TYPES
// ============================================================================

export type CanvasItemType =
  // Business Model Canvas items
  | 'partner'           // key_partners
  | 'activity'          // key_activities
  | 'resource'          // key_resources
  | 'value_proposition' // value_propositions
  | 'segment'           // customer_segments
  | 'relationship'      // customer_relationships
  | 'channel'           // channels
  | 'cost'              // cost_structure
  | 'revenue'           // revenue_streams
  // Customer Profile items
  | 'job'               // jobs
  | 'pain'              // pains
  | 'gain'              // gains
  // Value Map items
  | 'product_service'   // products_services
  | 'pain_reliever'     // pain_relievers
  | 'gain_creator'      // gain_creators

export type JobType = 'functional' | 'social' | 'emotional' | 'supporting'
export type Intensity = 'minor' | 'moderate' | 'major' | 'extreme'
export type Importance = 'critical' | 'high' | 'medium' | 'low'
export type ValidationStatus = 'untested' | 'testing' | 'validated' | 'invalidated'
export type Frequency = 'rarely' | 'sometimes' | 'often' | 'always'

// ============================================================================
// CANVAS ITEM
// ============================================================================

export interface CanvasItem {
  id: string
  studio_project_id?: string
  title: string
  description?: string
  item_type: CanvasItemType
  importance: Importance
  validation_status: ValidationStatus

  // Job-specific fields (for item_type = 'job')
  job_type?: JobType
  job_context?: string // "When I'm..." context for the job

  // Pain/Gain intensity (for item_type IN ('pain', 'gain'))
  intensity?: Intensity

  // Frequency/occurrence
  frequency?: Frequency

  // Metadata
  notes?: string
  tags: string[]
  metadata: Record<string, unknown>

  // Timestamps
  created_at: string
  updated_at: string
}

export type CanvasItemInsert = Omit<CanvasItem, 'id' | 'created_at' | 'updated_at'>
export type CanvasItemUpdate = Partial<CanvasItemInsert>

// ============================================================================
// CANVAS ITEM PLACEMENT
// ============================================================================

export type CanvasType = 'business_model_canvas' | 'customer_profile' | 'value_map'

export interface CanvasItemPlacement {
  id: string
  canvas_item_id: string
  canvas_type: CanvasType
  canvas_id: string
  block_name: string
  position: number
  validation_status_override?: ValidationStatus
  created_at: string
}

export type CanvasItemPlacementInsert = Omit<CanvasItemPlacement, 'id' | 'created_at'>
export type CanvasItemPlacementUpdate = Partial<Omit<CanvasItemPlacementInsert, 'canvas_item_id'>>

// ============================================================================
// CANVAS ITEM ASSUMPTION
// ============================================================================

export type AssumptionRelationshipType = 'about' | 'depends_on' | 'validates' | 'contradicts'

export interface CanvasItemAssumption {
  id: string
  canvas_item_id: string
  assumption_id: string
  relationship_type: AssumptionRelationshipType
  notes?: string
  created_at: string
}

export type CanvasItemAssumptionInsert = Omit<CanvasItemAssumption, 'id' | 'created_at'>
export type CanvasItemAssumptionUpdate = Partial<Omit<CanvasItemAssumptionInsert, 'canvas_item_id' | 'assumption_id'>>

// ============================================================================
// CANVAS ITEM MAPPING (FIT Analysis)
// ============================================================================

export type MappingType = 'relieves' | 'creates' | 'addresses' | 'enables'
export type FitStrength = 'weak' | 'partial' | 'strong' | 'perfect'
export type ValidationMethod = 'assumed' | 'interviewed' | 'tested' | 'measured'

export interface CanvasItemMapping {
  id: string
  source_item_id: string
  target_item_id: string
  mapping_type: MappingType
  fit_strength: FitStrength
  validation_method?: ValidationMethod
  notes?: string
  created_at: string
  updated_at: string
}

export type CanvasItemMappingInsert = Omit<CanvasItemMapping, 'id' | 'created_at' | 'updated_at'>
export type CanvasItemMappingUpdate = Partial<Omit<CanvasItemMappingInsert, 'source_item_id' | 'target_item_id'>>

// ============================================================================
// CANVAS ITEM EVIDENCE
// ============================================================================

export type EvidenceType =
  | 'interview'
  | 'survey'
  | 'analytics'
  | 'experiment'
  | 'observation'
  | 'research'
  | 'competitor'
  | 'expert'

export type Confidence = 'low' | 'medium' | 'high'

export interface CanvasItemEvidence {
  id: string
  canvas_item_id: string
  evidence_type: EvidenceType
  title: string
  summary?: string
  url?: string
  supports_item?: boolean // true = supports, false = contradicts, null = unclear
  confidence?: Confidence
  collected_at?: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type CanvasItemEvidenceInsert = Omit<CanvasItemEvidence, 'id' | 'created_at' | 'updated_at'>
export type CanvasItemEvidenceUpdate = Partial<Omit<CanvasItemEvidenceInsert, 'canvas_item_id'>>

// ============================================================================
// BLOCK TO ITEM TYPE MAPPING
// ============================================================================

/**
 * Maps canvas block names to the allowed item types for that block
 */
export const BLOCK_ITEM_TYPES: Record<string, CanvasItemType[]> = {
  // Business Model Canvas blocks
  key_partners: ['partner'],
  key_activities: ['activity'],
  key_resources: ['resource'],
  value_propositions: ['value_proposition'],
  customer_segments: ['segment'],
  customer_relationships: ['relationship'],
  channels: ['channel'],
  cost_structure: ['cost'],
  revenue_streams: ['revenue'],

  // Customer Profile blocks
  jobs: ['job'],
  pains: ['pain'],
  gains: ['gain'],

  // Value Map blocks
  products_services: ['product_service'],
  pain_relievers: ['pain_reliever'],
  gain_creators: ['gain_creator'],
}

/**
 * Get allowed item types for a given block name
 */
export function getAllowedItemTypes(blockName: string): CanvasItemType[] {
  return BLOCK_ITEM_TYPES[blockName] || []
}

/**
 * Get the primary item type for a block (first allowed type)
 */
export function getBlockItemType(blockName: string): CanvasItemType | undefined {
  return BLOCK_ITEM_TYPES[blockName]?.[0]
}

// ============================================================================
// EXTENDED VIEWS (with aggregated data)
// ============================================================================

export interface CanvasItemWithPlacements extends CanvasItem {
  placements: Array<{
    placement_id: string
    canvas_type: CanvasType
    canvas_id: string
    block_name: string
    position: number
  }>
  placement_count: number
}

export interface CanvasItemWithAssumptions extends CanvasItem {
  assumption_count: number
  validated_assumption_count: number
  invalidated_assumption_count: number
}

export interface CanvasItemWithRelations extends CanvasItem {
  placements: CanvasItemPlacement[]
  assumptions: CanvasItemAssumption[]
  evidence: CanvasItemEvidence[]
  source_mappings: CanvasItemMapping[] // Mappings where this item is the source
  target_mappings: CanvasItemMapping[] // Mappings where this item is the target
}
