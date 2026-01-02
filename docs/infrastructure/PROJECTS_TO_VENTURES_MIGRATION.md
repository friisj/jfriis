# Projects → Ventures Migration Plan

**Status:** Planning
**Created:** 2026-01-02
**Scope:** Rename portfolio "projects" entity to "ventures" throughout the entire codebase

## Executive Summary

This migration renames the `projects` table (portfolio items) to `ventures` to better reflect their identity as businesses/products/services and create clearer semantic distinction from `studio_projects` (R&D workshop).

**Key Points:**
- **What's changing:** `projects` → `ventures` (portfolio only, NOT `studio_projects`)
- **Why:** Better semantic alignment with explore/exploit business portfolio methodology
- **Impact:** ~35-40 files, database schema, types, components, routes, materialized views
- **Estimated scope:** Large refactor requiring careful coordination
- **Rollback strategy:** Database migration reversibility required

---

## Terminology Mapping

| Old Name | New Name | Context |
|----------|----------|---------|
| `projects` (table) | `ventures` | Portfolio items/businesses |
| `Project` (type) | `Venture` | TypeScript interface |
| `project_specimens` | `venture_specimens` | Junction table |
| `log_entry_projects` | `log_entry_ventures` | Junction table |
| `studio_project_id` | `venture_id` | FK in studio_projects pointing to ventures |
| `/api/projects` | `/api/ventures` | API routes (TBD: keep old for compat?) |
| `/admin/projects` | `/admin/ventures` | Admin routes |
| `/portfolio` | `/portfolio` | Public route (unchanged) |

**Important:** `studio_projects` table and all related entities remain unchanged.

---

## Migration Phases

### Phase 1: Database Migration (Foundation)
- Create new migration file
- Rename tables, columns, indexes, constraints
- Update materialized views and functions
- Update triggers
- Update RLS policies
- Test rollback capability

### Phase 2: Type System Updates
- Update TypeScript types and interfaces
- Update Zod schemas (MCP)
- Update entity type enums
- Ensure type safety throughout

### Phase 3: Backend & API Updates
- Update CRUD operations
- Update route handlers
- Update server components
- Update AI integration entity types

### Phase 4: Frontend Component Updates
- Update forms
- Update list views
- Update admin pages
- Update public portfolio pages
- Update dashboard components

### Phase 5: Testing & Validation
- Test all CRUD operations
- Test junction table relationships
- Test materialized view refresh
- Test public portfolio display
- Test admin workflows
- Test AI field generation

### Phase 6: Documentation & Cleanup
- Update README and documentation
- Update code comments
- Remove old references
- Update deployment notes

---

## Phase 1: Database Migration (Detailed)

### Migration File: `supabase/migrations/YYYYMMDDHHMMSS_rename_projects_to_ventures.sql`

