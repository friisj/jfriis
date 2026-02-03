# Boundary Objects Architecture Assessment

> Critical assessment of how boundary objects work with canvases, studio projects, and ventures.

**Date:** 2026-01-24
**Status:** ✅ Remediation complete (2026-02-03)

---

## Executive Summary

The boundary objects layer has **strong foundations for canvases** but **significant gaps for ventures and studio project integration**. The recent canvas refactoring (TimelineCanvas, CanvasColumnHeader, etc.) improved UI consistency, but the underlying data model has architectural misalignments that should be addressed.

---

## Current Architecture

### Boundary Objects Inventory

| File | Purpose | Status |
|------|---------|--------|
| `lib/boundary-objects/bmc-canvas.ts` | BMC types, validation, config | Complete |
| `lib/boundary-objects/customer-profile-canvas.ts` | Customer Profile types | Complete |
| `lib/boundary-objects/value-map-canvas.ts` | Value Map types | Complete |
| `lib/boundary-objects/vpc-canvas.ts` | VPC composition + fit | Complete |
| `lib/boundary-objects/blueprint-cells.ts` | Blueprint cell validation | Complete |
| `lib/boundary-objects/journey-cells.ts` | Journey cell validation | Complete |
| `lib/boundary-objects/story-map-layers.ts` | Story map layer types | Complete |
| `lib/boundary-objects/canvas-layers.ts` | Unified layer config | Complete |
| `lib/boundary-objects/mappings.ts` | Touchpoint mappings (entity_links) | Complete |
| `lib/boundary-objects/studio-project-links.ts` | Studio project linking | Complete |
| `lib/boundary-objects/index.ts` | Barrel export | **Incomplete** |

### Entity Relationship System

| Component | Location | Status |
|-----------|----------|--------|
| Type definitions | `lib/types/entity-relationships.ts` | Complete |
| Entity link helpers | `lib/entity-links.ts` | Complete |
| Entity type constants | `ENTITY_TYPES` constant | **Missing `venture`** |
| Linkable types | `LinkableEntityType` union | **Missing `venture`** |

---

## What's Working Well

### 1. Canvas Boundary Objects

All canvas boundary objects follow a consistent pattern:

```typescript
// Type definitions
export interface BMCItem { ... }
export interface BMCBlock { ... }
export interface BMCCanvas { ... }

// Configuration
export const BMC_BLOCK_CONFIG: Record<BMCBlockId, BMCBlockConfig> = { ... }

// Validation with XSS protection
export function validateItemContent(content: string): DataResult<string> { ... }

// Utilities
export function normalizeBlock(block: unknown): BMCBlock { ... }
export function createNewItem(content: string, priority?: ItemPriority): BMCItem { ... }
```

### 2. Timeline Pattern Unification

The recent refactoring created shared infrastructure:

- `canvas-layers.ts` - Unified layer configuration for Blueprint, Journey, Story Map
- `useCanvasCellSelection` hook - Shared cell selection state
- `useGridCellInteraction` hook - Shared click/keyboard handling
- `CanvasColumnHeader` / `CanvasLaneHeader` - Generic components

### 3. Entity Links System

The `entity_links` table provides flexible polymorphic relationships:

```typescript
// studio-project-links.ts provides typed helpers
await linkProjectToCanvas(projectId, canvasId, 'business_model_canvas')
await linkProjectToJourney(projectId, journeyId)
await linkProjectToBlueprint(projectId, blueprintId)
await linkProjectToStoryMap(projectId, storyMapId)
```

---

## Issues Identified

### P0: Ventures Missing from Entity System

**Problem:** The `venture` entity type is completely absent from the entity relationship system.

| Gap | Location | Impact |
|-----|----------|--------|
| Not in `LinkableEntityType` | `lib/types/entity-relationships.ts:137` | Can't type venture links |
| No `ENTITY_TYPES.VENTURE` | `lib/types/entity-relationships.ts:283` | Must use magic strings |
| Not in `ENTITY_TYPE_TABLE_MAP` | `lib/types/entity-relationships.ts:382` | Can't resolve table name |
| No boundary-objects file | `lib/boundary-objects/` | No shared validation |

**Why this matters:** Studio projects that "spin-off" should link to their resulting venture. This is impossible via the entity system.

