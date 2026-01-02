# Projects → Ventures Migration: Implementation Status

**Last Updated:** 2026-01-02
**Status:** Phase 1 & 2 Complete, Phases 3-6 Pending

---

## ✅ Completed Phases

### Phase 1: Database Migration ✓
**Status:** Complete and committed
**Files Modified:** 1 new migration file

- ✅ Created `supabase/migrations/20260102000000_rename_projects_to_ventures.sql`
- ✅ Renamed `projects` → `ventures`
- ✅ Renamed `project_specimens` → `venture_specimens`
- ✅ Renamed `log_entry_projects` → `log_entry_ventures`
- ✅ Updated all indexes (13 indexes renamed)
- ✅ Updated triggers (2 triggers recreated with new names)
- ✅ Updated RLS policies (6 policies recreated)
- ✅ Rebuilt materialized view `portfolio_evidence_summary`
- ✅ Updated functions: `compute_evidence_strength`, `suggest_explore_stage_transition`, `get_portfolio_metrics`
- ✅ Updated `backlog_items.converted_to` string values ('project' → 'venture')
- ✅ Added verification queries

**Note:** Migration has NOT been run yet - pending completion of code changes.

### Phase 2: Type System Updates ✓
**Status:** Complete and committed
**Files Modified:** 5 files (4 modified, 1 new)

#### Core Types (lib/types/database.ts) ✓
- ✅ Renamed `Project` → `Venture` interface
- ✅ Renamed `ProjectInsert` → `VentureInsert`
- ✅ Renamed `ProjectUpdate` → `VentureUpdate`
- ✅ Renamed `ProjectSpecimen` → `VentureSpecimen`
- ✅ Renamed `LogEntryProject` → `LogEntryVenture`
- ✅ Updated `PortfolioEvidenceSummary.id` → `venture_id`
- ✅ Updated Database schema interface: `projects` → `ventures`
- ✅ Added backwards compatibility via deprecated type aliases

#### MCP Schemas ✓
- ✅ Created `lib/mcp/schemas/ventures.ts` (new primary schema)
- ✅ Updated `lib/mcp/schemas/projects.ts` (now re-exports from ventures.ts)
- ✅ Updated `lib/mcp/schemas/junctions.ts` (VentureSpecimen, LogEntryVenture)
- ✅ Updated `lib/mcp/tables.ts` (table definitions for ventures)

### Phase 2b: AI Entity Type Mappings ✓
**Status:** Complete and committed
**Files Modified:** 2 files

- ✅ Updated `lib/ai/types/entities.ts`: EntityType 'projects' → 'ventures'
- ✅ Updated `lib/ai/actions/generate-field.ts`: Field prompts for 'ventures'

---

## 🔄 Pending Phases

### Phase 3: Backend Routes & API Handlers
**Status:** NOT STARTED
**Estimated files:** ~10-15 files

#### Admin Routes (Need Renaming & Query Updates)
- [ ] `app/(private)/admin/projects/page.tsx` → `/admin/ventures/page.tsx`
  - [ ] Rename directory: `/admin/projects/` → `/admin/ventures/`
  - [ ] Update query: `supabase.from('ventures')`
  - [ ] Update junction queries: `venture_specimens`, `log_entry_ventures`
  - [ ] Update import paths

- [ ] `app/(private)/admin/projects/new/page.tsx` → `/admin/ventures/new/page.tsx`
  - [ ] Move file to new directory
  - [ ] Update component import: `VentureForm` (see Phase 4)

- [ ] `app/(private)/admin/projects/[id]/edit/page.tsx` → `/admin/ventures/[id]/edit/page.tsx`
  - [ ] Move file to new directory
  - [ ] Update query: `supabase.from('ventures').select('*')`
  - [ ] Update component import: `VentureForm`

#### Public Portfolio Routes (Keep paths, update queries)
- [ ] `app/(public)/portfolio/page.tsx`
  - [ ] Update query: `supabase.from('ventures').select(...)`
  - [ ] Update type imports: `Venture` instead of `Project`
  - [ ] Keep route path as `/portfolio` (public-facing)

- [ ] `app/(public)/portfolio/[slug]/page.tsx`
  - [ ] Update query: `supabase.from('ventures')`
  - [ ] Update junction query: `venture_specimens`
  - [ ] Update type imports

#### Portfolio Dashboard
- [ ] `app/(private)/admin/portfolio/page.tsx`
  - [ ] Materialized view already renamed in migration
  - [ ] Update type imports: `PortfolioEvidenceSummary` (already uses `venture_id`)
  - [ ] Verify no code changes needed (should work with migration)

