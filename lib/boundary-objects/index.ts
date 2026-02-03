/**
 * Boundary Objects Module
 *
 * Shared types, validation, and utilities for domain entities.
 *
 * Note: Some modules have overlapping exports (e.g., DataResult, validateItemContent).
 * Import those directly from their specific files to avoid ambiguity:
 *   - import { ... } from '@/lib/boundary-objects/bmc-canvas'
 *   - import { ... } from '@/lib/boundary-objects/blueprint-cells'
 */

// ============================================================================
// JOURNEYS & BLUEPRINTS (original exports - no conflicts)
// ============================================================================

export * from './journeys'
export * from './blueprints'
export * from './story-maps'
export * from './mappings'

// ============================================================================
// UNIFIED LAYER CONFIGURATION
// ============================================================================

export * from './canvas-layers'

// ============================================================================
// STUDIO & PORTFOLIO RELATIONSHIPS
// ============================================================================

export * from './studio-project-links'
export * from './ventures'

// ============================================================================
// CELL & CANVAS BOUNDARY OBJECTS
// ============================================================================
// These have overlapping exports (DataResult, validateItemContent, etc.)
// Import directly from specific files:
//
// Blueprint cells:
//   import { BlueprintCell, LayerType, validateBlueprintCellContent } from '@/lib/boundary-objects/blueprint-cells'
//
// Journey cells:
//   import { JourneyCell, JourneyLayerType, validateJourneyCellContent } from '@/lib/boundary-objects/journey-cells'
//
// Story map layers:
//   import { StoryMapLayer, validateLayerName } from '@/lib/boundary-objects/story-map-layers'
//
// BMC Canvas:
//   import { BMCCanvas, BMCBlock, validateItemContent } from '@/lib/boundary-objects/bmc-canvas'
//
// Customer Profile:
//   import { CustomerProfileCanvas, validateItemContent } from '@/lib/boundary-objects/customer-profile-canvas'
//
// Value Map:
//   import { ValueMapCanvas, validateItemContent } from '@/lib/boundary-objects/value-map-canvas'
//
// VPC Canvas:
//   import { VPCCanvas, calculateVPCFit } from '@/lib/boundary-objects/vpc-canvas'