**Note:** The table is called `projects` (see `lib/mcp/schemas/ventures.ts` deprecation comments) but the entity should be called `venture` going forward.

### P1: Index.ts Export Gaps

**Problem:** `lib/boundary-objects/index.ts` only exports 4 of 10+ boundary object files.

```typescript
// Current exports
export * from './journeys'
export * from './mappings'
export * from './blueprints'
export * from './story-maps'

// Missing exports
// bmc-canvas, customer-profile-canvas, value-map-canvas, vpc-canvas
// canvas-layers, blueprint-cells, journey-cells, story-map-layers
// studio-project-links
```

**Impact:** Consumers must import from specific files rather than the barrel export.

### P2: Studio Projects Lack Boundary Objects

**Problem:** No boundary-objects files for studio domain entities.

| Missing | What's Needed |
|---------|---------------|
| `studio-projects.ts` | Status validation, slug validation, temperature enum |
| `studio-hypotheses.ts` | Statement validation, status transitions |
| `studio-experiments.ts` | Type enum, outcome enum, status transitions |

**Current state:** Validation only exists in MCP layer (`lib/mcp/schemas/`) which isn't importable by UI components.

### P3: Inconsistent Data Storage Patterns

**Problem:** Different storage strategies for similar entities create inconsistent capabilities.

| Entity | Storage | Can Link to Items? |
|--------|---------|-------------------|
| BMC | JSONB blocks on canvas | No - only canvas-level |
| VPC | JSONB blocks on canvas | No - only canvas-level |
| Customer Profile | JSONB blocks on canvas | No - only canvas-level |
| Value Map | JSONB blocks on canvas | No - only canvas-level |
| Blueprint | Relational `blueprint_cells` | Yes - cell-level |
| Journey | Relational `journey_cells` | Yes - cell-level |
| Story Map | Relational `user_stories` | Yes - story-level |

**Impact:** You cannot attach evidence or create relationships to individual BMC items - only to the whole canvas.

### P4: Evidence System Fragmentation

**Problem:** Multiple evidence storage locations.

| Location | Purpose | Status |
|----------|---------|--------|
| `universal_evidence` table | General evidence for any entity | Implemented |
| `touchpoint_evidence` table | Touchpoint-specific evidence | Legacy |
| `BMCBlock.evidence` field | JSONB embedded evidence | Unused? |

**Impact:** Unclear which system to use; potential for orphaned data.

---

## Remediation Plan

### Phase 1: Entity System Completion (P0)

**Goal:** Add venture to entity relationship system.

**Tasks:**

1. **Update `lib/types/entity-relationships.ts`:**
   ```typescript
   // Add to LinkableEntityType union (~line 137)
   | 'venture'

   // Add to ENTITY_TYPES constant (~line 283)
   VENTURE: 'venture' as const,

   // Add to ENTITY_TYPE_TABLE_MAP (~line 382)
   venture: 'projects',  // Note: table name is still 'projects'

   // Add to IMPLEMENTED_ENTITY_TYPES set (~line 410)
   'venture',
   ```

2. **Create `lib/boundary-objects/ventures.ts`:**
   ```typescript
   // Re-export Zod schemas from MCP for shared use
   export { VentureSchema, Venture, VentureCreate, VentureUpdate } from '@/lib/mcp/schemas/ventures'

   // Add validation functions
   export function validateVentureSlug(slug: string): DataResult<string>
   export function validateVentureStatus(status: string): DataResult<VentureStatus>
   ```

3. **Add link helpers to `studio-project-links.ts`:**
   ```typescript
   export async function linkProjectToVenture(
     projectId: string,
     ventureId: string,
     options?: { linkType?: 'spin_off' | 'related' }
   )
   ```

**Estimated effort:** Small

### Phase 2: Index Exports (P1)

**Goal:** All boundary objects importable from barrel export.

**Tasks:**

1. **Update `lib/boundary-objects/index.ts`:**
   ```typescript
   // Existing
   export * from './journeys'
   export * from './mappings'
   export * from './blueprints'
   export * from './story-maps'

   // Add canvas boundary objects
   export * from './bmc-canvas'
   export * from './customer-profile-canvas'
   export * from './value-map-canvas'
   export * from './vpc-canvas'
   export * from './canvas-layers'

   // Add cell/layer boundary objects
   export * from './blueprint-cells'
   export * from './journey-cells'
   export * from './story-map-layers'

   // Add studio linking
   export * from './studio-project-links'

   // Add ventures (after Phase 1)
   export * from './ventures'
   ```

