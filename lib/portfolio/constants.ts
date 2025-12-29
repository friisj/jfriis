/**
 * Portfolio Management Constants
 *
 * Centralizes all magic numbers, thresholds, and configuration values
 * used in portfolio calculations and UI rendering.
 */

// Evidence Strength Thresholds (matches database function)
export const EVIDENCE_THRESHOLDS = {
  WEAK_MIN: 20,
  MODERATE_MIN: 50,
  STRONG_MIN: 75,
} as const

// Evidence Score Weights (matches database calculation)
export const EVIDENCE_WEIGHTS = {
  VALIDATED_HYPOTHESIS: 10,
  SUCCESSFUL_EXPERIMENT: 15,
  VPC_FIT_SCORE: 50,
} as const

// Horizon Time Ranges (years)
export const HORIZON_RANGES = {
  H1: { min: 0, max: 2, label: '0-2 years' },
  H2: { min: 2, max: 5, label: '2-5 years' },
  H3: { min: 5, max: 12, label: '5-12 years' },
} as const

// Recommended Resource Allocation (70-20-10 rule)
export const RECOMMENDED_ALLOCATION = {
  H1: 70,
  H2: 20,
  H3: 10,
} as const

// Portfolio Type Labels
export const PORTFOLIO_TYPE_LABELS = {
  explore: 'Explore',
  exploit: 'Exploit',
} as const

// Stage Labels and Order
export const EXPLORE_STAGES = {
  ideation: { label: 'Ideation', order: 1 },
  discovery: { label: 'Discovery', order: 2 },
  validation: { label: 'Validation', order: 3 },
  acceleration: { label: 'Acceleration', order: 4 },
} as const

export const EXPLOIT_STAGES = {
  launch: { label: 'Launch', order: 1 },
  sustaining: { label: 'Sustaining', order: 2 },
  mature: { label: 'Mature', order: 3 },
  declining: { label: 'Declining', order: 4 },
} as const

// Review Frequency (days)
export const REVIEW_FREQUENCY = {
  ideation: 30,
  discovery: 21,
  validation: 14,
  acceleration: 7,
  launch: 14,
  sustaining: 30,
  mature: 90,
  declining: 60,
} as const

// Investment Thresholds
export const INVESTMENT_THRESHOLDS = {
  LOW: 50000,    // $50K
  MEDIUM: 250000, // $250K
  HIGH: 1000000,  // $1M
} as const

// Strategic Value Score Range
export const STRATEGIC_VALUE_RANGE = {
  MIN: 0,
  MAX: 10,
} as const

// FTE Allocation Thresholds
export const FTE_THRESHOLDS = {
  LOW: 0.5,
  MEDIUM: 2,
  HIGH: 5,
} as const

// Hypothesis and Experiment Thresholds
export const VALIDATION_THRESHOLDS = {
  MIN_HYPOTHESES_FOR_VALIDATION: 3,
  MIN_EXPERIMENTS_FOR_ACCELERATION: 5,
  MIN_SUCCESS_RATE: 0.6, // 60%
  MIN_FIT_SCORE: 7, // out of 10
} as const
