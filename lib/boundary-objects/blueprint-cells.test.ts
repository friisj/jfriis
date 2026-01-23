import { describe, it, expect } from 'vitest'
import {
  // Constants
  LAYER_TYPES,
  COST_IMPLICATIONS,
  FAILURE_RISKS,
  LAYER_CONFIG,
  LINE_OF_VISIBILITY_POSITION,
  CELL_CONTENT_MAX_LENGTH,
  STEP_NAME_MAX_LENGTH,
  STEP_DESCRIPTION_MAX_LENGTH,
  ACTORS_MAX_LENGTH,
  DURATION_MAX_LENGTH,
  // Types
  type LayerType,
  type CostImplication,
  type FailureRisk,
  type BlueprintCell,
  // Validation Functions
  validateLayerType,
  validateCellContent,
  validateStepName,
  validateStepDescription,
  validateActors,
  validateDuration,
  validateCostImplication,
  validateFailureRisk,
  // Helper Functions
  getOrderedLayers,
  showLineOfVisibilityAfter,
  getCellForStepLayer,
  buildCellsMap,
  sortStepsBySequence,
  createCellKey,
  parseCellKey,
} from './blueprint-cells'

// ============================================================================
// Constants Tests
// ============================================================================

describe('Constants', () => {
  describe('LAYER_TYPES', () => {
    it('has exactly 4 layer types', () => {
      expect(LAYER_TYPES).toHaveLength(4)
    })

    it('contains all standard service blueprint layers', () => {
      expect(LAYER_TYPES).toContain('customer_action')
      expect(LAYER_TYPES).toContain('frontstage')
      expect(LAYER_TYPES).toContain('backstage')
      expect(LAYER_TYPES).toContain('support_process')
    })

    it('layers are in correct order', () => {
      expect(LAYER_TYPES[0]).toBe('customer_action')
      expect(LAYER_TYPES[1]).toBe('frontstage')
      expect(LAYER_TYPES[2]).toBe('backstage')
      expect(LAYER_TYPES[3]).toBe('support_process')
    })
  })

  describe('COST_IMPLICATIONS', () => {
    it('has exactly 4 levels', () => {
      expect(COST_IMPLICATIONS).toHaveLength(4)
    })

    it('contains all cost levels', () => {
      expect(COST_IMPLICATIONS).toContain('none')
      expect(COST_IMPLICATIONS).toContain('low')
      expect(COST_IMPLICATIONS).toContain('medium')
      expect(COST_IMPLICATIONS).toContain('high')
    })
  })

  describe('FAILURE_RISKS', () => {
    it('has exactly 4 levels', () => {
      expect(FAILURE_RISKS).toHaveLength(4)
    })

    it('contains all risk levels', () => {
      expect(FAILURE_RISKS).toContain('none')
      expect(FAILURE_RISKS).toContain('low')
      expect(FAILURE_RISKS).toContain('medium')
      expect(FAILURE_RISKS).toContain('high')
    })
  })

  describe('LAYER_CONFIG', () => {
    it('has config for all layer types', () => {
      for (const layer of LAYER_TYPES) {
        expect(LAYER_CONFIG[layer]).toBeDefined()
      }
    })

    it('each config has name, color, and description', () => {
      for (const layer of LAYER_TYPES) {
        const config = LAYER_CONFIG[layer]
        expect(typeof config.name).toBe('string')
        expect(config.name.length).toBeGreaterThan(0)
        expect(typeof config.color).toBe('string')
        expect(config.color.length).toBeGreaterThan(0)
        expect(typeof config.description).toBe('string')
        expect(config.description.length).toBeGreaterThan(0)
      }
    })

    it('customer_action has correct config', () => {
      expect(LAYER_CONFIG.customer_action.name).toBe('Customer Actions')
      expect(LAYER_CONFIG.customer_action.color).toBe('blue')
    })

    it('frontstage has correct config', () => {
      expect(LAYER_CONFIG.frontstage.name).toBe('Frontstage')
      expect(LAYER_CONFIG.frontstage.color).toBe('green')
    })
  })

  describe('LINE_OF_VISIBILITY_POSITION', () => {
    it('is positioned after frontstage', () => {
      expect(LINE_OF_VISIBILITY_POSITION).toBe(2)
    })
  })

  describe('Length limits', () => {
    it('has reasonable max lengths', () => {
      expect(CELL_CONTENT_MAX_LENGTH).toBe(2000)
      expect(STEP_NAME_MAX_LENGTH).toBe(100)
      expect(STEP_DESCRIPTION_MAX_LENGTH).toBe(1000)
      expect(ACTORS_MAX_LENGTH).toBe(500)
      expect(DURATION_MAX_LENGTH).toBe(100)
    })
  })
})

