# Canvas View Feature Spec

> Generic visual editing substrate for structured entities

**Status**: Planning
**Priority**: High
**First Target**: Story Maps (2D grid)

---

## Overview

Many entities in the system have visual structures essential to their value:
- **Story Maps**: Activities × Releases grid
- **Service Blueprints**: Swimlane flow (customer → frontstage → backstage → support)
- **User Journeys**: Timeline with stages and touchpoints
- **Value Proposition Canvas**: Customer profile ↔ Value map quadrants
- **Business Model Canvas**: 9-block grid

The current form-based editing doesn't serve these well. This feature adds a **canvas view** - a full-screen visual editing surface that complements the form view.

---

## Requirements Summary

| Requirement | Decision |
|-------------|----------|
| **Trigger** | Toggle button in form header |
| **Render** | Route-based (`/admin/{entity}/[id]/canvas`) |
| **Interaction** | Both drag/drop and structured editing |
| **First Entity** | Story Maps (2D grid) |

---

## Architecture

### URL Structure

```
/admin/story-maps/[id]/edit    → Form view (metadata, relationships)
/admin/story-maps/[id]/canvas  → Canvas view (visual structure)
/admin/story-maps/[id]         → Read-only detail view
```

Same pattern for other entities:
```
/admin/blueprints/[id]/canvas
/admin/journeys/[id]/canvas
/admin/canvases/value-propositions/[id]/canvas
```

### Component Hierarchy

```
CanvasViewLayout
├── CanvasHeader
│   ├── BackToForm button
│   ├── Entity title
│   ├── Mode toggle (drag/structured)
│   └── Actions (save, zoom, etc.)
├── CanvasToolbar (entity-specific tools)
└── CanvasSurface
    └── EntityCanvas (story-map | blueprint | journey | etc.)
        └── CanvasNodes (draggable/editable items)
```

### Generic Components (Shared)

| Component | Purpose |
|-----------|---------|
| `CanvasViewLayout` | Full-screen container with header/toolbar slots |
| `CanvasHeader` | Navigation, mode toggle, actions |
| `CanvasSurface` | Pan/zoom container, grid background |
| `CanvasNode` | Base draggable/selectable item |
| `CanvasConnection` | Lines/arrows between nodes |
| `CanvasPanel` | Slide-out panel for editing selected item |

### Entity-Specific Components

| Entity | Canvas Component | Structure |
|--------|------------------|-----------|
| Story Maps | `StoryMapCanvas` | 2D grid: Activities (columns) × Releases (rows) |
| Blueprints | `BlueprintCanvas` | Swimlanes: 4 horizontal lanes, steps flow left-to-right |
| Journeys | `JourneyCanvas` | Timeline: Stages as columns, touchpoints within |
| VPC | `VPCCanvas` | Split view: Customer profile (left) ↔ Value map (right) |
| BMC | `BMCCanvas` | 9-block grid layout |

---

## Interaction Modes

### Drag Mode (Free-form)
- Drag nodes to reposition
- Drag to create connections
- Multi-select with marquee
- Keyboard shortcuts for alignment

### Structured Mode
- Click to select node
- Edit in side panel
- Add via toolbar buttons
- Reorder via drag handles (constrained)

### Mode Toggle
- Persistent toggle in header
- Remember preference per entity type
- Visual indicator of current mode

---

## Data Flow

### Read
```
Page load → Fetch entity + children → Render canvas
```

### Write (Optimistic)
```
User action → Update local state → Render immediately → Sync to DB → Handle errors
```

### Sync Strategy
- **Positions**: Store in `metadata` JSON field or dedicated position columns
- **Structure**: Direct DB updates (create/update/delete child records)
- **Debounced saves**: Auto-save after 1s of inactivity
- **Conflict handling**: Last-write-wins with timestamp check

---

## Story Map Canvas (First Implementation)

### Data Model

```
story_maps
├── activities (columns)
│   ├── id, name, sequence
│   └── user_stories (cells)
│       ├── id, title, description
│       ├── activity_id (column)
│       └── release_id (row)
└── story_releases (rows)
    ├── id, name, sequence
    └── user_stories (via release_id)
```

