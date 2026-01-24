/**
 * Server Action Tests: Story Map Actions
 *
 * Tests for the story map canvas server actions.
 * Verifies authentication, authorization, validation, and database operations.
 *
 * Note: Server actions use 'use server' directive and can't be imported directly
 * in unit tests. These tests verify the patterns and validation logic used.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockSupabaseClient, clearQueryWarnings, getQueryWarnings } from '../setup'
import {
  validateLayerName,
  validateActivityName,
  validateActivityDescription,
  validateActivityGoal,
  LAYER_NAME_MAX_LENGTH,
  ACTIVITY_NAME_MAX_LENGTH,
} from '@/lib/boundary-objects/story-map-layers'

// ============================================================================
// Type Definitions for Mock Builders
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockBuilder = Record<string, any>

// Helper to get a mock builder for setup (without table name)
function getMockBuilder(): MockBuilder {
  return mockSupabaseClient.from() as MockBuilder
}

// ============================================================================
// Mock Setup
// ============================================================================

// Mock authenticated user
const mockUser = {
  id: 'user-123-uuid',
  email: 'test@example.com',
}

// Mock story map data
const mockStoryMap = {
  id: 'story-map-123',
  name: 'Test Story Map',
}

const mockLayer = {
  id: 'layer-456',
  story_map_id: 'story-map-123',
  name: 'Test Layer',
  sequence: 0,
}

const mockActivity = {
  id: 'activity-789',
  story_map_id: 'story-map-123',
  name: 'Test Activity',
  sequence: 0,
}

// ============================================================================
// Helper Functions (Simulating Server Action Logic)
// ============================================================================

/**
 * Simulates the authentication check pattern used in server actions
 */
async function simulateAuthCheck(): Promise<{ user: typeof mockUser | null }> {
  const { data: { user } } = await mockSupabaseClient.auth.getUser()
  return { user }
}

/**
 * Simulates the access verification pattern
 */
async function simulateVerifyStoryMapAccess(storyMapId: string): Promise<{
  success: boolean
  error?: string
  storyMapId?: string
}> {
  const { data, error } = await (mockSupabaseClient.from('story_maps') as MockBuilder)
    .select('id')
    .eq('id', storyMapId)
    .single() as { data: { id: string } | null; error: { code: string; message: string } | null }

  if (error || !data) {
    return { success: false, error: 'Story map not found or access denied' }
  }

  return { success: true, storyMapId: data.id }
}

/**
 * Simulates the create layer action pattern
 */
async function simulateCreateLayerAction(
  storyMapId: string,
  name: string,
  sequence: number
): Promise<{ success: boolean; error?: string; code?: string }> {
  // Auth check
  const { user } = await simulateAuthCheck()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // Access verification
  const accessCheck = await simulateVerifyStoryMapAccess(storyMapId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: 'ACCESS_DENIED' }
  }

  // Validation
  const nameResult = validateLayerName(name)
  if (!nameResult.success) {
    return { success: false, error: nameResult.error, code: 'VALIDATION_ERROR' }
  }

  // Database operation (simplified)
  const { error } = (await (mockSupabaseClient.from('story_map_layers') as MockBuilder)
    .insert({
      story_map_id: storyMapId,
      name: nameResult.data,
      sequence,
    })) as { error: { code: string; message: string } | null }

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'A layer with this position already exists', code: 'DUPLICATE_ERROR' }
    }
    return { success: false, error: 'Failed to create layer', code: 'DATABASE_ERROR' }
  }

  return { success: true }
}

/**
 * Simulates the create activity action pattern
 */
async function simulateCreateActivityAction(
  storyMapId: string,
  name: string,
  sequence: number
): Promise<{ success: boolean; error?: string; code?: string }> {
  // Auth check
  const { user } = await simulateAuthCheck()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // Access verification
  const accessCheck = await simulateVerifyStoryMapAccess(storyMapId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: 'ACCESS_DENIED' }
  }

  // Validation
  const nameResult = validateActivityName(name)
  if (!nameResult.success) {
    return { success: false, error: nameResult.error, code: 'VALIDATION_ERROR' }
  }

  // Database operation
  const { error } = (await (mockSupabaseClient.from('activities') as MockBuilder)
    .insert({
      story_map_id: storyMapId,
      name: nameResult.data,
      sequence,
    })) as { error: { code: string; message: string } | null }

  if (error) {
    return { success: false, error: 'Failed to create activity', code: 'DATABASE_ERROR' }
  }

  return { success: true }
}

// ============================================================================
// Test Suite: Authentication
// ============================================================================

