# Admin Multi-View Upgrade Plan

## Executive Summary

Upgrade the admin list interface from table-only to support multiple view types (table, grid, kanban, canvas) with per-entity view configuration and user preference persistence.

---

## Current State Analysis

### What We Have
- `AdminTable` component renders data in table format
- Used across 4 entity types: projects, backlog, studio, log
- Each page defines `AdminTableColumn[]` with custom cell renderers
- Strongly typed with TypeScript generics
- Flexible column system handles diverse data types

### Current Usage Pattern
```typescript
<AdminTable
  columns={columns}  // Array of column definitions
  data={items}       // Array of entity data
/>
```

---

## Proposed Architecture

### Component Hierarchy

```
AdminDataView (new parent container)
  ├── ViewToolbar (view switcher + filters)
  │     └── ViewTypeSelector (table | grid | kanban | canvas)
  ├── AdminTableView (renamed from AdminTable)
  ├── AdminGridView (new)
  ├── AdminKanbanView (new)
  └── AdminCanvasView (new)
```

---

## Design Patterns

### 1. Configuration-Based Approach

Each view type has its own configuration interface. Pages only define the views they want to support.

```typescript
<AdminDataView
  data={projects}
  views={{
    table: {
      columns: projectColumns,
    },
    grid: {
      renderCard: (project) => <ProjectCard project={project} />,
      columns: 3,  // grid layout columns
    },
    kanban: {
      groupBy: 'status',
      renderCard: (project) => <ProjectCard project={project} />,
      groups: ['draft', 'active', 'completed', 'archived'],
    },
  }}
  defaultView="table"
  persistenceKey="admin-projects-view"  // For localStorage
/>
```

### 2. Type Definitions

```typescript
// Base view types
type ViewType = 'table' | 'grid' | 'kanban' | 'canvas'

// Table view (existing)
interface TableViewConfig<T> {
  columns: AdminTableColumn<T>[]
  getRowKey?: (row: T) => string
}

// Grid view
interface GridViewConfig<T> {
  renderCard: (item: T) => ReactNode
  columns?: number  // Grid columns (1-6)
  gap?: number      // Gap size in rem
  minCardWidth?: string  // Min width before wrapping
}

// Kanban view
interface KanbanViewConfig<T> {
  groupBy: keyof T | ((item: T) => string)
  groups: Array<{
    id: string
    label: string
    color?: string
  }>
  renderCard: (item: T) => ReactNode
  allowDragDrop?: boolean
  onMove?: (item: T, fromGroup: string, toGroup: string) => Promise<void>
}

// Canvas view (most complex)
interface CanvasViewConfig<T> {
  renderCard: (item: T) => ReactNode
  getPosition: (item: T) => { x: number; y: number }
  onPositionChange?: (item: T, position: { x: number; y: number }) => Promise<void>
  gridSnap?: number
  canvasWidth?: number
  canvasHeight?: number
}

// Main component props
interface AdminDataViewProps<T extends { id: string }> {
  data: T[]
  views: {
    table?: TableViewConfig<T>
    grid?: GridViewConfig<T>
    kanban?: KanbanViewConfig<T>
    canvas?: CanvasViewConfig<T>
  }
  defaultView?: ViewType
  persistenceKey?: string  // For localStorage
  emptyState?: ReactNode
}
```

---

## View-Specific Features

### Table View
- ✅ Already implemented
- Sortable columns (future enhancement)
- Column visibility toggle (future enhancement)
- Pagination (future enhancement)

### Grid View
- Responsive card grid
- Configurable columns (1-6)
- Masonry layout option
- Card hover effects

### Kanban View
- Vertical columns by status/category
- Drag & drop between columns
- Column swimlanes
- Card counts per column
- Optimistic updates on drag

### Canvas View
- Free-form positioning (like Miro/FigJam)
- Drag to reposition
- Pan & zoom
- Grid snapping
- Connection lines (future)
- Most complex - start simple

---

## State Management Strategy

### View Selection State

