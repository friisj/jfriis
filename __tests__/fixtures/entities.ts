/**
 * Test Fixtures - Entity Factories
 *
 * Factory functions for creating test data with sensible defaults.
 * Use overrides to customize specific properties for each test case.
 */

// ============================================
// Project Entities
// ============================================

export const createMockProject = (overrides = {}) => ({
  id: 'project-1',
  name: 'Test Project',
  slug: 'test-project',
  description: 'A test project',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

export const createMockVenture = (overrides = {}) => ({
  id: 'venture-1',
  name: 'Test Venture',
  slug: 'test-venture',
  description: 'A test venture',
  status: 'exploring',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

// ============================================
// Journey Entities
// ============================================

export const createMockJourney = (overrides = {}) => ({
  id: 'journey-1',
  name: 'Test Journey',
  description: 'A test journey',
  status: 'draft',
  stages: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

export const createMockTouchpoint = (overrides = {}) => ({
  id: 'touchpoint-1',
  name: 'Test Touchpoint',
  description: 'A test touchpoint',
  journey_id: 'journey-1',
  sequence: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

// ============================================
// Canvas Entities
// ============================================

export const createMockStoryMap = (overrides = {}) => ({
  id: 'story-map-1',
  name: 'Test Story Map',
  description: 'A test story map',
  status: 'draft',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

export const createMockActivity = (overrides = {}) => ({
  id: 'activity-1',
  name: 'Test Activity',
  description: 'A test activity',
  story_map_id: 'story-map-1',
  sequence: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

export const createMockUserStory = (overrides = {}) => ({
  id: 'user-story-1',
  title: 'Test User Story',
  description: 'A test user story',
  activity_id: 'activity-1',
  layer_id: 'layer-1',
  status: 'backlog',
  story_type: 'feature',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

// ============================================
// Assumption & Evidence Entities
// ============================================

export const createMockAssumption = (overrides = {}) => ({
  id: 'assumption-1',
  statement: 'Test assumption statement',
  status: 'untested',
  risk_level: 'medium',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

export const createMockEvidence = (overrides = {}) => ({
  id: 'evidence-1',
  title: 'Test Evidence',
  description: 'Test evidence description',
  evidence_type: 'interview',
  source: 'User research',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

// ============================================
// Specimen Entities
// ============================================

export const createMockSpecimen = (overrides = {}) => ({
  id: 'specimen-1',
  title: 'Test Specimen',
  slug: 'test-specimen',
  description: 'A test specimen',
  type: 'ui-component',
  published: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

// ============================================
// Entity Link Entities
// ============================================

export const createMockEntityLink = (overrides = {}) => ({
  id: 'link-1',
  source_type: 'project',
  source_id: 'project-1',
  target_type: 'venture',
  target_id: 'venture-1',
  link_type: 'related',
  strength: null,
  notes: null,
  metadata: {},
  position: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

// ============================================
// User / Auth Entities
// ============================================

export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

export const createMockProfile = (overrides = {}) => ({
  id: 'user-1',
  username: 'testuser',
  full_name: 'Test User',
  avatar_url: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})
