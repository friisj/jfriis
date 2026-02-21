# Comprehensive Test Coverage Specification

**Status**: Draft
**Created**: 2026-01-23
**Related**: [TEST_HARNESS_SPEC.md](./TEST_HARNESS_SPEC.md)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Test Execution Policy](#test-execution-policy)
3. [Test Type Definitions](#test-type-definitions)
4. [Current State](#current-state)
5. [Entity Inventory](#entity-inventory)
6. [Risk-Based Prioritization](#risk-based-prioritization)
7. [Phase 1: Unit Tests](#phase-1-unit-tests)
8. [Phase 2: Smoke Tests](#phase-2-smoke-tests)
9. [Phase 3: Integration Tests](#phase-3-integration-tests)
10. [Phase 4: E2E Tests](#phase-4-e2e-tests)
11. [Test Patterns & Examples](#test-patterns--examples)
12. [Implementation Checklist](#implementation-checklist)

---

## Executive Summary

This specification extends the Test Harness (see `TEST_HARNESS_SPEC.md`) with comprehensive test coverage across all entity types and test categories. The goal is systematic, risk-prioritized test coverage that catches regressions before they ship.

### Key Principles

1. **Risk-based prioritization** - Test high-impact, high-change areas first
2. **Appropriate test types** - Use the right test type for each scenario
3. **Incremental adoption** - Add tests in phases, not all at once
4. **Colocated tests** - Tests live next to the code they test
5. **Maintainability over coverage %** - Focus on valuable tests, not vanity metrics
6. **Proportionate execution** - Run the right tests at the right time

---

## Test Execution Policy

Running all 230-300 tests on every commit is impractical. Different test types run at different trigger points based on feedback speed and scope.

### Execution Matrix

| Trigger | Unit (Related) | Unit (All) | Smoke | Integration | E2E |
|---------|---------------|------------|-------|-------------|-----|
| **Pre-commit** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Pre-push** | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Manual: `npm test`** | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Manual: `npm run test:full`** | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Manual: `npm run test:e2e`** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Before PR/Release** | ❌ | ✅ | ✅ | ✅ | ✅ |

### Trigger Details

#### Pre-commit (Husky + lint-staged)

**What runs**: Only tests related to staged files

```bash
# .husky/pre-commit
npm run type-check
npx lint-staged
```

```json
// package.json lint-staged
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "vitest related --run"  // ← Only tests for changed files
    ]
  }
}
```

**Rationale**: Fast feedback (~5-15s). Catches obvious breaks in changed code without blocking workflow.

#### Pre-push (Husky)

**What runs**: All unit tests + smoke tests

```bash
# .husky/pre-push
npm run test:run      # All unit + smoke tests
npm run build         # Production build
```

**Rationale**: More comprehensive check before code leaves local machine. Still fast (~30-60s for tests).

#### Manual: Full Suite

**When**: Before creating PRs, after major changes, periodic validation

```bash
npm run test:full     # Unit + smoke + integration
```

**Rationale**: Integration tests require mocked Supabase setup and are slower. Run when you need confidence, not on every change.

#### Manual: E2E

**When**: Before releases, after major features, periodic regression check

```bash
npm run test:e2e      # Playwright E2E tests
```

**Rationale**: E2E tests are slow (browser automation) and brittle. Run deliberately, not routinely.

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:watch": "vitest --watch",
    "test:related": "vitest related --run",
    "test:unit": "vitest run --dir lib --dir components",
    "test:smoke": "vitest run --dir __tests__/smoke",
    "test:integration": "vitest run --dir app",
    "test:full": "vitest run",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Vitest Project Configuration

To enable selective test execution, configure Vitest projects:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // ... existing config

    // Define test groups via include patterns
    include: ['**/*.test.{ts,tsx}'],

    // Workspace projects for selective runs
    // Usage: vitest --project=unit
  }
})
```

### Claude Code Hook Integration

For Claude Code sessions, hooks can enforce test policies:

```yaml
# .claude/hooks/pre-commit.yaml (conceptual)
triggers:
  - on: commit
    run: npm run type-check && npx lint-staged

# .claude/hooks/pre-push.yaml (conceptual)
triggers:
  - on: push
    run: npm run test:run && npm run build
```

**Current implementation**: Husky handles these via `.husky/pre-commit` and `.husky/pre-push`.

### When to Run What: Decision Tree

```
Making a commit?
├─ Yes → Pre-commit runs automatically (related tests only)
│
Pushing to remote?
├─ Yes → Pre-push runs automatically (unit + smoke + build)
│
Creating a PR?
├─ Yes → Run `npm run test:full` manually
│        Run `npm run test:e2e` if touching critical flows
│
Releasing to production?
├─ Yes → Run full suite including E2E
│        Consider tech-review agent for large changes
│
Just want fast feedback?
├─ Yes → `npm test` in watch mode
│        Or `npm run test:related` for specific files
```

### Escape Hatches

When you need to bypass (use sparingly):

```bash
# Skip pre-commit hooks
git commit --no-verify -m "emergency fix"

# Skip pre-push hooks
git push --no-verify

# Skip specific test suites
npm run test:unit    # Only unit tests
npm run test:smoke   # Only smoke tests
```

**Warning**: Skipping tests can introduce regressions. Document why in commit message.

---

## Test Type Definitions

| Test Type | Scope | Dependencies | Speed | When to Use |
|-----------|-------|--------------|-------|-------------|
| **Unit** | Single function/module | None (pure) | <10ms | Validation, transformations, parsers, formatters |
| **Smoke** | Page renders | Mocked data | <500ms | Critical pages load without crashing |
| **Integration** | Module + mocked DB | Mocked Supabase | <1s | Server actions, API routes, complex flows |
| **E2E** | Full stack | Real browser | 5-30s | Critical user journeys, regression suites |

### When to Use Each Type

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Testing Pyramid                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                           /\                                         │
│                          /  \     E2E (few)                         │
│                         /    \    - Critical user flows             │
│                        /──────\   - Full browser + DB               │
│                       /        \                                     │
│                      / Integr.  \  Integration (moderate)           │
│                     /   ation    \ - Server actions                 │
│                    /──────────────\- API routes                     │
│                   /                \- Mocked Supabase                │
│                  /                  \                                │
│                 /      Smoke         \ Smoke (many)                 │
│                /                      \- Pages render               │
│               /────────────────────────\- No crashes                │
│              /                          \                            │
│             /           Unit             \ Unit (most)              │
│            /                              \- Validation             │
│           /────────────────────────────────\- Parsers               │
│          /                                  \- Transformations      │
│         /──────────────────────────────────────\                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Current State

### Existing Tests (48 total)

| File | Type | Count | Coverage |
|------|------|-------|----------|
| `components/admin/status-badge.test.tsx` | Unit | 18 | StatusBadge component |
| `lib/entity-links-validation.test.ts` | Unit | 30 | Entity link validation |

### Test Infrastructure

- **Framework**: Vitest with happy-dom
- **Component Testing**: React Testing Library
- **Mocks**: Next.js, Supabase, AI SDKs (in `__tests__/setup.ts`)
- **Fixtures**: Entity factories (in `__tests__/fixtures/entities.ts`)

### Gaps Identified

1. **Boundary Objects** - No unit tests for validation functions
2. **Server Actions** - No integration tests for CRUD operations
3. **AI Generation** - No tests for prompt templates or response parsing
4. **Canvas Operations** - No tests for layer/activity/cell management
5. **Admin Pages** - No smoke tests for page rendering
6. **User Flows** - No E2E tests for critical journeys

---

## Entity Inventory

### Core Entities

| Entity | Table | Boundary Object | Server Actions | Priority |
|--------|-------|-----------------|----------------|----------|
| Projects | `projects` | - | - | Medium |
| Ventures | `ventures` | - | - | Medium |
| Specimens | `specimens` | - | - | Low |
| Studio Projects | `studio_projects` | - | - | Low |
| Gallery Sequences | `gallery_sequences` | - | - | Low |

### Journey Entities

| Entity | Table | Boundary Object | Server Actions | Priority |
|--------|-------|-----------------|----------------|----------|
| Journeys | `journeys` | `lib/boundary-objects/journeys.ts` | `journeys/[id]/canvas/actions.ts` | High |
| Journey Stages | `journey_stages` | - | - | High |
| Journey Cells | `journey_cells` | `lib/boundary-objects/journey-cells.ts` | - | High |
| Touchpoints | `touchpoints` | - | - | High |

### Story Map Entities

| Entity | Table | Boundary Object | Server Actions | Priority |
|--------|-------|-----------------|----------------|----------|
| Story Maps | `story_maps` | `lib/boundary-objects/story-maps.ts` | `story-maps/[id]/canvas/actions.ts` | Critical |
| Activities | `activities` | - | - | Critical |
| User Stories | `user_stories` | - | - | High |
| Story Map Layers | `story_map_layers` | `lib/boundary-objects/story-map-layers.ts` | - | Critical |

### Blueprint Entities

| Entity | Table | Boundary Object | Server Actions | Priority |
|--------|-------|-----------------|----------------|----------|
| Blueprints | `service_blueprints` | `lib/boundary-objects/blueprints.ts` | `blueprints/[id]/canvas/actions.ts` | High |
| Blueprint Steps | `blueprint_steps` | - | - | High |
| Blueprint Lanes | `blueprint_lanes` | - | - | High |
| Blueprint Cells | `blueprint_cells` | `lib/boundary-objects/blueprint-cells.ts` | - | High |

### Canvas Entities

| Entity | Table | Boundary Object | Server Actions | Priority |
|--------|-------|-----------------|----------------|----------|
| BMC Canvases | `bmc_canvases` | `lib/boundary-objects/bmc-canvas.ts` | `business-models/[id]/canvas/actions.ts` | Medium |
| Customer Profiles | `customer_profile_canvases` | `lib/boundary-objects/customer-profile-canvas.ts` | `customer-profiles/[id]/canvas/actions.ts` | Medium |
| Value Maps | `value_map_canvases` | `lib/boundary-objects/value-map-canvas.ts` | `value-maps/[id]/canvas/actions.ts` | Medium |
| VPC Canvases | `vpc_canvases` | `lib/boundary-objects/vpc-canvas.ts` | `value-propositions/[id]/canvas/actions.ts` | Medium |

### Cross-Cutting

| Entity | Table | Files | Priority |
|--------|-------|-------|----------|
| Entity Links | `entity_links` | `lib/entity-links-validation.ts` | Critical |
| Mappings | `entity_mappings` | `lib/boundary-objects/mappings.ts` | High |
| Studio Links | `studio_project_links` | `lib/boundary-objects/studio-project-links.ts` | Medium |

### AI Generation

| Feature | Files | Priority |
|---------|-------|----------|
| Entity Generation | `lib/ai/actions/generate-entity.ts` | Critical |
| Draft Generation | `lib/ai/actions/generate-draft.ts` | High |
| Field Generation | `lib/ai/actions/generate-field.ts` | High |
| Prompt Templates | `lib/ai/prompts/*.ts` | Critical |
### Studio Projects

Studio infrastructure is tested like any other domain - full coverage for admin workflows and CRUD operations. Individual experiment prototypes may also need tests as they mature.

#### Studio Infrastructure (Full Coverage)

| Entity | Table | Priority | Test Types |
|--------|-------|----------|------------|
| Studio Projects | `studio_projects` | High | Unit + Integration + Smoke |
| Hypotheses | `studio_hypotheses` | High | Unit + Integration |
| Experiments | `studio_experiments` | High | Unit + Integration + Smoke |
#### Test Coverage by Type

| Test Type | What to Test |
|-----------|--------------|
| **Unit** | Validation functions, status transitions |
| **Smoke** | Admin list pages (`/admin/studio-projects`), detail pages, dynamic routes (`/studio/[project]`) |
| **Integration** | Project CRUD actions, hypothesis/experiment management |
| **E2E** | Full project lifecycle (create → shape → work → complete) |

#### Individual Experiment Prototypes

As prototypes mature and become complex, they may warrant their own tests:

| Prototype Complexity | Testing Approach |
|---------------------|------------------|
| Simple demo | No tests needed |
| Has business logic | Unit tests for logic |
| Has user interactions | Component tests |
| Candidates for production | Full test coverage before promotion |

**Example**: A particle system prototype starts simple, but if it grows to include physics calculations, persistence, and user controls, add tests:
```
components/studio/prototypes/particle-system/
├── particle-engine.ts        # Business logic
├── particle-engine.test.ts   # Unit tests for physics
├── particle-canvas.tsx       # React component
└── particle-canvas.test.tsx  # Component tests (if complex)
```

---

## Risk-Based Prioritization

### Tier 1: Critical (Implement First)

High impact, high change frequency, complex logic:

| Category | Items | Test Types |
|----------|-------|------------|
| Entity Links | Validation, type inference, link creation | Unit |
| Story Map Layers | Layer CRUD, reordering, validation | Unit + Integration |
| AI Entity Generation | Prompt building, response parsing | Unit |
| Canvas Grid Operations | Cell positioning, relationship integrity | Unit + Integration |
| Auth Flow | Login, session, protected routes | Smoke + E2E |

### Tier 2: High (Implement Second)

Moderate impact, regular changes:

| Category | Items | Test Types |
|----------|-------|------------|
| Blueprint Operations | Step/lane/cell management | Unit + Integration |
| Journey Operations | Stage/touchpoint management | Unit + Integration |
| AI Draft Generation | Draft naming, field generation | Unit |
| Admin List Pages | Pagination, filtering, sorting | Smoke |
| Canvas Views | Render without crash, basic interactions | Smoke |

### Tier 3: Standard (Implement Third)

Lower change frequency, simpler logic:

| Category | Items | Test Types |
|----------|-------|------------|
| BMC/VPC Canvases | Section updates, validation | Unit + Integration |
| Core Entity CRUD | Projects, ventures, specimens | Integration |
| Gallery Sequences | Ordering, display | Unit |
| Studio Project Links | Link management | Unit |

### Studio: Full Infrastructure Coverage

Studio infrastructure follows the same testing standards as other domains. Individual prototypes get tests as they mature.

| Priority | Category | Items | Test Types |
|----------|----------|-------|------------|
| High | Studio Admin | Project/hypothesis/experiment CRUD, admin pages | Unit + Integration + Smoke |
| High | Dynamic Pages | `/studio/[project]`, `/studio/[project]/[experiment]` | Smoke |
| As Needed | Prototypes | Individual experiment implementations | Tests added when complexity warrants |

**Studio Admin Tests (High)**:
- Unit: Status transitions, validation functions
- Integration: CRUD actions for projects, hypotheses, experiments
- Smoke: Admin list pages, detail pages, forms

**Dynamic Page Tests (High)**:
- Smoke: `/studio/[project]` renders with valid data
- Smoke: `/studio/[project]/[experiment]` mounts registered prototype
- Smoke: Graceful handling of invalid slugs, missing prototypes

---

## Phase 1: Unit Tests

**Goal**: Test pure functions and validation logic in boundary objects and AI modules.

### 1.1 Boundary Object Tests

For each boundary object file, create colocated test file:

#### `lib/boundary-objects/story-map-layers.test.ts`

```typescript
describe('story-map-layers', () => {
  describe('validateLayerName', () => {
    it('accepts valid layer names')
    it('rejects empty names')
    it('rejects names exceeding max length')
    it('trims whitespace from names')
  })

  describe('validateLayerType', () => {
    it('accepts valid layer types')
    it('rejects invalid layer types')
    it('is case-insensitive')
  })

  describe('calculateNextSequence', () => {
    it('returns 0 for empty array')
    it('returns max+1 for existing layers')
    it('handles gaps in sequence numbers')
  })

  describe('validateReorderSequences', () => {
    it('accepts valid sequence arrays')
    it('rejects duplicate sequences')
    it('rejects missing layer IDs')
  })
})
```

#### `lib/boundary-objects/blueprint-cells.test.ts`

```typescript
describe('blueprint-cells', () => {
  describe('validateCellContent', () => {
    it('accepts valid content within limits')
    it('rejects content exceeding max length')
    it('sanitizes HTML content')
  })

  describe('validateCellPosition', () => {
    it('validates step_id exists')
    it('validates lane_id exists')
    it('rejects duplicate positions')
  })

  describe('buildCellKey', () => {
    it('generates consistent keys from step+lane')
    it('handles null values')
  })
})
```

#### `lib/boundary-objects/journey-cells.test.ts`

```typescript
describe('journey-cells', () => {
  describe('validateJourneyCell', () => {
    it('validates required fields')
    it('validates touchpoint references')
    it('validates stage references')
  })

  describe('getCellsByStage', () => {
    it('groups cells by stage correctly')
    it('maintains ordering within groups')
    it('handles empty arrays')
  })
})
```

### 1.2 AI Prompt & Parser Tests

#### `lib/ai/prompts/entity-generation.test.ts`

```typescript
describe('entity-generation prompts', () => {
  describe('buildEntityPrompt', () => {
    it('includes all required context fields')
    it('includes entity-specific field hints')
    it('handles missing optional context')
  })

  describe('getEntityConfig', () => {
    it('returns config for all supported entity types')
    it('throws for unsupported entity types')
    it('includes all required config fields')
  })

  describe('parseEntityResponse', () => {
    it('extracts fields from valid JSON response')
    it('handles markdown code blocks')
    it('returns error for malformed JSON')
    it('applies default values')
  })
})
```

#### `lib/ai/actions/generate-entity.test.ts`

```typescript
describe('generateEntity', () => {
  describe('buildGenerationContext', () => {
    it('includes parent entity context')
    it('includes linked entity context')
    it('includes existing siblings for uniqueness')
  })

  describe('validateGeneratedEntity', () => {
    it('validates required fields are present')
    it('validates field types match schema')
    it('sanitizes string fields')
  })
})
```

### 1.3 Validation & Utility Tests

#### `lib/entity-links-validation.test.ts` (existing, extend)

Add tests for:
```typescript
describe('entity link inference', () => {
  it('infers correct link type for journey → touchpoint')
  it('infers correct link type for story_map → touchpoint')
  it('infers correct link type for blueprint → journey')
  // ... all valid combinations
})

describe('circular reference detection', () => {
  it('detects direct circular references')
  it('detects indirect circular references')
  it('allows valid deep nesting')
})
```

### Phase 1 File List

| File to Test | Test File | Est. Tests |
|--------------|-----------|------------|
| `lib/boundary-objects/story-map-layers.ts` | `story-map-layers.test.ts` | 15-20 |
| `lib/boundary-objects/blueprint-cells.ts` | `blueprint-cells.test.ts` | 10-15 |
| `lib/boundary-objects/journey-cells.ts` | `journey-cells.test.ts` | 10-15 |
| `lib/boundary-objects/journeys.ts` | `journeys.test.ts` | 10-15 |
| `lib/boundary-objects/blueprints.ts` | `blueprints.test.ts` | 10-15 |
| `lib/boundary-objects/mappings.ts` | `mappings.test.ts` | 10-15 |
| `lib/ai/prompts/entity-generation.ts` | `entity-generation.test.ts` | 15-20 |
| `lib/ai/actions/generate-entity.ts` | `generate-entity.test.ts` | 15-20 |
| `lib/ai/actions/generate-draft.ts` | `generate-draft.test.ts` | 10-15 |
| `lib/ai/actions/generate-field.ts` | `generate-field.test.ts` | 10-15 |

**Phase 1 Target**: ~120-160 unit tests

---

## Phase 2: Smoke Tests

**Goal**: Ensure critical admin pages render without crashing.

### 2.1 Test Pattern

```typescript
// __tests__/smoke/admin-pages.test.tsx
import { render, screen } from '@testing-library/react'

// Test that page component renders without throwing
describe('Admin Page Smoke Tests', () => {
  describe('Story Maps', () => {
    it('renders story maps list page', async () => {
      const { StoryMapsPage } = await import('@/app/(private)/admin/story-maps/page')
      // Mock props/data
      render(<StoryMapsPage />)
      expect(screen.getByRole('heading')).toBeInTheDocument()
    })

    it('renders story map canvas page', async () => {
      const { StoryMapCanvasPage } = await import('@/app/(private)/admin/story-maps/[id]/canvas/page')
      render(<StoryMapCanvasPage params={{ id: 'test-id' }} />)
      expect(screen.getByTestId('canvas-container')).toBeInTheDocument()
    })
  })
})
```

### 2.2 Pages to Test

| Route | Component | Priority |
|-------|-----------|----------|
| `/admin/story-maps` | Story maps list | Critical |
| `/admin/story-maps/[id]/canvas` | Story map canvas | Critical |
| `/admin/journeys` | Journeys list | High |
| `/admin/journeys/[id]/canvas` | Journey canvas | High |
| `/admin/blueprints` | Blueprints list | High |
| `/admin/blueprints/[id]/canvas` | Blueprint canvas | High |
| `/admin/canvases/business-models/[id]/canvas` | BMC canvas | Medium |
| `/admin/canvases/value-propositions/[id]/canvas` | VPC canvas | Medium |
| `/admin/projects` | Projects list | Medium |
| `/admin/ventures` | Ventures list | Medium |

#### Studio Pages (Selective)

| Route | Component | Priority |
|-------|-----------|----------|
| `/studio/[project]` | Dynamic project page | Medium |
| `/studio/[project]/[experiment]` | Dynamic experiment page | Medium |

**Studio smoke test focus:**
- Page renders with valid project/experiment slugs
- Page handles missing/invalid slugs gracefully
- Prototype mounting works for registered experiments
- Unregistered prototypes show fallback UI

### 2.3 Error Boundary Testing

```typescript
describe('Error Boundaries', () => {
  it('renders error UI when canvas data fails to load', async () => {
    // Mock Supabase to return error
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } })
    })

    render(<StoryMapCanvasPage params={{ id: 'bad-id' }} />)
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })
})
```

**Phase 2 Target**: ~45-55 smoke tests

---

## Phase 3: Integration Tests

**Goal**: Test server actions with mocked Supabase, verifying data flow and error handling.

### 3.1 Server Action Test Pattern

```typescript
// app/(private)/admin/story-maps/[id]/canvas/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockSupabaseClient } from '@/__tests__/setup'
import {
  createLayerAction,
  updateLayerAction,
  deleteLayerAction,
  reorderLayersAction
} from './actions'

describe('Story Map Layer Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    })
  })

  describe('createLayerAction', () => {
    it('creates a layer with valid input', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'layer-1', name: 'Test Layer', sequence: 0 },
          error: null
        })
      })

      const result = await createLayerAction('story-map-1', 'Test Layer', 'actor')

      expect(result.success).toBe(true)
      expect(result.data?.name).toBe('Test Layer')
    })

    it('returns error for unauthenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await createLayerAction('story-map-1', 'Test', 'actor')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })

    it('validates layer name', async () => {
      const result = await createLayerAction('story-map-1', '', 'actor')

      expect(result.success).toBe(false)
      expect(result.error).toContain('name')
    })

    it('handles database errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Unique constraint violation' }
        })
      })

      const result = await createLayerAction('story-map-1', 'Duplicate', 'actor')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('reorderLayersAction', () => {
    it('reorders layers using two-phase approach', async () => {
      const updateCalls: { id: string; sequence: number }[] = []

      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn((data) => {
          updateCalls.push(data)
          return {
            eq: vi.fn().mockResolvedValue({ error: null })
          }
        })
      })

      await reorderLayersAction('story-map-1', ['layer-2', 'layer-1', 'layer-3'])

      // Verify two-phase update pattern
      expect(updateCalls.length).toBeGreaterThanOrEqual(6) // 3 negative + 3 positive
    })

    it('rolls back on partial failure', async () => {
      let callCount = 0
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn(() => {
          callCount++
          // Fail on 4th call (first positive sequence)
          if (callCount === 4) {
            return { eq: vi.fn().mockResolvedValue({ error: { message: 'Failed' } }) }
          }
          return { eq: vi.fn().mockResolvedValue({ error: null }) }
        })
      })

      const result = await reorderLayersAction('story-map-1', ['layer-1', 'layer-2'])

      expect(result.success).toBe(false)
      // Verify rollback was attempted
    })
  })
})
```

### 3.2 Server Actions to Test

| Actions File | Functions | Priority |
|--------------|-----------|----------|
| `story-maps/[id]/canvas/actions.ts` | Layer CRUD, reorder, story CRUD | Critical |
| `journeys/[id]/canvas/actions.ts` | Stage CRUD, touchpoint CRUD, cell updates | High |
| `blueprints/[id]/canvas/actions.ts` | Step/lane/cell CRUD | High |
| `business-models/[id]/canvas/actions.ts` | Section updates | Medium |
| `value-propositions/[id]/canvas/actions.ts` | Section updates | Medium |

#### Studio Integration Tests

| Actions File | Functions | Priority |
|--------------|-----------|----------|
| Studio project actions | Project CRUD, status transitions | High |
| Studio hypothesis actions | Hypothesis CRUD, validation status | High |
| Studio experiment actions | Experiment CRUD, outcome recording | High |

**Studio Admin Integration Test Focus:**

```typescript
describe('Studio Project Actions', () => {
  it('creates project with required fields', async () => {})
  it('validates slug uniqueness', async () => {})
  it('transitions status correctly', async () => {})
  it('links project to ventures/journeys via entity_links', async () => {})
})

describe('Studio Hypothesis Actions', () => {
  it('creates hypothesis linked to project', async () => {})
  it('validates status transitions (proposed → testing → validated/invalidated)', async () => {})
  it('maintains sequence ordering', async () => {})
})

describe('Studio Experiment Actions', () => {
  it('creates experiment linked to project and hypothesis', async () => {})
  it('validates experiment type', async () => {})
  it('records outcome with learnings', async () => {})
})
```

### 3.3 AI Action Integration Tests

```typescript
// lib/ai/actions/generate-entity.test.ts
describe('generateEntityAction', () => {
  it('generates entity with full context', async () => {
    // Mock AI SDK
    vi.mocked(generateText).mockResolvedValue({
      text: JSON.stringify({ name: 'Generated Name', description: 'Generated desc' })
    })

    // Mock context fetching
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: { name: 'Parent Entity' },
        error: null
      })
    })

    const result = await generateEntityAction({
      entityType: 'activity',
      parentId: 'story-map-1',
      count: 1
    })

    expect(result.success).toBe(true)
    expect(result.entities).toHaveLength(1)
  })

  it('respects rate limits', async () => {
    // Mock rate limit exceeded
    vi.mock('@/lib/ai/rate-limit', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ allowed: false, retryAfter: 60 })
    }))

    const result = await generateEntityAction({
      entityType: 'activity',
      parentId: 'story-map-1',
      count: 1
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('rate limit')
  })
})
```

**Phase 3 Target**: ~80-100 integration tests

---

## Phase 4: E2E Tests

**Goal**: Test critical user journeys end-to-end with Playwright.

### 4.1 Setup

```bash
npm install -D @playwright/test
npx playwright install
```

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### 4.2 Critical User Flows

#### Authentication Flow

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('user can log in and access admin', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'testpassword')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/admin')
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  })

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/admin/story-maps')
    await expect(page).toHaveURL(/\/login/)
  })
})
```

#### Story Map Canvas Flow

```typescript
// e2e/story-map-canvas.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Story Map Canvas', () => {
  test.beforeEach(async ({ page }) => {
    // Login helper
    await loginAsTestUser(page)
  })

  test('user can create and manage layers', async ({ page }) => {
    await page.goto('/admin/story-maps/test-map/canvas')

    // Add a layer
    await page.click('button:has-text("Add Layer")')
    await page.fill('[data-testid="layer-name-input"]', 'Customer Actions')
    await page.click('button:has-text("Create")')

    // Verify layer appears
    await expect(page.getByText('Customer Actions')).toBeVisible()

    // Edit layer name
    await page.click('[data-testid="layer-menu-button"]')
    await page.click('text=Rename')
    await page.fill('[data-testid="layer-name-input"]', 'User Actions')
    await page.keyboard.press('Enter')

    await expect(page.getByText('User Actions')).toBeVisible()
    await expect(page.getByText('Customer Actions')).not.toBeVisible()
  })

  test('user can create stories in canvas cells', async ({ page }) => {
    await page.goto('/admin/story-maps/test-map/canvas')

    // Click on a cell to create story
    await page.click('[data-testid="canvas-cell-0-0"]')
    await page.fill('[data-testid="story-title-input"]', 'Login to account')
    await page.click('button:has-text("Create Story")')

    await expect(page.getByText('Login to account')).toBeVisible()
  })

  test('user can drag to reorder layers', async ({ page }) => {
    await page.goto('/admin/story-maps/test-map/canvas')

    const layer1 = page.getByTestId('layer-row-0')
    const layer2 = page.getByTestId('layer-row-1')

    // Drag layer1 below layer2
    await layer1.dragTo(layer2)

    // Verify order changed
    const layers = await page.getByTestId(/layer-row-/).allTextContents()
    expect(layers[0]).toContain('Layer 2') // Was second, now first
  })
})
```

#### AI Generation Flow

```typescript
// e2e/ai-generation.spec.ts
test.describe('AI Generation', () => {
  test('user can generate activities from touchpoint context', async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto('/admin/story-maps/linked-map/canvas')

    // Open AI generation menu
    await page.click('button:has-text("Generate")')
    await page.click('text=Activities')

    // Configure generation
    await page.fill('[data-testid="count-input"]', '3')
    await page.fill('[data-testid="instructions-input"]', 'Focus on checkout flow')
    await page.click('button:has-text("Generate")')

    // Wait for generation (with timeout)
    await expect(page.getByTestId('activity-column')).toHaveCount(3, { timeout: 30000 })
  })
})
```

### 4.3 E2E Test Files

| File | Flows Covered | Priority |
|------|---------------|----------|
| `e2e/auth.spec.ts` | Login, logout, protected routes | Critical |
| `e2e/story-map-canvas.spec.ts` | Layer CRUD, story CRUD, reordering | Critical |
| `e2e/journey-canvas.spec.ts` | Stage CRUD, touchpoint management | High |
| `e2e/blueprint-canvas.spec.ts` | Step/lane/cell management | High |
| `e2e/ai-generation.spec.ts` | Entity generation flows | High |
| `e2e/canvas-navigation.spec.ts` | Entity linking, navigation between canvases | Medium |
| `e2e/studio-project.spec.ts` | Project lifecycle (create → shape → work → complete) | High |

**Phase 4 Target**: ~25-35 E2E tests

---

## Test Patterns & Examples

### Pattern 1: Boundary Object Unit Test

```typescript
// lib/boundary-objects/story-map-layers.test.ts
import { describe, it, expect } from 'vitest'
import {
  validateLayerName,
  validateLayerType,
  LAYER_NAME_MAX_LENGTH,
  VALID_LAYER_TYPES
} from './story-map-layers'

describe('validateLayerName', () => {
  it('returns success for valid names', () => {
    const result = validateLayerName('Customer Actions')
    expect(result.success).toBe(true)
    expect(result.data).toBe('Customer Actions')
  })

  it('trims whitespace', () => {
    const result = validateLayerName('  Trimmed Name  ')
    expect(result.data).toBe('Trimmed Name')
  })

  it('returns error for empty string', () => {
    const result = validateLayerName('')
    expect(result.success).toBe(false)
    expect(result.error).toContain('required')
  })

  it('returns error for whitespace-only string', () => {
    const result = validateLayerName('   ')
    expect(result.success).toBe(false)
  })

  it('returns error for names exceeding max length', () => {
    const longName = 'a'.repeat(LAYER_NAME_MAX_LENGTH + 1)
    const result = validateLayerName(longName)
    expect(result.success).toBe(false)
    expect(result.error).toContain('characters')
  })

  it('accepts names at max length', () => {
    const maxName = 'a'.repeat(LAYER_NAME_MAX_LENGTH)
    const result = validateLayerName(maxName)
    expect(result.success).toBe(true)
  })
})

describe('validateLayerType', () => {
  it.each(VALID_LAYER_TYPES)('accepts valid type: %s', (type) => {
    const result = validateLayerType(type)
    expect(result.success).toBe(true)
  })

  it('returns error for invalid type', () => {
    const result = validateLayerType('invalid-type')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid layer type')
  })

  it('is case-insensitive', () => {
    const result = validateLayerType('ACTOR')
    expect(result.success).toBe(true)
    expect(result.data).toBe('actor') // Normalized to lowercase
  })
})
```

### Pattern 2: AI Prompt Test

```typescript
// lib/ai/prompts/entity-generation.test.ts
import { describe, it, expect } from 'vitest'
import { buildEntityPrompt, parseEntityResponse, getEntityConfig } from './entity-generation'

describe('buildEntityPrompt', () => {
  it('builds prompt with full context', () => {
    const prompt = buildEntityPrompt({
      entityType: 'activity',
      context: {
        story_map_name: 'Checkout Flow',
        touchpoint_description: 'User completes purchase'
      },
      count: 3,
      instructions: 'Focus on error states'
    })

    expect(prompt).toContain('Checkout Flow')
    expect(prompt).toContain('User completes purchase')
    expect(prompt).toContain('3')
    expect(prompt).toContain('Focus on error states')
  })

  it('includes field hints for entity type', () => {
    const config = getEntityConfig('activity')
    const prompt = buildEntityPrompt({
      entityType: 'activity',
      context: {},
      count: 1
    })

    for (const hint of Object.values(config.fieldHints)) {
      expect(prompt).toContain(hint)
    }
  })

  it('handles missing optional context gracefully', () => {
    const prompt = buildEntityPrompt({
      entityType: 'activity',
      context: {}, // No context
      count: 1
    })

    expect(prompt).toBeDefined()
    expect(prompt).not.toContain('undefined')
    expect(prompt).not.toContain('null')
  })
})

describe('parseEntityResponse', () => {
  it('parses valid JSON array response', () => {
    const response = '[{"name": "Step 1", "description": "First step"}]'
    const result = parseEntityResponse(response, 'activity')

    expect(result.success).toBe(true)
    expect(result.entities).toHaveLength(1)
    expect(result.entities[0].name).toBe('Step 1')
  })

  it('extracts JSON from markdown code blocks', () => {
    const response = '```json\n[{"name": "Step 1"}]\n```'
    const result = parseEntityResponse(response, 'activity')

    expect(result.success).toBe(true)
    expect(result.entities).toHaveLength(1)
  })

  it('returns error for invalid JSON', () => {
    const response = 'This is not JSON'
    const result = parseEntityResponse(response, 'activity')

    expect(result.success).toBe(false)
    expect(result.error).toContain('parse')
  })

  it('applies default values from config', () => {
    const response = '[{"name": "Story 1"}]'
    const result = parseEntityResponse(response, 'user_story')

    expect(result.success).toBe(true)
    // Default values from config
    expect(result.entities[0].status).toBe('backlog')
    expect(result.entities[0].story_type).toBe('feature')
  })

  it('validates required fields', () => {
    const response = '[{"description": "Missing name field"}]'
    const result = parseEntityResponse(response, 'activity')

    expect(result.success).toBe(false)
    expect(result.error).toContain('name')
  })
})
```

### Pattern 3: Server Action Integration Test

```typescript
// app/(private)/admin/story-maps/[id]/canvas/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockSupabaseClient } from '@/__tests__/setup'
import { createStoryAction, updateStoryAction, deleteStoryAction } from './actions'

describe('Story CRUD Actions', () => {
  const mockUser = { id: 'user-1', email: 'test@example.com' }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })
  })

  describe('createStoryAction', () => {
    it('creates story with valid input', async () => {
      const newStory = {
        title: 'Login to account',
        activity_id: 'activity-1',
        layer_id: 'layer-1'
      }

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'story-1', ...newStory },
          error: null
        })
      })

      const result = await createStoryAction(newStory)

      expect(result.success).toBe(true)
      expect(result.data?.title).toBe('Login to account')

      // Verify Supabase was called correctly
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_stories')
    })

    it('validates title is required', async () => {
      const result = await createStoryAction({
        title: '',
        activity_id: 'activity-1',
        layer_id: 'layer-1'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('title')
    })

    it('validates activity_id exists', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      })

      const result = await createStoryAction({
        title: 'Test',
        activity_id: 'nonexistent',
        layer_id: 'layer-1'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('activity')
    })
  })

  describe('updateStoryAction', () => {
    it('updates story fields', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'story-1', title: 'Updated Title' },
          error: null
        })
      })

      const result = await updateStoryAction('story-1', { title: 'Updated Title' })

      expect(result.success).toBe(true)
      expect(result.data?.title).toBe('Updated Title')
    })

    it('prevents updating to invalid state', async () => {
      const result = await updateStoryAction('story-1', { status: 'invalid-status' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('status')
    })
  })

  describe('deleteStoryAction', () => {
    it('deletes story by id', async () => {
      mockSupabaseClient.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      })

      const result = await deleteStoryAction('story-1')

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_stories')
    })

    it('handles non-existent story gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: { message: 'Row not found', code: 'PGRST116' }
        })
      })

      const result = await deleteStoryAction('nonexistent')

      // Should succeed silently (idempotent delete)
      expect(result.success).toBe(true)
    })
  })
})
```

### Pattern 4: Smoke Test

```typescript
// __tests__/smoke/canvas-pages.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mockSupabaseClient } from '@/__tests__/setup'

// Mock data
const mockStoryMap = {
  id: 'sm-1',
  name: 'Test Story Map',
  layers: [],
  activities: [],
  stories: []
}

describe('Canvas Page Smoke Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: return empty data (no crash)
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: mockStoryMap, error: null })
    })
  })

  describe('StoryMapCanvasPage', () => {
    it('renders without crashing', async () => {
      const StoryMapCanvasPage = (await import(
        '@/app/(private)/admin/story-maps/[id]/canvas/page'
      )).default

      render(await StoryMapCanvasPage({ params: { id: 'sm-1' } }))

      expect(screen.getByTestId('story-map-canvas')).toBeInTheDocument()
    })

    it('shows loading state', async () => {
      // Delay response
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue(new Promise(() => {})) // Never resolves
      })

      const StoryMapCanvasPage = (await import(
        '@/app/(private)/admin/story-maps/[id]/canvas/page'
      )).default

      render(await StoryMapCanvasPage({ params: { id: 'sm-1' } }))

      expect(screen.getByTestId('canvas-loading')).toBeInTheDocument()
    })

    it('shows error state on fetch failure', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      })

      const StoryMapCanvasPage = (await import(
        '@/app/(private)/admin/story-maps/[id]/canvas/page'
      )).default

      render(await StoryMapCanvasPage({ params: { id: 'sm-1' } }))

      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})
```

---

## Implementation Checklist

### Phase 1: Unit Tests (Target: 145-185 tests)

#### Boundary Objects
- [ ] `lib/boundary-objects/story-map-layers.test.ts` (~15 tests)
- [ ] `lib/boundary-objects/blueprint-cells.test.ts` (~12 tests)
- [ ] `lib/boundary-objects/journey-cells.test.ts` (~12 tests)
- [ ] `lib/boundary-objects/journeys.test.ts` (~12 tests)
- [ ] `lib/boundary-objects/blueprints.test.ts` (~12 tests)
- [ ] `lib/boundary-objects/mappings.test.ts` (~10 tests)
- [ ] `lib/boundary-objects/bmc-canvas.test.ts` (~8 tests)
- [ ] `lib/boundary-objects/vpc-canvas.test.ts` (~8 tests)

#### AI Module
- [ ] `lib/ai/prompts/entity-generation.test.ts` (~20 tests)
- [ ] `lib/ai/actions/generate-entity.test.ts` (~15 tests)
- [ ] `lib/ai/actions/generate-draft.test.ts` (~12 tests)
- [ ] `lib/ai/actions/generate-field.test.ts` (~10 tests)

#### Studio
- [ ] `lib/boundary-objects/studio-project-links.test.ts` (~10 tests)

#### Validation (extend existing)
- [ ] `lib/entity-links-validation.test.ts` - add inference tests (~15 tests)

### Phase 2: Smoke Tests (Target: 45-55 tests)

- [ ] Create `__tests__/smoke/` directory
- [ ] `__tests__/smoke/admin-list-pages.test.tsx` (~10 tests)
- [ ] `__tests__/smoke/canvas-pages.test.tsx` (~15 tests)
- [ ] `__tests__/smoke/error-boundaries.test.tsx` (~10 tests)

#### Studio Smoke Tests
- [ ] `__tests__/smoke/studio-admin-pages.test.tsx` (~8 tests)
  - `/admin/studio-projects` list page renders
  - `/admin/studio-projects/[id]` detail page renders
  - `/admin/studio-projects/new` form renders
  - Hypothesis and experiment management UI renders
- [ ] `__tests__/smoke/studio-dynamic-pages.test.tsx` (~6 tests)
  - `/studio/[project]` renders with valid slug
  - `/studio/[project]/[experiment]` renders with valid slugs
  - Prototype mounting works for registered experiments
  - Graceful handling of invalid slugs

### Phase 3: Integration Tests (Target: 80-100 tests)

- [ ] `story-maps/[id]/canvas/actions.test.ts` (~20 tests)
- [ ] `journeys/[id]/canvas/actions.test.ts` (~15 tests)
- [ ] `blueprints/[id]/canvas/actions.test.ts` (~15 tests)
- [ ] `business-models/[id]/canvas/actions.test.ts` (~8 tests)
- [ ] `value-propositions/[id]/canvas/actions.test.ts` (~8 tests)
- [ ] `lib/ai/actions/generate-entity.test.ts` - integration (~10 tests)

#### Studio Integration Tests
- [ ] Studio project actions (~12 tests)
  - Project CRUD, status transitions, entity linking
- [ ] Studio hypothesis actions (~10 tests)
  - Hypothesis CRUD, status validation, sequence ordering
- [ ] Studio experiment actions (~10 tests)
  - Experiment CRUD, type validation, outcome recording

### Phase 4: E2E Tests (Target: 25-35 tests)

- [ ] Install Playwright: `npm install -D @playwright/test`
- [ ] Create `playwright.config.ts`
- [ ] Create `e2e/` directory
- [ ] `e2e/auth.spec.ts` (~5 tests)
- [ ] `e2e/story-map-canvas.spec.ts` (~8 tests)
- [ ] `e2e/journey-canvas.spec.ts` (~5 tests)
- [ ] `e2e/ai-generation.spec.ts` (~5 tests)
- [ ] `e2e/canvas-navigation.spec.ts` (~5 tests)
- [ ] Add E2E scripts to `package.json`

#### Studio E2E Tests
- [ ] `e2e/studio-project.spec.ts` (~6 tests)
  - Create project via admin
  - Add hypotheses and experiments
  - Update status through lifecycle
  - View project on dynamic route
### Test Infrastructure Updates

- [ ] Add `data-testid` attributes to key components
- [ ] Create test user fixtures for E2E
- [ ] Add test database seed script
- [ ] Document test conventions in README
- [ ] Update `package.json` with selective test scripts (see [Test Execution Policy](#test-execution-policy))

---

## Success Metrics

| Phase | Target Tests | Coverage Goal |
|-------|--------------|---------------|
| Phase 1 | 145-185 | Boundary objects 80%+, AI parsers 90%+ |
| Phase 2 | 45-55 | All admin + dynamic pages render |
| Phase 3 | 80-100 | Server actions 70%+, Studio CRUD 80%+ |
| Phase 4 | 25-35 | Critical flows covered incl. Studio lifecycle |
| **Total** | **295-375** | - |

### Execution Time Targets

| Trigger | Target Time | What Runs |
|---------|-------------|-----------|
| Pre-commit | <15s | Related unit tests only |
| Pre-push | <60s | All unit + smoke + build |
| Full suite | <3 min | Unit + smoke + integration |
| E2E | <5 min | Playwright tests |

### Quality Indicators

- Zero flaky tests (deterministic results)
- Pre-commit completes in <15s for typical changes
- All tests have descriptive names
- No commented-out tests
- Test failures provide actionable error messages

### Monitoring

Track these over time:
- Test count by type (unit/smoke/integration/e2e)
- Average execution time per trigger point
- Flaky test occurrences (should be zero)
- Coverage % for critical modules

---

*Document version: 1.2*
*Created: 2026-01-23*
*Updated: 2026-01-23 - Added Test Execution Policy, full Studio infrastructure coverage*
