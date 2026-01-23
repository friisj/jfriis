import { describe, it, expect } from 'vitest'
import {
  validateLayerName,
  validateLayerDescription,
  validateActivityName,
  validateActivityDescription,
  validateActivityGoal,
  LAYER_NAME_MAX_LENGTH,
  LAYER_DESCRIPTION_MAX_LENGTH,
  ACTIVITY_NAME_MAX_LENGTH,
  ACTIVITY_DESCRIPTION_MAX_LENGTH,
  ACTIVITY_GOAL_MAX_LENGTH,
} from './story-map-layers'

// ============================================================================
// Constants Tests
// ============================================================================

describe('Constants', () => {
  it('defines correct max lengths', () => {
    expect(LAYER_NAME_MAX_LENGTH).toBe(100)
    expect(LAYER_DESCRIPTION_MAX_LENGTH).toBe(500)
    expect(ACTIVITY_NAME_MAX_LENGTH).toBe(100)
    expect(ACTIVITY_DESCRIPTION_MAX_LENGTH).toBe(500)
    expect(ACTIVITY_GOAL_MAX_LENGTH).toBe(500)
  })
})

// ============================================================================
// validateLayerName Tests
// ============================================================================

describe('validateLayerName', () => {
  describe('valid names', () => {
    it('accepts a simple name', () => {
      const result = validateLayerName('Customer')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Customer')
      }
    })

    it('accepts a name with spaces', () => {
      const result = validateLayerName('Internal Agent')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Internal Agent')
      }
    })

    it('accepts a name at exactly max length', () => {
      const maxName = 'a'.repeat(LAYER_NAME_MAX_LENGTH)
      const result = validateLayerName(maxName)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(maxName)
        expect(result.data.length).toBe(LAYER_NAME_MAX_LENGTH)
      }
    })

    it('accepts a single character name', () => {
      const result = validateLayerName('X')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('X')
      }
    })
  })

  describe('whitespace handling', () => {
    it('trims leading whitespace', () => {
      const result = validateLayerName('  Customer')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Customer')
      }
    })

    it('trims trailing whitespace', () => {
      const result = validateLayerName('Customer  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Customer')
      }
    })

    it('trims both leading and trailing whitespace', () => {
      const result = validateLayerName('  Customer  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Customer')
      }
    })

    it('preserves internal whitespace', () => {
      const result = validateLayerName('Internal  Agent')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Internal  Agent')
      }
    })
  })

  describe('invalid names', () => {
    it('rejects empty string', () => {
      const result = validateLayerName('')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('required')
      }
    })

    it('rejects whitespace-only string', () => {
      const result = validateLayerName('   ')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('required')
      }
    })

    it('rejects name exceeding max length', () => {
      const tooLong = 'a'.repeat(LAYER_NAME_MAX_LENGTH + 1)
      const result = validateLayerName(tooLong)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain(`${LAYER_NAME_MAX_LENGTH}`)
        expect(result.error).toContain('characters')
      }
    })

    it('rejects significantly longer names', () => {
      const wayTooLong = 'a'.repeat(500)
      const result = validateLayerName(wayTooLong)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// validateLayerDescription Tests
// ============================================================================

describe('validateLayerDescription', () => {
  describe('valid descriptions', () => {
    it('accepts undefined', () => {
      const result = validateLayerDescription(undefined)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('accepts a simple description', () => {
      const result = validateLayerDescription('Actions performed by the customer')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Actions performed by the customer')
      }
    })

    it('accepts a description at exactly max length', () => {
      const maxDesc = 'a'.repeat(LAYER_DESCRIPTION_MAX_LENGTH)
      const result = validateLayerDescription(maxDesc)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(maxDesc)
        expect(result.data?.length).toBe(LAYER_DESCRIPTION_MAX_LENGTH)
      }
    })

    it('accepts multi-line descriptions', () => {
      const multiLine = 'Line 1\nLine 2\nLine 3'
      const result = validateLayerDescription(multiLine)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(multiLine)
      }
    })
  })

  describe('whitespace handling', () => {
    it('returns null for empty string', () => {
      const result = validateLayerDescription('')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('returns null for whitespace-only string', () => {
      const result = validateLayerDescription('   ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('trims leading and trailing whitespace', () => {
      const result = validateLayerDescription('  Description  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Description')
      }
    })
  })

  describe('invalid descriptions', () => {
    it('rejects description exceeding max length', () => {
      const tooLong = 'a'.repeat(LAYER_DESCRIPTION_MAX_LENGTH + 1)
      const result = validateLayerDescription(tooLong)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain(`${LAYER_DESCRIPTION_MAX_LENGTH}`)
        expect(result.error).toContain('characters')
      }
    })
  })
})

// ============================================================================
// validateActivityName Tests
// ============================================================================

describe('validateActivityName', () => {
  describe('valid names', () => {
    it('accepts a simple name', () => {
      const result = validateActivityName('Login')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Login')
      }
    })

    it('accepts a name with spaces', () => {
      const result = validateActivityName('Enter Credentials')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Enter Credentials')
      }
    })

    it('accepts a name at exactly max length', () => {
      const maxName = 'a'.repeat(ACTIVITY_NAME_MAX_LENGTH)
      const result = validateActivityName(maxName)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.length).toBe(ACTIVITY_NAME_MAX_LENGTH)
      }
    })
  })

  describe('whitespace handling', () => {
    it('trims whitespace', () => {
      const result = validateActivityName('  Login  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Login')
      }
    })
  })

  describe('invalid names', () => {
    it('rejects empty string', () => {
      const result = validateActivityName('')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('required')
      }
    })

    it('rejects whitespace-only string', () => {
      const result = validateActivityName('   ')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('required')
      }
    })

    it('rejects name exceeding max length', () => {
      const tooLong = 'a'.repeat(ACTIVITY_NAME_MAX_LENGTH + 1)
      const result = validateActivityName(tooLong)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain(`${ACTIVITY_NAME_MAX_LENGTH}`)
      }
    })
  })
})

