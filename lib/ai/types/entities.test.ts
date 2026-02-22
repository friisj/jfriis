import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isValidEntityType,
  validateContext,
  estimateContextSize,
  validateContextSize,
  MAX_CONTEXT_TOKENS,
  type EntityType,
  type AIContext,
} from './entities'

// ============================================================================
// Constants Tests
// ============================================================================

describe('Constants', () => {
  it('MAX_CONTEXT_TOKENS is defined and reasonable', () => {
    expect(MAX_CONTEXT_TOKENS).toBe(500)
    expect(typeof MAX_CONTEXT_TOKENS).toBe('number')
  })
})

// ============================================================================
// isValidEntityType Tests
// ============================================================================

describe('isValidEntityType', () => {
  describe('valid entity types', () => {
    const validTypes: EntityType[] = [
      'studio_projects',
      'studio_hypotheses',
      'studio_experiments',
      'business_model_canvases',
      'customer_profiles',
      'value_maps',
      'value_proposition_canvases',
      'canvas_items',
      'assumptions',
      'ventures',
      'log_entries',
      'specimens',
      'user_journeys',
      'service_blueprints',
      'story_maps',
      'bmc_items',
      'activities',
      'user_stories',
      'blueprint_steps',
      'blueprint_cells',
      'journey_stages',
      'journey_cells',
      'customer_profile_items',
      'value_map_items',
    ]

    it.each(validTypes)('returns true for %s', (type) => {
      expect(isValidEntityType(type)).toBe(true)
    })
  })

  describe('invalid entity types', () => {
    it('returns false for empty string', () => {
      expect(isValidEntityType('')).toBe(false)
    })

    it('returns false for random string', () => {
      expect(isValidEntityType('not_a_real_type')).toBe(false)
    })

    it('returns false for similar but incorrect names', () => {
      expect(isValidEntityType('studio_project')).toBe(false) // Missing 's'
      expect(isValidEntityType('StudioProjects')).toBe(false) // Wrong case
      expect(isValidEntityType('studio-projects')).toBe(false) // Wrong separator
    })

    it('returns false for null or undefined', () => {
      // @ts-expect-error - Testing runtime behavior with invalid input
      expect(isValidEntityType(null)).toBe(false)
      // @ts-expect-error - Testing runtime behavior with invalid input
      expect(isValidEntityType(undefined)).toBe(false)
    })
  })
})

// ============================================================================
// validateContext Tests
// ============================================================================

