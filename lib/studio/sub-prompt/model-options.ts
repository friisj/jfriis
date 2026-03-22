/**
 * Sub-Prompt — Model Options
 *
 * UI-friendly model list derived from lib/ai/models.ts.
 * Safe to import client-side (no provider initialization).
 */

import { models, type ModelConfig } from '@/lib/ai/models'
import type { ModelOption } from './types'

/** All models as UI-friendly options */
export function getModelOptions(): ModelOption[] {
  return Object.entries(models).map(([key, config]: [string, ModelConfig]) => ({
    key,
    name: config.name,
    provider: config.provider,
    costTier: config.costTier,
  }))
}

/** Get display name for a model key */
export function getModelDisplayName(key: string): string {
  return models[key]?.name ?? key
}

/** Get provider for a model key */
export function getModelProvider(key: string): string {
  return models[key]?.provider ?? 'unknown'
}

/** Check if a model key is valid */
export function isValidModelKey(key: string): boolean {
  return key in models
}