```sql
-- ============================================================================
-- MIGRATION: Rename projects → ventures
-- ============================================================================

BEGIN;

-- Step 1: Rename main table
ALTER TABLE projects RENAME TO ventures;

-- Step 2: Rename sequences
ALTER SEQUENCE IF EXISTS projects_id_seq RENAME TO ventures_id_seq;

-- Step 3: Rename indexes
ALTER INDEX idx_projects_slug RENAME TO idx_ventures_slug;
ALTER INDEX idx_projects_status RENAME TO idx_ventures_status;
ALTER INDEX idx_projects_published RENAME TO idx_ventures_published;
ALTER INDEX idx_projects_created_at RENAME TO idx_ventures_created_at;
ALTER INDEX idx_projects_studio_project RENAME TO idx_ventures_studio_project;
ALTER INDEX idx_projects_portfolio_type RENAME TO idx_ventures_portfolio_type;
ALTER INDEX idx_projects_explore_stage RENAME TO idx_ventures_explore_stage;
ALTER INDEX idx_projects_exploit_stage RENAME TO idx_ventures_exploit_stage;
ALTER INDEX idx_projects_horizon RENAME TO idx_ventures_horizon;
ALTER INDEX idx_projects_evidence_strength RENAME TO idx_ventures_evidence_strength;
ALTER INDEX idx_projects_innovation_risk RENAME TO idx_ventures_innovation_risk;
ALTER INDEX idx_projects_next_review RENAME TO idx_ventures_next_review;

-- Step 4: Rename triggers
DROP TRIGGER IF EXISTS update_projects_updated_at ON ventures;
CREATE TRIGGER update_ventures_updated_at
    BEFORE UPDATE ON ventures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_refresh_portfolio_evidence_projects ON ventures;
CREATE TRIGGER trigger_refresh_portfolio_evidence_ventures
    AFTER INSERT OR UPDATE OR DELETE ON ventures
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_portfolio_evidence();

-- Step 5: Rename junction tables
ALTER TABLE project_specimens RENAME TO venture_specimens;
ALTER TABLE log_entry_projects RENAME TO log_entry_ventures;

-- Step 6: Rename columns in junction tables
ALTER TABLE venture_specimens RENAME COLUMN project_id TO venture_id;
ALTER TABLE log_entry_ventures RENAME COLUMN project_id TO venture_id;

-- Step 7: Rename junction table indexes
ALTER INDEX IF EXISTS idx_project_specimens_project_id RENAME TO idx_venture_specimens_venture_id;
ALTER INDEX IF EXISTS idx_project_specimens_specimen_id RENAME TO idx_venture_specimens_specimen_id;
ALTER INDEX IF EXISTS idx_log_entry_projects_log_entry_id RENAME TO idx_log_entry_ventures_log_entry_id;
ALTER INDEX IF EXISTS idx_log_entry_projects_project_id RENAME TO idx_log_entry_ventures_venture_id;

-- Step 8: Rename foreign key constraints (if named)
-- Note: Check actual constraint names with:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'venture_specimens'::regclass;
-- Then rename appropriately, e.g.:
-- ALTER TABLE venture_specimens RENAME CONSTRAINT project_specimens_project_id_fkey TO venture_specimens_venture_id_fkey;

-- Step 9: Update RLS policies
DROP POLICY IF EXISTS "Public can view published projects" ON ventures;
CREATE POLICY "Public can view published ventures"
    ON ventures FOR SELECT
    USING (published = true);

DROP POLICY IF EXISTS "Admin can do everything with projects" ON ventures;
CREATE POLICY "Admin can do everything with ventures"
    ON ventures FOR ALL
    USING (auth.jwt() ->> 'role' = 'authenticated');

-- Update junction table policies
DROP POLICY IF EXISTS "Public can view project specimens" ON venture_specimens;
CREATE POLICY "Public can view venture specimens"
    ON venture_specimens FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admin can manage project specimens" ON venture_specimens;
CREATE POLICY "Admin can manage venture specimens"
    ON venture_specimens FOR ALL
    USING (auth.jwt() ->> 'role' = 'authenticated');

DROP POLICY IF EXISTS "Public can view log entry projects" ON log_entry_ventures;
CREATE POLICY "Public can view log entry ventures"
    ON log_entry_ventures FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admin can manage log entry projects" ON log_entry_ventures;
CREATE POLICY "Admin can manage log entry ventures"
    ON log_entry_ventures FOR ALL
    USING (auth.jwt() ->> 'role' = 'authenticated');

-- Step 10: Update materialized view (CRITICAL)
DROP MATERIALIZED VIEW IF EXISTS portfolio_evidence_summary;

CREATE MATERIALIZED VIEW portfolio_evidence_summary AS
SELECT
    v.id as venture_id,
    v.title,
    v.slug,
    v.portfolio_type,
    v.horizon,
    v.explore_stage,
    v.exploit_stage,
    v.evidence_strength,
    v.innovation_risk,
    v.strategic_value_score,
    v.studio_project_id,

    -- Hypothesis counts
    COUNT(DISTINCT CASE WHEN h.status = 'validated' THEN h.id END) as validated_hypotheses,
    COUNT(DISTINCT CASE WHEN h.status = 'invalidated' THEN h.id END) as invalidated_hypotheses,
    COUNT(DISTINCT CASE WHEN h.status = 'testing' THEN h.id END) as testing_hypotheses,
    COUNT(DISTINCT h.id) as total_hypotheses,

    -- Experiment counts
    COUNT(DISTINCT CASE WHEN e.outcome = 'success' THEN e.id END) as successful_experiments,
    COUNT(DISTINCT CASE WHEN e.outcome = 'failure' THEN e.id END) as failed_experiments,
    COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.id END) as active_experiments,
    COUNT(DISTINCT e.id) as total_experiments,

    -- Canvas validation
    COUNT(DISTINCT CASE WHEN bmc.validation_status = 'validated' THEN bmc.id END) as validated_business_models,
    COUNT(DISTINCT bmc.id) as total_business_models,
    AVG(vpc.fit_score) as avg_vpc_fit_score,
    COUNT(DISTINCT CASE WHEN cp.validation_status = 'validated' THEN cp.id END) as validated_customer_profiles,

    -- Computed metrics
    CASE
        WHEN v.portfolio_type = 'explore' THEN
            LEAST(100, GREATEST(0,
                COUNT(DISTINCT CASE WHEN h.status = 'validated' THEN h.id END) * 10 +
                COUNT(DISTINCT CASE WHEN e.outcome = 'success' THEN e.id END) * 15 +
                COALESCE(AVG(vpc.fit_score), 0) * 50
            ))
        ELSE NULL
    END as computed_evidence_score,

    -- Rates
    CASE
        WHEN COUNT(DISTINCT h.id) > 0 THEN
            (COUNT(DISTINCT CASE WHEN h.status = 'validated' THEN h.id END)::FLOAT / COUNT(DISTINCT h.id)::FLOAT * 100)
        ELSE 0
    END as hypothesis_validation_rate,

    CASE
        WHEN COUNT(DISTINCT e.id) > 0 THEN
            (COUNT(DISTINCT CASE WHEN e.outcome = 'success' THEN e.id END)::FLOAT / COUNT(DISTINCT e.id)::FLOAT * 100)
        ELSE 0
    END as experiment_success_rate,

    -- Timestamps
    MAX(GREATEST(
        COALESCE(h.updated_at, '1970-01-01'::timestamp),
        COALESCE(e.updated_at, '1970-01-01'::timestamp),
        COALESCE(bmc.updated_at, '1970-01-01'::timestamp),
        COALESCE(vpc.updated_at, '1970-01-01'::timestamp)
    )) as last_evidence_activity_at,

    v.created_at,
    v.updated_at
FROM ventures v
LEFT JOIN studio_projects sp ON v.studio_project_id = sp.id
LEFT JOIN studio_hypotheses h ON sp.id = h.project_id
LEFT JOIN studio_experiments e ON sp.id = e.project_id
LEFT JOIN business_model_canvases bmc ON sp.id = bmc.studio_project_id
LEFT JOIN value_proposition_canvases vpc ON sp.id = vpc.studio_project_id
LEFT JOIN customer_profiles cp ON sp.id = cp.studio_project_id
GROUP BY v.id, v.title, v.slug, v.portfolio_type, v.horizon, v.explore_stage,
         v.exploit_stage, v.evidence_strength, v.innovation_risk,
         v.strategic_value_score, v.studio_project_id, v.created_at, v.updated_at;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_portfolio_evidence_summary_venture_id
    ON portfolio_evidence_summary (venture_id);

-- Step 11: Update functions that reference projects table
CREATE OR REPLACE FUNCTION compute_evidence_strength(p_venture_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_score INTEGER;
    v_evidence_strength TEXT;
BEGIN
    SELECT computed_evidence_score INTO v_score
    FROM portfolio_evidence_summary
    WHERE venture_id = p_venture_id;

    IF v_score IS NULL THEN
        RETURN 'none';
    ELSIF v_score >= 75 THEN
        RETURN 'strong';
    ELSIF v_score >= 50 THEN
        RETURN 'moderate';
    ELSIF v_score >= 25 THEN
        RETURN 'weak';
    ELSE
        RETURN 'none';
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION suggest_explore_stage_transition(p_venture_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_summary RECORD;
    v_suggestion JSONB;
BEGIN
    SELECT * INTO v_summary
    FROM portfolio_evidence_summary
    WHERE venture_id = p_venture_id;

    -- Logic for stage transition suggestions based on evidence
    -- (Implementation details would go here)

    RETURN v_suggestion;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Update get_portfolio_metrics function
CREATE OR REPLACE FUNCTION get_portfolio_metrics()
RETURNS JSONB AS $$
DECLARE
    v_metrics JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_ventures', COUNT(*),
        'explore_ventures', COUNT(*) FILTER (WHERE portfolio_type = 'explore'),
        'exploit_ventures', COUNT(*) FILTER (WHERE portfolio_type = 'exploit'),
        'avg_evidence_score', AVG(computed_evidence_score),
        'high_risk_ventures', COUNT(*) FILTER (WHERE innovation_risk = 'high'),
        'ventures_due_review', COUNT(*) FILTER (WHERE next_review_due_at < NOW())
    ) INTO v_metrics
    FROM ventures;

    RETURN v_metrics;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Update backlog_items references
-- Note: backlog_items.converted_to can contain 'project' as a string value
UPDATE backlog_items
SET converted_to = 'venture'
WHERE converted_to = 'project';

COMMIT;
```

