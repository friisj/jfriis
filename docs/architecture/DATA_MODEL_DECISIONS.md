# Data Model Decisions

> Architectural decisions for data storage patterns across the application.

**Date:** 2026-02-03
**Status:** Active reference document

---

## Overview

This document explains the rationale behind data storage patterns used in the application, particularly the tradeoffs between JSONB and relational storage, and how these choices affect entity linking and evidence attachment capabilities.

---

## Storage Pattern Summary

| Entity Type | Storage Pattern | Can Link to Items? | Evidence Level |
|-------------|-----------------|-------------------|----------------|
| **BMC** | JSONB blocks on canvas | No - canvas only | Canvas-level |
| **Customer Profile** | JSONB blocks on canvas | No - canvas only | Canvas-level |
| **Value Map** | JSONB blocks on canvas | No - canvas only | Canvas-level |
| **VPC** | Composition of Profile + Map | No - canvas only | Canvas-level |
| **Blueprint** | Relational `blueprint_cells` | Yes - cell-level | Cell-level |
| **Journey** | Relational `journey_cells` | Yes - cell-level | Cell-level |
| **Story Map** | Relational `user_stories` | Yes - story-level | Story-level |
| **Ventures** | Relational `projects` | Yes | Entity-level |
| **Studio Projects** | Relational `studio_projects` | Yes | Entity-level |

---

## JSONB vs Relational: When to Use Each

### Use JSONB When:

1. **Block/grid structures** - Canvas blocks that form a logical unit
2. **Atomic operations** - The entire structure is saved/loaded together
3. **No individual linking needed** - Items don't need independent relationships
4. **Rapid iteration** - Schema changes don't require migrations
5. **Embedded data** - Items only make sense within their parent context

**Examples:**
- BMC blocks (Key Partners, Value Propositions, etc.)
- Customer Profile segments (Jobs, Pains, Gains)
- Value Map sections (Products, Pain Relievers, Gain Creators)

### Use Relational When:

1. **Individual entity linking** - Items need `entity_links` relationships
2. **Evidence attachment** - Items need `universal_evidence` records
3. **Complex querying** - Need to filter/sort/aggregate items
4. **Cross-entity references** - Items referenced from multiple places
5. **Independent lifecycle** - Items can be created/deleted separately

**Examples:**
- Blueprint cells (need risk/cost annotations, evidence)
- Journey cells (need touchpoint links, evidence)
- User stories (need release assignment, dependencies)

---

## Entity Linking Capabilities

### Full Linking Support (Relational)

These entities can be both source and target in `entity_links`:

```
studio_project → venture (spin_off)
studio_project → business_model_canvas (explores)
studio_project → user_journey (improves)
blueprint_cell → touchpoint (delivers)
user_story → touchpoint (enables)
```

### Canvas-Level Linking Only (JSONB)

These entities can only be linked at the canvas level, not individual items:

```
studio_project → business_model_canvas ✓
studio_project → bmc_item ✗ (not possible)
```

**Workaround:** If you need to reference a specific BMC item, use the canvas link with metadata:

```typescript
await linkProjectToCanvas(projectId, canvasId, 'business_model_canvas', {
  metadata: {
    focusBlock: 'value_propositions',
    focusItemId: 'item-uuid-here',
  }
})
```

---

## Evidence Attachment Strategy

### Current System

| Storage | How to Attach Evidence |
|---------|----------------------|
| Relational (cells, stories) | `universal_evidence` table with `entity_type` + `entity_id` |
| JSONB (canvas blocks) | `universal_evidence` with `entity_type: 'business_model_canvas'` + canvas ID |

### Evidence System Components

| Table | Purpose | Status |
|-------|---------|--------|
| `universal_evidence` | General evidence for any entity | Primary system |
| `touchpoint_evidence` | Touchpoint-specific evidence | Legacy (migrate to universal) |
| `BMCBlock.evidence` field | JSONB embedded evidence | Unused - prefer universal_evidence |

**Recommendation:** Use `universal_evidence` for all new evidence. The embedded JSONB evidence fields exist for offline/sync scenarios but are not the primary storage.

---

## Known Limitations

### 1. JSONB Item Linking

**Limitation:** Individual items within JSONB blocks (e.g., a specific BMC value proposition) cannot be directly linked via `entity_links`.

**Why:** The `entity_links` table requires a `target_id` that resolves to a database row. JSONB items don't have independent rows.

**Mitigations:**
- Use canvas-level links with metadata for context
- Items have stable UUIDs (`BMCItem.id`) that could be referenced in metadata
- For critical linking needs, consider migrating to relational storage

**Recommendation:** Accept this limitation for now. Canvas-level linking is sufficient for most use cases. Revisit if strong user need emerges.

### 2. Evidence on JSONB Items

**Limitation:** Cannot attach evidence to a specific BMC item, only to the whole canvas.

**Workaround:** Use `universal_evidence` with custom metadata:

```typescript
{
  entity_type: 'business_model_canvas',
  entity_id: canvasId,
  metadata: {
    targetBlock: 'value_propositions',
    targetItemId: 'item-uuid',
  }
}
```

### 3. Querying JSONB Content

**Limitation:** Complex queries on JSONB content are less efficient than relational queries.

**Mitigation:** For search/filter scenarios, consider:
- Full-text search indexes on JSONB fields
- Materialized views for common query patterns
- Hybrid approach: relational index table + JSONB storage

---

## Migration Considerations

### When to Migrate JSONB → Relational

Consider migration if:
- Users frequently need to link individual items
- Evidence attachment at item level is critical
- Complex querying/filtering is required
- Item-level permissions are needed

### Migration Strategy

1. Create new relational table with same structure
2. Add migration script to copy JSONB data to rows
3. Update UI to read from new table
4. Maintain JSONB field for backwards compatibility period
5. Remove JSONB field after validation

**Note:** This is a significant change. Only pursue if there's clear user value.

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2024-XX | BMC uses JSONB | Blocks are atomic, rapid iteration needed |
| 2024-XX | Blueprint uses relational | Need cell-level evidence and touchpoint links |
| 2024-XX | Journey uses relational | Need cell-level touchpoint relationships |
| 2025-XX | Story Map uses relational | Need story-level linking and release assignment |
| 2026-02 | Document tradeoffs | Clarify when to use each pattern |

---

## Related Documents

- `docs/infrastructure/BOUNDARY_OBJECTS_ASSESSMENT.md` - Assessment that prompted this doc
- `docs/infrastructure/ENTITY_RELATIONSHIPS.md` - Entity links system
- `docs/infrastructure/TOUCHPOINT_UNIFICATION_SPEC.md` - Evidence migration plans

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-02-03 | Claude | Initial document |
