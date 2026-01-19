/**
 * Value Proposition Canvas (VPC) Boundary Objects
 *
 * Types, validation, and utilities for the VPC canvas split view.
 * VPC combines Customer Profile (right) and Value Map (left) with fit analysis.
 */

import type { CustomerProfileCanvas, PainItem, GainItem, JobItem } from './customer-profile-canvas'
import type { ValueMapCanvas, PainRelieverItem, GainCreatorItem, ProductItem } from './value-map-canvas'

// ============================================================================
// Types
// ============================================================================

export const FIT_LINK_TYPES = ['pains', 'gains', 'jobs'] as const
export type FitLinkType = (typeof FIT_LINK_TYPES)[number]

export interface AddressedBlock {
  items: string[] // IDs of addressed items
  coverage?: number // Percentage 0-100
}

export interface VPCFitAnalysis {
  overall_score: number
  pain_coverage: number
  gain_coverage: number
  job_coverage: number
  gaps: {
    unaddressed_pains: string[]
    unaddressed_gains: string[]
    unaddressed_jobs: string[]
  }
  strengths: {
    well_covered_pains: string[]
    well_covered_gains: string[]
  }
}

export interface ValuePropositionCanvasData {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  value_map_id: string
  customer_profile_id: string
  fit_score: number | null
  fit_analysis: VPCFitAnalysis | null
  addressed_jobs: AddressedBlock
  addressed_pains: AddressedBlock
  addressed_gains: AddressedBlock
  created_at: string
  updated_at: string
}

export interface VPCCanvasWithLinked {
  vpc: ValuePropositionCanvasData
  valueMap: ValueMapCanvas
  customerProfile: CustomerProfileCanvas
}

// ============================================================================
// Result Types
// ============================================================================

export type DataResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate fit link type
 */
export function validateFitLinkType(linkType: string): DataResult<FitLinkType> {
  if (!FIT_LINK_TYPES.includes(linkType as FitLinkType)) {
    return { success: false, error: `Invalid fit link type: ${linkType}` }
  }
  return { success: true, data: linkType as FitLinkType }
}

/**
 * Validate an item ID exists in the given block
 */
export function validateItemExists(
  itemId: string,
  items: Array<{ id: string }>
): DataResult<string> {
  const exists = items.some((item) => item.id === itemId)
  if (!exists) {
    return { success: false, error: `Item not found: ${itemId}` }
  }
  return { success: true, data: itemId }
}

/**
 * Validate addressed block structure
 */
export function isValidAddressedBlock(block: unknown): block is AddressedBlock {
  if (!block || typeof block !== 'object') return false
  const b = block as Record<string, unknown>
  if (!Array.isArray(b.items)) return false
  if (!b.items.every((item) => typeof item === 'string')) return false
  if (b.coverage !== undefined && typeof b.coverage !== 'number') return false
  return true
}

/**
 * Validate VPCFitAnalysis structure from database JSON
 */
export function isValidVPCFitAnalysis(data: unknown): data is VPCFitAnalysis {
  if (!data || typeof data !== 'object') return false
  const analysis = data as Record<string, unknown>

  // Check required numeric fields
  if (typeof analysis.overall_score !== 'number') return false
  if (typeof analysis.pain_coverage !== 'number') return false
  if (typeof analysis.gain_coverage !== 'number') return false
  if (typeof analysis.job_coverage !== 'number') return false

  // Check gaps object
  if (!analysis.gaps || typeof analysis.gaps !== 'object') return false
  const gaps = analysis.gaps as Record<string, unknown>
  if (!Array.isArray(gaps.unaddressed_pains)) return false
  if (!Array.isArray(gaps.unaddressed_gains)) return false
  if (!Array.isArray(gaps.unaddressed_jobs)) return false

  // Check strengths object
  if (!analysis.strengths || typeof analysis.strengths !== 'object') return false
  const strengths = analysis.strengths as Record<string, unknown>
  if (!Array.isArray(strengths.well_covered_pains)) return false
  if (!Array.isArray(strengths.well_covered_gains)) return false

  return true
}

