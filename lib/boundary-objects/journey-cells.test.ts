import { describe, it, expect } from 'vitest'
import {
  // Constants
  JOURNEY_LAYER_TYPES,
  EMOTION_SCORE_MIN,
  EMOTION_SCORE_MAX,
  CHANNEL_TYPES,
  JOURNEY_LAYER_CONFIG,
  CELL_CONTENT_MAX_LENGTH,
  STAGE_NAME_MAX_LENGTH,
  STAGE_DESCRIPTION_MAX_LENGTH,
  TOUCHPOINT_NAME_MAX_LENGTH,
  TOUCHPOINT_DESCRIPTION_MAX_LENGTH,
  // Types
  type JourneyLayerType,
  type ChannelType,
  type JourneyCell,
  // Validation Functions
  validateJourneyLayerType,
  validateCellContent,
  validateStageName,
  validateStageDescription,
  validateEmotionScore,
  validateChannelType,
  validateTouchpointName,
  validateTouchpointDescription,
  // Helper Functions
  getOrderedJourneyLayers,
  getCellForStageLayer,
  buildJourneyCellsMap,
  getEmotionEmoji,
  getEmotionBgClass,
  sortStagesBySequence,
  createJourneyCellKey,
  parseJourneyCellKey,
} from './journey-cells'

// ============================================================================
// Constants Tests
// ============================================================================

describe('Constants', () => {
  describe('JOURNEY_LAYER_TYPES', () => {
    it('has exactly 5 layer types', () => {
      expect(JOURNEY_LAYER_TYPES).toHaveLength(5)
    })

    it('contains all standard journey layers', () => {
      expect(JOURNEY_LAYER_TYPES).toContain('touchpoint')
      expect(JOURNEY_LAYER_TYPES).toContain('emotion')
      expect(JOURNEY_LAYER_TYPES).toContain('pain_point')
      expect(JOURNEY_LAYER_TYPES).toContain('channel')
      expect(JOURNEY_LAYER_TYPES).toContain('opportunity')
    })

    it('layers are in correct order', () => {
      expect(JOURNEY_LAYER_TYPES[0]).toBe('touchpoint')
      expect(JOURNEY_LAYER_TYPES[1]).toBe('emotion')
      expect(JOURNEY_LAYER_TYPES[2]).toBe('pain_point')
      expect(JOURNEY_LAYER_TYPES[3]).toBe('channel')
      expect(JOURNEY_LAYER_TYPES[4]).toBe('opportunity')
    })
  })

  describe('EMOTION_SCORE bounds', () => {
    it('has correct min and max', () => {
      expect(EMOTION_SCORE_MIN).toBe(-5)
      expect(EMOTION_SCORE_MAX).toBe(5)
    })

    it('range is symmetric around 0', () => {
      expect(Math.abs(EMOTION_SCORE_MIN)).toBe(EMOTION_SCORE_MAX)
    })
  })

  describe('CHANNEL_TYPES', () => {
    it('has 10 channel types', () => {
      expect(CHANNEL_TYPES).toHaveLength(10)
    })

    it('contains common channels', () => {
      expect(CHANNEL_TYPES).toContain('email')
      expect(CHANNEL_TYPES).toContain('phone')
      expect(CHANNEL_TYPES).toContain('web')
      expect(CHANNEL_TYPES).toContain('mobile_app')
      expect(CHANNEL_TYPES).toContain('chat')
      expect(CHANNEL_TYPES).toContain('in_person')
      expect(CHANNEL_TYPES).toContain('social_media')
      expect(CHANNEL_TYPES).toContain('mail')
      expect(CHANNEL_TYPES).toContain('self_service')
      expect(CHANNEL_TYPES).toContain('other')
    })
  })

  describe('JOURNEY_LAYER_CONFIG', () => {
    it('has config for all layer types', () => {
      for (const layer of JOURNEY_LAYER_TYPES) {
        expect(JOURNEY_LAYER_CONFIG[layer]).toBeDefined()
      }
    })

    it('each config has name, color, and description', () => {
      for (const layer of JOURNEY_LAYER_TYPES) {
        const config = JOURNEY_LAYER_CONFIG[layer]
        expect(typeof config.name).toBe('string')
        expect(config.name.length).toBeGreaterThan(0)
        expect(typeof config.color).toBe('string')
        expect(config.color.length).toBeGreaterThan(0)
        expect(typeof config.description).toBe('string')
        expect(config.description.length).toBeGreaterThan(0)
      }
    })

    it('touchpoint has correct config', () => {
      expect(JOURNEY_LAYER_CONFIG.touchpoint.name).toBe('Touchpoints')
      expect(JOURNEY_LAYER_CONFIG.touchpoint.color).toBe('blue')
    })

    it('emotion has correct config', () => {
      expect(JOURNEY_LAYER_CONFIG.emotion.name).toBe('Emotions')
      expect(JOURNEY_LAYER_CONFIG.emotion.color).toBe('pink')
    })
  })

  describe('Length limits', () => {
    it('has reasonable max lengths', () => {
      expect(CELL_CONTENT_MAX_LENGTH).toBe(2000)
      expect(STAGE_NAME_MAX_LENGTH).toBe(100)
      expect(STAGE_DESCRIPTION_MAX_LENGTH).toBe(1000)
      expect(TOUCHPOINT_NAME_MAX_LENGTH).toBe(200)
      expect(TOUCHPOINT_DESCRIPTION_MAX_LENGTH).toBe(1000)
    })
  })
})

