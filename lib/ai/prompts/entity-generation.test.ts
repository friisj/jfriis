import { describe, it, expect } from 'vitest'
import {
  ENTITY_GENERATION_CONFIGS,
  buildAntiRedundancyContext,
  buildSourceContext,
  getEntityGenerationConfig,
  type EntityGenerationConfig,
} from './entity-generation'
import type { EntityType } from '../types/entities'

// ============================================================================
// ENTITY_GENERATION_CONFIGS Tests
// ============================================================================

describe('ENTITY_GENERATION_CONFIGS', () => {
  // List of all entity types that should have configs
  const expectedConfigs: EntityType[] = [
    'studio_hypotheses',
    'studio_experiments',
    'canvas_items',
    'assumptions',
    'activities',
    'user_stories',
    'blueprint_steps',
    'blueprint_cells',
    'journey_stages',
    'journey_cells',
    'bmc_items',
    'customer_profile_items',
    'value_map_items',
  ]

  describe('config existence', () => {
    it.each(expectedConfigs)('has config for %s', (entityType) => {
      const config = ENTITY_GENERATION_CONFIGS[entityType]
      expect(config).toBeDefined()
    })
  })

  describe('config structure', () => {
    it.each(expectedConfigs)('%s has required fields', (entityType) => {
      const config = ENTITY_GENERATION_CONFIGS[entityType]
      expect(config).toBeDefined()

      if (config) {
        expect(typeof config.systemPrompt).toBe('string')
        expect(config.systemPrompt.length).toBeGreaterThan(50)

        expect(Array.isArray(config.fieldsToGenerate)).toBe(true)
        expect(config.fieldsToGenerate.length).toBeGreaterThan(0)

        expect(typeof config.defaultValues).toBe('object')

        expect(Array.isArray(config.contextFields)).toBe(true)

        expect(typeof config.displayField).toBe('string')
        expect(config.displayField.length).toBeGreaterThan(0)

        expect(Array.isArray(config.editableFields)).toBe(true)
        expect(config.editableFields.length).toBeGreaterThan(0)
      }
    })

    it.each(expectedConfigs)('%s displayField is in fieldsToGenerate or editableFields', (entityType) => {
      const config = ENTITY_GENERATION_CONFIGS[entityType]
      if (config) {
        const allFields = [...config.fieldsToGenerate, ...config.editableFields]
        expect(allFields).toContain(config.displayField)
      }
    })
  })

  describe('specific config validations', () => {
    it('studio_hypotheses has correct default status', () => {
      const config = ENTITY_GENERATION_CONFIGS.studio_hypotheses
      expect(config?.defaultValues.status).toBe('proposed')
    })

    it('studio_experiments has correct default status', () => {
      const config = ENTITY_GENERATION_CONFIGS.studio_experiments
      expect(config?.defaultValues.status).toBe('planned')
    })

    it('user_stories has correct defaults', () => {
      const config = ENTITY_GENERATION_CONFIGS.user_stories
      expect(config?.defaultValues.status).toBe('backlog')
      expect(config?.defaultValues.story_type).toBe('feature')
    })

    it('canvas_items has correct default importance', () => {
      const config = ENTITY_GENERATION_CONFIGS.canvas_items
      expect(config?.defaultValues.importance).toBe('medium')
    })

    it('activities has empty default values', () => {
      const config = ENTITY_GENERATION_CONFIGS.activities
      expect(config?.defaultValues).toEqual({})
    })
  })

  describe('fieldHints', () => {
    it.each(expectedConfigs)('%s has fieldHints for generated fields', (entityType) => {
      const config = ENTITY_GENERATION_CONFIGS[entityType]
      if (config && config.fieldHints) {
        for (const field of config.fieldsToGenerate) {
          expect(config.fieldHints[field]).toBeDefined()
          expect(typeof config.fieldHints[field]).toBe('string')
        }
      }
    })
  })
})

// ============================================================================
// buildAntiRedundancyContext Tests
// ============================================================================