/**
 * Safely parse VPCFitAnalysis from database JSON
 * Returns null if invalid structure
 */
export function parseVPCFitAnalysis(data: unknown): VPCFitAnalysis | null {
  if (isValidVPCFitAnalysis(data)) {
    return data
  }
  return null
}

/**
 * Normalize an addressed block, ensuring valid structure
 */
export function normalizeAddressedBlock(block: unknown): AddressedBlock {
  if (isValidAddressedBlock(block)) {
    return {
      items: block.items,
      coverage: block.coverage,
    }
  }
  return { items: [], coverage: 0 }
}

// ============================================================================
// Fit Calculation
// ============================================================================

/**
 * Calculate the overall fit score based on coverage
 * Returns a percentage 0-100
 */
export function calculateFitScore(
  profile: CustomerProfileCanvas,
  addressedPains: AddressedBlock,
  addressedGains: AddressedBlock,
  addressedJobs: AddressedBlock
): number {
  const totalPains = profile.pains?.items?.length || 0
  const totalGains = profile.gains?.items?.length || 0
  const totalJobs = profile.jobs?.items?.length || 0

  const painsCovered = totalPains > 0 ? addressedPains.items.length / totalPains : 0
  const gainsCovered = totalGains > 0 ? addressedGains.items.length / totalGains : 0
  const jobsCovered = totalJobs > 0 ? addressedJobs.items.length / totalJobs : 0

  // Weight: Pains and Gains are more important than Jobs for VPC
  const weightedScore = painsCovered * 0.4 + gainsCovered * 0.4 + jobsCovered * 0.2

  return Math.round(weightedScore * 100)
}

/**
 * Calculate detailed fit analysis
 */
export function calculateFitAnalysis(
  profile: CustomerProfileCanvas,
  addressedPains: AddressedBlock,
  addressedGains: AddressedBlock,
  addressedJobs: AddressedBlock
): VPCFitAnalysis {
  const totalPains = profile.pains?.items?.length || 0
  const totalGains = profile.gains?.items?.length || 0
  const totalJobs = profile.jobs?.items?.length || 0

  const addressedPainIds = new Set(addressedPains.items)
  const addressedGainIds = new Set(addressedGains.items)
  const addressedJobIds = new Set(addressedJobs.items)

  // Calculate coverages
  const painCoverage = totalPains > 0 ? Math.round((addressedPainIds.size / totalPains) * 100) : 0
  const gainCoverage = totalGains > 0 ? Math.round((addressedGainIds.size / totalGains) * 100) : 0
  const jobCoverage = totalJobs > 0 ? Math.round((addressedJobIds.size / totalJobs) * 100) : 0

  // Find gaps
  const unaddressedPains = (profile.pains?.items || [])
    .filter((p) => !addressedPainIds.has(p.id))
    .map((p) => p.id)
  const unaddressedGains = (profile.gains?.items || [])
    .filter((g) => !addressedGainIds.has(g.id))
    .map((g) => g.id)
  const unaddressedJobs = (profile.jobs?.items || [])
    .filter((j) => !addressedJobIds.has(j.id))
    .map((j) => j.id)

  // Find strengths (addressed high-severity pains, critical gains)
  const wellCoveredPains = (profile.pains?.items || [])
    .filter((p) => addressedPainIds.has(p.id) && (p.severity === 'high' || p.severity === 'extreme'))
    .map((p) => p.id)
  const wellCoveredGains = (profile.gains?.items || [])
    .filter((g) => addressedGainIds.has(g.id) && g.importance === 'critical')
    .map((g) => g.id)

  const overallScore = calculateFitScore(profile, addressedPains, addressedGains, addressedJobs)

  return {
    overall_score: overallScore,
    pain_coverage: painCoverage,
    gain_coverage: gainCoverage,
    job_coverage: jobCoverage,
    gaps: {
      unaddressed_pains: unaddressedPains,
      unaddressed_gains: unaddressedGains,
      unaddressed_jobs: unaddressedJobs,
    },
    strengths: {
      well_covered_pains: wellCoveredPains,
      well_covered_gains: wellCoveredGains,
    },
  }
}

