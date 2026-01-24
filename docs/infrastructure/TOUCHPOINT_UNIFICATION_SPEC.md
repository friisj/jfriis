# Touchpoint Unification Spec

> Architectural refactor to unify interaction entities across Journey, Blueprint, and Story Map canvases.

**Created:** 2026-01-24
**Status:** Planning
**Author:** Claude (with product-arch agent analysis)

---

## Executive Summary

The current entity model has redundant concepts representing "customer interactions" across three canvas types. This spec documents the decision to unify around the existing `touchpoints` table and clarify the relationship between Journey, Blueprint, and Story Map.

---

## Problem Statement

### Current State (Problematic)

```
Journey → Stages → touchpoints + journey_cells
Blueprint → Steps → blueprint_cells
Story Map → Activities → user_stories
```

**Issues identified:**
1. **Entity duplication**: 4 different "cell" entities (touchpoints, journey_cells, blueprint_cells, user_stories) representing variations of the same concept
2. **Conceptual confusion**: Touchpoint vs Story unclear - both represent discrete customer interactions
3. **No single source of truth**: Same interaction modeled 3 times with no automatic synchronization
4. **Maintenance burden**: Changes must be made in multiple places

### Discovery Process

During canvas view testing (2026-01-24), we paused to clarify the conceptual model:

1. **Journey and Blueprint are parallel lenses** on the same customer experience
   - Journey = experiential/emotional dimension
   - Blueprint = operational/delivery dimension

2. **Story Map is a "double-click"** on a single interaction
   - Expands one touchpoint (e.g., "Login") into granular micro-steps
   - Activities = sequential steps within the interaction
   - Layers = actor perspectives (Customer, System, AI Agent, etc.)

3. **Touchpoint is already 90% of what we need** as a unified "interaction" entity

---

## Agreed Conceptual Model

### The Hierarchy

```
                    TOUCHPOINT (the interaction)
                    e.g., "Login"
                   /         \
                  /           \
           entity_link     entity_link
           (in_stage)      (in_step)
                /               \
               v                 v
        journey_stage      blueprint_step
        "Auth Phase"       "User Login"
        (experience)       (operations)

                    |
                    | entity_link (expanded_by)
                    v

              STORY MAP: "Login Flow"
              (granular breakdown)
                    |
            activities × layers
            ├── "User sees login link"     [Customer]
            ├── "UI shows login form"      [System]
            ├── "User enters credentials"  [Customer]
            ├── "System validates"         [System]
            └── "Dashboard loads"          [System]
```

### Key Principles

1. **Touchpoint = Interaction** (unified entity, may rename)
2. **Journey & Blueprint = Parallel views** of same touchpoints
3. **Story Map = Expansion** of a single touchpoint into micro-steps
4. **Explicit linking** - user controls which touchpoints appear in which stages/steps
5. **No auto-propagation** - adding to Journey doesn't auto-add to Blueprint

---

## Migration Plan

### Phase 1: Schema Changes

**1.1 Make `journey_stage_id` optional on touchpoints**

```sql
-- Current: touchpoints.journey_stage_id is required FK
-- Target: touchpoints can exist independently, linked via entity_links

ALTER TABLE touchpoints
  ALTER COLUMN journey_stage_id DROP NOT NULL;
```

**1.2 Add link types for touchpoint relationships**

Ensure `entity_links` supports:
- `touchpoint` ↔ `journey_stage` (link_type: 'in_stage')
- `touchpoint` ↔ `blueprint_step` (link_type: 'in_step')
- `story_map` → `touchpoint` (link_type: 'expands')

**1.3 Deprecate redundant tables**

Mark for future removal (after migration):
- `journey_cells` - replaced by touchpoint fields + entity_links
- `blueprint_cells` - replaced by touchpoint fields + entity_links
- `user_stories` - keep for now, but clarify role as Story Map internal

### Phase 2: Data Migration

**2.1 Migrate journey_cells to touchpoints**

```sql
-- For each journey_cell, ensure corresponding touchpoint exists
-- Map journey_cell fields to touchpoint fields:
--   content → description
--   emotion_score → (new field or keep in journey context)
--   channel_type → channel_type (already exists)
```

**2.2 Create entity_links for existing touchpoints**

```sql
-- Convert direct FK to entity_link
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type)
SELECT 'touchpoint', id, 'journey_stage', journey_stage_id, 'in_stage'
FROM touchpoints
WHERE journey_stage_id IS NOT NULL;
```

