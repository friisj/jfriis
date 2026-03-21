import { describe, it, expect } from 'vitest';
import {
  validateTraits,
  validateTraitPatch,
  applyTraitPatch,
  renderTraitsAsText,
  DEFAULT_TRAITS,
  SOUL_TRAITS,
  type SoulTraits,
} from './soul-modulation';

// ============================================================================
// validateTraits
// ============================================================================

describe('validateTraits', () => {
  it('accepts a valid full trait set', () => {
    const result = validateTraits(DEFAULT_TRAITS);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a non-object input', () => {
    expect(validateTraits(null).valid).toBe(false);
    expect(validateTraits('string').valid).toBe(false);
    expect(validateTraits([1, 2, 3]).valid).toBe(false);
  });

  it('rejects when a trait is missing', () => {
    const { humor: _omit, ...partial } = DEFAULT_TRAITS;
    const result = validateTraits(partial);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('humor'))).toBe(true);
  });

  it('rejects out-of-range values', () => {
    const bad: SoulTraits = { ...DEFAULT_TRAITS, honesty: 0 };
    const result = validateTraits(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('honesty'))).toBe(true);
  });

  it('rejects value of 11', () => {
    const bad: SoulTraits = { ...DEFAULT_TRAITS, risk_taking: 11 };
    const result = validateTraits(bad);
    expect(result.valid).toBe(false);
  });

  it('rejects non-integer values', () => {
    const bad = { ...DEFAULT_TRAITS, humor: 5.5 };
    const result = validateTraits(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('humor'))).toBe(true);
  });

  it('rejects unknown trait keys', () => {
    const bad = { ...DEFAULT_TRAITS, unknown_trait: 5 };
    const result = validateTraits(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('unknown_trait'))).toBe(true);
  });

  it('accepts all boundary values (1 and 10)', () => {
    const boundary: SoulTraits = {
      honesty: 1,
      humor: 10,
      deference: 1,
      formality: 10,
      enthusiasm: 1,
      risk_taking: 10,
    };
    expect(validateTraits(boundary).valid).toBe(true);
  });
});

// ============================================================================
// validateTraitPatch
// ============================================================================

describe('validateTraitPatch', () => {
  it('accepts a partial patch with valid values', () => {
    expect(validateTraitPatch({ honesty: 8 }).valid).toBe(true);
    expect(validateTraitPatch({ humor: 3, formality: 7 }).valid).toBe(true);
  });

  it('accepts an empty patch', () => {
    expect(validateTraitPatch({}).valid).toBe(true);
  });

  it('rejects out-of-range values in patch', () => {
    const result = validateTraitPatch({ honesty: 0 });
    expect(result.valid).toBe(false);
  });

  it('rejects unknown keys in patch', () => {
    const result = validateTraitPatch({ sarcasm: 5 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('sarcasm'))).toBe(true);
  });

  it('rejects non-object input', () => {
    expect(validateTraitPatch(null).valid).toBe(false);
    expect(validateTraitPatch(42).valid).toBe(false);
  });
});

// ============================================================================
// applyTraitPatch
// ============================================================================

describe('applyTraitPatch', () => {
  it('returns a new object with patched values', () => {
    const updated = applyTraitPatch(DEFAULT_TRAITS, { honesty: 9, humor: 2 });
    expect(updated.honesty).toBe(9);
    expect(updated.humor).toBe(2);
  });

  it('leaves unpatched traits unchanged', () => {
    const updated = applyTraitPatch(DEFAULT_TRAITS, { honesty: 9 });
    for (const key of SOUL_TRAITS) {
      if (key !== 'honesty') {
        expect(updated[key]).toBe(DEFAULT_TRAITS[key]);
      }
    }
  });

  it('does not mutate the original traits object', () => {
    const original = { ...DEFAULT_TRAITS };
    applyTraitPatch(DEFAULT_TRAITS, { honesty: 1 });
    expect(DEFAULT_TRAITS).toEqual(original);
  });

  it('handles an empty patch (identity operation)', () => {
    expect(applyTraitPatch(DEFAULT_TRAITS, {})).toEqual(DEFAULT_TRAITS);
  });
});

// ============================================================================
// renderTraitsAsText
// ============================================================================

describe('renderTraitsAsText', () => {
  it('renders all 6 traits', () => {
    const text = renderTraitsAsText(DEFAULT_TRAITS);
    for (const key of SOUL_TRAITS) {
      // Each trait name or label should appear in the output
      expect(text.toLowerCase()).toContain(key.replace('_', '/').split('_')[0]);
    }
  });

  it('labels low values as low descriptor', () => {
    const traits: SoulTraits = { ...DEFAULT_TRAITS, honesty: 3 };
    const text = renderTraitsAsText(traits);
    expect(text).toContain('diplomatic');
  });

  it('labels high values as high descriptor', () => {
    const traits: SoulTraits = { ...DEFAULT_TRAITS, honesty: 8 };
    const text = renderTraitsAsText(traits);
    expect(text).toContain('brutally direct');
  });

  it('labels mid values as balanced', () => {
    const traits: SoulTraits = { ...DEFAULT_TRAITS, humor: 5 };
    const text = renderTraitsAsText(traits);
    expect(text).toContain('balanced');
  });

  it('returns a multi-line string with 6 lines', () => {
    const lines = renderTraitsAsText(DEFAULT_TRAITS).split('\n');
    expect(lines).toHaveLength(6);
  });
});