### Rollback Migration: `supabase/migrations/YYYYMMDDHHMMSS_rollback_ventures_to_projects.sql`

```sql
-- Reverse migration (for emergency rollback only)
BEGIN;

-- Reverse all the changes in opposite order
ALTER TABLE ventures RENAME TO projects;
ALTER TABLE venture_specimens RENAME TO project_specimens;
ALTER TABLE log_entry_ventures RENAME TO log_entry_projects;

-- (Continue reversing all changes...)

COMMIT;
```

---

## Phase 2: Type System Updates

### Files to Update:

**1. `/lib/types/database.ts`**
```typescript
// OLD
export interface Project extends BaseRecord {
  title: string
  slug: string
  // ... all fields
  studio_project_id?: string
}

export type ProjectInsert = Omit<Project, keyof BaseRecord>
export type ProjectUpdate = Partial<ProjectInsert>

export interface ProjectSpecimen extends BaseRecord {
  project_id: string
  specimen_id: string
  position?: number
}

export interface LogEntryProject extends BaseRecord {
  log_entry_id: string
  project_id: string
}

// NEW
export interface Venture extends BaseRecord {
  title: string
  slug: string
  // ... all fields
  studio_project_id?: string  // Still links to studio_projects
}

export type VentureInsert = Omit<Venture, keyof BaseRecord>
export type VentureUpdate = Partial<VentureInsert>

export interface VentureSpecimen extends BaseRecord {
  venture_id: string
  specimen_id: string
  position?: number
}

export interface LogEntryVenture extends BaseRecord {
  log_entry_id: string
  venture_id: string
}
```