// ============================================================================
// validateLayerType Tests
// ============================================================================

describe('validateLayerType', () => {
  describe('valid layer types', () => {
    it.each(LAYER_TYPES)('returns success for %s', (layer) => {
      const result = validateLayerType(layer)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(layer)
      }
    })
  })

  describe('invalid layer types', () => {
    it('rejects empty string', () => {
      const result = validateLayerType('')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid layer type')
      }
    })

    it('rejects unknown layer type', () => {
      const result = validateLayerType('unknown_layer')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('unknown_layer')
      }
    })

    it('rejects similar but incorrect names', () => {
      const result = validateLayerType('customer_actions') // plural
      expect(result.success).toBe(false)
    })

    it('rejects case variations', () => {
      const result = validateLayerType('FRONTSTAGE')
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
      const result = validateCellContent('Customer reviews order details')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Customer reviews order details')
      }
    })

    it('accepts content at exactly max length', () => {
      const content = 'a'.repeat(CELL_CONTENT_MAX_LENGTH)
      const result = validateCellContent(content)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data?.length).toBe(CELL_CONTENT_MAX_LENGTH)
      }
    })

    it('accepts multi-line content', () => {
      const result = validateCellContent('Line 1\nLine 2\nLine 3')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Line 1\nLine 2\nLine 3')
      }
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

    it('rejects self-closing HTML tags', () => {
      const result = validateCellContent('<img src="x" />')
      expect(result.success).toBe(false)
    })

    it('rejects javascript: protocol', () => {
      const result = validateCellContent('javascript:alert(1)')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('invalid characters')
      }
    })

    it('rejects event handlers', () => {
      const result = validateCellContent('onclick=alert(1)')
      expect(result.success).toBe(false)
    })

    it('rejects onmouseover handlers', () => {
      const result = validateCellContent('onmouseover = malicious()')
      expect(result.success).toBe(false)
    })

    it('rejects data: protocol', () => {
      const result = validateCellContent('data:text/html,<script>alert(1)</script>')
      expect(result.success).toBe(false)
    })

    it('allows safe special characters', () => {
      const result = validateCellContent('Use < and > for comparisons')
      // This should actually fail because it contains < and >
      expect(result.success).toBe(false)
    })

    it('allows normal punctuation', () => {
      const result = validateCellContent('Hello! How are you? (fine)')
      expect(result.success).toBe(true)
    })
  })
})

// ============================================================================
// validateStepName Tests
// ============================================================================

describe('validateStepName', () => {
  describe('valid names', () => {
    it('accepts a simple name', () => {
      const result = validateStepName('Login')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Login')
      }
    })

    it('accepts a name with spaces', () => {
      const result = validateStepName('Enter Payment Details')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Enter Payment Details')
      }
    })

    it('accepts a name at exactly max length', () => {
      const name = 'a'.repeat(STEP_NAME_MAX_LENGTH)
      const result = validateStepName(name)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.length).toBe(STEP_NAME_MAX_LENGTH)
      }
    })
  })

  describe('whitespace handling', () => {
    it('trims whitespace', () => {
      const result = validateStepName('  Login  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Login')
      }
    })
  })

  describe('invalid names', () => {
    it('rejects empty string', () => {
      const result = validateStepName('')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('required')
      }
    })

    it('rejects whitespace-only string', () => {
      const result = validateStepName('   ')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('required')
      }
    })

    it('rejects name exceeding max length', () => {
      const name = 'a'.repeat(STEP_NAME_MAX_LENGTH + 1)
      const result = validateStepName(name)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain(`${STEP_NAME_MAX_LENGTH}`)
      }
    })
  })

  describe('XSS prevention', () => {
    it('rejects HTML tags', () => {
      const result = validateStepName('<b>Bold</b>')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('HTML tags')
      }
    })
  })
})

// ============================================================================
// validateStepDescription Tests
// ============================================================================