describe('buildAntiRedundancyContext', () => {
  describe('with no items', () => {
    it('returns empty string when both arrays are empty', () => {
      const result = buildAntiRedundancyContext([], [], 'name')
      expect(result).toBe('')
    })
  })

  describe('with existing items only', () => {
    it('builds context with existing items', () => {
      const existing = [
        { id: '1', name: 'Item One' },
        { id: '2', name: 'Item Two' },
      ]
      const result = buildAntiRedundancyContext(existing, [], 'name')

      expect(result).toContain('Existing items')
      expect(result).toContain('do NOT duplicate')
      expect(result).toContain('- Item One')
      expect(result).toContain('- Item Two')
      expect(result).toContain('meaningfully different')
    })

    it('uses id as fallback when displayField is missing', () => {
      const existing = [
        { id: 'abc123' },
        { id: 'def456' },
      ]
      const result = buildAntiRedundancyContext(existing, [], 'name')

      expect(result).toContain('- abc123')
      expect(result).toContain('- def456')
    })
  })

  describe('with pending items only', () => {
    it('builds context with pending items', () => {
      const pending = [
        { title: 'Pending A' },
        { title: 'Pending B' },
      ]
      const result = buildAntiRedundancyContext([], pending, 'title')

      expect(result).toContain('Pending items')
      expect(result).toContain('do NOT duplicate')
      expect(result).toContain('- Pending A')
      expect(result).toContain('- Pending B')
    })

    it('uses fallback for pending items without displayField', () => {
      const pending = [{ id: '1' }, { id: '2' }]
      const result = buildAntiRedundancyContext([], pending, 'name')

      expect(result).toContain('- pending item')
    })
  })

  describe('with both existing and pending items', () => {
    it('builds context with both sections', () => {
      const existing = [{ name: 'Existing' }]
      const pending = [{ name: 'Pending' }]
      const result = buildAntiRedundancyContext(existing, pending, 'name')

      expect(result).toContain('Existing items')
      expect(result).toContain('- Existing')
      expect(result).toContain('Pending items')
      expect(result).toContain('- Pending')
      expect(result).toContain('meaningfully different')
    })
  })

  describe('edge cases', () => {
    it('handles items with empty displayField values', () => {
      const existing = [
        { id: '1', name: '' },
        { id: '2', name: 'Valid Name' },
      ]
      const result = buildAntiRedundancyContext(existing, [], 'name')

      // Empty string is falsy, so falls back to id
      expect(result).toContain('- 1')
      expect(result).toContain('- Valid Name')
    })

    it('handles items with null displayField values', () => {
      const existing = [
        { id: '1', name: null },
      ]
      const result = buildAntiRedundancyContext(existing, [], 'name')

      expect(result).toContain('- 1')
    })

    it('handles many items', () => {
      const existing = Array.from({ length: 20 }, (_, i) => ({
        id: `id-${i}`,
        name: `Item ${i}`,
      }))
      const result = buildAntiRedundancyContext(existing, [], 'name')

      expect(result).toContain('- Item 0')
      expect(result).toContain('- Item 19')
    })
  })
})

// ============================================================================
// buildSourceContext Tests
// ============================================================================

