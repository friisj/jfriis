/**
 * Luv: Dynamic Soul Modulation System (DSMS)
 *
 * Core engine for parametric personality trait control.
 * Traits are integer values on a 1–10 scale. This module handles:
 *   - Type definitions
 *   - Trait validation
 *   - Config state management (append-only history)
 *   - Preset application
 *   - Soul layer rendering for prompt composition
 */

// ============================================================================
// Types
// ============================================================================

export const SOUL_TRAITS = [
  'honesty',
  'humor',
  'deference',
  'formality',
  'enthusiasm',
  'risk_taking',
] as const;

export type SoulTrait = (typeof SOUL_TRAITS)[number];

export type SoulTraits = Record<SoulTrait, number>;

export type SoulModifiedBy = 'user' | 'autonomous' | 'preset' | 'system';

export interface SoulPreset {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  traits: SoulTraits;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SoulConfig {
  id: string;
  character_id: string | null;
  session_id: string | null;
  preset_id: string | null;
  traits: SoulTraits;
  context: string | null;
  modified_by: SoulModifiedBy;
  note: string | null;
  created_at: string;
}

/** Partial trait update — caller supplies only the keys they want to change */
export type TraitPatch = Partial<SoulTraits>;

// ============================================================================
// Validation
// ============================================================================

export interface TraitValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate a full SoulTraits object — all 6 keys, integer 1–10 */
export function validateTraits(traits: unknown): TraitValidationResult {
  const errors: string[] = [];

  if (typeof traits !== 'object' || traits === null || Array.isArray(traits)) {
    return { valid: false, errors: ['traits must be a non-null object'] };
  }

  const obj = traits as Record<string, unknown>;

  for (const key of SOUL_TRAITS) {
    const val = obj[key];
    if (val === undefined || val === null) {
      errors.push(`Missing trait: ${key}`);
      continue;
    }
    if (typeof val !== 'number' || !Number.isInteger(val)) {
      errors.push(`${key} must be an integer (got ${typeof val})`);
      continue;
    }
    if (val < 1 || val > 10) {
      errors.push(`${key} must be between 1 and 10 (got ${val})`);
    }
  }

  // Reject unknown keys
  for (const key of Object.keys(obj)) {
    if (!SOUL_TRAITS.includes(key as SoulTrait)) {
      errors.push(`Unknown trait: ${key}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Validate a partial trait patch — only keys present are validated */
export function validateTraitPatch(patch: unknown): TraitValidationResult {
  const errors: string[] = [];

  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
    return { valid: false, errors: ['patch must be a non-null object'] };
  }

  const obj = patch as Record<string, unknown>;

  for (const key of Object.keys(obj)) {
    if (!SOUL_TRAITS.includes(key as SoulTrait)) {
      errors.push(`Unknown trait: ${key}`);
      continue;
    }
    const val = obj[key];
    if (typeof val !== 'number' || !Number.isInteger(val)) {
      errors.push(`${key} must be an integer (got ${typeof val})`);
      continue;
    }
    if ((val as number) < 1 || (val as number) > 10) {
      errors.push(`${key} must be between 1 and 10 (got ${val})`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Trait descriptions for prompt rendering
// ============================================================================

const TRAIT_LABELS: Record<SoulTrait, string> = {
  honesty: 'Honesty/Directness',
  humor: 'Humor',
  deference: 'Deference',
  formality: 'Formality',
  enthusiasm: 'Enthusiasm',
  risk_taking: 'Risk-Taking',
};

const TRAIT_LOW: Record<SoulTrait, string> = {
  honesty: 'diplomatic',
  humor: 'professional/serious',
  deference: 'intellectually assertive',
  formality: 'casual warmth',
  enthusiasm: 'measured/reserved',
  risk_taking: 'conservative',
};

const TRAIT_HIGH: Record<SoulTrait, string> = {
  honesty: 'brutally direct',
  humor: 'playfully irreverent',
  deference: 'collaborative/deferential',
  formality: 'academically precise',
  enthusiasm: 'effusively excited',
  risk_taking: 'boldly experimental',
};

/**
 * Render a trait config as a human-readable description for the soul layer.
 * Format: "Trait (value/10): leaning toward low/high descriptor"
 */
export function renderTraitsAsText(traits: SoulTraits): string {
  const lines = SOUL_TRAITS.map((key) => {
    const val = traits[key];
    const label = TRAIT_LABELS[key];
    const tendency = val <= 4 ? TRAIT_LOW[key] : val >= 7 ? TRAIT_HIGH[key] : 'balanced';
    return `- ${label}: ${val}/10 (${tendency})`;
  });
  return lines.join('\n');
}

/**
 * Merge a patch into an existing trait config.
 * Returns a new SoulTraits object with patch values applied.
 */
export function applyTraitPatch(current: SoulTraits, patch: TraitPatch): SoulTraits {
  return { ...current, ...patch };
}

/**
 * Default baseline traits used when no config history exists for a session.
 */
export const DEFAULT_TRAITS: SoulTraits = {
  honesty: 7,
  humor: 6,
  deference: 4,
  formality: 5,
  enthusiasm: 7,
  risk_taking: 6,
};