#### Dashboard Components
- [ ] `components/admin/dashboard-stats.tsx`
  - [ ] Update query: `supabase.from('ventures')`
  - [ ] Update link: `/admin/ventures`
  - [ ] Update label: "Ventures" instead of "Projects"

- [ ] `components/admin/recent-activity.tsx`
  - [ ] Update query: `supabase.from('ventures')`
  - [ ] Update activity type mapping: `'venture'` instead of `'project'`
  - [ ] Update link: `/admin/ventures/{id}/edit`

---

### Phase 4: Frontend Components
**Status:** NOT STARTED
**Estimated files:** ~15-20 files

#### Form Components (Critical - Used by routes)
- [ ] `components/admin/project-form.tsx` → `venture-form.tsx`
  - [ ] Rename file
  - [ ] Rename component: `ProjectForm` → `VentureForm`
  - [ ] Rename interface: `ProjectFormData` → `VentureFormData`
  - [ ] Update queries: `ventures`, `venture_specimens`, `log_entry_ventures`
  - [ ] Update type imports: `Venture`, `VentureInsert`, `VentureUpdate`
  - [ ] Update AI entity type: `'ventures'`
  - [ ] Update all supabase operations

- [ ] `components/admin/log-entry-form.tsx`
  - [ ] Update `projectIds` → `ventureIds` (optional refactor)
  - [ ] Update junction table query: `log_entry_ventures`
  - [ ] Update column name: `venture_id`

- [ ] `components/admin/specimen-form.tsx`
  - [ ] Update `projectIds` → `ventureIds` (optional refactor)
  - [ ] Update junction table query: `venture_specimens`
  - [ ] Update column name: `venture_id`

#### List/View Components
- [ ] `components/admin/views/projects-list-view.tsx` → `ventures-list-view.tsx`
  - [ ] Rename file
  - [ ] Rename component: `ProjectsListView` → `VenturesListView`
  - [ ] Rename interface: `ProjectsListViewProps` → `VenturesListViewProps`
  - [ ] Update type: `Project[]` → `Venture[]`
  - [ ] Update junction counts: `venture_specimens`, `log_entry_ventures`
  - [ ] Update links: `/admin/ventures/[id]/edit`

- [ ] `components/admin/cards/project-card.tsx` → `venture-card.tsx`
  - [ ] Rename file
  - [ ] Rename component: `ProjectCard` → `VentureCard`
  - [ ] Update type imports
  - [ ] Update links
  - [ ] Update junction counts

#### Portfolio Components (No rename needed, just query updates)
- [ ] `components/portfolio/portfolio-dashboard.tsx`
  - [ ] Update props type: `ventures: PortfolioEvidenceSummary[]`
  - [ ] No queries in this component (data passed from route)

- [ ] `components/portfolio/portfolio-table-view.tsx`
  - [ ] Update internal references if any
  - [ ] Verify column headers still accurate

- [ ] `components/portfolio/portfolio-filters.tsx`
  - [ ] Verify filter logic works with new schema

- [ ] `components/portfolio/portfolio-metrics-summary.tsx`
  - [ ] Verify metrics display works

---

### Phase 5: Testing & Validation
**Status:** NOT STARTED
**Prerequisites:** Phases 1-4 must be complete

#### Pre-Migration Testing (Current State)
- [ ] Verify current app works before migration
- [ ] Test project CRUD operations
- [ ] Test portfolio dashboard
- [ ] Test public portfolio

#### Database Migration Testing
- [ ] Test migration on local development database
- [ ] Verify all tables renamed successfully
- [ ] Verify all indexes exist
- [ ] Verify all triggers fire
- [ ] Verify RLS policies work
- [ ] Verify materialized view refreshes
- [ ] Test rollback migration (if created)

#### Post-Migration Application Testing
- [ ] Test venture CRUD operations
  - [ ] Create new venture via `/admin/ventures/new`
  - [ ] Read venture list at `/admin/ventures`
  - [ ] Update venture at `/admin/ventures/[id]/edit`
  - [ ] Delete venture

- [ ] Test junction table relationships
  - [ ] Link specimen to venture
  - [ ] Unlink specimen from venture
  - [ ] Link log entry to venture
  - [ ] Unlink log entry from venture

- [ ] Test portfolio dashboard at `/admin/portfolio`
  - [ ] Verify evidence aggregation works
  - [ ] Verify metrics display correctly
  - [ ] Test portfolio filters
  - [ ] Test stage transitions

