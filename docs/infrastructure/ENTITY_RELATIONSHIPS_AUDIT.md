# Entity Relationships Audit

**Date**: 2026-01-13
**Context**: Studio Project Workflow simplification and entity_links standardization

---

## Current State

### Universal Relationship Table

`entity_links` table exists (migration: `20260102200001_create_entity_links.sql`) and provides:
- Polymorphic source/target relationships
- Link types (related, references, validates, tests, etc.)
- Optional metadata, strength, position
- Bidirectional indexing

**Supported entity types** (from table comments):
- project, log_entry, backlog_item, specimen
- studio_project, hypothesis, experiment
- business_model_canvas, customer_profile, value_proposition_canvas, canvas_item
- user_journey, journey_stage, touchpoint
- assumption

### Direct Foreign Keys (Non-Standard)

#### From studio_projects migration:

1. **log_entries**:
   - `studio_project_id UUID` (nullable, cascades to NULL on delete)
   - `studio_experiment_id UUID` (nullable, cascades to NULL on delete)

2. **specimens**:
   - `studio_project_id UUID` (nullable, cascades to NULL on delete)

These create redundancy with entity_links and fragment the relationship model.

---

## Entity Relationship Gaps

Studio projects need relationships with these strategic frameworks:

| Entity | Table | Use Case |
|--------|-------|----------|
| Studio Projects (self) | `studio_projects` | **Critical**: Projects relate to each other (evolved_from, inspired_by, related) |
| Log Entries | `log_entries` | **Critical**: Log entries may underpin new studio project creation |
| Business Model Canvas | `business_model_canvases` | Studio project explores business model hypotheses |
| Value Prop Canvas | `value_proposition_canvases` | Studio project tests value propositions |
| User Journeys | `user_journeys` | Studio project improves journey stages |
| Service Blueprints | `service_blueprints` | Studio project prototypes blueprint elements |
| Story Maps | `story_maps` | Studio project experiments inform story map activities |

**Current state**:
- Log entries have direct FKs but should ALSO support entity_links for easy bidirectional queries
- No studio_project → studio_project relationships defined
- No relationships to strategic frameworks
- Entity_links supports these but no conventions exist for:
  - Which `link_type` to use
  - Direction (studio_project as source or target?)
  - When to create links

---

## Recommendations

### 1. Keep Direct FKs AND Add entity_links (Hybrid Approach)

**Rationale**:
- Direct FKs remain for fast, critical queries (log_entry → studio_project)
- Entity_links enable bidirectional queries and richer relationships
- Log entries may underpin new studio project creation (need easy "find all log entries that could seed projects")

**Migration plan**:
```sql
-- Backfill entity_links from existing FKs (don't drop FKs):
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type)
SELECT 'log_entry', id, 'studio_project', studio_project_id, 'documents'
FROM log_entries WHERE studio_project_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type)
SELECT 'log_entry', id, 'studio_experiment', studio_experiment_id, 'documents'
FROM log_entries WHERE studio_experiment_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type)
SELECT 'specimen', id, 'studio_project', studio_project_id, 'demonstrates'
FROM specimens WHERE studio_project_id IS NOT NULL
ON CONFLICT DO NOTHING;
```

**Keep FKs, use entity_links for**:
- Bidirectional queries (find all log entries that could seed new projects)
- Richer relationships (strength, notes, metadata)
- Studio project cross-references

**Impact**:
- No breaking changes
- Lib functions gain new query capabilities
- Admin UI can offer richer relationship views

### 2. Define Studio Project Link Conventions

Create conventions for linking studio projects to other entities:

#### Studio Project Cross-References (Critical for Easy Relating)

| Target Entity | Link Type | Direction | Use Case |
|---------------|-----------|-----------|----------|
| studio_project | `evolved_from` | new_project → old_project | Project evolved from earlier work |
| studio_project | `inspired_by` | project → inspiration | Project inspired by another |
| studio_project | `related` | project ↔ project | Projects are related (bidirectional) |
| studio_project | `spin_off` | spin_off → parent | Project is a spin-off of parent |

#### Strategic Framework Links

| Target Entity | Link Type | Direction | Use Case |
|---------------|-----------|-----------|----------|
| log_entry | `inspired_by` | studio_project → log_entry | Project seeded from log entry |
| business_model_canvas | `explores` | studio_project → canvas | Project explores business model |
| value_proposition_canvas | `tests` | studio_project → canvas | Project tests value prop |
| user_journey | `improves` | studio_project → journey | Project improves journey |
| service_blueprint | `prototypes` | studio_project → blueprint | Project prototypes blueprint element |
| story_map | `informs` | studio_project → story_map | Project experiments inform story map |

**Implementation**:
- Update entity_links.link_type CHECK constraint to include these types
- Document in protocol
- Add helpers in lib functions for easy cross-referencing

---

## Next Steps

1. **Create migration** to backfill entity_links from direct FKs (keep FKs in place)
2. **Update entity_links CHECK constraint** to include new link types
3. **Add link type constants** to lib/types for type safety
4. **Create helper functions** for common link queries:
   - Studio project cross-references:
     - `getRelatedProjects(projectId)` → related studio_projects
     - `linkProjects(sourceId, targetId, linkType)` → create project-to-project link
   - Log entry relationships:
     - `getProjectInspiration(projectId)` → log_entries that inspired project
     - `getLogsForProject(projectId)` → documents for project (via FK or entity_links)
   - Strategic framework links:
     - `linkProjectToCanvas(projectId, canvasId, linkType)`
     - `linkProjectToJourney(projectId, journeyId, linkType)`
5. **Update admin UI** to surface entity_links relationships
6. **Document link conventions** in STUDIO_PROJECT_PROTOCOL.md

---

## Open Questions

1. Should story_maps link to studio_projects, or should specific experiments link to specific activities?
   - Experiments are more granular
   - But project-level links show strategic intent

2. Should we support bidirectional links or enforce direction?
   - entity_links allows querying both ways via indexes
   - But conventions should guide which direction to use

3. When should links be created - manually via admin UI or automatically by code?
   - Strategic framework links probably manual (deliberate)
