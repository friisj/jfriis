/**
 * Test Data Factories
 *
 * Centralized factory functions for creating mock test data.
 * Reduces duplication and ensures consistent test data across all test files.
 */

import type {
  BlueprintCell,
  BlueprintStep,
  ServiceBlueprint,
  LayerType,
  CostImplication,
  FailureRisk,
} from '@/lib/boundary-objects/blueprint-cells'

import type {
  JourneyCell,
  JourneyStage,
  UserJourney,
  Touchpoint,
  JourneyLayerType,
} from '@/lib/boundary-objects/journey-cells'

// ============================================================================
// Utility
// ============================================================================

let idCounter = 0

/**
 * Generate a unique ID for test data
 */
export function createId(prefix = 'test'): string {
  return `${prefix}-${++idCounter}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Reset ID counter between test runs
 */
export function resetIdCounter(): void {
  idCounter = 0
}

/**
 * Generate ISO timestamp
 */
export function createTimestamp(offset = 0): string {
  return new Date(Date.now() + offset).toISOString()
}

// ============================================================================
// Blueprint Factories
// ============================================================================

type BlueprintCellOverrides = Partial<BlueprintCell>
type BlueprintStepOverrides = Partial<BlueprintStep>
type ServiceBlueprintOverrides = Partial<ServiceBlueprint>

/**
 * Creates a mock BlueprintCell with sensible defaults
 *
 * @param overrides - Partial cell properties to override
 * @returns A complete BlueprintCell object
 *
 * @example
 * const cell = createBlueprintCell({
 *   layer_type: 'frontstage',
 *   content: 'Agent responds to customer'
 * })
 */
export function createBlueprintCell(overrides?: BlueprintCellOverrides): BlueprintCell {
  const now = createTimestamp()
  return {
    id: createId('cell'),
    step_id: createId('step'),
    layer_type: 'customer_action' as LayerType,
    content: 'Default cell content',
    actors: null,
    duration_estimate: null,
    cost_implication: null,
    failure_risk: null,
    sequence: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/**
 * Creates multiple BlueprintCells with sequential sequences
 *
 * @param count - Number of cells to create
 * @param overrides - Properties to apply to all cells
 */
export function createBlueprintCells(
  count: number,
  overrides?: BlueprintCellOverrides
): BlueprintCell[] {
  return Array.from({ length: count }, (_, i) =>
    createBlueprintCell({ sequence: i, ...overrides })
  )
}

/**
 * Creates a complete set of blueprint cells for all layer types
 */
export function createBlueprintCellsByLayer(stepId: string): BlueprintCell[] {
  const layerTypes: LayerType[] = ['customer_action', 'frontstage', 'backstage', 'support_process']
  return layerTypes.map((layer_type, i) =>
    createBlueprintCell({ step_id: stepId, layer_type, sequence: i })
  )
}

/**
 * Creates a mock BlueprintStep
 */
export function createBlueprintStep(overrides?: BlueprintStepOverrides): BlueprintStep {
  return {
    id: createId('step'),
    service_blueprint_id: createId('blueprint'),
    name: 'Default Step',
    description: null,
    sequence: 0,
    cells: [],
    ...overrides,
  }
}

/**
 * Creates multiple BlueprintSteps with sequential sequences
 */
export function createBlueprintSteps(
  count: number,
  overrides?: BlueprintStepOverrides
): BlueprintStep[] {
  return Array.from({ length: count }, (_, i) =>
    createBlueprintStep({
      sequence: i,
      name: `Step ${i + 1}`,
      ...overrides,
    })
  )
}

/**
 * Creates a mock ServiceBlueprint
 */
export function createServiceBlueprint(overrides?: ServiceBlueprintOverrides): ServiceBlueprint {
  const id = createId('blueprint')
  return {
    id,
    slug: `blueprint-${id}`,
    name: 'Default Blueprint',
    description: null,
    blueprint_type: null,
    status: 'draft',
    steps: [],
    ...overrides,
  }
}

// ============================================================================
// Journey Factories
// ============================================================================

type JourneyCellOverrides = Partial<JourneyCell>
type JourneyStageOverrides = Partial<JourneyStage>
type UserJourneyOverrides = Partial<UserJourney>
type TouchpointOverrides = Partial<Touchpoint>

/**
 * Creates a mock JourneyCell
 *
 * @example
 * const cell = createJourneyCell({
 *   layer_type: 'emotion',
 *   emotion_score: 3
 * })
 */
export function createJourneyCell(overrides?: JourneyCellOverrides): JourneyCell {
  const now = createTimestamp()
  return {
    id: createId('jcell'),
    stage_id: createId('stage'),
    layer_type: 'touchpoint' as JourneyLayerType,
    content: 'Default journey cell content',
    emotion_score: null,
    channel_type: null,
    sequence: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/**
 * Creates multiple JourneyCells with sequential sequences
 */
export function createJourneyCells(
  count: number,
  overrides?: JourneyCellOverrides
): JourneyCell[] {
  return Array.from({ length: count }, (_, i) =>
    createJourneyCell({ sequence: i, ...overrides })
  )
}

/**
 * Creates a complete set of journey cells for all layer types
 */
export function createJourneyCellsByLayer(stageId: string): JourneyCell[] {
  const layerTypes: JourneyLayerType[] = ['touchpoint', 'emotion', 'pain_point', 'channel', 'opportunity']
  return layerTypes.map((layer_type, i) =>
    createJourneyCell({ stage_id: stageId, layer_type, sequence: i })
  )
}

/**
 * Creates a mock JourneyStage
 */
export function createJourneyStage(overrides?: JourneyStageOverrides): JourneyStage {
  return {
    id: createId('stage'),
    user_journey_id: createId('journey'),
    name: 'Default Stage',
    description: null,
    sequence: 0,
    cells: [],
    ...overrides,
  }
}

/**
 * Creates multiple JourneyStages
 */
export function createJourneyStages(
  count: number,
  overrides?: JourneyStageOverrides
): JourneyStage[] {
  return Array.from({ length: count }, (_, i) =>
    createJourneyStage({
      sequence: i,
      name: `Stage ${i + 1}`,
      ...overrides,
    })
  )
}

/**
 * Creates a mock UserJourney
 */
export function createUserJourney(overrides?: UserJourneyOverrides): UserJourney {
  const id = createId('journey')
  return {
    id,
    slug: `journey-${id}`,
    name: 'Default Journey',
    description: null,
    status: 'draft',
    stages: [],
    ...overrides,
  }
}

/**
 * Creates a mock Touchpoint
 */
export function createTouchpoint(overrides?: TouchpointOverrides): Touchpoint {
  return {
    id: createId('touchpoint'),
    journey_stage_id: createId('stage'),
    name: 'Default Touchpoint',
    description: null,
    sequence: 0,
    channel_type: null,
    interaction_type: null,
    importance: null,
    current_experience_quality: null,
    pain_level: null,
    ...overrides,
  }
}

// ============================================================================
// Admin Component Factories
// ============================================================================

export interface MockAdminItem {
  id: string
  name: string
  status: string
  description?: string
  created_at: string
  updated_at: string
}

/**
 * Creates a generic admin list item
 */
export function createAdminItem(overrides?: Partial<MockAdminItem>): MockAdminItem {
  const now = createTimestamp()
  return {
    id: createId('item'),
    name: 'Default Item',
    status: 'draft',
    description: undefined,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/**
 * Creates multiple admin items
 */
export function createAdminItems(count: number, overrides?: Partial<MockAdminItem>): MockAdminItem[] {
  return Array.from({ length: count }, (_, i) =>
    createAdminItem({
      name: `Item ${i + 1}`,
      ...overrides,
    })
  )
}

// ============================================================================
// XSS Test Vectors
// ============================================================================

/**
 * Comprehensive XSS attack vectors for security testing.
 * Use with validation functions to ensure proper sanitization.
 */
export const XSS_VECTORS = {
  // Basic script injection
  basic: [
    '<script>alert(1)</script>',
    '<script>alert("xss")</script>',
    "<script>alert('xss')</script>",
  ],

  // Event handler injection
  eventHandlers: [
    '<img src="x" onerror="alert(1)">',
    '<svg onload="alert(1)">',
    '<body onload="alert(1)">',
    '<div onmouseover="alert(1)">',
    '<input onfocus="alert(1)" autofocus>',
  ],

  // SVG-based XSS
  svg: [
    '<svg><script>alert(1)</script></svg>',
    '<svg onload="alert(1)">',
    '<svg><animate onbegin="alert(1)">',
    '<math><mi//xlink:href="data:x,<script>alert(1)</script>">',
  ],

  // Protocol-based XSS
  protocols: [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
  ],

  // Encoded XSS
  encoded: [
    '&lt;script&gt;alert(1)&lt;/script&gt;',
    '&#60;script&#62;alert(1)&#60;/script&#62;',
    '\\x3cscript\\x3ealert(1)\\x3c/script\\x3e',
  ],

  // Unicode/fullwidth XSS
  unicode: [
    '＜script＞alert(1)＜/script＞', // Fullwidth characters
    '<sCrIpT>alert(1)</sCrIpT>', // Mixed case
  ],

  // CDATA-based XSS
  cdata: ['<![CDATA[<script>alert(1)</script>]]>'],

  // Iframe-based XSS
  iframe: [
    '<iframe src="javascript:alert(1)">',
    '<iframe src="data:text/html,<script>alert(1)</script>">',
  ],

  // All vectors combined for comprehensive testing
  all: [] as string[],
}

// Populate the 'all' array with all vectors
XSS_VECTORS.all = [
  ...XSS_VECTORS.basic,
  ...XSS_VECTORS.eventHandlers,
  ...XSS_VECTORS.svg,
  ...XSS_VECTORS.protocols,
  ...XSS_VECTORS.encoded,
  ...XSS_VECTORS.unicode,
  ...XSS_VECTORS.cdata,
  ...XSS_VECTORS.iframe,
]

// ============================================================================
// AI Context Factories
// ============================================================================

export interface MockAIContext {
  [key: string]: string | number | boolean | null
}

/**
 * Creates a mock AI context object
 */
export function createAIContext(overrides?: MockAIContext): MockAIContext {
  return {
    name: 'Test Entity',
    description: 'A test entity for AI generation',
    status: 'draft',
    ...overrides,
  }
}

/**
 * Creates a large AI context for testing size limits
 */
export function createLargeAIContext(charCount: number): MockAIContext {
  return {
    description: 'x'.repeat(charCount),
  }
}