describe('validateContext', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
  })

  describe('allowed value types', () => {
    it('allows string values', () => {
      const input = { name: 'Test', description: 'A description' }
      const result = validateContext(input)

      expect(result.name).toBe('Test')
      expect(result.description).toBe('A description')
    })

    it('allows number values', () => {
      const input = { count: 42, score: 3.14 }
      const result = validateContext(input)

      expect(result.count).toBe(42)
      expect(result.score).toBe(3.14)
    })

    it('allows boolean values', () => {
      const input = { active: true, disabled: false }
      const result = validateContext(input)

      expect(result.active).toBe(true)
      expect(result.disabled).toBe(false)
    })

    it('allows null values', () => {
      const input = { optional: null }
      const result = validateContext(input)

      expect(result.optional).toBeNull()
    })

    it('handles mixed serializable types', () => {
      const input = {
        name: 'Test',
        count: 10,
        active: true,
        optional: null,
      }
      const result = validateContext(input)

      expect(result).toEqual(input)
    })
  })

  describe('disallowed value types', () => {
    it('filters out objects', () => {
      const input = { data: { nested: 'value' }, name: 'Test' }
      const result = validateContext(input)

      expect(result.data).toBeUndefined()
      expect(result.name).toBe('Test')
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AIContext]'),
        'object',
        expect.any(String)
      )
    })

    it('filters out arrays', () => {
      const input = { items: [1, 2, 3], name: 'Test' }
      const result = validateContext(input)

      expect(result.items).toBeUndefined()
      expect(result.name).toBe('Test')
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it('filters out functions', () => {
      const input = { callback: () => {}, name: 'Test' }
      const result = validateContext(input)

      expect(result.callback).toBeUndefined()
      expect(result.name).toBe('Test')
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it('filters out symbols', () => {
      const input = { symbol: Symbol('test'), name: 'Test' }
      const result = validateContext(input)

      expect(result.symbol).toBeUndefined()
      expect(result.name).toBe('Test')
    })
  })

  describe('undefined handling', () => {
    it('skips undefined values without warning', () => {
      const input = { name: 'Test', optional: undefined }
      const result = validateContext(input)

      expect(result.name).toBe('Test')
      expect(result.optional).toBeUndefined()
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('handles empty object', () => {
      const result = validateContext({})
      expect(result).toEqual({})
    })

    it('handles object with all invalid values', () => {
      const input = {
        obj: { nested: true },
        arr: [1, 2, 3],
        fn: () => {},
      }
      const result = validateContext(input)
      expect(result).toEqual({})
    })

    it('preserves empty string', () => {
      const input = { name: '' }
      const result = validateContext(input)
      expect(result.name).toBe('')
    })

    it('preserves zero', () => {
      const input = { count: 0 }
      const result = validateContext(input)
      expect(result.count).toBe(0)
    })

    it('preserves false', () => {
      const input = { active: false }
      const result = validateContext(input)
      expect(result.active).toBe(false)
    })
  })
})

// ============================================================================
// estimateContextSize Tests
// ============================================================================

describe('estimateContextSize', () => {
  it('returns 0 for empty context', () => {
    const size = estimateContextSize({})
    expect(size).toBe(1) // '{}' is 2 chars, /4 = 0.5, ceil = 1
  })

  it('estimates size based on JSON length', () => {
    const context: AIContext = { name: 'Test' }
    const size = estimateContextSize(context)
    // {"name":"Test"} = 15 chars, /4 = 3.75, ceil = 4
    expect(size).toBe(4)
  })

  it('increases with more content', () => {
    const small: AIContext = { a: '1' }
    const large: AIContext = {
      name: 'A very long name that takes up space',
      description: 'An even longer description that contains a lot of text content',
    }

    const smallSize = estimateContextSize(small)
    const largeSize = estimateContextSize(large)

    expect(largeSize).toBeGreaterThan(smallSize)
  })

  it('handles special characters', () => {
    const context: AIContext = { text: 'Hello\nWorld\t"Quoted"' }
    const size = estimateContextSize(context)
    expect(size).toBeGreaterThan(0)
  })

  it('handles unicode characters', () => {
    const context: AIContext = { emoji: '🚀🌟💡' }
    const size = estimateContextSize(context)
    expect(size).toBeGreaterThan(0)
  })
})

// ============================================================================
// validateContextSize Tests
// ============================================================================

describe('validateContextSize', () => {
  it('returns valid=true for small context', () => {
    const context: AIContext = { name: 'Test' }
    const result = validateContextSize(context)

    expect(result.valid).toBe(true)
    expect(result.size).toBeLessThanOrEqual(result.max)
    expect(result.max).toBe(MAX_CONTEXT_TOKENS)
  })

  it('returns valid=false for large context', () => {
    // Create context that exceeds MAX_CONTEXT_TOKENS
    // 500 tokens * 4 chars/token = 2000 chars needed
    const longText = 'x'.repeat(2100)
    const context: AIContext = { description: longText }
    const result = validateContextSize(context)

    expect(result.valid).toBe(false)
    expect(result.size).toBeGreaterThan(result.max)
  })

  it('returns size close to MAX when at boundary', () => {
    // Create context right at the boundary
    // Need ~500 tokens = ~2000 chars of JSON
    const text = 'a'.repeat(1980) // Leave room for {"text":"..."}
    const context: AIContext = { text }
    const result = validateContextSize(context)

    expect(result.size).toBeCloseTo(500, -2) // Within ~100 of 500
  })

  it('includes max in result', () => {
    const result = validateContextSize({ name: 'Test' })
    expect(result.max).toBe(MAX_CONTEXT_TOKENS)
  })

  it('handles empty context', () => {
    const result = validateContextSize({})

    expect(result.valid).toBe(true)
    expect(result.size).toBeLessThan(10)
  })
})

// ============================================================================
// Type Safety Tests (compile-time validation)
// ============================================================================

describe('Type Safety', () => {
  it('EntityType includes all expected types', () => {
    // This test validates that the type definition is complete
    // If any of these fail to compile, the types are incomplete
    const types: EntityType[] = [
      'studio_projects',
      'activities',
      'user_stories',
      'blueprint_cells',
      'journey_cells',
    ]
    expect(types.length).toBe(5)
  })

  it('AIContext accepts serializable values', () => {
    const context: AIContext = {
      string: 'value',
      number: 42,
      boolean: true,
      null: null,
    }
    expect(Object.keys(context)).toHaveLength(4)
  })
})