**Option 1: URL Query Params** (Recommended)
```
/admin/projects?view=kanban
```
- ✅ Bookmarkable
- ✅ Shareable
- ✅ Browser back/forward works
- ❌ More complex implementation

**Option 2: LocalStorage**
```typescript
localStorage.setItem('admin-projects-view', 'grid')
```
- ✅ Simple implementation
- ✅ Persists across sessions
- ❌ Not shareable
- ❌ Not bookmarkable

**Recommendation:** Start with localStorage for simplicity, add URL params in phase 2.

### Persistence Structure
```typescript
// LocalStorage schema
{
  "admin-view-preferences": {
    "projects": "grid",
    "backlog": "kanban",
    "studio": "table",
    "log": "table"
  }
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Create parent component and refactor existing table

1. Create `AdminDataView` parent component
   - View type state management
   - View switcher UI (simple button group)
   - LocalStorage persistence

2. Rename `AdminTable` → `AdminTableView`
   - No functional changes
   - Update all imports

3. Update one entity (projects) to use new API
   - Verify backward compatibility
   - Test view switching with only table view

**Deliverables:**
- [ ] `components/admin/admin-data-view.tsx`
- [ ] `components/admin/views/table-view.tsx` (renamed)
- [ ] `components/admin/views/view-toolbar.tsx`
- [ ] Updated `app/(private)/admin/projects/page.tsx`

### Phase 2: Grid View (Week 2)
**Goal:** Implement first new view type

1. Create `AdminGridView` component
   - Responsive grid layout
   - Card renderer
   - Empty state

2. Create reusable card components per entity
   - `ProjectCard`
   - `BacklogItemCard`
   - etc.

3. Add grid view to all entity types

**Deliverables:**
- [ ] `components/admin/views/grid-view.tsx`
- [ ] `components/admin/cards/project-card.tsx`
- [ ] `components/admin/cards/backlog-item-card.tsx`
- [ ] `components/admin/cards/studio-project-card.tsx`
- [ ] `components/admin/cards/log-entry-card.tsx`

### Phase 3: Kanban View (Week 3-4)
**Goal:** Add drag-and-drop kanban view

1. Research drag-and-drop libraries
   - Options: @dnd-kit, react-beautiful-dnd, react-dnd
   - Recommendation: @dnd-kit (modern, accessible)

2. Create `AdminKanbanView` component
   - Column layout
   - Drag & drop functionality
   - Optimistic UI updates

3. Add kanban configuration to entities
   - Projects: group by `status`
   - Backlog: group by `status`
   - Studio: group by `temperature` or `status`

**Deliverables:**
- [ ] `components/admin/views/kanban-view.tsx`
- [ ] Kanban config for all entities
- [ ] Drag & drop implementation

### Phase 4: Canvas View (Future)
**Goal:** Free-form canvas view (most complex)

This is optional and can be deferred. Requires:
- Pan/zoom functionality
- Position persistence
- Minimap
- Complex interaction patterns

**Recommendation:** Start with phases 1-3, evaluate need for canvas later.

---

## Migration Strategy

### Backward Compatibility

**Option A: Gradual Migration (Recommended)**
1. Keep `AdminTable` as deprecated wrapper
2. New pages use `AdminDataView`
3. Migrate existing pages incrementally
4. Remove `AdminTable` after all migrations complete

```typescript
// Deprecated wrapper for backward compatibility
export function AdminTable<T>(props: AdminTableProps<T>) {
  return (
    <AdminDataView
      data={props.data}
      views={{ table: { columns: props.columns, getRowKey: props.getRowKey } }}
      defaultView="table"
    />
  )
}
```

**Option B: Big Bang Migration**
- Update all 4 entity pages simultaneously
- Higher risk, faster delivery
- Easier to maintain consistency

**Recommendation:** Option A for safety.

---

## Technical Challenges & Solutions

### Challenge 1: Type Safety Across Views
**Problem:** Each view has different config types, hard to type the `views` object.

**Solution:** Use discriminated union or mapped types
```typescript
type ViewConfigs<T> = {
  [K in ViewType]?: K extends 'table' ? TableViewConfig<T>
    : K extends 'grid' ? GridViewConfig<T>
    : K extends 'kanban' ? KanbanViewConfig<T>
    : K extends 'canvas' ? CanvasViewConfig<T>
    : never
}
```

### Challenge 2: Deriving Grid/Kanban From Table Config
**Problem:** Don't want to force pages to define every view manually.

**Solution:** Auto-generate card renderer from table columns
```typescript
function deriveCardFromColumns<T>(columns: AdminTableColumn<T>[]): (item: T) => ReactNode {
  return (item) => (
    <div className="space-y-2">
      {columns.slice(0, 3).map(col => (
        <div key={col.key}>{getCellValue(item, col)}</div>
      ))}
    </div>
  )
}
```

### Challenge 3: View-Specific Actions
**Problem:** Some views need different actions (e.g., kanban needs drag handlers).

**Solution:** View configs can include action handlers
```typescript
kanban: {
  groupBy: 'status',
  renderCard: (item) => <Card item={item} />,
  onMove: async (item, fromStatus, toStatus) => {
    await updateProject(item.id, { status: toStatus })
  }
}
```

### Challenge 4: Responsive Design
**Problem:** Different views need different responsive behavior.

**Solution:** Each view component handles its own responsive logic
- Table: horizontal scroll on mobile
- Grid: reduce columns on smaller screens
- Kanban: horizontal scroll or stacked columns
- Canvas: zoom controls + pan

---

## File Structure

```
components/admin/
├── index.ts                        # Barrel export
├── admin-data-view.tsx            # Main multi-view container
├── admin-list-layout.tsx          # (existing) Page wrapper
├── admin-empty-state.tsx          # (existing) Empty state
├── status-badge.tsx               # (existing) Status badges
├── views/
│   ├── index.ts                   # View barrel export
│   ├── table-view.tsx            # Renamed from admin-table.tsx
│   ├── grid-view.tsx             # Grid layout
│   ├── kanban-view.tsx           # Kanban board
│   ├── canvas-view.tsx           # Canvas (future)
│   └── view-toolbar.tsx          # View switcher UI
├── cards/
│   ├── index.ts
│   ├── project-card.tsx          # Project card component
│   ├── backlog-item-card.tsx     # Backlog card
│   ├── studio-project-card.tsx   # Studio card
│   └── log-entry-card.tsx        # Log card
└── hooks/
    ├── useViewPreference.ts       # View persistence hook
    └── useDragAndDrop.ts          # DnD hook (for kanban)