**2. `/lib/mcp/schemas/projects.ts` → `/lib/mcp/schemas/ventures.ts`**
```typescript
// Rename file and update all exports
export const VentureSchema = z.object({
  // ... fields
})

export type Venture = z.infer<typeof VentureSchema>
export type VentureCreate = z.infer<typeof VentureCreateSchema>
export type VentureUpdate = z.infer<typeof VentureUpdateSchema>
```

**3. `/lib/mcp/schemas/junctions.ts`**
```typescript
// Update junction schemas
export const VentureSpecimenSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
  venture_id: z.string().uuid(),
  specimen_id: z.string().uuid(),
  position: z.number().nullable()
})

export const LogEntryVentureSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
  log_entry_id: z.string().uuid(),
  venture_id: z.string().uuid()
})
```

**4. `/lib/mcp/tables.ts`**
```typescript
// Update table definitions
export const tables = [
  {
    name: 'ventures',
    description: 'Portfolio ventures and businesses',
    schema: VentureSchema,
    createSchema: VentureCreateSchema,
    updateSchema: VentureUpdateSchema,
    hasVentureId: false  // Updated flag name
  },
  {
    name: 'venture_specimens',
    description: 'Links ventures to specimens',
    schema: VentureSpecimenSchema,
    // ...
  },
  {
    name: 'log_entry_ventures',
    description: 'Links log entries to ventures',
    schema: LogEntryVentureSchema,
    // ...
  },
  // ... studio_projects unchanged
]
```

**5. `/lib/ai/types/entities.ts`**
```typescript
// Update entity type enum
export type EntityType =
  | 'ventures'  // Changed from 'projects'
  | 'studio_projects'
  | 'log_entries'
  | 'specimens'
  // ...

// Update field mappings
const entityFieldNames: Record<EntityType, string[]> = {
  ventures: ['title', 'description', 'content', 'tags'],
  studio_projects: ['name', 'description', 'problem_statement', 'hypothesis', 'success_criteria'],
  // ...
}
```

**6. `/lib/ai/actions/generate-field.ts`**
```typescript
// Update entity-specific prompts
const entityPrompts: Record<string, Record<string, string>> = {
  ventures: {
    title: "A clear, descriptive title for this venture.",
    description: "Brief overview of what this venture is and its goals.",
    content: "Detailed venture content, background, process, or learnings.",
    tags: "Relevant tags for categorizing this venture."
  },
  // ...
}
```

---

## Phase 3: Backend & API Updates

### Files to Update:

**1. Admin Route Handlers**

`/app/(private)/admin/projects/page.tsx` → `/app/(private)/admin/ventures/page.tsx`
```typescript
// Update query
const { data: ventures, error } = await supabase
  .from('ventures')
  .select(`
    *,
    venture_specimens(count),
    log_entry_ventures(count)
  `)
  .order('created_at', { ascending: false })
```

`/app/(private)/admin/projects/new/page.tsx` → `/app/(private)/admin/ventures/new/page.tsx`

