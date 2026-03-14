# System Graph — /admin/system

Interactive 3D visualization of the jonfriis.com architecture: all database tables, apps, tools, and their relationships, rendered as a force-directed graph.

**Route**: `/admin/system`
**Source**: `lib/admin/system/`, `components/admin/system/`, `app/actions/admin/system.ts`

---

## Purpose

Provides a living map of the database schema and application structure — useful for understanding coupling, finding orphaned tables, and orienting new work. Not user-facing; admin-only.

---

## Architecture

### Static Registry Pattern

The graph is defined entirely in code, not derived from the live database schema. `lib/admin/system/static-registry.ts` is the single source of truth for:

- Every Supabase table, its domain, description, and admin href
- Every app and tool, their owned tables
- Every known foreign key relationship

**Implication: this file must be manually updated when tables, apps, or tools are added or removed.** The live database is only queried for row counts (via the server action), not for schema introspection.

### Data Flow

```
static-registry.ts        →  buildStaticGraph()  →  SystemGraphData
app/actions/admin/system  →  live row counts     ↗
                                                      ↓
                                              computeDiagnostics()
                                                      ↓
                                              SystemGraph (R3F / Three.js)
```

### Node Kinds

| Kind             | Description                              | ID prefix        |
|------------------|------------------------------------------|------------------|
| `table`          | A Supabase database table                | `table:<name>`   |
| `app`            | A full studio app (`/apps/*`)            | `app:<slug>`     |
| `tool`           | An internal tool (`/tools/*`)            | `tool:<slug>`    |
| `studio_project` | Reserved for future use                  | `studio:<slug>`  |

### Edge Types

| Type           | Meaning                                              |
|----------------|------------------------------------------------------|
| `foreign_key`  | DB-level FK relationship (child → parent)           |
| `ownership`    | App or tool owns a table                             |
| `entity_link`  | Linked via `entity_links` junction table            |
| `structural`   | Logical chain (e.g. projects → hypotheses → experiments) |

---

## Domain Taxonomy

10 domains used to group nodes visually and color-code the graph. Domains are arranged in a circle for the initial force simulation positions.

| Domain        | Color     | Covers                                                     |
|---------------|-----------|------------------------------------------------------------|
| `core`        | blue      | ventures, log_entries, specimens, gallery, profiles        |
| `studio`      | purple    | studio_projects, hypotheses, experiments, spikes           |
| `validation`  | cyan      | canvases, assumptions, entity_links                        |
| `journeys`    | teal      | user_journeys, stages, touchpoints                         |
| `blueprints`  | indigo    | service_blueprints, blueprint_steps                        |
| `story-maps`  | pink      | story_maps, activities, user_stories, releases             |
| `distribution`| yellow    | channels, distribution_posts, distribution_queue           |
| `auth`        | red       | webauthn_challenges, webauthn_credentials                  |
| `apps`        | green     | chalk, ludo, verbivore, arena, loadout, onder, putt, recess|
| `tools`       | orange    | cog, stable, luv, sampler, duo, remix, spend, repas        |

---

## Diagnostics

`lib/admin/system/diagnostics.ts` runs client-side on the assembled graph and annotates each node with:

- **connectionCount**: total edges (in + out)
- **inDegree / outDegree**: directional counts
- **isOrphan**: no edges at all (warning for table nodes)
- **couplingLevel**: `low` (<4) / `medium` (4–8) / `high` (9–15) / `critical` (>15)
- **signals**: array of `{ severity, message }` health notes

Signals fire for: orphan tables, high-coupling nodes, junction/bridge table pattern, root tables (no parent FK), and apps/tools with no owned tables.

---

## Rendering

Uses **React Three Fiber** (R3F) with a custom force simulation (no external force-graph library). Key decisions:

- Nodes rendered as `<mesh>` spheres, sized by connection count
- Edges rendered as `<Line>` (drei)
- Force simulation runs in a `useEffect` loop using repulsion + spring forces
- Domain cluster centers used as initial positions (circle layout, radius 200)
- Camera: `PerspectiveCamera` with `OrbitControls` (drei)
- Sidebar shows node details and diagnostics on click

---

## Keeping the Registry in Sync

When adding a new table:

```ts
// In lib/admin/system/static-registry.ts → TABLES
new_table_name: { domain: 'core', description: 'What this table does', href: '/admin/route' },
```

When adding a new FK:

```ts
// In FOREIGN_KEYS
{ source: 'child_table', target: 'parent_table', column: 'fk_column_name' },
```

When adding a new app or tool with tables:

```ts
// In APPS or TOOLS
new_app: { label: 'New App', description: '...', href: '/apps/new-app', tables: ['new_app_table1'] },
```

Apps/tools with no DB tables still get a node — just pass `tables: []`.