```

---

## API Examples

### Minimal Usage (Table Only)
```typescript
<AdminDataView
  data={projects}
  views={{
    table: { columns: projectColumns }
  }}
/>
```

### Multi-View With Defaults
```typescript
<AdminDataView
  data={backlogItems}
  views={{
    table: { columns: backlogColumns },
    kanban: {
      groupBy: 'status',
      renderCard: (item) => <BacklogItemCard item={item} />,
      groups: [
        { id: 'inbox', label: 'Inbox', color: 'gray' },
        { id: 'in-progress', label: 'In Progress', color: 'blue' },
        { id: 'shaped', label: 'Shaped', color: 'green' },
      ],
    },
  }}
  defaultView="kanban"
  persistenceKey="admin-backlog-view"
/>
```

### Full Featured
```typescript
<AdminDataView
  data={projects}
  views={{
    table: {
      columns: projectColumns,
    },
    grid: {
      renderCard: (p) => <ProjectCard project={p} />,
      columns: 3,
    },
    kanban: {
      groupBy: 'status',
      renderCard: (p) => <ProjectCard project={p} compact />,
      groups: statusGroups,
      onMove: async (project, from, to) => {
        await updateProjectStatus(project.id, to)
      },
    },
  }}
  defaultView="table"
  persistenceKey="admin-projects-view"
  emptyState={
    <AdminEmptyState
      title="No projects yet"
      description="Create your first project"
      actionHref="/admin/projects/new"
      actionLabel="New Project"
    />
  }