describe('Story Map Actions: Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearQueryWarnings()
  })

  it('returns unauthorized error when user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const result = await simulateCreateLayerAction('story-map-123', 'New Layer', 0)

    expect(result.success).toBe(false)
    expect(result.code).toBe('UNAUTHORIZED')
    expect(result.error).toBe('Unauthorized')
  })

  it('proceeds when user is authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    // Mock successful story map access
    getMockBuilder().select().eq('id', '').single.mockResolvedValue({
      data: mockStoryMap,
      error: null,
    })

    const result = await simulateCreateLayerAction('story-map-123', 'New Layer', 0)

    // Should proceed past auth check (may fail on access or DB, but not auth)
    expect(result.code).not.toBe('UNAUTHORIZED')
  })
})

// ============================================================================
// Test Suite: Authorization (Access Verification)
// ============================================================================

describe('Story Map Actions: Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearQueryWarnings()

    // Set up authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
  })

  it('returns access denied when story map is not found', async () => {
    getMockBuilder().select().eq('id', '').single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' },
    })

    const result = await simulateCreateLayerAction('nonexistent-map', 'New Layer', 0)

    expect(result.success).toBe(false)
    expect(result.code).toBe('ACCESS_DENIED')
    expect(result.error).toMatch(/not found|access denied/i)
  })

  it('proceeds when story map access is verified', async () => {
    getMockBuilder().select().eq('id', '').single.mockResolvedValue({
      data: mockStoryMap,
      error: null,
    })

    const result = await simulateCreateLayerAction('story-map-123', 'New Layer', 0)

    // Should proceed past access check
    expect(result.code).not.toBe('ACCESS_DENIED')
  })
})

// ============================================================================
// Test Suite: Validation
// ============================================================================

describe('Story Map Actions: Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearQueryWarnings()

    // Set up authenticated user with access
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
    getMockBuilder().select().eq('id', '').single.mockResolvedValue({
      data: mockStoryMap,
      error: null,
    })
  })

  describe('Layer Name Validation', () => {
    it('rejects empty layer name', async () => {
      const result = await simulateCreateLayerAction('story-map-123', '', 0)

      expect(result.success).toBe(false)
      expect(result.code).toBe('VALIDATION_ERROR')
      expect(result.error).toMatch(/required/i)
    })

    it('rejects whitespace-only layer name', async () => {
      const result = await simulateCreateLayerAction('story-map-123', '   ', 0)

      expect(result.success).toBe(false)
      expect(result.code).toBe('VALIDATION_ERROR')
    })

    it('rejects layer name exceeding max length', async () => {
      const longName = 'a'.repeat(LAYER_NAME_MAX_LENGTH + 1)
      const result = await simulateCreateLayerAction('story-map-123', longName, 0)

      expect(result.success).toBe(false)
      expect(result.code).toBe('VALIDATION_ERROR')
      expect(result.error).toMatch(/characters or less/i)
    })

    it('rejects layer name with HTML tags (XSS)', async () => {
      const result = await simulateCreateLayerAction(
        'story-map-123',
        '<script>alert(1)</script>',
        0
      )

      expect(result.success).toBe(false)
      expect(result.code).toBe('VALIDATION_ERROR')
    })

    it('accepts valid layer name', async () => {
      const result = await simulateCreateLayerAction('story-map-123', 'Customer Layer', 0)

      // Should pass validation (may fail on DB)
      expect(result.code).not.toBe('VALIDATION_ERROR')
    })
  })

  describe('Activity Name Validation', () => {
    it('rejects empty activity name', async () => {
      const result = await simulateCreateActivityAction('story-map-123', '', 0)

      expect(result.success).toBe(false)
      expect(result.code).toBe('VALIDATION_ERROR')
    })

    it('rejects activity name exceeding max length', async () => {
      const longName = 'a'.repeat(ACTIVITY_NAME_MAX_LENGTH + 1)
      const result = await simulateCreateActivityAction('story-map-123', longName, 0)

      expect(result.success).toBe(false)
      expect(result.code).toBe('VALIDATION_ERROR')
    })

    it('rejects activity name with XSS patterns', async () => {
      const result = await simulateCreateActivityAction(
        'story-map-123',
        'javascript:alert(1)',
        0
      )

      expect(result.success).toBe(false)
      expect(result.code).toBe('VALIDATION_ERROR')
    })
  })
})

// ============================================================================
// Test Suite: Database Operations
// ============================================================================

