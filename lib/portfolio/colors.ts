/**
 * Portfolio Color Utilities
 *
 * Centralizes color schemes and badge styling for portfolio-related UI elements.
 * Uses Tailwind CSS utility classes for consistency.
 */

import type {
  EvidenceStrength,
  InnovationRisk,
  PortfolioType,
  ExploreStage,
  ExploitStage,
  Horizon,
} from '@/lib/types/database'

/**
 * Gets Tailwind classes for evidence strength badges
 */
export function getEvidenceColor(strength?: EvidenceStrength | string): string {
  switch (strength) {
    case 'strong':
      return 'bg-green-500/10 text-green-700 dark:text-green-400'
    case 'moderate':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
    case 'weak':
      return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
    case 'none':
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
  }
}

/**
 * Gets Tailwind classes for innovation risk badges
 */
export function getRiskColor(risk?: InnovationRisk | string): string {
  switch (risk) {
    case 'high':
      return 'bg-red-500/10 text-red-700 dark:text-red-400'
    case 'medium':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
    case 'low':
      return 'bg-green-500/10 text-green-700 dark:text-green-400'
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
  }
}

/**
 * Gets Tailwind classes for portfolio type badges
 */
export function getPortfolioTypeColor(type?: PortfolioType | string): string {
  switch (type) {
    case 'explore':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
    case 'exploit':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
  }
}

/**
 * Gets Tailwind classes for horizon badges
 */
export function getHorizonColor(horizon?: Horizon | string): string {
  switch (horizon) {
    case 'h1':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
    case 'h2':
      return 'bg-sky-500/10 text-sky-700 dark:text-sky-400'
    case 'h3':
      return 'bg-violet-500/10 text-violet-700 dark:text-violet-400'
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
  }
}

/**
 * Gets Tailwind classes for stage badges (both explore and exploit)
 */
export function getStageColor(stage?: ExploreStage | ExploitStage | string): string {
  switch (stage) {
    // Explore stages
    case 'ideation':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
    case 'discovery':
      return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400'
    case 'validation':
      return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
    case 'acceleration':
      return 'bg-green-500/10 text-green-700 dark:text-green-400'

    // Exploit stages
    case 'launch':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
    case 'sustaining':
      return 'bg-teal-500/10 text-teal-700 dark:text-teal-400'
    case 'mature':
      return 'bg-slate-500/10 text-slate-700 dark:text-slate-400'
    case 'declining':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-400'

    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
  }
}

/**
 * Gets display label for evidence strength
 */
export function getEvidenceLabel(strength?: EvidenceStrength | string): string {
  if (!strength) return 'None'
  return strength.charAt(0).toUpperCase() + strength.slice(1)
}

/**
 * Gets display label for risk level
 */
export function getRiskLabel(risk?: InnovationRisk | string): string {
  if (!risk) return '—'
  return risk.charAt(0).toUpperCase() + risk.slice(1)
}

/**
 * Gets display label for horizon
 */
export function getHorizonLabel(horizon?: Horizon | string): string {
  if (!horizon) return '—'
  return horizon.toUpperCase()
}

/**
 * Gets display label for stage
 */
export function getStageLabel(stage?: ExploreStage | ExploitStage | string): string {
  if (!stage) return '—'
  return stage.charAt(0).toUpperCase() + stage.slice(1)
}

/**
 * Base badge classes for consistent styling
 */
export const BADGE_BASE_CLASSES = 'px-2 py-1 rounded text-xs font-medium'
