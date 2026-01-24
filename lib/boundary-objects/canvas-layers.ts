/**
 * Unified Layer Configuration for Canvas Components
 *
 * This module provides a consistent interface for layer definitions across
 * all canvas types: Story Map (dynamic layers), Blueprint (fixed layers),
 * and Journey (fixed layers).
 *
 * Part of the TimelineCanvas refactoring for maximized reuse.
 */

import type { StoryMapLayer } from './story-map-layers'

// ============================================================================
// Types
// ============================================================================

/**
 * Unified layer definition used by all canvas types.
 * This interface provides a common structure for both fixed and dynamic layers.
 */
export interface CanvasLayerDefinition {
  /** Unique identifier for the layer */
  id: string
  /** Display name for the layer */
  name: string
  /** Optional description shown in tooltips or detail views */
  description?: string
  /**
   * Semantic color name (e.g., 'blue', 'green', 'orange').
   * Use getTailwindColorClass() to convert to actual Tailwind classes.
   */
  color?: string
  /** Optional text color override (defaults to foreground) */
  textColor?: string
  /** Optional border color override */
  borderColor?: string
  /** Whether to show a separator line after this layer */
  showSeparatorAfter?: boolean
  /** Label for the separator (e.g., "Line of Visibility") */
  separatorLabel?: string
}

/**
 * Configuration registry providing layer definitions and helper functions.
 */
export interface CanvasLayerConfig {
  /** Array of layer definitions in display order */
  layers: CanvasLayerDefinition[]
  /** Get a layer by its ID */
  getLayerById: (id: string) => CanvasLayerDefinition | undefined
  /** Get the Tailwind color class for a layer's background */
  getLayerBgClass: (id: string) => string
  /** Get the Tailwind color class for a layer's text */
  getLayerTextClass: (id: string) => string
  /** Get the index of the separator (or null if no separator) */
  getSeparatorAfterIndex: () => number | null
}

// ============================================================================
// Color Utilities
// ============================================================================

/**
 * Map semantic color names to Tailwind background classes.
 */
const COLOR_TO_BG_CLASS: Record<string, string> = {
  blue: 'bg-blue-50',
  green: 'bg-green-50',
  orange: 'bg-orange-50',
  purple: 'bg-purple-50',
  pink: 'bg-pink-50',
  red: 'bg-red-50',
  yellow: 'bg-yellow-50',
  gray: 'bg-gray-50',
  indigo: 'bg-indigo-50',
  cyan: 'bg-cyan-50',
  teal: 'bg-teal-50',
}

/**
 * Map semantic color names to Tailwind text classes.
 */
const COLOR_TO_TEXT_CLASS: Record<string, string> = {
  blue: 'text-blue-700',
  green: 'text-green-700',
  orange: 'text-orange-700',
  purple: 'text-purple-700',
  pink: 'text-pink-700',
  red: 'text-red-700',
  yellow: 'text-yellow-700',
  gray: 'text-gray-700',
  indigo: 'text-indigo-700',
  cyan: 'text-cyan-700',
  teal: 'text-teal-700',
}

/**
 * Get Tailwind background class from a semantic color name.
 */
export function getTailwindBgClass(color: string | undefined): string {
  if (!color) return 'bg-gray-50'
  return COLOR_TO_BG_CLASS[color.toLowerCase()] ?? 'bg-gray-50'
}

/**
 * Get Tailwind text class from a semantic color name.
 */