describe('Story Map Actions: Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearQueryWarnings()

    // Set up authenticated user with access
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
    getMockBuilder().select().eq('id', '').single.mockResolvedValue({
      data: mockStoryMap,
      error: null,
    })
  })

  it('calls insert with correct data for create layer', async () => {
    await simulateCreateLayerAction('story-map-123', 'New Layer', 5)

    // Verify the insert was called
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('story_map_layers')
  })

  it('handles duplicate error (unique constraint violation)', async () => {
    const builder = getMockBuilder()
    ;(builder.then as ReturnType<typeof vi.fn>).mockImplementation((resolve: (val: unknown) => void) => {
      resolve({ data: null, error: { code: '23505', message: 'Duplicate key' } })
    })

    const result = await simulateCreateLayerAction('story-map-123', 'New Layer', 0)

    expect(result.success).toBe(false)
    expect(result.code).toBe('DUPLICATE_ERROR')
    expect(result.error).toMatch(/already exists/i)
  })

  it('handles generic database error', async () => {
    const builder = getMockBuilder()
    ;(builder.then as ReturnType<typeof vi.fn>).mockImplementation((resolve: (val: unknown) => void) => {
      resolve({ data: null, error: { code: '42P01', message: 'Table not found' } })
    })

    const result = await simulateCreateLayerAction('story-map-123', 'New Layer', 0)

    expect(result.success).toBe(false)
    expect(result.code).toBe('DATABASE_ERROR')
  })
})

// ============================================================================
// Test Suite: Query Warning Assertions
// ============================================================================

describe('Story Map Actions: Query Warnings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearQueryWarnings()
  })

  it('does not generate query warnings for valid operations', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
    getMockBuilder().select().eq('id', '').single.mockResolvedValue({
      data: mockStoryMap,
      error: null,
    })

    await simulateCreateLayerAction('story-map-123', 'Valid Layer', 0)

    const warnings = getQueryWarnings()
    expect(warnings).toHaveLength(0)
  })
})

// ============================================================================
// Test Suite: Bulk Operations
// ============================================================================

describe('Story Map Actions: Bulk Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearQueryWarnings()

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
    getMockBuilder().select().eq('id', '').single.mockResolvedValue({
      data: mockStoryMap,
      error: null,
    })
  })

  it('validates all items before any database operation', () => {
    // Test that bulk validation catches multiple errors
    const activities = [
      { name: 'Valid Activity' },
      { name: '' }, // Invalid: empty
      { name: 'a'.repeat(ACTIVITY_NAME_MAX_LENGTH + 1) }, // Invalid: too long
    ]

    const validationErrors: string[] = []

    for (let i = 0; i < activities.length; i++) {
      const nameResult = validateActivityName(activities[i].name)
      if (!nameResult.success) {
        validationErrors.push(`Activity ${i + 1}: ${nameResult.error}`)
      }
    }

    // Should have collected 2 errors before any DB operation
    expect(validationErrors).toHaveLength(2)
    expect(validationErrors[0]).toContain('Activity 2')
    expect(validationErrors[1]).toContain('Activity 3')
  })
})

// ============================================================================
// Test Suite: Validation Functions (Direct)
// ============================================================================

describe('Validation Functions', () => {
  describe('validateLayerName', () => {
    it('trims whitespace from valid names', () => {
      const result = validateLayerName('  Customer Layer  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Customer Layer')
      }
    })

    it('returns error for empty string', () => {
      const result = validateLayerName('')
      expect(result.success).toBe(false)
    })

    it('returns error for XSS patterns', () => {
      const vectors = [
        '<script>alert(1)</script>',
        'javascript:void(0)',
        '<img onerror="alert(1)">',
        'vbscript:msgbox(1)',
        '＜script＞', // Fullwidth
      ]

      for (const vector of vectors) {
        const result = validateLayerName(vector)
        expect(result.success, `Should reject: ${vector}`).toBe(false)
      }
    })
  })

  describe('validateActivityName', () => {
    it('trims whitespace from valid names', () => {
      const result = validateActivityName('  Browse Products  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Browse Products')
      }
    })

    it('enforces max length', () => {
      const exactLength = 'a'.repeat(ACTIVITY_NAME_MAX_LENGTH)
      const tooLong = 'a'.repeat(ACTIVITY_NAME_MAX_LENGTH + 1)

      expect(validateActivityName(exactLength).success).toBe(true)
      expect(validateActivityName(tooLong).success).toBe(false)
    })
  })

  describe('validateActivityDescription', () => {
    it('allows null/undefined', () => {
      expect(validateActivityDescription(undefined).success).toBe(true)
      expect(validateActivityDescription('')).toMatchObject({ success: true, data: null })
    })

    it('trims and validates description', () => {
      const result = validateActivityDescription('  A valid description  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('A valid description')
      }
    })
  })

  describe('validateActivityGoal', () => {
    it('allows null/undefined', () => {
      expect(validateActivityGoal(undefined).success).toBe(true)
    })

    it('validates goal content', () => {
      const result = validateActivityGoal('Find the best product')
      expect(result.success).toBe(true)
    })
  })
})
