import { describe, it, expect } from 'vitest'
import {
  isValidLinkType,
  getValidLinkTypes,
  validateLink,
  getSuggestedLinkTypes,
  getLinkPatternInfo,
} from './entity-links-validation'

describe('isValidLinkType', () => {
  describe('default link types', () => {
    it('always allows "related" link type', () => {
      expect(isValidLinkType('project', 'specimen', 'related')).toBe(true)
      expect(isValidLinkType('log_entry', 'assumption', 'related')).toBe(true)
      expect(isValidLinkType('canvas_item', 'canvas_item', 'related')).toBe(true)
    })

    it('always allows "references" link type', () => {
      expect(isValidLinkType('project', 'specimen', 'references')).toBe(true)
      expect(isValidLinkType('log_entry', 'assumption', 'references')).toBe(true)
    })
  })

  describe('specific link type rules', () => {
    it('allows "documents" from log_entry to assumption', () => {
      expect(isValidLinkType('log_entry', 'assumption', 'documents')).toBe(true)
    })

    it('allows "contains" from log_entry to specimen', () => {
      expect(isValidLinkType('log_entry', 'specimen', 'contains')).toBe(true)
    })

    it('allows "demonstrates" from specimen to assumption', () => {
      expect(isValidLinkType('specimen', 'assumption', 'demonstrates')).toBe(true)
    })

    it('allows "tests" from experiment to hypothesis', () => {
      expect(isValidLinkType('experiment', 'hypothesis', 'tests')).toBe(true)
    })

    it('allows "validates" from experiment to assumption', () => {
      expect(isValidLinkType('experiment', 'assumption', 'validates')).toBe(true)
    })

    it('allows "contains" from gallery_sequence to specimen', () => {
      expect(isValidLinkType('gallery_sequence', 'specimen', 'contains')).toBe(true)
    })

    it('allows canvas_item to canvas_item FIT relationships', () => {
      expect(isValidLinkType('canvas_item', 'canvas_item', 'addresses_job')).toBe(true)
      expect(isValidLinkType('canvas_item', 'canvas_item', 'relieves_pain')).toBe(true)
      expect(isValidLinkType('canvas_item', 'canvas_item', 'creates_gain')).toBe(true)
    })
  })

  describe('bidirectional support', () => {
    it('supports reverse direction queries', () => {
      // log_entry -> assumption is defined, but we should also find it from assumption perspective
      expect(isValidLinkType('assumption', 'log_entry', 'documents')).toBe(true)
    })
  })

  describe('invalid link types', () => {
    it('rejects invalid link types not in rules', () => {
      expect(isValidLinkType('project', 'specimen', 'tests')).toBe(false)
      expect(isValidLinkType('gallery_sequence', 'specimen', 'documents')).toBe(false)
    })
  })
})

describe('getValidLinkTypes', () => {
  it('always includes default link types', () => {
    const types = getValidLinkTypes('project', 'specimen')
    expect(types).toContain('related')
    expect(types).toContain('references')
  })

  it('includes specific link types for defined pairs', () => {
    const types = getValidLinkTypes('log_entry', 'assumption')
    expect(types).toContain('documents')
    expect(types).toContain('related')
  })

  it('includes FIT types for canvas_item to canvas_item', () => {
    const types = getValidLinkTypes('canvas_item', 'canvas_item')
    expect(types).toContain('addresses_job')
    expect(types).toContain('relieves_pain')
    expect(types).toContain('creates_gain')
  })

  it('returns unique values', () => {
    const types = getValidLinkTypes('log_entry', 'assumption')
    const uniqueTypes = new Set(types)
    expect(types.length).toBe(uniqueTypes.size)
  })

  it('includes types from both directions for bidirectional support', () => {
    // specimen -> assumption has 'demonstrates' and 'validates'
    const typesForward = getValidLinkTypes('specimen', 'assumption')
    const typesReverse = getValidLinkTypes('assumption', 'specimen')

    // Both directions should include the same specific types
    expect(typesForward).toContain('demonstrates')
    expect(typesReverse).toContain('demonstrates')
  })
})