export function getTailwindTextClass(color: string | undefined): string {
  if (!color) return 'text-gray-700'
  return COLOR_TO_TEXT_CLASS[color.toLowerCase()] ?? 'text-gray-700'
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a CanvasLayerConfig from an array of layer definitions.
 * Provides convenience methods for common operations.
 */
export function createLayerConfig(
  layers: CanvasLayerDefinition[]
): CanvasLayerConfig {
  const layerMap = new Map(layers.map((l) => [l.id, l]))

  return {
    layers,

    getLayerById: (id: string) => layerMap.get(id),

    getLayerBgClass: (id: string) => {
      const layer = layerMap.get(id)
      return getTailwindBgClass(layer?.color)
    },

    getLayerTextClass: (id: string) => {
      const layer = layerMap.get(id)
      if (layer?.textColor) {
        return getTailwindTextClass(layer.textColor)
      }
      return getTailwindTextClass(layer?.color)
    },

    getSeparatorAfterIndex: () => {
      const index = layers.findIndex((l) => l.showSeparatorAfter)
      return index >= 0 ? index : null
    },
  }
}

// ============================================================================
// Blueprint Layer Configuration
// ============================================================================

/**
 * Fixed layers for Service Blueprint canvas.
 * Line of Visibility separates frontstage (visible to customer) from backstage.
 */
export const BLUEPRINT_LAYERS: CanvasLayerDefinition[] = [
  {
    id: 'customer_action',
    name: 'Customer Actions',
    description: 'What the customer does',
    color: 'blue',
  },
  {
    id: 'frontstage',
    name: 'Frontstage',
    description: 'Visible employee actions',
    color: 'green',
    showSeparatorAfter: true,
    separatorLabel: 'Line of Visibility',
  },
  {
    id: 'backstage',
    name: 'Backstage',
    description: 'Hidden employee actions',
    color: 'orange',
  },
  {
    id: 'support_process',
    name: 'Support Process',
    description: 'Systems and infrastructure',
    color: 'purple',
  },
]

/**
 * Pre-configured layer config for Blueprint canvas.
 */
export const BLUEPRINT_LAYER_CONFIG = createLayerConfig(BLUEPRINT_LAYERS)

// ============================================================================
// Journey Layer Configuration
// ============================================================================

/**
 * Fixed layers for Customer Journey canvas.
 * Represents different perspectives on the customer experience.
 */
export const JOURNEY_LAYERS: CanvasLayerDefinition[] = [
  {
    id: 'touchpoint',
    name: 'Touchpoints',
    description: 'Customer interaction points',
    color: 'blue',
  },
  {
    id: 'emotion',
    name: 'Emotions',
    description: 'Emotional state (-5 to +5)',
    color: 'pink',
  },
  {
    id: 'pain_point',
    name: 'Pain Points',
    description: 'Frustrations and problems',
    color: 'orange',
  },
  {
    id: 'channel',
    name: 'Channels',
    description: 'Communication channels used',
    color: 'green',
  },
  {
    id: 'opportunity',
    name: 'Opportunities',
    description: 'Improvement opportunities',
    color: 'purple',
  },
]

/**
 * Pre-configured layer config for Journey canvas.
 */
export const JOURNEY_LAYER_CONFIG = createLayerConfig(JOURNEY_LAYERS)

// ============================================================================
// Story Map Layer Configuration (Dynamic)
// ============================================================================

/**
 * Default layer colors for Story Map canvas.
 * Cycles through these colors when creating new layers.
 */
export const STORY_MAP_LAYER_COLORS = [
  'blue',
  'green',
  'orange',
  'purple',
  'pink',
  'cyan',
  'teal',
  'indigo',
] as const

/**
 * Create a CanvasLayerConfig from Story Map database layers.
 * Used for dynamic layers that users can create/edit.
 *
 * @param layers - Story map layers from database
 * @returns CanvasLayerConfig with layer definitions
 */
export function createDynamicLayerConfig(
  layers: StoryMapLayer[]
): CanvasLayerConfig {
  const definitions: CanvasLayerDefinition[] = layers.map((layer, index) => ({
    id: layer.id,
    name: layer.name,
    description: layer.description ?? undefined,
    color: STORY_MAP_LAYER_COLORS[index % STORY_MAP_LAYER_COLORS.length],
  }))

  return createLayerConfig(definitions)
}

/**
 * Get the next color for a new Story Map layer.
 * Cycles through the color palette based on the current number of layers.
 *
 * @param currentLayerCount - Number of existing layers
 * @returns Color name for the next layer
 */
export function getNextLayerColor(currentLayerCount: number): string {
  return STORY_MAP_LAYER_COLORS[currentLayerCount % STORY_MAP_LAYER_COLORS.length]
}

// ============================================================================
// Layer Type Conversion (for backward compatibility)
// ============================================================================

/**
 * Convert a layer ID to a CanvasLayerDefinition from Blueprint config.
 * Useful when you have a layer_type string and need the full definition.
 */
export function getBlueprintLayerDefinition(
  layerType: string
): CanvasLayerDefinition | undefined {
  return BLUEPRINT_LAYER_CONFIG.getLayerById(layerType)
}

/**
 * Convert a layer ID to a CanvasLayerDefinition from Journey config.
 * Useful when you have a layer_type string and need the full definition.
 */
export function getJourneyLayerDefinition(
  layerType: string
): CanvasLayerDefinition | undefined {
  return JOURNEY_LAYER_CONFIG.getLayerById(layerType)
}