// ============================================================================
// Fit Operations
// ============================================================================

/**
 * Add an item ID to the addressed list
 */
export function addAddressedItem(
  block: AddressedBlock,
  itemId: string
): AddressedBlock {
  if (block.items.includes(itemId)) {
    return block // Already addressed
  }
  return {
    ...block,
    items: [...block.items, itemId],
  }
}

/**
 * Remove an item ID from the addressed list
 */
export function removeAddressedItem(
  block: AddressedBlock,
  itemId: string
): AddressedBlock {
  return {
    ...block,
    items: block.items.filter((id) => id !== itemId),
  }
}

/**
 * Toggle an item's addressed status
 */
export function toggleAddressedItem(
  block: AddressedBlock,
  itemId: string
): AddressedBlock {
  if (block.items.includes(itemId)) {
    return removeAddressedItem(block, itemId)
  }
  return addAddressedItem(block, itemId)
}

/**
 * Check if an item is addressed
 */
export function isItemAddressed(block: AddressedBlock, itemId: string): boolean {
  return block.items.includes(itemId)
}

// ============================================================================
// UI Helpers
// ============================================================================

/**
 * Get fit score color class based on percentage
 */
export function getFitScoreColorClass(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-50'
  if (score >= 60) return 'text-yellow-600 bg-yellow-50'
  if (score >= 40) return 'text-orange-600 bg-orange-50'
  return 'text-red-600 bg-red-50'
}

/**
 * Get fit score label based on percentage
 */
export function getFitScoreLabel(score: number): string {
  if (score >= 80) return 'Strong Fit'
  if (score >= 60) return 'Moderate Fit'
  if (score >= 40) return 'Partial Fit'
  return 'Weak Fit'
}

/**
 * Get coverage badge class
 */
export function getCoverageBadgeClass(coverage: number): string {
  if (coverage >= 80) return 'bg-green-100 text-green-800'
  if (coverage >= 50) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

// ============================================================================
// Item Matching Helpers
// ============================================================================

/**
 * Find pain items that are not addressed by any pain reliever
 */
export function findUnaddressedPains(
  profile: CustomerProfileCanvas,
  addressedPains: AddressedBlock
): PainItem[] {
  const addressedIds = new Set(addressedPains.items)
  return (profile.pains?.items || []).filter((pain) => !addressedIds.has(pain.id))
}

/**
 * Find gain items that are not addressed by any gain creator
 */
export function findUnaddressedGains(
  profile: CustomerProfileCanvas,
  addressedGains: AddressedBlock
): GainItem[] {
  const addressedIds = new Set(addressedGains.items)
  return (profile.gains?.items || []).filter((gain) => !addressedIds.has(gain.id))
}

/**
 * Count statistics for VPC summary
 */
export function getVPCStats(
  profile: CustomerProfileCanvas,
  valueMap: ValueMapCanvas,
  addressedPains: AddressedBlock,
  addressedGains: AddressedBlock,
  addressedJobs: AddressedBlock
): {
  profileItems: number
  valueMapItems: number
  totalAddressed: number
  totalGaps: number
} {
  const profileItems =
    (profile.jobs?.items?.length || 0) +
    (profile.pains?.items?.length || 0) +
    (profile.gains?.items?.length || 0)

  const valueMapItems =
    (valueMap.products_services?.items?.length || 0) +
    (valueMap.pain_relievers?.items?.length || 0) +
    (valueMap.gain_creators?.items?.length || 0)

  const totalAddressed =
    addressedPains.items.length + addressedGains.items.length + addressedJobs.items.length

  const totalGaps =
    profileItems -
    addressedPains.items.length -
    addressedGains.items.length -
    addressedJobs.items.length

  return {
    profileItems,
    valueMapItems,
    totalAddressed,
    totalGaps: Math.max(0, totalGaps),
  }
}