- [ ] Test public portfolio
  - [ ] View published ventures at `/portfolio`
  - [ ] View individual venture at `/portfolio/[slug]`
  - [ ] Verify unpublished ventures hidden
  - [ ] Verify SEO metadata

- [ ] Test dashboard
  - [ ] Verify venture count shows
  - [ ] Verify recent activity shows ventures
  - [ ] Test navigation links work

- [ ] Test AI field generation
  - [ ] Generate title for venture
  - [ ] Generate description for venture
  - [ ] Generate content for venture
  - [ ] Generate tags for venture

#### Browser Testing
- [ ] Check console for errors
- [ ] Check network tab for failed queries
- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Safari

#### Data Integrity Testing
- [ ] Verify no data loss
- [ ] Verify foreign keys intact
- [ ] Verify junction table records preserved
- [ ] Spot-check venture content

---

### Phase 6: Documentation & Cleanup
**Status:** NOT STARTED

#### Update Documentation
- [ ] Update `/docs/database-schema.md`
  - [ ] Change all `projects` references to `ventures`
  - [ ] Update junction table docs

- [ ] Update `/docs/infrastructure/ENTITY_RELATIONSHIPS.md`
  - [ ] Update entity names
  - [ ] Update relationship diagrams

- [ ] Update `/docs/project-overview.md`
  - [ ] Update terminology throughout

- [ ] Update `/README.md`
  - [ ] Change any project references to ventures

- [ ] Mark `/docs/infrastructure/PROJECTS_TO_VENTURES_MIGRATION.md` as completed

#### Code Cleanup
- [ ] Remove any old `projects` imports (verify deprecated types are the only references)
- [ ] Verify no lingering `project_specimens` or `log_entry_projects` references
- [ ] Update code comments

#### MCP Rebuilding (if needed)
- [ ] Rebuild MCP server: `cd mcp && npm run build`
- [ ] Verify TypeScript declarations in `mcp/dist/`
- [ ] Test MCP integration

---

## 📊 Progress Summary

| Phase | Status | Files | Progress |
|-------|--------|-------|----------|
| Phase 1: Database | ✅ Complete | 1 | 100% |
| Phase 2: Types | ✅ Complete | 5 | 100% |
| Phase 2b: AI | ✅ Complete | 2 | 100% |
| Phase 3: Backend | ⏸️ Pending | ~15 | 0% |
| Phase 4: Frontend | ⏸️ Pending | ~20 | 0% |
| Phase 5: Testing | ⏸️ Pending | N/A | 0% |
| Phase 6: Docs | ⏸️ Pending | ~5 | 0% |
| **TOTAL** | **🔄 In Progress** | **~48** | **~15%** |

---

## 🚀 Next Steps

### Immediate Actions (Phase 3 Start)

1. **Rename admin route directories:**
   ```bash
   mv app/(private)/admin/projects app/(private)/admin/ventures
   ```

2. **Update route files one by one:**
   - Start with `app/(private)/admin/ventures/page.tsx` (list view)
   - Then `new/page.tsx` (create form)
   - Then `[id]/edit/page.tsx` (edit form)

3. **Update component imports as you go:**
   - Each route update will reveal which components need updating
   - Use TypeScript errors as a guide

### Recommended Order

1. Complete Phase 3 (Backend Routes) first
2. Then Phase 4 (Frontend Components) - guided by route updates
3. Then run database migration
4. Then Phase 5 (Testing)
5. Finally Phase 6 (Documentation)

---

## ⚠️ Important Notes

1. **Don't run the migration** until Phases 3 & 4 are complete
   - The migration will break the app if code isn't updated first
   - Test all code changes before running migration

2. **Maintain backwards compatibility** during development
   - Deprecated type aliases allow gradual migration
   - Can remove deprecations after everything works

3. **Test incrementally**
   - Test each route/component as you update it
   - Don't wait until everything is done to test

4. **Keep the migration plan** for reference
   - `/docs/infrastructure/PROJECTS_TO_VENTURES_MIGRATION.md`
   - Has detailed SQL and component update instructions

---

## 🔍 How to Continue

To resume work on this migration:

1. **Start with Phase 3** (Backend Routes)
2. **Follow the checklist** above item by item
3. **Update this document** as you complete items (change `[ ]` to `[x]`)
4. **Commit frequently** to track progress
5. **Reference the full migration plan** for details

The foundation is solid - all types and schemas are ready. Now it's systematic application of those changes to routes and components.