`/app/(private)/admin/projects/[id]/edit/page.tsx` → `/app/(private)/admin/ventures/[id]/edit/page.tsx`

**2. Public Portfolio Routes (keep /portfolio route, update queries)**

`/app/(public)/portfolio/page.tsx`
```typescript
const { data: ventures } = await supabase
  .from('ventures')
  .select('*')
  .eq('published', true)
```

`/app/(public)/portfolio/[slug]/page.tsx`
```typescript
const { data: venture } = await supabase
  .from('ventures')
  .select(`
    *,
    venture_specimens(
      specimen:specimens(*)
    )
  `)
  .eq('slug', slug)
  .single()
```

**3. Portfolio Dashboard**

`/app/(private)/admin/portfolio/page.tsx`
```typescript
// Materialized view already updated in migration
const { data } = await supabase
  .from('portfolio_evidence_summary')
  .select('*')
```

---

## Phase 4: Frontend Component Updates

### Files to Update:

**1. Form Components**

`/components/admin/project-form.tsx` → `/components/admin/venture-form.tsx`
```typescript
interface VentureFormData {
  title: string
  slug: string
  description?: string
  // ... all venture fields
}

export function VentureForm({ ventureId }: { ventureId?: string }) {
  // Update all queries and mutations
  const { data: venture } = await supabase
    .from('ventures')
    .select(`
      *,
      venture_specimens(specimen_id, position),
      log_entry_ventures(log_entry_id)
    `)
}
```

`/components/admin/log-entry-form.tsx`
```typescript
// Update junction table references
const { data: linkedVentures } = await supabase
  .from('log_entry_ventures')
  .select('venture_id')
  .eq('log_entry_id', logEntryId)
```

`/components/admin/specimen-form.tsx`
```typescript
// Update junction table references
const { data: linkedVentures } = await supabase
  .from('venture_specimens')
  .select('venture_id')
  .eq('specimen_id', specimenId)
```

**2. List/View Components**

`/components/admin/views/projects-list-view.tsx` → `/components/admin/views/ventures-list-view.tsx`
```typescript
interface VenturesListViewProps {
  ventures: Venture[]
}

export function VenturesListView({ ventures }: VenturesListViewProps) {
  // Update links to /admin/ventures/[id]/edit
}
```

`/components/admin/cards/project-card.tsx` → `/components/admin/cards/venture-card.tsx`

**3. Dashboard Components**

`/components/admin/dashboard-stats.tsx`
```typescript
const { count } = await supabase
  .from('ventures')
  .select('*', { count: 'exact', head: true })

// Update link to /admin/ventures
```

`/components/admin/recent-activity.tsx`
```typescript
const { data: ventures } = await supabase
  .from('ventures')
  .select('id, title, updated_at')
  .order('updated_at', { ascending: false })
  .limit(5)

// Map to activity type 'venture'
// Update link to /admin/ventures/{id}/edit
```

**4. Portfolio Components (no file renames, just query updates)**

`/components/portfolio/portfolio-dashboard.tsx`
```typescript
interface PortfolioDashboardProps {
  ventures: PortfolioEvidenceSummary[]  // Type already references venture_id
}
```

---

## Phase 5: Testing Checklist

### Database Testing
- [ ] Verify `ventures` table exists with all columns
- [ ] Verify all indexes renamed correctly
- [ ] Verify all triggers fire correctly
- [ ] Verify RLS policies work (public can view published, admin can manage)
- [ ] Verify materialized view refreshes correctly
- [ ] Verify junction tables link correctly
- [ ] Test foreign key constraints

### CRUD Operations
- [ ] Create new venture via admin form
- [ ] Read venture list in admin
- [ ] Update existing venture
- [ ] Delete venture
- [ ] Link venture to specimens (junction)
- [ ] Link venture to log entries (junction)
- [ ] Link venture to studio_project

### Materialized View
- [ ] Manually refresh: `REFRESH MATERIALIZED VIEW portfolio_evidence_summary`
- [ ] Verify triggers auto-refresh on venture changes
- [ ] Verify evidence scores calculate correctly
- [ ] Verify hypothesis/experiment aggregation

### Public Portfolio
- [ ] View published ventures on /portfolio
- [ ] View individual venture on /portfolio/[slug]
- [ ] Verify unpublished ventures hidden
- [ ] Verify SEO metadata renders