// ============================================================================
// validateJourneyLayerType Tests
// ============================================================================

describe('validateJourneyLayerType', () => {
  describe('valid layer types', () => {
    it.each(JOURNEY_LAYER_TYPES)('returns success for %s', (layer) => {
      const result = validateJourneyLayerType(layer)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(layer)
      }
    })
  })

  describe('invalid layer types', () => {
    it('rejects empty string', () => {
      const result = validateJourneyLayerType('')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid layer type')
      }
    })

    it('rejects unknown layer type', () => {
      const result = validateJourneyLayerType('unknown_layer')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('unknown_layer')
      }
    })

    it('rejects similar but incorrect names', () => {
      const result = validateJourneyLayerType('touchpoints') // plural
      expect(result.success).toBe(false)
    })

    it('rejects case variations', () => {
      const result = validateJourneyLayerType('EMOTION')
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// validateCellContent Tests
// ============================================================================

describe('validateCellContent', () => {
  describe('valid content', () => {
    it('returns null for undefined', () => {
      const result = validateCellContent(undefined)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('returns null for null', () => {
      const result = validateCellContent(null)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('returns null for empty string', () => {
      const result = validateCellContent('')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('accepts valid content', () => {
      const result = validateCellContent('User searches for product')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('User searches for product')
      }
    })

    it('accepts content at exactly max length', () => {
      const content = 'a'.repeat(CELL_CONTENT_MAX_LENGTH)
      const result = validateCellContent(content)
      expect(result.success).toBe(true)
    })
  })

  describe('whitespace handling', () => {
    it('trims leading and trailing whitespace', () => {
      const result = validateCellContent('  content  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('content')
      }
    })

    it('returns null for whitespace-only content', () => {
      const result = validateCellContent('   ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })
  })

  describe('length validation', () => {
    it('rejects content exceeding max length', () => {
      const content = 'a'.repeat(CELL_CONTENT_MAX_LENGTH + 1)
      const result = validateCellContent(content)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain(`${CELL_CONTENT_MAX_LENGTH}`)
      }
    })
  })

  describe('XSS prevention', () => {
    it('rejects HTML tags', () => {
      const result = validateCellContent('<script>alert("xss")</script>')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('HTML tags')
      }
    })

    it('rejects javascript: protocol', () => {
      const result = validateCellContent('javascript:alert(1)')
      expect(result.success).toBe(false)
    })

    it('rejects event handlers', () => {
      const result = validateCellContent('onclick=alert(1)')
      expect(result.success).toBe(false)
    })

    it('rejects data: protocol', () => {
      const result = validateCellContent('data:text/html,<script>')
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// validateStageName Tests
// ============================================================================

describe('validateStageName', () => {
  describe('valid names', () => {
    it('accepts a simple name', () => {
      const result = validateStageName('Awareness')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Awareness')
      }
    })

    it('accepts a name with spaces', () => {
      const result = validateStageName('Purchase Decision')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Purchase Decision')
      }
    })

    it('accepts a name at exactly max length', () => {
      const name = 'a'.repeat(STAGE_NAME_MAX_LENGTH)
      const result = validateStageName(name)
      expect(result.success).toBe(true)
    })
  })

  describe('whitespace handling', () => {
    it('trims whitespace', () => {
      const result = validateStageName('  Awareness  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Awareness')
      }
    })
  })

  describe('invalid names', () => {
    it('rejects empty string', () => {
      const result = validateStageName('')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('required')
      }
    })

    it('rejects whitespace-only string', () => {
      const result = validateStageName('   ')
      expect(result.success).toBe(false)
    })

    it('rejects name exceeding max length', () => {
      const name = 'a'.repeat(STAGE_NAME_MAX_LENGTH + 1)
      const result = validateStageName(name)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain(`${STAGE_NAME_MAX_LENGTH}`)
      }
    })
  })

  describe('XSS prevention', () => {
    it('rejects HTML tags', () => {
      const result = validateStageName('<b>Bold</b>')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('HTML tags')
      }
    })
  })
})

// ============================================================================
// validateStageDescription Tests
// ============================================================================

describe('validateStageDescription', () => {
  describe('valid descriptions', () => {
    it('returns null for undefined', () => {
      const result = validateStageDescription(undefined)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('returns null for null', () => {
      const result = validateStageDescription(null)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('accepts valid description', () => {
      const result = validateStageDescription('Customer becomes aware of the problem')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Customer becomes aware of the problem')
      }
    })

    it('accepts description at exactly max length', () => {
      const desc = 'a'.repeat(STAGE_DESCRIPTION_MAX_LENGTH)
      const result = validateStageDescription(desc)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid descriptions', () => {
    it('rejects description exceeding max length', () => {
      const desc = 'a'.repeat(STAGE_DESCRIPTION_MAX_LENGTH + 1)
      const result = validateStageDescription(desc)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain(`${STAGE_DESCRIPTION_MAX_LENGTH}`)
      }
    })
  })

  describe('XSS prevention', () => {
    it('rejects HTML tags', () => {
      const result = validateStageDescription('<div>content</div>')
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// validateEmotionScore Tests
// ============================================================================

describe('validateEmotionScore', () => {
  describe('valid scores', () => {
    it('returns null for undefined', () => {
      const result = validateEmotionScore(undefined)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('returns null for null', () => {
      const result = validateEmotionScore(null)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('accepts minimum score', () => {
      const result = validateEmotionScore(EMOTION_SCORE_MIN)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(-5)
      }
    })

    it('accepts maximum score', () => {
      const result = validateEmotionScore(EMOTION_SCORE_MAX)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(5)
      }
    })

    it('accepts zero', () => {
      const result = validateEmotionScore(0)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(0)
      }
    })

    it('accepts positive scores', () => {
      const result = validateEmotionScore(3)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(3)
      }
    })

    it('accepts negative scores', () => {
      const result = validateEmotionScore(-2)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(-2)
      }
    })
  })

  describe('invalid scores', () => {
    it('rejects score below minimum', () => {
      const result = validateEmotionScore(-6)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain(`${EMOTION_SCORE_MIN}`)
        expect(result.error).toContain(`${EMOTION_SCORE_MAX}`)
      }
    })

    it('rejects score above maximum', () => {
      const result = validateEmotionScore(6)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain(`${EMOTION_SCORE_MIN}`)
        expect(result.error).toContain(`${EMOTION_SCORE_MAX}`)
      }
    })

    it('rejects non-integer (decimal)', () => {
      const result = validateEmotionScore(2.5)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('whole number')
      }
    })

    it('rejects very large positive number', () => {
      const result = validateEmotionScore(100)
      expect(result.success).toBe(false)
    })

    it('rejects very large negative number', () => {
      const result = validateEmotionScore(-100)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// validateChannelType Tests
// ============================================================================

describe('validateChannelType', () => {
  describe('valid channel types', () => {
    it('returns null for undefined', () => {
      const result = validateChannelType(undefined)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('returns null for null', () => {
      const result = validateChannelType(null)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('accepts predefined channel types', () => {
      for (const channel of CHANNEL_TYPES) {
        const result = validateChannelType(channel)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(channel)
        }
      }
    })

    it('accepts custom channel type (flexibility)', () => {
      const result = validateChannelType('custom_channel')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('custom_channel')
      }
    })
  })

  describe('whitespace handling', () => {
    it('trims whitespace', () => {
      const result = validateChannelType('  email  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('email')
      }
    })

    it('returns null for whitespace-only', () => {
      const result = validateChannelType('   ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })
  })

  describe('invalid channel types', () => {
    it('rejects channel type exceeding max length', () => {
      const channel = 'a'.repeat(51)
      const result = validateChannelType(channel)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('50')
      }
    })
  })

  describe('XSS prevention', () => {
    it('rejects HTML tags', () => {
      const result = validateChannelType('<script>x</script>')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('HTML tags')
      }
    })
  })
})

// ============================================================================
// validateTouchpointName Tests
// ============================================================================

describe('validateTouchpointName', () => {
  describe('valid names', () => {
    it('accepts a simple name', () => {
      const result = validateTouchpointName('Product Search')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Product Search')
      }
    })

    it('accepts a name at exactly max length', () => {
      const name = 'a'.repeat(TOUCHPOINT_NAME_MAX_LENGTH)
      const result = validateTouchpointName(name)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid names', () => {
    it('rejects undefined', () => {
      const result = validateTouchpointName(undefined)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('required')
      }
    })

    it('rejects null', () => {
      const result = validateTouchpointName(null)
      expect(result.success).toBe(false)
    })

    it('rejects empty string', () => {
      const result = validateTouchpointName('')
      expect(result.success).toBe(false)
    })

    it('rejects whitespace-only', () => {
      const result = validateTouchpointName('   ')
      expect(result.success).toBe(false)
    })

    it('rejects name exceeding max length', () => {
      const name = 'a'.repeat(TOUCHPOINT_NAME_MAX_LENGTH + 1)
      const result = validateTouchpointName(name)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain(`${TOUCHPOINT_NAME_MAX_LENGTH}`)
      }
    })
  })

  describe('XSS prevention', () => {
    it('rejects HTML tags', () => {
      const result = validateTouchpointName('<b>Search</b>')
      expect(result.success).toBe(false)
    })

    it('rejects javascript: protocol', () => {
      const result = validateTouchpointName('javascript:alert(1)')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('invalid characters')
      }
    })

    it('rejects event handlers', () => {
      const result = validateTouchpointName('onclick=malicious()')
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// validateTouchpointDescription Tests
// ============================================================================

describe('validateTouchpointDescription', () => {
  describe('valid descriptions', () => {
    it('returns null for undefined', () => {
      const result = validateTouchpointDescription(undefined)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('returns null for null', () => {
      const result = validateTouchpointDescription(null)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('accepts valid description', () => {
      const result = validateTouchpointDescription('User searches for products on the website')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('User searches for products on the website')
      }
    })

    it('accepts description at exactly max length', () => {
      const desc = 'a'.repeat(TOUCHPOINT_DESCRIPTION_MAX_LENGTH)
      const result = validateTouchpointDescription(desc)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid descriptions', () => {
    it('rejects description exceeding max length', () => {
      const desc = 'a'.repeat(TOUCHPOINT_DESCRIPTION_MAX_LENGTH + 1)
      const result = validateTouchpointDescription(desc)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain(`${TOUCHPOINT_DESCRIPTION_MAX_LENGTH}`)
      }
    })
  })

  describe('XSS prevention', () => {
    it('rejects HTML tags', () => {
      const result = validateTouchpointDescription('<script>x</script>')
      expect(result.success).toBe(false)
    })

    it('rejects javascript: protocol', () => {
      const result = validateTouchpointDescription('javascript:alert(1)')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('invalid characters')
      }
    })
  })
})

// ============================================================================
// getOrderedJourneyLayers Tests
// ============================================================================

describe('getOrderedJourneyLayers', () => {
  it('returns all layer types', () => {
    const layers = getOrderedJourneyLayers()
    expect(layers).toHaveLength(5)
  })

  it('returns layers in correct order', () => {
    const layers = getOrderedJourneyLayers()
    expect(layers[0]).toBe('touchpoint')
    expect(layers[1]).toBe('emotion')
    expect(layers[2]).toBe('pain_point')
    expect(layers[3]).toBe('channel')
    expect(layers[4]).toBe('opportunity')
  })

  it('returns a new array (not the original)', () => {
    const layers1 = getOrderedJourneyLayers()
    const layers2 = getOrderedJourneyLayers()
    expect(layers1).not.toBe(layers2)
    expect(layers1).toEqual(layers2)
  })

  it('does not allow mutation of original', () => {
    const layers = getOrderedJourneyLayers()
    layers[0] = 'modified' as JourneyLayerType
    const freshLayers = getOrderedJourneyLayers()
    expect(freshLayers[0]).toBe('touchpoint')
  })
})

// ============================================================================
// getCellForStageLayer Tests
// ============================================================================

describe('getCellForStageLayer', () => {
  const mockCells: JourneyCell[] = [
    {
      id: 'cell-1',
      stage_id: 'stage-1',
      layer_type: 'touchpoint',
      content: 'Search products',
      emotion_score: null,
      channel_type: 'web',
      sequence: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'cell-2',
      stage_id: 'stage-1',
      layer_type: 'emotion',
      content: null,
      emotion_score: 3,
      channel_type: null,
      sequence: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'cell-3',
      stage_id: 'stage-2',
      layer_type: 'touchpoint',
      content: 'Add to cart',
      emotion_score: null,
      channel_type: 'web',
      sequence: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  it('finds cell for matching stage and layer', () => {
    const cell = getCellForStageLayer(mockCells, 'stage-1', 'touchpoint')
    expect(cell).toBeDefined()
    expect(cell?.id).toBe('cell-1')
    expect(cell?.content).toBe('Search products')
  })

  it('finds different cell for same stage, different layer', () => {
    const cell = getCellForStageLayer(mockCells, 'stage-1', 'emotion')
    expect(cell).toBeDefined()
    expect(cell?.id).toBe('cell-2')
    expect(cell?.emotion_score).toBe(3)
  })

  it('finds cell for different stage', () => {
    const cell = getCellForStageLayer(mockCells, 'stage-2', 'touchpoint')
    expect(cell).toBeDefined()
    expect(cell?.id).toBe('cell-3')
  })

  it('returns undefined for non-existent stage', () => {
    const cell = getCellForStageLayer(mockCells, 'stage-99', 'touchpoint')
    expect(cell).toBeUndefined()
  })

  it('returns undefined for non-existent layer on existing stage', () => {
    const cell = getCellForStageLayer(mockCells, 'stage-1', 'pain_point')
    expect(cell).toBeUndefined()
  })

  it('returns undefined for empty cells array', () => {
    const cell = getCellForStageLayer([], 'stage-1', 'touchpoint')
    expect(cell).toBeUndefined()
  })
})

// ============================================================================
// buildJourneyCellsMap Tests
// ============================================================================

describe('buildJourneyCellsMap', () => {
  const mockCells: JourneyCell[] = [
    {
      id: 'cell-1',
      stage_id: 'stage-1',
      layer_type: 'touchpoint',
      content: 'Content 1',
      emotion_score: null,
      channel_type: null,
      sequence: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'cell-2',
      stage_id: 'stage-1',
      layer_type: 'emotion',
      content: null,
      emotion_score: 2,
      channel_type: null,
      sequence: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'cell-3',
      stage_id: 'stage-2',
      layer_type: 'pain_point',
      content: 'Pain content',
      emotion_score: null,
      channel_type: null,
      sequence: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  it('creates a nested map structure', () => {
    const map = buildJourneyCellsMap(mockCells)
    expect(map).toBeInstanceOf(Map)
    expect(map.size).toBe(2) // 2 unique stage IDs
  })

  it('allows O(1) lookup by stage and layer', () => {
    const map = buildJourneyCellsMap(mockCells)
    const cell = map.get('stage-1')?.get('touchpoint')
    expect(cell).toBeDefined()
    expect(cell?.id).toBe('cell-1')
  })

  it('handles multiple layers per stage', () => {
    const map = buildJourneyCellsMap(mockCells)
    const stageMap = map.get('stage-1')
    expect(stageMap?.size).toBe(2)
    expect(stageMap?.get('touchpoint')?.id).toBe('cell-1')
    expect(stageMap?.get('emotion')?.id).toBe('cell-2')
  })

  it('returns empty map for empty cells array', () => {
    const map = buildJourneyCellsMap([])
    expect(map.size).toBe(0)
  })

  it('returns undefined for non-existent stage', () => {
    const map = buildJourneyCellsMap(mockCells)
    expect(map.get('non-existent')).toBeUndefined()
  })

  it('returns undefined for non-existent layer on existing stage', () => {
    const map = buildJourneyCellsMap(mockCells)
    expect(map.get('stage-1')?.get('opportunity')).toBeUndefined()
  })
})

// ============================================================================
// getEmotionEmoji Tests
// ============================================================================

describe('getEmotionEmoji', () => {
  describe('positive emotions', () => {
    it('returns 😄 for score >= 4', () => {
      expect(getEmotionEmoji(4)).toBe('😄')
      expect(getEmotionEmoji(5)).toBe('😄')
    })

    it('returns 🙂 for score >= 2 and < 4', () => {
      expect(getEmotionEmoji(2)).toBe('🙂')
      expect(getEmotionEmoji(3)).toBe('🙂')
    })
  })

  describe('neutral emotions', () => {
    it('returns 😐 for score >= -1 and < 2', () => {
      expect(getEmotionEmoji(-1)).toBe('😐')
      expect(getEmotionEmoji(0)).toBe('😐')
      expect(getEmotionEmoji(1)).toBe('😐')
    })

    it('returns 😐 for null', () => {
      expect(getEmotionEmoji(null)).toBe('😐')
    })
  })

  describe('negative emotions', () => {
    it('returns 😟 for score >= -3 and < -1', () => {
      expect(getEmotionEmoji(-2)).toBe('😟')
      expect(getEmotionEmoji(-3)).toBe('😟')
    })

    it('returns 😢 for score < -3', () => {
      expect(getEmotionEmoji(-4)).toBe('😢')
      expect(getEmotionEmoji(-5)).toBe('😢')
    })
  })
})

// ============================================================================
// getEmotionBgClass Tests
// ============================================================================

describe('getEmotionBgClass', () => {
  describe('positive scores', () => {
    it('returns bg-green-100 for score >= 4', () => {
      expect(getEmotionBgClass(4)).toBe('bg-green-100')
      expect(getEmotionBgClass(5)).toBe('bg-green-100')
    })

    it('returns bg-green-50 for score >= 2 and < 4', () => {
      expect(getEmotionBgClass(2)).toBe('bg-green-50')
      expect(getEmotionBgClass(3)).toBe('bg-green-50')
    })
  })

  describe('neutral scores', () => {
    it('returns bg-gray-50 for score >= -1 and < 2', () => {
      expect(getEmotionBgClass(-1)).toBe('bg-gray-50')
      expect(getEmotionBgClass(0)).toBe('bg-gray-50')
      expect(getEmotionBgClass(1)).toBe('bg-gray-50')
    })

    it('returns bg-gray-50 for null', () => {
      expect(getEmotionBgClass(null)).toBe('bg-gray-50')
    })
  })

  describe('negative scores', () => {
    it('returns bg-orange-50 for score >= -3 and < -1', () => {
      expect(getEmotionBgClass(-2)).toBe('bg-orange-50')
      expect(getEmotionBgClass(-3)).toBe('bg-orange-50')
    })

    it('returns bg-red-100 for score < -3', () => {
      expect(getEmotionBgClass(-4)).toBe('bg-red-100')
      expect(getEmotionBgClass(-5)).toBe('bg-red-100')
    })
  })
})

// ============================================================================
// sortStagesBySequence Tests
// ============================================================================

describe('sortStagesBySequence', () => {
  it('sorts stages in ascending order', () => {
    const stages = [
      { id: 'a', sequence: 2 },
      { id: 'b', sequence: 0 },
      { id: 'c', sequence: 1 },
    ]
    const sorted = sortStagesBySequence(stages)
    expect(sorted[0].id).toBe('b')
    expect(sorted[1].id).toBe('c')
    expect(sorted[2].id).toBe('a')
  })

  it('returns new array (does not mutate input)', () => {
    const stages = [
      { id: 'a', sequence: 2 },
      { id: 'b', sequence: 0 },
    ]
    const sorted = sortStagesBySequence(stages)
    expect(sorted).not.toBe(stages)
    expect(stages[0].sequence).toBe(2) // Original unchanged
  })

  it('handles empty array', () => {
    const sorted = sortStagesBySequence([])
    expect(sorted).toEqual([])
  })

  it('handles single item', () => {
    const stages = [{ id: 'a', sequence: 5 }]
    const sorted = sortStagesBySequence(stages)
    expect(sorted).toHaveLength(1)
    expect(sorted[0].id).toBe('a')
  })

  it('preserves additional properties', () => {
    const stages = [
      { id: 'a', sequence: 1, name: 'Stage A' },
      { id: 'b', sequence: 0, name: 'Stage B' },
    ]
    const sorted = sortStagesBySequence(stages)
    expect(sorted[0].name).toBe('Stage B')
    expect(sorted[1].name).toBe('Stage A')
  })
})

// ============================================================================
// createJourneyCellKey Tests
// ============================================================================

describe('createJourneyCellKey', () => {
  it('creates key in expected format', () => {
    const key = createJourneyCellKey('stage-123', 'emotion')
    expect(key).toBe('stage-123:emotion')
  })

  it('works with all layer types', () => {
    for (const layer of JOURNEY_LAYER_TYPES) {
      const key = createJourneyCellKey('stage-1', layer)
      expect(key).toBe(`stage-1:${layer}`)
    }
  })

  it('handles UUID-style stage IDs', () => {
    const key = createJourneyCellKey('550e8400-e29b-41d4-a716-446655440000', 'pain_point')
    expect(key).toBe('550e8400-e29b-41d4-a716-446655440000:pain_point')
  })
})

// ============================================================================
// parseJourneyCellKey Tests
// ============================================================================

describe('parseJourneyCellKey', () => {
  it('parses valid key', () => {
    const result = parseJourneyCellKey('stage-123:emotion')
    expect(result).not.toBeNull()
    expect(result?.stageId).toBe('stage-123')
    expect(result?.layerType).toBe('emotion')
  })

  it('parses keys with all layer types', () => {
    for (const layer of JOURNEY_LAYER_TYPES) {
      const result = parseJourneyCellKey(`stage-1:${layer}`)
      expect(result).not.toBeNull()
      expect(result?.layerType).toBe(layer)
    }
  })

  it('handles UUID-style stage IDs', () => {
    const result = parseJourneyCellKey('550e8400-e29b-41d4-a716-446655440000:pain_point')
    expect(result).not.toBeNull()
    expect(result?.stageId).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('returns null for invalid format (no colon)', () => {
    const result = parseJourneyCellKey('stage-123-emotion')
    expect(result).toBeNull()
  })

  it('returns null for invalid layer type', () => {
    const result = parseJourneyCellKey('stage-123:invalid_layer')
    expect(result).toBeNull()
  })

  it('returns null for empty string', () => {
    const result = parseJourneyCellKey('')
    expect(result).toBeNull()
  })

  it('returns null for key with empty stage ID', () => {
    const result = parseJourneyCellKey(':emotion')
    expect(result).toBeNull()
  })

  it('returns null for key with empty layer type', () => {
    const result = parseJourneyCellKey('stage-123:')
    expect(result).toBeNull()
  })
})

// ============================================================================
// Type Safety Tests (compile-time validation)
// ============================================================================

describe('Type Safety', () => {
  it('JourneyLayerType includes all layer types', () => {
    const types: JourneyLayerType[] = [
      'touchpoint',
      'emotion',
      'pain_point',
      'channel',
      'opportunity',
    ]
    expect(types).toHaveLength(5)
  })

  it('ChannelType includes all channel types', () => {
    const channels: ChannelType[] = [
      'email',
      'phone',
      'web',
      'mobile_app',
      'chat',
      'in_person',
      'social_media',
      'mail',
      'self_service',
      'other',
    ]
    expect(channels).toHaveLength(10)
  })
})