/>
```

---

## Trade-offs & Decisions

### 1. View State: LocalStorage vs URL
**Decision:** Start with localStorage, add URL params later
**Reasoning:** Simpler to implement, can enhance in phase 2

### 2. Card Components: Auto-generate vs Manual
**Decision:** Manual card components per entity
**Reasoning:** More control over design, better user experience

### 3. DnD Library: @dnd-kit vs react-beautiful-dnd
**Decision:** @dnd-kit
**Reasoning:** More modern, better accessibility, smaller bundle, actively maintained

### 4. Canvas View: Include in v1?
**Decision:** No, defer to future
**Reasoning:** High complexity, unclear use case, can add later without breaking changes

### 5. Pagination: Per-view or global?
**Decision:** Defer pagination to phase 2+
**Reasoning:** Current pages don't paginate, can add universally later

---

## Success Criteria

### Phase 1
- [ ] Can switch between view types (even if only table exists)
- [ ] View preference persists across page reloads
- [ ] No regression in existing functionality
- [ ] Type-safe API for view configuration

### Phase 2
- [ ] Grid view displays all entities correctly
- [ ] Grid is responsive (1-3 columns based on screen size)
- [ ] Cards show essential entity information
- [ ] Empty states work in all views

### Phase 3
- [ ] Can drag items between kanban columns
- [ ] Status updates persist to database
- [ ] Optimistic UI updates (no flash)
- [ ] Accessible keyboard navigation

---

## Testing Strategy

### Unit Tests
- View toolbar rendering
- View state persistence
- Card components render correctly
- Column calculations

### Integration Tests
- View switching works
- Data persists across view changes
- Empty states display correctly
- Drag & drop updates database

### Manual Testing Checklist
- [ ] All views work on mobile
- [ ] Keyboard navigation works
- [ ] Screen reader announces view changes
- [ ] Performance with 100+ items
- [ ] Works in all supported browsers

---

## Dependencies

### New Packages Needed

```json
{
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.2"
}
```

### Optional (for canvas view)
```json
{
  "react-zoom-pan-pinch": "^3.4.0"
}
```

---

## Open Questions

1. **Should view preference be per-user or per-browser?**
   - Current: localStorage (per-browser)
   - Future: Could move to user preferences table

2. **Should we support custom view types?**
   - Allow plugins/extensions to register new view types
   - Probably overkill for now

3. **How to handle view-specific filtering?**
   - Some filters make sense for all views
   - Some are view-specific (e.g., kanban swimlane filters)

4. **Should empty states be view-specific?**
   - Current plan: shared empty state
   - Alternative: each view can customize

---

## Rollout Plan

### Week 1: Foundation
- Implement Phase 1 (AdminDataView + refactor)
- Deploy to staging
- Internal testing

### Week 2-3: Grid View
- Implement Phase 2 (Grid view + cards)
- Deploy to staging
- User acceptance testing

### Week 4-5: Kanban View
- Implement Phase 3 (Kanban + DnD)
- Deploy to staging
- Performance testing

### Week 6: Polish & Deploy
- Bug fixes
- Performance optimization
- Documentation
- Deploy to production

---

## Future Enhancements

Beyond the initial implementation:

1. **View-specific filters**
   - Filter by column in table view
   - Quick filters in kanban

2. **Saved views**
   - Save filter + sort + view type combinations
   - Share saved views with team

3. **Column customization**
   - Show/hide columns
   - Reorder columns
   - Column width adjustment

4. **Bulk actions**
   - Select multiple items
   - Batch operations
   - Works across all views

5. **Export functionality**
   - Export current view as CSV/PDF
   - Respect current filters

6. **Timeline view**
   - Chronological view for time-based entities (log entries)
   - Gantt chart for projects

---

## Conclusion

This upgrade transforms the admin interface from a simple table to a flexible multi-view system. The phased approach minimizes risk while delivering value incrementally. The architecture is extensible for future view types without breaking existing functionality.

**Recommended next step:** Review this plan, discuss trade-offs, then implement Phase 1.