### Admin Workflows
- [ ] Navigate to /admin/ventures
- [ ] Create new venture from /admin/ventures/new
- [ ] Edit venture from /admin/ventures/[id]/edit
- [ ] View portfolio dashboard at /admin/portfolio
- [ ] Verify dashboard stats show venture count
- [ ] Verify recent activity shows ventures

### AI Integration
- [ ] Generate title field for venture
- [ ] Generate description field for venture
- [ ] Generate tags for venture
- [ ] Verify entity type 'ventures' recognized

### Junction Table Relationships
- [ ] Link specimen to venture
- [ ] Unlink specimen from venture
- [ ] Link log entry to venture
- [ ] Unlink log entry from venture
- [ ] Verify cascade behavior

---

## Phase 6: Documentation Updates

### Files to Update:
- `/docs/database-schema.md` - Update table references
- `/docs/infrastructure/ENTITY_RELATIONSHIPS.md` - Update entity names
- `/docs/project-overview.md` - Update terminology
- `/README.md` - Update any project references
- This migration doc - Mark as "Completed"

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Data loss during migration | **CRITICAL** | Test migration on dev/staging first, create backup |
| Broken foreign keys | **HIGH** | Verify constraint names, test cascade behavior |
| Materialized view performance | **MEDIUM** | Monitor refresh times, ensure indexes exist |
| Public portfolio downtime | **MEDIUM** | Deploy during low-traffic window |
| Missed references in code | **MEDIUM** | Comprehensive grep/search before deployment |
| AI entity type mismatch | **LOW** | Update enum before deploying forms |

---

## Deployment Strategy

### Pre-Deployment
1. **Backup production database** (full snapshot)
2. **Test migration on local environment**
3. **Test migration on staging environment**
4. **Verify all tests pass**
5. **Review rollback plan**

### Deployment Steps
1. **Put site in maintenance mode** (optional, for safety)
2. **Run database migration**
3. **Deploy updated code** (all phases together)
4. **Verify materialized view refresh**
5. **Test critical paths** (create venture, view portfolio)
6. **Monitor error logs** for 24 hours
7. **Exit maintenance mode**

### Post-Deployment
1. **Monitor application logs** for errors
2. **Check Supabase dashboard** for query performance
3. **Verify public portfolio** loads correctly
4. **Test admin workflows** end-to-end
5. **Update Linear/project tracker** that migration is complete

---

## Rollback Plan

**If migration fails:**
1. **Restore database from backup** (fastest, loses recent data)
2. **OR run rollback migration** (preserves data, slower)
3. **Revert code deployment** to previous version
4. **Investigate failure** in isolated environment
5. **Fix issues** and retry migration

**Rollback window:** Recommend 2-hour window for safe rollback decision.

---

## Success Criteria

Migration is considered successful when:
- [ ] All database tables/indexes/triggers renamed
- [ ] All TypeScript types updated and compiling
- [ ] All admin routes accessible at new paths
- [ ] All public portfolio pages rendering
- [ ] All CRUD operations working
- [ ] Materialized view auto-refreshing
- [ ] AI field generation working
- [ ] Zero console errors in browser
- [ ] Zero server errors in logs
- [ ] All tests passing

---

## Estimated Effort

| Phase | Estimated Time | Complexity |
|-------|---------------|------------|
| Phase 1: Database Migration | 2-3 hours | High |
| Phase 2: Type System | 1-2 hours | Medium |
| Phase 3: Backend/API | 2-3 hours | Medium |
| Phase 4: Frontend Components | 3-4 hours | High |
| Phase 5: Testing | 2-3 hours | Medium |
| Phase 6: Documentation | 1 hour | Low |
| **Total** | **11-16 hours** | **High** |

**Recommended approach:** Execute phases sequentially, commit after each phase, test thoroughly between phases.

---

## Notes

- This migration touches ~35-40 files across database, backend, and frontend
- The materialized view `portfolio_evidence_summary` is performance-critical and must be tested thoroughly
- Foreign key from `ventures.studio_project_id` → `studio_projects.id` is the key relationship linking portfolio to R&D
- The term "venture" works well for early-stage through scaled operations
- Public-facing route `/portfolio` can stay the same (ventures displayed as "portfolio")
- Consider whether to keep `/api/projects` as backwards-compatible alias to `/api/ventures`

---

## Next Steps

1. Review this plan with stakeholders
2. Schedule migration window (recommend off-peak hours)
3. Create database backup strategy
4. Begin Phase 1 implementation
5. Test each phase before proceeding to next

---

**Migration Owner:** TBD
**Target Completion:** TBD
**Status Updates:** Track progress in Linear or project management tool
