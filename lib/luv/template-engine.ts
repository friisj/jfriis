/**
 * Luv: Prompt Template Variable Interpolation
 *
 * Pure functions for building template contexts from character data
 * and rendering templates with {{variable}} interpolation.
 */

import type { LuvSoulData, LuvChassisData, LuvAestheticPreset } from '@/lib/types/luv';
import type { LuvChassisModule } from '@/lib/types/luv-chassis';

export type TemplateContext = Record<string, unknown>;

/**
 * Build a flat dot-path context from structured character data.
 */
export function buildTemplateContext(
  soulData?: LuvSoulData,
  chassisData?: LuvChassisData,
  modules?: LuvChassisModule[],
  preset?: LuvAestheticPreset | null,
): TemplateContext {
  const ctx: TemplateContext = {};

  // Soul data
  if (soulData) {
    flattenInto(ctx, 'soul', soulData);
  }

  // Chassis data (from character singleton)
  if (chassisData) {
    flattenInto(ctx, 'chassis', chassisData);
  }

  // Chassis modules — namespace by slug
  if (modules) {
    for (const mod of modules) {
      flattenInto(ctx, `modules.${mod.slug}`, mod.parameters);
    }
  }

  // Aesthetic preset parameters
  if (preset) {
    flattenInto(ctx, 'aesthetic', preset.parameters);
  }

  return ctx;
}

/**
 * Render a template string by replacing {{path}} tokens with context values.
 * Unknown paths render as [unknown: path].
 */
export function renderTemplate(template: string, context: TemplateContext): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
    const trimmed = path.trim();
    const value = resolvePath(context, trimmed);
    if (value === undefined) return `[unknown: ${trimmed}]`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  });
}

/**
 * Get all available variable paths from a context.
 */
export function getAvailableVariables(context: TemplateContext): string[] {
  return Object.keys(context).sort();
}

// -- Helpers --

function resolvePath(obj: TemplateContext, path: string): unknown {
  return obj[path];
}

function flattenInto(
  target: TemplateContext,
  prefix: string,
  value: unknown,
): void {
  if (value === null || value === undefined) return;

  if (typeof value === 'object' && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flattenInto(target, `${prefix}.${k}`, v);
    }
  } else {
    target[prefix] = value;
  }
}