**Estimated effort:** Small

### Phase 3: Studio Boundary Objects (P2)

**Goal:** Consistent validation for studio domain.

**Tasks:**

1. **Create `lib/boundary-objects/studio-projects.ts`:**
   ```typescript
   export type ProjectStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'
   export type ProjectTemperature = 'hot' | 'warm' | 'cold'

   export const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
     draft: ['active', 'archived'],
     active: ['paused', 'completed', 'archived'],
     paused: ['active', 'archived'],
     completed: ['archived'],
     archived: [],
   }

   export function validateStatusTransition(from: ProjectStatus, to: ProjectStatus): DataResult<ProjectStatus>
   export function validateProjectSlug(slug: string): DataResult<string>
   ```

2. **Create `lib/boundary-objects/studio-hypotheses.ts`:**
   ```typescript
   export type HypothesisStatus = 'proposed' | 'testing' | 'validated' | 'invalidated'

   export function validateHypothesisStatement(statement: string): DataResult<string>
   export function validateValidationCriteria(criteria: string): DataResult<string>
   ```

3. **Create `lib/boundary-objects/studio-experiments.ts`:**
   ```typescript
   export type ExperimentType = 'experiment' | 'prototype' | 'discovery_interviews' | 'landing_page'
   export type ExperimentStatus = 'planned' | 'in_progress' | 'completed' | 'abandoned'
   export type ExperimentOutcome = 'success' | 'failure' | 'inconclusive' | 'pivoted'

   export function validateExperimentSlug(slug: string): DataResult<string>
   ```

**Estimated effort:** Medium

### Phase 4: Documentation (P3, P4)

**Goal:** Document architectural decisions.

**Tasks:**

1. **Create `docs/architecture/DATA_MODEL_DECISIONS.md`:**
   - Document JSONB vs relational tradeoffs
   - Explain when to use each pattern
   - Document evidence attachment strategy per entity type

2. **Update this document** with completion status as phases complete.

**Estimated effort:** Small

### Phase 5: Future Consideration (Deferred)

**JSONB Item Linking:** Currently, BMC items stored in JSONB cannot be linked individually. Options to consider later:

1. **Accept limitation** - Canvas-level linking is sufficient
2. **Add stable IDs** - BMCItem already has `id`, could reference in entity_links
3. **Migrate to relational** - Major breaking change, defer unless strong need

**Recommendation:** Document as known limitation. Revisit if user need emerges.

---

## Verification Checklist

Remediation completed 2026-02-03:

- [x] `venture` appears in `LinkableEntityType`
- [x] `ENTITY_TYPES.VENTURE` constant exists
- [x] `linkProjectToVenture()` function works
- [x] All boundary-objects importable from `lib/boundary-objects` (or documented as direct imports)
- [x] Studio project status transitions validated (`lib/boundary-objects/studio-projects.ts`)
- [x] Hypothesis/experiment validation in shared location (`lib/boundary-objects/studio-hypotheses.ts`, `studio-experiments.ts`)
- [x] Data model decisions documented (`docs/architecture/DATA_MODEL_DECISIONS.md`)

---

## Related Documents

- `docs/infrastructure/ENTITY_RELATIONSHIPS.md` - Entity links system
- `docs/infrastructure/ENTITY_RELATIONSHIPS_AUDIT.md` - Previous audit
- `docs/infrastructure/TOUCHPOINT_UNIFICATION_SPEC.md` - Evidence migration
- `docs/infrastructure/PROJECTS_TO_VENTURES_MIGRATION.md` - Naming migration
- `docs/studio/canvas-views-expansion/plan.md` - Canvas expansion project

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Claude | Initial assessment and remediation plan |
| 2026-02-03 | Claude | Phase 1: Added venture to entity system |
| 2026-02-03 | Claude | Phase 2: Expanded barrel export with documentation |
| 2026-02-03 | Claude | Phase 3: Created studio boundary objects |
| 2026-02-03 | Claude | Phase 4: Created DATA_MODEL_DECISIONS.md |