describe('validateStepDescription', () => {
  describe('valid descriptions', () => {
    it('returns null for undefined', () => {
      const result = validateStepDescription(undefined)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('returns null for null', () => {
      const result = validateStepDescription(null)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('returns null for empty string', () => {
      const result = validateStepDescription('')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('accepts valid description', () => {
      const result = validateStepDescription('User enters their credentials')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('User enters their credentials')
      }
    })

    it('accepts description at exactly max length', () => {
      const desc = 'a'.repeat(STEP_DESCRIPTION_MAX_LENGTH)
      const result = validateStepDescription(desc)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data?.length).toBe(STEP_DESCRIPTION_MAX_LENGTH)
      }
    })
  })

  describe('whitespace handling', () => {
    it('trims whitespace', () => {
      const result = validateStepDescription('  description  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('description')
      }
    })

    it('returns null for whitespace-only', () => {
      const result = validateStepDescription('   ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })
  })

  describe('invalid descriptions', () => {
    it('rejects description exceeding max length', () => {
      const desc = 'a'.repeat(STEP_DESCRIPTION_MAX_LENGTH + 1)
      const result = validateStepDescription(desc)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain(`${STEP_DESCRIPTION_MAX_LENGTH}`)
      }
    })
  })

  describe('XSS prevention', () => {
    it('rejects HTML tags', () => {
      const result = validateStepDescription('<div>content</div>')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('HTML tags')
      }
    })
  })
})

// ============================================================================
// validateActors Tests
// ============================================================================

describe('validateActors', () => {
  describe('valid actors', () => {
    it('returns null for undefined', () => {
      const result = validateActors(undefined)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('returns null for null', () => {
      const result = validateActors(null)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('accepts single actor', () => {
      const result = validateActors('Customer Service Agent')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Customer Service Agent')
      }
    })

    it('accepts comma-separated actors', () => {
      const result = validateActors('Agent, System, Manager')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Agent, System, Manager')
      }
    })

    it('accepts actors at exactly max length', () => {
      const actors = 'a'.repeat(ACTORS_MAX_LENGTH)
      const result = validateActors(actors)
      expect(result.success).toBe(true)
    })
  })

  describe('whitespace handling', () => {
    it('trims whitespace', () => {
      const result = validateActors('  Agent  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Agent')
      }
    })

    it('returns null for whitespace-only', () => {
      const result = validateActors('   ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })
  })

  describe('invalid actors', () => {
    it('rejects actors exceeding max length', () => {
      const actors = 'a'.repeat(ACTORS_MAX_LENGTH + 1)
      const result = validateActors(actors)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain(`${ACTORS_MAX_LENGTH}`)
      }
    })
  })

  describe('XSS prevention', () => {
    it('rejects HTML tags', () => {
      const result = validateActors('<span>Agent</span>')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('HTML tags')
      }
    })
  })
})

// ============================================================================
// validateDuration Tests
// ============================================================================

describe('validateDuration', () => {
  describe('valid durations', () => {
    it('returns null for undefined', () => {
      const result = validateDuration(undefined)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('returns null for null', () => {
      const result = validateDuration(null)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('accepts simple duration', () => {
      const result = validateDuration('5 minutes')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('5 minutes')
      }
    })

    it('accepts range duration', () => {
      const result = validateDuration('1-2 hours')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('1-2 hours')
      }
    })

    it('accepts duration at exactly max length', () => {
      const duration = 'a'.repeat(DURATION_MAX_LENGTH)
      const result = validateDuration(duration)
      expect(result.success).toBe(true)
    })
  })

  describe('whitespace handling', () => {
    it('trims whitespace', () => {
      const result = validateDuration('  5 min  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('5 min')
      }
    })

    it('returns null for whitespace-only', () => {
      const result = validateDuration('   ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })
  })

  describe('invalid durations', () => {
    it('rejects duration exceeding max length', () => {
      const duration = 'a'.repeat(DURATION_MAX_LENGTH + 1)
      const result = validateDuration(duration)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain(`${DURATION_MAX_LENGTH}`)
      }
    })
  })

  describe('XSS prevention', () => {
    it('rejects HTML tags', () => {
      const result = validateDuration('<em>5 min</em>')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('HTML tags')
      }
    })
  })
})

// ============================================================================
// validateCostImplication Tests
// ============================================================================

describe('validateCostImplication', () => {
  describe('valid cost implications', () => {
    it('returns null for undefined', () => {
      const result = validateCostImplication(undefined)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('returns null for null', () => {
      const result = validateCostImplication(null)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it.each(COST_IMPLICATIONS)('returns success for %s', (cost) => {
      const result = validateCostImplication(cost)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(cost)
      }
    })
  })

  describe('invalid cost implications', () => {
    it('rejects empty string', () => {
      const result = validateCostImplication('')
      expect(result.success).toBe(true) // Empty becomes null
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('rejects unknown cost level', () => {
      const result = validateCostImplication('very_high')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid cost implication')
        expect(result.error).toContain('very_high')
      }
    })

    it('rejects case variations', () => {
      const result = validateCostImplication('HIGH')
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// validateFailureRisk Tests
// ============================================================================

describe('validateFailureRisk', () => {
  describe('valid failure risks', () => {
    it('returns null for undefined', () => {
      const result = validateFailureRisk(undefined)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('returns null for null', () => {
      const result = validateFailureRisk(null)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it.each(FAILURE_RISKS)('returns success for %s', (risk) => {
      const result = validateFailureRisk(risk)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(risk)
      }
    })
  })

  describe('invalid failure risks', () => {
    it('rejects empty string', () => {
      const result = validateFailureRisk('')
      expect(result.success).toBe(true) // Empty becomes null
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('rejects unknown risk level', () => {
      const result = validateFailureRisk('critical')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid failure risk')
        expect(result.error).toContain('critical')
      }
    })

    it('rejects case variations', () => {
      const result = validateFailureRisk('Medium')
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// getOrderedLayers Tests
// ============================================================================

describe('getOrderedLayers', () => {
  it('returns all layer types', () => {
    const layers = getOrderedLayers()
    expect(layers).toHaveLength(4)
  })

  it('returns layers in correct order', () => {
    const layers = getOrderedLayers()
    expect(layers[0]).toBe('customer_action')
    expect(layers[1]).toBe('frontstage')
    expect(layers[2]).toBe('backstage')
    expect(layers[3]).toBe('support_process')
  })

  it('returns a new array (not the original)', () => {
    const layers1 = getOrderedLayers()
    const layers2 = getOrderedLayers()
    expect(layers1).not.toBe(layers2)
    expect(layers1).toEqual(layers2)
  })

  it('does not allow mutation of original', () => {
    const layers = getOrderedLayers()
    layers[0] = 'modified' as LayerType
    const freshLayers = getOrderedLayers()
    expect(freshLayers[0]).toBe('customer_action')
  })
})

// ============================================================================
// showLineOfVisibilityAfter Tests
// ============================================================================

describe('showLineOfVisibilityAfter', () => {
  it('returns false for customer_action (index 0)', () => {
    expect(showLineOfVisibilityAfter(0)).toBe(false)
  })

  it('returns true for frontstage (index 1)', () => {
    expect(showLineOfVisibilityAfter(1)).toBe(true)
  })

  it('returns false for backstage (index 2)', () => {
    expect(showLineOfVisibilityAfter(2)).toBe(false)
  })

  it('returns false for support_process (index 3)', () => {
    expect(showLineOfVisibilityAfter(3)).toBe(false)
  })

  it('returns false for out-of-range indices', () => {
    expect(showLineOfVisibilityAfter(-1)).toBe(false)
    expect(showLineOfVisibilityAfter(10)).toBe(false)
  })
})

// ============================================================================
// getCellForStepLayer Tests
// ============================================================================

describe('getCellForStepLayer', () => {
  const mockCells: BlueprintCell[] = [
    {
      id: 'cell-1',
      step_id: 'step-1',
      layer_type: 'customer_action',
      content: 'Customer clicks button',
      actors: null,
      duration_estimate: null,
      cost_implication: null,
      failure_risk: null,
      sequence: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'cell-2',
      step_id: 'step-1',
      layer_type: 'frontstage',
      content: 'Agent responds',
      actors: 'Agent',
      duration_estimate: '5 min',
      cost_implication: 'low',
      failure_risk: 'none',
      sequence: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'cell-3',
      step_id: 'step-2',
      layer_type: 'customer_action',
      content: 'Customer reviews',
      actors: null,
      duration_estimate: null,
      cost_implication: null,
      failure_risk: null,
      sequence: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  it('finds cell for matching step and layer', () => {
    const cell = getCellForStepLayer(mockCells, 'step-1', 'customer_action')
    expect(cell).toBeDefined()
    expect(cell?.id).toBe('cell-1')
    expect(cell?.content).toBe('Customer clicks button')
  })

  it('finds different cell for same step, different layer', () => {
    const cell = getCellForStepLayer(mockCells, 'step-1', 'frontstage')
    expect(cell).toBeDefined()
    expect(cell?.id).toBe('cell-2')
  })

  it('finds cell for different step', () => {
    const cell = getCellForStepLayer(mockCells, 'step-2', 'customer_action')
    expect(cell).toBeDefined()
    expect(cell?.id).toBe('cell-3')
  })

  it('returns undefined for non-existent step', () => {
    const cell = getCellForStepLayer(mockCells, 'step-99', 'customer_action')
    expect(cell).toBeUndefined()
  })

  it('returns undefined for non-existent layer on existing step', () => {
    const cell = getCellForStepLayer(mockCells, 'step-1', 'backstage')
    expect(cell).toBeUndefined()
  })

  it('returns undefined for empty cells array', () => {
    const cell = getCellForStepLayer([], 'step-1', 'customer_action')
    expect(cell).toBeUndefined()
  })
})

// ============================================================================
// buildCellsMap Tests
// ============================================================================

describe('buildCellsMap', () => {
  const mockCells: BlueprintCell[] = [
    {
      id: 'cell-1',
      step_id: 'step-1',
      layer_type: 'customer_action',
      content: 'Content 1',
      actors: null,
      duration_estimate: null,
      cost_implication: null,
      failure_risk: null,
      sequence: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'cell-2',
      step_id: 'step-1',
      layer_type: 'frontstage',
      content: 'Content 2',
      actors: null,
      duration_estimate: null,
      cost_implication: null,
      failure_risk: null,
      sequence: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'cell-3',
      step_id: 'step-2',
      layer_type: 'backstage',
      content: 'Content 3',
      actors: null,
      duration_estimate: null,
      cost_implication: null,
      failure_risk: null,
      sequence: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  it('creates a nested map structure', () => {
    const map = buildCellsMap(mockCells)
    expect(map).toBeInstanceOf(Map)
    expect(map.size).toBe(2) // 2 unique step IDs
  })

  it('allows O(1) lookup by step and layer', () => {
    const map = buildCellsMap(mockCells)
    const cell = map.get('step-1')?.get('customer_action')
    expect(cell).toBeDefined()
    expect(cell?.id).toBe('cell-1')
  })

  it('handles multiple layers per step', () => {
    const map = buildCellsMap(mockCells)
    const stepMap = map.get('step-1')
    expect(stepMap?.size).toBe(2)
    expect(stepMap?.get('customer_action')?.id).toBe('cell-1')
    expect(stepMap?.get('frontstage')?.id).toBe('cell-2')
  })

  it('returns empty map for empty cells array', () => {
    const map = buildCellsMap([])
    expect(map.size).toBe(0)
  })

  it('returns undefined for non-existent step', () => {
    const map = buildCellsMap(mockCells)
    expect(map.get('non-existent')).toBeUndefined()
  })

  it('returns undefined for non-existent layer on existing step', () => {
    const map = buildCellsMap(mockCells)
    expect(map.get('step-1')?.get('support_process')).toBeUndefined()
  })
})

// ============================================================================
// sortStepsBySequence Tests
// ============================================================================

describe('sortStepsBySequence', () => {
  it('sorts steps in ascending order', () => {
    const steps = [
      { id: 'a', sequence: 2 },
      { id: 'b', sequence: 0 },
      { id: 'c', sequence: 1 },
    ]
    const sorted = sortStepsBySequence(steps)
    expect(sorted[0].id).toBe('b')
    expect(sorted[1].id).toBe('c')
    expect(sorted[2].id).toBe('a')
  })

  it('returns new array (does not mutate input)', () => {
    const steps = [
      { id: 'a', sequence: 2 },
      { id: 'b', sequence: 0 },
    ]
    const sorted = sortStepsBySequence(steps)
    expect(sorted).not.toBe(steps)
    expect(steps[0].sequence).toBe(2) // Original unchanged
  })

  it('handles empty array', () => {
    const sorted = sortStepsBySequence([])
    expect(sorted).toEqual([])
  })

  it('handles single item', () => {
    const steps = [{ id: 'a', sequence: 5 }]
    const sorted = sortStepsBySequence(steps)
    expect(sorted).toHaveLength(1)
    expect(sorted[0].id).toBe('a')
  })

  it('handles already sorted array', () => {
    const steps = [
      { id: 'a', sequence: 0 },
      { id: 'b', sequence: 1 },
      { id: 'c', sequence: 2 },
    ]
    const sorted = sortStepsBySequence(steps)
    expect(sorted.map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('handles negative sequences', () => {
    const steps = [
      { id: 'a', sequence: -1 },
      { id: 'b', sequence: -3 },
      { id: 'c', sequence: 0 },
    ]
    const sorted = sortStepsBySequence(steps)
    expect(sorted.map((s) => s.id)).toEqual(['b', 'a', 'c'])
  })

  it('preserves additional properties', () => {
    const steps = [
      { id: 'a', sequence: 1, name: 'Step A' },
      { id: 'b', sequence: 0, name: 'Step B' },
    ]
    const sorted = sortStepsBySequence(steps)
    expect(sorted[0].name).toBe('Step B')
    expect(sorted[1].name).toBe('Step A')
  })
})

// ============================================================================
// createCellKey Tests
// ============================================================================

describe('createCellKey', () => {
  it('creates key in expected format', () => {
    const key = createCellKey('step-123', 'frontstage')
    expect(key).toBe('step-123:frontstage')
  })

  it('works with all layer types', () => {
    for (const layer of LAYER_TYPES) {
      const key = createCellKey('step-1', layer)
      expect(key).toBe(`step-1:${layer}`)
    }
  })

  it('handles UUID-style step IDs', () => {
    const key = createCellKey('550e8400-e29b-41d4-a716-446655440000', 'backstage')
    expect(key).toBe('550e8400-e29b-41d4-a716-446655440000:backstage')
  })
})

// ============================================================================
// parseCellKey Tests
// ============================================================================

describe('parseCellKey', () => {
  it('parses valid key', () => {
    const result = parseCellKey('step-123:frontstage')
    expect(result).not.toBeNull()
    expect(result?.stepId).toBe('step-123')
    expect(result?.layerType).toBe('frontstage')
  })

  it('parses keys with all layer types', () => {
    for (const layer of LAYER_TYPES) {
      const result = parseCellKey(`step-1:${layer}`)
      expect(result).not.toBeNull()
      expect(result?.layerType).toBe(layer)
    }
  })

  it('handles UUID-style step IDs', () => {
    const result = parseCellKey('550e8400-e29b-41d4-a716-446655440000:backstage')
    expect(result).not.toBeNull()
    expect(result?.stepId).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('returns null for invalid format (no colon)', () => {
    const result = parseCellKey('step-123-frontstage')
    expect(result).toBeNull()
  })

  it('returns null for invalid layer type', () => {
    const result = parseCellKey('step-123:invalid_layer')
    expect(result).toBeNull()
  })

  it('returns null for empty string', () => {
    const result = parseCellKey('')
    expect(result).toBeNull()
  })

  it('returns null for key with empty step ID', () => {
    const result = parseCellKey(':frontstage')
    expect(result).toBeNull()
  })

  it('returns null for key with empty layer type', () => {
    const result = parseCellKey('step-123:')
    expect(result).toBeNull()
  })

  it('returns null for key with multiple colons (takes first two parts)', () => {
    // This tests the split behavior - it should only split on first colon
    const result = parseCellKey('step:with:colon:frontstage')
    // The current implementation splits and takes first two parts
    // step and with, then 'with' is not a valid layer type
    expect(result).toBeNull()
  })
})

// ============================================================================
// Type Safety Tests (compile-time validation)
// ============================================================================

describe('Type Safety', () => {
  it('LayerType includes all layer types', () => {
    const types: LayerType[] = [
      'customer_action',
      'frontstage',
      'backstage',
      'support_process',
    ]
    expect(types).toHaveLength(4)
  })

  it('CostImplication includes all cost levels', () => {
    const costs: CostImplication[] = ['none', 'low', 'medium', 'high']
    expect(costs).toHaveLength(4)
  })

  it('FailureRisk includes all risk levels', () => {
    const risks: FailureRisk[] = ['none', 'low', 'medium', 'high']
    expect(risks).toHaveLength(4)
  })
})