// ============================================================================
// validateActivityDescription Tests
// ============================================================================

describe('validateActivityDescription', () => {
  describe('valid descriptions', () => {
    it('accepts undefined', () => {
      const result = validateActivityDescription(undefined)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('accepts a simple description', () => {
      const result = validateActivityDescription('User enters their username and password')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('User enters their username and password')
      }
    })

    it('accepts a description at exactly max length', () => {
      const maxDesc = 'a'.repeat(ACTIVITY_DESCRIPTION_MAX_LENGTH)
      const result = validateActivityDescription(maxDesc)
      expect(result.success).toBe(true)
    })
  })

  describe('whitespace handling', () => {
    it('returns null for empty string', () => {
      const result = validateActivityDescription('')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('returns null for whitespace-only string', () => {
      const result = validateActivityDescription('   ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('trims whitespace', () => {
      const result = validateActivityDescription('  Description  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Description')
      }
    })
  })

  describe('invalid descriptions', () => {
    it('rejects description exceeding max length', () => {
      const tooLong = 'a'.repeat(ACTIVITY_DESCRIPTION_MAX_LENGTH + 1)
      const result = validateActivityDescription(tooLong)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain(`${ACTIVITY_DESCRIPTION_MAX_LENGTH}`)
      }
    })
  })
})

// ============================================================================
// validateActivityGoal Tests
// ============================================================================

describe('validateActivityGoal', () => {
  describe('valid goals', () => {
    it('accepts undefined', () => {
      const result = validateActivityGoal(undefined)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('accepts a simple goal', () => {
      const result = validateActivityGoal('Authenticate to access account')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Authenticate to access account')
      }
    })

    it('accepts a goal at exactly max length', () => {
      const maxGoal = 'a'.repeat(ACTIVITY_GOAL_MAX_LENGTH)
      const result = validateActivityGoal(maxGoal)
      expect(result.success).toBe(true)
    })
  })

  describe('whitespace handling', () => {
    it('returns null for empty string', () => {
      const result = validateActivityGoal('')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('returns null for whitespace-only string', () => {
      const result = validateActivityGoal('   ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('trims whitespace', () => {
      const result = validateActivityGoal('  Goal  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Goal')
      }
    })
  })

  describe('invalid goals', () => {
    it('rejects goal exceeding max length', () => {
      const tooLong = 'a'.repeat(ACTIVITY_GOAL_MAX_LENGTH + 1)
      const result = validateActivityGoal(tooLong)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain(`${ACTIVITY_GOAL_MAX_LENGTH}`)
        expect(result.error).toContain('goal')
      }
    })
  })
})

// ============================================================================
// DataResult Type Tests (compile-time validation)
// ============================================================================

describe('DataResult type', () => {
  it('success result has data property', () => {
    const result = validateLayerName('Test')
    if (result.success) {
      // TypeScript ensures data exists when success is true
      expect(typeof result.data).toBe('string')
    }
  })

  it('error result has error property', () => {
    const result = validateLayerName('')
    if (!result.success) {
      // TypeScript ensures error exists when success is false
      expect(typeof result.error).toBe('string')
    }
  })
})