describe('buildSourceContext', () => {
  describe('basic functionality', () => {
    it('builds context from simple fields', () => {
      const sourceData = {
        name: 'Test Project',
        description: 'A test description',
      }
      const result = buildSourceContext(sourceData, ['name', 'description'])

      expect(result).toContain('Name: Test Project')
      expect(result).toContain('Description: A test description')
    })

    it('formats field names with proper capitalization', () => {
      const sourceData = {
        problem_statement: 'The problem is...',
        current_focus: 'We are focusing on...',
      }
      const result = buildSourceContext(sourceData, ['problem_statement', 'current_focus'])

      expect(result).toContain('Problem Statement:')
      expect(result).toContain('Current Focus:')
    })

    it('returns fallback message when no fields have values', () => {
      const sourceData = {}
      const result = buildSourceContext(sourceData, ['name', 'description'])

      expect(result).toBe('No additional context provided.')
    })
  })

  describe('field filtering', () => {
    it('only includes requested fields', () => {
      const sourceData = {
        name: 'Test',
        description: 'Desc',
        secret: 'Should not appear',
      }
      const result = buildSourceContext(sourceData, ['name'])

      expect(result).toContain('Name: Test')
      expect(result).not.toContain('description')
      expect(result).not.toContain('secret')
    })

    it('skips fields with empty string values', () => {
      const sourceData = {
        name: 'Test',
        description: '',
      }
      const result = buildSourceContext(sourceData, ['name', 'description'])

      expect(result).toContain('Name: Test')
      expect(result).not.toContain('Description:')
    })

    it('skips fields with whitespace-only values', () => {
      const sourceData = {
        name: 'Test',
        description: '   ',
      }
      const result = buildSourceContext(sourceData, ['name', 'description'])

      expect(result).toContain('Name: Test')
      expect(result).not.toContain('Description:')
    })

    it('skips fields with null values', () => {
      const sourceData = {
        name: 'Test',
        description: null,
      }
      const result = buildSourceContext(sourceData, ['name', 'description'])

      expect(result).toContain('Name: Test')
      expect(result).not.toContain('Description:')
    })

    it('skips fields with undefined values', () => {
      const sourceData = {
        name: 'Test',
        description: undefined,
      }
      const result = buildSourceContext(sourceData, ['name', 'description'])

      expect(result).toContain('Name: Test')
      expect(result).not.toContain('Description:')
    })

    it('skips non-string values', () => {
      const sourceData = {
        name: 'Test',
        count: 42,
        active: true,
        data: { nested: 'object' },
      }
      const result = buildSourceContext(sourceData, ['name', 'count', 'active', 'data'])

      expect(result).toContain('Name: Test')
      expect(result).not.toContain('Count')
      expect(result).not.toContain('Active')
      expect(result).not.toContain('Data')
    })
  })

  describe('missing fields', () => {
    it('handles missing fields gracefully', () => {
      const sourceData = {
        name: 'Test',
      }
      const result = buildSourceContext(sourceData, ['name', 'nonexistent'])

      expect(result).toContain('Name: Test')
      expect(result).not.toContain('Nonexistent')
    })

    it('returns fallback when all requested fields are missing', () => {
      const sourceData = {
        other: 'value',
      }
      const result = buildSourceContext(sourceData, ['name', 'description'])

      expect(result).toBe('No additional context provided.')
    })
  })

  describe('edge cases', () => {
    it('handles empty contextFields array', () => {
      const sourceData = { name: 'Test' }
      const result = buildSourceContext(sourceData, [])

      expect(result).toBe('No additional context provided.')
    })

    it('handles multi-word underscored field names', () => {
      const sourceData = {
        testing_assumption: 'We assume users will...',
        assumption_category: 'desirability',
      }
      const result = buildSourceContext(sourceData, ['testing_assumption', 'assumption_category'])

      expect(result).toContain('Testing Assumption:')
      expect(result).toContain('Assumption Category:')
    })

    it('preserves multi-line string values', () => {
      const sourceData = {
        description: 'Line 1\nLine 2\nLine 3',
      }
      const result = buildSourceContext(sourceData, ['description'])

      expect(result).toContain('Line 1\nLine 2\nLine 3')
    })
  })
})

// ============================================================================
// getEntityGenerationConfig Tests
// ============================================================================

describe('getEntityGenerationConfig', () => {
  describe('returns config for supported types', () => {
    it('returns config for studio_hypotheses', () => {
      const config = getEntityGenerationConfig('studio_hypotheses')
      expect(config).toBeDefined()
      expect(config?.displayField).toBe('statement')
    })

    it('returns config for activities', () => {
      const config = getEntityGenerationConfig('activities')
      expect(config).toBeDefined()
      expect(config?.displayField).toBe('name')
    })

    it('returns config for user_stories', () => {
      const config = getEntityGenerationConfig('user_stories')
      expect(config).toBeDefined()
      expect(config?.displayField).toBe('title')
    })

    it('returns config for blueprint_cells', () => {
      const config = getEntityGenerationConfig('blueprint_cells')
      expect(config).toBeDefined()
      expect(config?.displayField).toBe('content')
    })
  })

  describe('returns undefined for unsupported types', () => {
    it('returns undefined for studio_projects', () => {
      const config = getEntityGenerationConfig('studio_projects')
      expect(config).toBeUndefined()
    })

    it('returns undefined for ventures', () => {
      const config = getEntityGenerationConfig('ventures')
      expect(config).toBeUndefined()
    })

    it('returns undefined for log_entries', () => {
      const config = getEntityGenerationConfig('log_entries')
      expect(config).toBeUndefined()
    })
  })

  describe('config integrity', () => {
    it('returned config matches stored config', () => {
      const stored = ENTITY_GENERATION_CONFIGS.studio_hypotheses
      const retrieved = getEntityGenerationConfig('studio_hypotheses')
      expect(retrieved).toBe(stored) // Same reference
    })
  })
})