**2.3 Link blueprint_cells to touchpoints**

- Create touchpoints from blueprint_cells where missing
- Link via entity_links with 'in_step' type

### Phase 3: UI Updates

**3.1 Journey Canvas**
- "Add Touchpoint" creates touchpoint + entity_link to stage
- TouchpointDetailPanel shows/edits touchpoint fields
- Remove journey_cells dependency

**3.2 Blueprint Canvas**
- "Add Interaction" creates/selects touchpoint + links to step
- BlueprintCellDetailPanel edits touchpoint from operational lens
- Add fields for frontstage/backstage/support (on touchpoint or via metadata)

**3.3 Story Map Canvas**
- Story Map linked to parent touchpoint via entity_link (expands)
- Activities = micro-steps within the touchpoint
- user_stories retained as implementation details within activities

**3.4 Cross-Canvas Navigation**
- From touchpoint in Journey → "View in Blueprint" (if linked)
- From touchpoint in Blueprint → "View in Journey" (if linked)
- From touchpoint → "Expand to Story Map" (creates or opens)

### Phase 4: Cleanup

- Remove `journey_cells` table
- Remove `blueprint_cells` table (or repurpose)
- Update all canvas actions.ts files
- Update boundary-objects
- Update types

---

## Test Harness Updates

### Existing Tests to Update

| Test File | Changes Needed |
|-----------|----------------|
| `__tests__/server-actions/story-map-actions.test.ts` | Update for new touchpoint relationships |
| `__tests__/server-actions/journey-actions.test.ts` | Remove journey_cells, add touchpoint linking |
| `__tests__/integration/` | Add cross-canvas touchpoint tests |

### New Tests Required

**Unit Tests:**
- `touchpoint-linking.test.ts` - Test entity_link creation for touchpoints
- `touchpoint-crud.test.ts` - Test touchpoint operations independent of parent

**Integration Tests:**
- `touchpoint-journey-blueprint.test.ts` - Same touchpoint visible in both views
- `story-map-expansion.test.ts` - Story map correctly expands touchpoint

**E2E Tests:**
- `canvas-touchpoint-flow.e2e.ts` - Full workflow: create touchpoint → link to stage/step → expand to story map

### Test Data Fixtures

Update fixtures to reflect unified model:
```typescript
// fixtures/touchpoints.ts
export const testTouchpoint = {
  id: 'tp-login-001',
  name: 'User Login',
  description: 'User authenticates to access the system',
  channel_type: 'web',
  // ... linked to both journey_stage AND blueprint_step
}
```

---

## Success Criteria

1. **Single source of truth**: One touchpoint entity serves all three views
2. **No data duplication**: Removing journey_cells and blueprint_cells doesn't lose information
3. **Clear mental model**: Users understand touchpoint → Journey/Blueprint → Story Map relationship
4. **Tests pass**: All existing tests updated and passing
5. **Cross-view navigation**: Can navigate between views for same touchpoint

---

## Open Questions

1. **Rename touchpoints to interactions?**
   - Pro: Clearer semantic meaning
   - Con: Migration complexity, existing references
   - Decision: TBD (can defer)

2. **Blueprint-specific fields (frontstage/backstage)?**
   - Option A: Add columns to touchpoints table
   - Option B: Store in touchpoints.metadata JSONB
   - Option C: Keep as separate display concern (derived from description)
   - Decision: TBD

3. **Story Map user_stories - keep or merge?**
   - Current: user_stories are agile-style work items
   - Question: Are they implementation tasks or interaction micro-steps?
   - Decision: Keep as implementation details within Story Map activities

---

## Timeline

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 0 | Conceptual alignment (this doc) | Complete |
| Phase 1 | Schema changes | Not started |
| Phase 2 | Data migration | Not started |
| Phase 3 | UI updates | Not started |
| Phase 4 | Cleanup & tests | Not started |

---

## References

- Product Architecture Assessment (product-arch agent, 2026-01-24)
- Canvas Views Expansion Plan: `/docs/studio/canvas-views-expansion/plan.md`
- Entity Relationships: `/docs/infrastructure/ENTITY_RELATIONSHIPS.md`
- Test Harness Spec: `/docs/infrastructure/TEST_HARNESS_SPEC.md`

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-24 | Initial spec created from architecture discussion |