### Canvas Layout

```
┌─────────────────────────────────────────────────────────┐
│  [← Form]  Story Map Name           [Drag ○ Structured] │
├─────────────────────────────────────────────────────────┤
│  [+ Activity]  [+ Release]  [+ Story]                   │
├─────────────────────────────────────────────────────────┤
│           │ Activity 1 │ Activity 2 │ Activity 3 │      │
│───────────┼────────────┼────────────┼────────────┼──────│
│ Release 1 │  [Story]   │  [Story]   │            │      │
│───────────┼────────────┼────────────┼────────────┼──────│
│ Release 2 │  [Story]   │            │  [Story]   │      │
│───────────┼────────────┼────────────┼────────────┼──────│
│ Backlog   │  [Story]   │  [Story]   │  [Story]   │      │
└─────────────────────────────────────────────────────────┘
```

### Interactions

| Action | Drag Mode | Structured Mode |
|--------|-----------|-----------------|
| Add story | Drop in cell | Click cell → modal |
| Move story | Drag to new cell | Cut/paste or move modal |
| Edit story | Double-click | Click → side panel |
| Add activity | Drag header | Toolbar button |
| Reorder activities | Drag column | Drag handle |
| Add release | Drag row header | Toolbar button |

---

## Implementation Phases

### Phase 1: Infrastructure
- [ ] `CanvasViewLayout` component
- [ ] `CanvasHeader` with mode toggle
- [ ] `CanvasSurface` with pan/zoom (optional initially)
- [ ] Route structure for `/[id]/canvas`
- [ ] Toggle button in form headers

### Phase 2: Story Map Canvas
- [ ] `StoryMapCanvas` grid component
- [ ] Activity columns (add, reorder, delete)
- [ ] Release rows (add, reorder, delete)
- [ ] Story cards in cells (CRUD)
- [ ] Drag-and-drop between cells
- [ ] Side panel for story editing

### Phase 3: Blueprint Canvas
- [ ] `BlueprintCanvas` swimlane component
- [ ] 4-lane structure
- [ ] Step cards with layer content
- [ ] Sequential flow visualization

### Phase 4: Journey Canvas
- [ ] `JourneyCanvas` timeline component
- [ ] Stage columns
- [ ] Touchpoint cards
- [ ] Emotion curve overlay (optional)

### Phase 5: Canvas Canvases (VPC, BMC)
- [ ] `VPCCanvas` split view
- [ ] `BMCCanvas` 9-block grid
- [ ] Shared canvas item editing

---

## Technical Considerations

### Libraries
- **Drag/drop**: `@dnd-kit/core` (already in use) or native HTML5
- **Pan/zoom**: Consider later if needed; start with fixed grid
- **Animations**: `framer-motion` for smooth transitions

### Performance
- Virtualize large grids (>50 items)
- Debounce position saves
- Optimistic UI updates

### State Management
- Local component state for canvas interactions
- Server state via Supabase queries
- Consider `useSWR` or `react-query` for caching

### Accessibility
- Keyboard navigation between cells
- Screen reader announcements for drag operations
- Focus management on mode switch

---

## Open Questions

1. **Offline support**: Should canvas changes queue for later sync?
2. **Collaboration**: Real-time multi-user editing later?
3. **Undo/redo**: Local undo stack or rely on version history?
4. **Export**: PNG/PDF export of canvas view?
5. **Mobile**: Responsive canvas or desktop-only feature?

---

## Success Criteria

- [ ] Can create and manage story map structure entirely in canvas view
- [ ] Drag mode feels fluid (<16ms frame time)
- [ ] Structured mode works well with keyboard only
- [ ] Data syncs reliably without conflicts
- [ ] Pattern is reusable for blueprints and journeys

---

## References

- Story mapping: Jeff Patton's User Story Mapping
- Service blueprints: Lynn Shostack's service design methodology
- Similar tools: Miro, FigJam, Notion databases, Linear project views