describe('validateLink', () => {
  it('does not throw for valid link types', () => {
    expect(() => validateLink('log_entry', 'assumption', 'documents')).not.toThrow()
    expect(() => validateLink('project', 'specimen', 'related')).not.toThrow()
    expect(() => validateLink('experiment', 'hypothesis', 'tests')).not.toThrow()
  })

  it('throws for invalid link types', () => {
    expect(() => validateLink('project', 'specimen', 'tests')).toThrow()
    expect(() => validateLink('gallery_sequence', 'specimen', 'documents')).toThrow()
  })

  it('includes valid types in error message', () => {
    try {
      validateLink('project', 'specimen', 'tests')
    } catch (error) {
      expect((error as Error).message).toContain('Invalid link type')
      expect((error as Error).message).toContain('related')
      expect((error as Error).message).toContain('contains')
    }
  })

  it('includes source and target types in error message', () => {
    try {
      validateLink('project', 'specimen', 'tests')
    } catch (error) {
      expect((error as Error).message).toContain('project')
      expect((error as Error).message).toContain('specimen')
    }
  })
})

describe('getSuggestedLinkTypes', () => {
  it('returns specific types first for defined pairs', () => {
    const types = getSuggestedLinkTypes('log_entry', 'assumption')
    // First types should be the specific ones
    expect(types[0]).toBe('documents')
  })

  it('returns defaults when no specific rules exist', () => {
    // A pair with no specific rules defined should get defaults
    // Using a pair that has no specific rules in VALID_LINK_TYPES
    const types = getSuggestedLinkTypes('gallery_sequence', 'project')
    expect(types).toContain('related')
    expect(types).toContain('references')
  })

  it('includes default types at the end', () => {
    const types = getSuggestedLinkTypes('log_entry', 'assumption')
    // Defaults should be at the end (after specific types)
    const relatedIndex = types.indexOf('related')
    const documentsIndex = types.indexOf('documents')
    expect(documentsIndex).toBeLessThan(relatedIndex)
  })
})

describe('getLinkPatternInfo', () => {
  describe('common patterns', () => {
    it('identifies log_entry to project as common', () => {
      const info = getLinkPatternInfo('log_entry', 'project')
      expect(info.isCommon).toBe(true)
      expect(info.description).toBeDefined()
    })

    it('identifies experiment to hypothesis as common', () => {
      const info = getLinkPatternInfo('experiment', 'hypothesis')
      expect(info.isCommon).toBe(true)
    })

    it('identifies canvas_item to canvas_item as common', () => {
      const info = getLinkPatternInfo('canvas_item', 'canvas_item')
      expect(info.isCommon).toBe(true)
    })

    it('identifies touchpoint to assumption as common', () => {
      const info = getLinkPatternInfo('touchpoint', 'assumption')
      expect(info.isCommon).toBe(true)
    })

    it('works bidirectionally', () => {
      // Check both directions return the same result
      const forward = getLinkPatternInfo('log_entry', 'project')
      const reverse = getLinkPatternInfo('project', 'log_entry')
      expect(forward.isCommon).toBe(reverse.isCommon)
    })
  })

  describe('uncommon patterns', () => {
    it('identifies uncommon patterns', () => {
      // This combination is not in COMMON_LINK_PATTERNS
      const info = getLinkPatternInfo('gallery_sequence', 'experiment')
      expect(info.isCommon).toBe(false)
    })

    it('provides suggestions for uncommon patterns', () => {
      const info = getLinkPatternInfo('gallery_sequence', 'hypothesis')
      expect(info.isCommon).toBe(false)
      // Suggestions array should exist (may or may not have content)
      expect(Array.isArray(info.suggestions)).toBe(true)
    })
  })
})
