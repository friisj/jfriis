# Portfolio Dashboard Implementation Plan

**Version:** 1.0
**Date:** 2025-12-29
**Status:** Draft - Ready for Review

## Executive Summary

Transform the portfolio projects system from basic project tracking to a **Strategyzer Portfolio Map** implementation with visual portfolio dashboard. This enables evidence-based innovation management across both Explore (new growth engines) and Exploit (existing businesses) portfolios.

**Key Deliverables:**
1. Enriched `projects` table with Strategyzer Portfolio Map dimensions
2. Database views/functions aggregating evidence from linked entities
3. New admin view type: **Portfolio Dashboard** with visual portfolio map
4. Integration with existing BMC, VPC, hypotheses, and experiments

**Timeline:** 3-4 weeks across 4 implementation phases

---

## Current State Analysis

### What We Have

**Portfolio Projects Table:**
- Basic fields: title, slug, description, content, status, type
- Timeline: start_date, end_date
- Simple status: draft, active, archived, completed
- No lifecycle tracking, evidence strength, or risk categorization

**Supporting Infrastructure (Already Excellent):**
- ✅ Business Model Canvases with validation_status per block
- ✅ Value Proposition Canvases with fit_score and evidence arrays
- ✅ Customer Profiles with validation_confidence
- ✅ Studio Hypotheses with validation status
- ✅ Studio Experiments with outcomes
- ✅ Log Entries documenting evidence
- ✅ All entities linked via FKs

**Current Admin UI:**
- Table view only (via AdminDataView)
- Shows basic project info
- No portfolio visualization
- No evidence aggregation

### The Opportunity

We already have **all the underlying data** for evidence-based portfolio management. We just need to:
1. Add portfolio dimensions to projects table
2. Aggregate evidence from linked entities
3. Visualize it on a portfolio map dashboard

---

## Proposed Architecture

### Portfolio Map Visualization

Following Strategyzer's two-portfolio framework:

```
┌─────────────────────────────────────────────────────────────┐
│                    PORTFOLIO DASHBOARD                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [View Switcher: Explore | Exploit | Both | Table]          │
│                                                              │
│  ┌──────────────────────────────┐  ┌────────────────────┐  │
│  │   EXPLORE PORTFOLIO          │  │  EXPLOIT PORTFOLIO │  │
│  │                              │  │                    │  │
│  │  Y: Expected Return/Profit   │  │  Y: Profitability  │  │
│  │  X: Evidence Strength        │  │  X: Sustainability │  │
│  │                              │  │                    │  │
│  │  Stages:                     │  │  Stages:           │  │
│  │  • Ideation                  │  │  • Launch          │  │
│  │  • Discovery                 │  │  • Sustaining      │  │
│  │  • Validation                │  │  • Efficiency      │  │
│  │  • Acceleration              │  │  • Mature          │  │
│  │                              │  │  • Declining       │  │
│  └──────────────────────────────┘  │  • Renovation      │  │
│                                     └────────────────────┘  │
│                                                              │
│  [Filter: Horizon | Risk | Investment | Owner]              │
│  [Metrics: Portfolio Balance, Total Investment, ROI]        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
AdminPortfolioDashboard (new page)
  ├── PortfolioViewSwitcher (Explore | Exploit | Both | Table)
  ├── PortfolioMetricsSummary (balance, investment, counts)
  ├── PortfolioFilters (horizon, risk, stage, owner)
  └── PortfolioMapVisualization
        ├── ExplorePortfolioMap (2D scatter plot)
        │     ├── PortfolioAxis (Y: Expected Return, X: Evidence)
        │     ├── StageMarkers (Ideation → Discovery → Validation → Acceleration)
        │     └── ProjectBubbles (sized by investment)
        ├── ExploitPortfolioMap (2D scatter plot)
        │     ├── PortfolioAxis (Y: Profitability, X: Sustainability)
        │     ├── StageMarkers (Launch → Sustaining → Mature → Declining)
        │     └── ProjectBubbles (sized by revenue)
        └── TableFallback (AdminDataView with enhanced columns)
```

---

## Database Schema Changes

### Phase 1: Core Portfolio Dimensions

```sql
-- Add portfolio management columns to projects table
ALTER TABLE projects
  -- Portfolio Classification
  ADD COLUMN portfolio_type TEXT CHECK (portfolio_type IN ('explore', 'exploit')),
  ADD COLUMN horizon TEXT CHECK (horizon IN ('h1', 'h2', 'h3')),
  ADD COLUMN innovation_ambition TEXT CHECK (innovation_ambition IN ('core', 'adjacent', 'transformational')),

  -- Explore Portfolio Dimensions
  ADD COLUMN explore_stage TEXT CHECK (explore_stage IN ('ideation', 'discovery', 'validation', 'acceleration')),
  ADD COLUMN evidence_strength TEXT CHECK (evidence_strength IN ('none', 'weak', 'moderate', 'strong')),
  ADD COLUMN expected_return TEXT CHECK (expected_return IN ('low', 'medium', 'high', 'breakthrough')),

  -- Exploit Portfolio Dimensions
  ADD COLUMN exploit_stage TEXT CHECK (exploit_stage IN ('launch', 'sustaining', 'efficiency', 'mature', 'declining', 'renovation')),
  ADD COLUMN profitability TEXT CHECK (profitability IN ('low', 'medium', 'high')),
  ADD COLUMN disruption_risk TEXT CHECK (disruption_risk IN ('protected', 'moderate', 'at_risk')),

  -- Risk & Value
  ADD COLUMN innovation_risk TEXT CHECK (innovation_risk IN ('low', 'medium', 'high')),
  ADD COLUMN strategic_value_score INTEGER CHECK (strategic_value_score >= 1 AND strategic_value_score <= 10),
  ADD COLUMN market_size_estimate TEXT,

  -- Investment & Resources
  ADD COLUMN current_investment DECIMAL(12,2),
  ADD COLUMN total_investment DECIMAL(12,2),
  ADD COLUMN allocated_fte DECIMAL(4,2), -- Full-time equivalents

  -- Lifecycle Tracking
  ADD COLUMN last_stage_transition_at TIMESTAMPTZ,
  ADD COLUMN last_portfolio_review_at TIMESTAMPTZ,
  ADD COLUMN next_review_due_at TIMESTAMPTZ,

  -- Decision History
  ADD COLUMN decision_history JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ date, decision: 'pivot'|'persevere'|'kill', rationale, reviewer }]

  -- Target Metrics (goals for this project)
  ADD COLUMN target_metrics JSONB DEFAULT '{}'::jsonb;
  -- Structure: { revenue_target, customer_target, validation_target, timeline_target }

-- Indexes for portfolio queries
CREATE INDEX idx_projects_portfolio_type ON projects(portfolio_type);
CREATE INDEX idx_projects_explore_stage ON projects(explore_stage);
CREATE INDEX idx_projects_exploit_stage ON projects(exploit_stage);
CREATE INDEX idx_projects_horizon ON projects(horizon);
CREATE INDEX idx_projects_evidence_strength ON projects(evidence_strength);
CREATE INDEX idx_projects_next_review ON projects(next_review_due_at) WHERE next_review_due_at IS NOT NULL;

COMMENT ON COLUMN projects.portfolio_type IS 'Explore (new growth engines) vs Exploit (existing businesses)';
COMMENT ON COLUMN projects.evidence_strength IS 'Computed from linked hypotheses, experiments, and canvas validation';
COMMENT ON COLUMN projects.decision_history IS 'Array of portfolio review decisions with rationale';
```

### Phase 2: Computed Evidence Aggregation

```sql
-- Create view that aggregates evidence from linked entities
CREATE OR REPLACE VIEW portfolio_evidence_summary AS
SELECT
  p.id,
  p.slug,
  p.title,
  p.portfolio_type,
  p.explore_stage,
  p.exploit_stage,
  p.evidence_strength,

  -- Hypothesis Validation Stats
  COUNT(DISTINCT h.id) as total_hypotheses,
  COUNT(DISTINCT h.id) FILTER (WHERE h.status = 'validated') as validated_hypotheses,
  COUNT(DISTINCT h.id) FILTER (WHERE h.status = 'invalidated') as invalidated_hypotheses,
  COUNT(DISTINCT h.id) FILTER (WHERE h.status = 'testing') as testing_hypotheses,

  -- Experiment Success Stats
  COUNT(DISTINCT e.id) as total_experiments,
  COUNT(DISTINCT e.id) FILTER (WHERE e.outcome = 'success') as successful_experiments,
  COUNT(DISTINCT e.id) FILTER (WHERE e.outcome = 'failure') as failed_experiments,
  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'in_progress') as active_experiments,

  -- Canvas Validation (via studio_project link)
  (
    SELECT COUNT(*)
    FROM business_model_canvases bmc
    WHERE bmc.studio_project_id = sp.id
    AND bmc.status = 'validated'
  ) as validated_business_models,

  (
    SELECT AVG(fit_score)
    FROM value_proposition_canvases vpc
    WHERE vpc.studio_project_id = sp.id
    AND vpc.fit_score IS NOT NULL
  ) as avg_vpc_fit_score,

  -- Evidence Documentation
  COUNT(DISTINCT le.id) as total_log_entries,

  -- Computed Evidence Strength Score (0-100)
  CASE
    WHEN p.portfolio_type = 'explore' THEN
      LEAST(100, (
        COALESCE(COUNT(DISTINCT h.id) FILTER (WHERE h.status = 'validated') * 10, 0) +
        COALESCE(COUNT(DISTINCT e.id) FILTER (WHERE e.outcome = 'success') * 15, 0) +
        COALESCE((SELECT AVG(fit_score) FROM value_proposition_canvases WHERE studio_project_id = sp.id) * 50, 0)
      ))
    ELSE NULL
  END as computed_evidence_score

FROM projects p
LEFT JOIN studio_projects sp ON p.id = sp.id OR p.slug = sp.slug -- Assuming linkage (may need junction table)
LEFT JOIN studio_hypotheses h ON h.project_id = sp.id
LEFT JOIN studio_experiments e ON e.project_id = sp.id
LEFT JOIN log_entries le ON le.studio_project_id = sp.id
GROUP BY p.id, p.slug, p.title, p.portfolio_type, p.explore_stage, p.exploit_stage, p.evidence_strength, sp.id;

COMMENT ON VIEW portfolio_evidence_summary IS 'Aggregates evidence from hypotheses, experiments, canvases, and log entries';
```

### Phase 3: Helper Functions

```sql
-- Function to compute evidence strength based on linked entities
CREATE OR REPLACE FUNCTION compute_evidence_strength(project_id UUID)
RETURNS TEXT AS $$
DECLARE
  evidence_score INTEGER;
BEGIN
  SELECT computed_evidence_score INTO evidence_score
  FROM portfolio_evidence_summary
  WHERE id = project_id;

  RETURN CASE
    WHEN evidence_score IS NULL OR evidence_score < 20 THEN 'none'
    WHEN evidence_score < 50 THEN 'weak'
    WHEN evidence_score < 75 THEN 'moderate'
    ELSE 'strong'
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to suggest stage transitions based on evidence
CREATE OR REPLACE FUNCTION suggest_explore_stage_transition(project_id UUID)
RETURNS JSONB AS $$
DECLARE
  summary RECORD;
  suggestion JSONB;
BEGIN
  SELECT * INTO summary
  FROM portfolio_evidence_summary
  WHERE id = project_id;

  -- Ideation → Discovery: At least 1 hypothesis defined
  IF summary.explore_stage = 'ideation' AND summary.total_hypotheses >= 1 THEN
    suggestion = jsonb_build_object(
      'current_stage', 'ideation',
      'suggested_stage', 'discovery',
      'rationale', 'Hypotheses defined, ready to start testing',
      'confidence', 'medium'
    );

  -- Discovery → Validation: At least 3 experiments with 60%+ success rate
  ELSIF summary.explore_stage = 'discovery' AND summary.total_experiments >= 3
    AND summary.successful_experiments::float / summary.total_experiments >= 0.6 THEN
    suggestion = jsonb_build_object(
      'current_stage', 'discovery',
      'suggested_stage', 'validation',
      'rationale', format('Strong early evidence: %s/%s experiments successful',
                          summary.successful_experiments, summary.total_experiments),
      'confidence', 'high'
    );

  -- Validation → Acceleration: VPC fit score > 0.7 AND validated business model
  ELSIF summary.explore_stage = 'validation'
    AND summary.avg_vpc_fit_score > 0.7
    AND summary.validated_business_models >= 1 THEN
    suggestion = jsonb_build_object(
      'current_stage', 'validation',
      'suggested_stage', 'acceleration',
      'rationale', format('Strong validation: VPC fit %.2f, %s validated business model(s)',
                          summary.avg_vpc_fit_score, summary.validated_business_models),
      'confidence', 'high'
    );

  ELSE
    suggestion = jsonb_build_object(
      'current_stage', summary.explore_stage,
      'suggested_stage', summary.explore_stage,
      'rationale', 'Insufficient evidence for stage transition',
      'confidence', 'low'
    );
  END IF;

  RETURN suggestion;
END;
$$ LANGUAGE plpgsql;
```

### Phase 4: Projects ↔ Studio Projects Junction

Currently unclear how `projects` and `studio_projects` relate. Options:

**Option A: Merge Tables**
- Projects table absorbs studio_projects fields
- Simpler, single source of truth
- Migration required

**Option B: Junction Table**
- Keep separate, create `project_studio_links` junction
- More flexible, no migration
- Requires join in queries

**Option C: Soft Link via Slug**
- Match on slug (already unique in both)
- No schema change needed
- Loose coupling

**Recommendation:** Option C for now (slug matching), Option A long-term (merge tables)

---

## Portfolio Dashboard Design

### View Modes

**1. Explore Portfolio Map**
- 2D scatter plot
- Y-Axis: Expected Return (low → medium → high → breakthrough)
- X-Axis: Evidence Strength (none → weak → moderate → strong)
- Bubbles: Projects sized by current_investment
- Color: By explore_stage (Ideation=gray, Discovery=blue, Validation=yellow, Acceleration=green)
- Stage zones marked with vertical dividers

**2. Exploit Portfolio Map**
- 2D scatter plot
- Y-Axis: Profitability (low → medium → high)
- X-Axis: Sustainability (at_risk → moderate → protected)
- Bubbles: Projects sized by revenue or total_investment
- Color: By exploit_stage
- Quadrant lines showing risk zones

**3. Combined View**
- Both maps side-by-side
- Shared filters and metrics
- Shows portfolio balance (% in explore vs exploit)

**4. Table View (Fallback)**
- Enhanced AdminDataView with new columns
- Sortable by evidence strength, expected return, stage, etc.
- Inline evidence summary (hypotheses validated, experiments run)

### Dashboard Metrics Bar

```typescript
interface PortfolioMetrics {
  // Portfolio Balance
  exploreCount: number
  exploitCount: number
  explorePercentage: number  // % of projects in explore

  // Investment Distribution
  totalInvestment: number
  exploreInvestment: number
  exploitInvestment: number

  // Horizon Balance (70-20-10 rule)
  h1Count: number
  h2Count: number
  h3Count: number
  horizonBalance: {
    h1: number,  // % of resources in H1
    h2: number,
    h3: number
  }

  // Risk Distribution
  highRiskCount: number
  mediumRiskCount: number
  lowRiskCount: number

  // Evidence & Validation
  projectsWithStrongEvidence: number
  projectsNeedingReview: number
  avgVPCFitScore: number

  // Lifecycle Health
  projectsInIdeation: number
  projectsInDiscovery: number
  projectsInValidation: number
  projectsInAcceleration: number
  staleProjects: number  // No update in 30+ days
}
```

### Filtering & Segmentation

```typescript
interface PortfolioFilters {
  portfolioType?: 'explore' | 'exploit' | 'both'
  horizon?: 'h1' | 'h2' | 'h3'[]
  stage?: string[]  // explore_stage or exploit_stage values
  riskLevel?: ('low' | 'medium' | 'high')[]
  evidenceStrength?: ('none' | 'weak' | 'moderate' | 'strong')[]
  investmentRange?: { min: number, max: number }
  needsReview?: boolean  // next_review_due_at < now
  hasStrongEvidence?: boolean
}
```

### Interactive Features

1. **Click project bubble** → Open project detail panel
   - Shows linked BMC, VPC, hypotheses, experiments
   - Evidence summary with confidence scores
   - Decision history timeline
   - Quick actions: Move to stage, Schedule review, Add decision

2. **Drag & drop** → Update stage (optional, Phase 3)
   - Drag project bubble to new stage zone
   - Prompts for rationale
   - Records in decision_history

3. **Hover tooltip**
   - Project name
   - Current stage
   - Evidence strength: "3/5 hypotheses validated, 4/6 experiments successful"
   - Investment: "$50K invested"
   - Last review: "14 days ago"

4. **Bulk actions**
   - Select multiple projects
   - Batch schedule reviews
   - Export to CSV
   - Generate portfolio report

---

## Implementation Phases

### Phase 1: Database Foundation (Week 1)

**Goal:** Extend projects table with portfolio dimensions and create evidence aggregation

**Tasks:**
- [ ] Create migration: `add_portfolio_dimensions_to_projects.sql`
- [ ] Add all new columns to projects table
- [ ] Create indexes for portfolio queries
- [ ] Create `portfolio_evidence_summary` view
- [ ] Create helper functions: `compute_evidence_strength`, `suggest_explore_stage_transition`
- [ ] Establish projects ↔ studio_projects linkage (slug-based)
- [ ] Update TypeScript types in `lib/types/database.ts`
- [ ] Seed existing projects with initial portfolio classifications

**Deliverables:**
- Migration file
- Database view and functions
- Updated type definitions
- Seeded data

**Success Criteria:**
- [ ] Can query portfolio_evidence_summary for all projects
- [ ] Evidence strength computes correctly from linked entities
- [ ] Stage transition suggestions work

### Phase 2: Portfolio Dashboard UI - Foundation (Week 2)

**Goal:** Create dashboard page with table view and metrics

**Tasks:**
- [ ] Create `app/(private)/admin/portfolio/page.tsx`
- [ ] Create `components/portfolio/portfolio-dashboard.tsx`
- [ ] Create `components/portfolio/portfolio-metrics-summary.tsx`
- [ ] Create `components/portfolio/portfolio-filters.tsx`
- [ ] Create enhanced table view with portfolio columns
  - Show: portfolio_type, stage, evidence_strength, expected_return/profitability
  - Show aggregated stats: "3/5 hypotheses validated"
  - Inline evidence summary tooltip
- [ ] Add to admin navigation

**Deliverables:**
- Portfolio dashboard page (table view only)
- Metrics summary bar
- Filtering controls
- Enhanced table columns

**Success Criteria:**
- [ ] Can view all projects in table with portfolio dimensions
- [ ] Can filter by portfolio type, stage, horizon, risk
- [ ] Metrics summary shows accurate portfolio balance
- [ ] Can click project to see detail panel

### Phase 3: Portfolio Map Visualization (Week 3)

**Goal:** Implement 2D portfolio map visualizations

**Tasks:**
- [ ] Research visualization libraries (Recharts, D3, Visx, Nivo)
- [ ] Create `components/portfolio/portfolio-map.tsx`
  - [ ] 2D scatter plot with configurable axes
  - [ ] Project bubbles sized by investment
  - [ ] Color coding by stage
  - [ ] Stage zone markers/dividers
  - [ ] Hover tooltips
  - [ ] Click to open detail panel
- [ ] Create `components/portfolio/explore-portfolio-map.tsx`
  - Y: Expected Return, X: Evidence Strength
- [ ] Create `components/portfolio/exploit-portfolio-map.tsx`
  - Y: Profitability, X: Sustainability
- [ ] Create view switcher: Explore | Exploit | Both | Table
- [ ] Responsive design (stacked on mobile)

**Deliverables:**
- Interactive portfolio map visualizations
- Explore and Exploit map components
- View switcher
- Responsive layout

**Success Criteria:**
- [ ] Projects plot correctly on 2D maps
- [ ] Bubbles sized proportionally to investment
- [ ] Hover shows evidence summary
- [ ] Can switch between Explore/Exploit/Both/Table views
- [ ] Stage zones visually clear

### Phase 4: Polish & Advanced Features (Week 4)

**Goal:** Add interactivity, decision tracking, and insights

**Tasks:**
- [ ] Project detail panel
  - [ ] Show linked BMC, VPC, hypotheses, experiments
  - [ ] Evidence timeline
  - [ ] Decision history with rationale
  - [ ] Quick actions: Update stage, Schedule review
- [ ] Decision recording
  - [ ] "Add Decision" modal (pivot, persevere, kill)
  - [ ] Rationale text field
  - [ ] Records to decision_history JSONB
- [ ] Stage transition workflow
  - [ ] "Suggest Stage Transition" button
  - [ ] Uses `suggest_explore_stage_transition()` function
  - [ ] Shows rationale and confidence
  - [ ] One-click approve or manual override
- [ ] Portfolio insights
  - [ ] Projects needing review (next_review_due_at < now)
  - [ ] Stale projects (no update in 30+ days)
  - [ ] Imbalanced horizons (deviation from 70-20-10)
  - [ ] High-risk projects without evidence
- [ ] Export & reporting
  - [ ] Export portfolio to CSV
  - [ ] Generate PDF portfolio report
  - [ ] Share portfolio snapshot via link

**Deliverables:**
- Project detail panel
- Decision recording UI
- Stage transition suggestions
- Portfolio insights/warnings
- Export functionality

**Success Criteria:**
- [ ] Can view full project evidence chain
- [ ] Can record portfolio decisions with rationale
- [ ] Stage transitions suggested based on evidence
- [ ] Dashboard highlights projects needing attention
- [ ] Can export portfolio data

---

## Technical Challenges & Solutions

### Challenge 1: Projects ↔ Studio Projects Relationship

**Problem:** Unclear how `projects` and `studio_projects` relate. Are they:
- Same entities with different schemas?
- Projects = public portfolio, studio_projects = internal work?
- Projects = all work, studio_projects = subset?

**Solution Options:**
1. **Merge tables** - Consolidate into single projects table with all fields
2. **Junction table** - Create explicit many-to-many relationship
3. **Slug-based soft link** - Match on unique slug field

**Recommendation:**
- Short-term: Slug-based matching (no migration needed)
- Long-term: Merge tables for single source of truth
- Decision needed from user on semantic relationship

### Challenge 2: Evidence Aggregation Performance

**Problem:** Computing evidence_strength from multiple joined tables (hypotheses, experiments, canvases) could be slow with many projects.

**Solution:**
- Use database VIEW with pre-joined data (`portfolio_evidence_summary`)
- Add indexes on FK columns (project_id, studio_project_id)
- Consider materialized view if >1000 projects
- Compute evidence_strength on-write (trigger) vs on-read (view) trade-off

**Recommendation:**
- Start with VIEW (simpler, always fresh)
- Move to materialized view if performance issues arise
- Add `REFRESH MATERIALIZED VIEW` to nightly cron

### Challenge 3: Choosing Visualization Library

**Options:**
| Library | Pros | Cons |
|---------|------|------|
| **Recharts** | Simple API, React-friendly, good docs | Limited customization |
| **D3** | Ultimate control, powerful | Steep learning curve, verbose |
| **Visx** | D3 primitives, React-friendly | Medium learning curve |
| **Nivo** | Beautiful defaults, declarative | Bundle size, less flexible |

**Recommendation:** **Visx**
- Good balance of control and simplicity
- React primitives (no D3 selection manipulation)
- Small bundle size
- Used by Airbnb, Netflix

### Challenge 4: Real-time Evidence Updates

**Problem:** When user runs experiment and marks it "success", should portfolio map update immediately?

**Solution Options:**
1. **Manual refresh** - User reloads dashboard
2. **Optimistic updates** - Update local state, sync later
3. **Real-time subscriptions** - Supabase realtime on projects table
4. **Polling** - Fetch every N seconds

**Recommendation:**
- Phase 1-3: Manual refresh (simplest)
- Phase 4: Optimistic updates for stage transitions
- Future: Supabase realtime subscriptions

### Challenge 5: Handling Missing Data

**Problem:** Many projects won't have all portfolio fields populated initially.

**Solution:**
- Graceful fallbacks in UI
- "Uncategorized" section in dashboard
- Onboarding flow: "Classify your portfolio"
- Allow bulk edit to set portfolio_type, horizon
- Default values: portfolio_type=NULL, evidence_strength=NULL (computed)

**Recommendation:**
- Create "Portfolio Setup Wizard" for batch classification
- Show % of portfolio classified in metrics bar
- Warn when viewing dashboard if >50% uncategorized

---

## Data Migration Strategy

### Seeding Existing Projects

```sql
-- Classify existing projects based on status and type
UPDATE projects
SET
  portfolio_type = CASE
    WHEN status IN ('draft', 'active') AND type = 'experiment' THEN 'explore'
    WHEN status IN ('completed', 'archived') THEN 'exploit'
    ELSE NULL
  END,

  explore_stage = CASE
    WHEN status = 'draft' THEN 'ideation'
    WHEN status = 'active' AND type = 'experiment' THEN 'discovery'
    ELSE NULL
  END,

  exploit_stage = CASE
    WHEN status = 'completed' THEN 'mature'
    WHEN status = 'archived' THEN 'declining'
    ELSE NULL
  END,

  horizon = CASE
    WHEN type = 'project' THEN 'h1'
    WHEN type = 'experiment' THEN 'h3'
    WHEN type = 'business' THEN 'h2'
    ELSE 'h1'
  END,

  innovation_risk = 'medium',  -- Default, requires manual review

  evidence_strength = 'none',  -- Will be computed by view

  last_portfolio_review_at = now(),
  next_review_due_at = now() + interval '90 days';

-- Log migration
INSERT INTO log_entries (title, content, type, published)
VALUES (
  'Portfolio Classification Migration',
  'Automatically classified existing projects into portfolio framework. Requires manual review and refinement.',
  'system',
  false
);
```

---

## UI/UX Wireframes

### Portfolio Dashboard (Explore View)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Admin > Portfolio Dashboard                          [@Admin] [?]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ PORTFOLIO METRICS                                           │   │
│  ├──────────────┬──────────────┬──────────────┬──────────────┤   │
│  │ Explore: 12  │ H1: 15 (60%) │ Strong Ev: 5 │ Need Review: │   │
│  │ Exploit: 13  │ H2: 8 (32%)  │ Weak Ev: 10  │ 7            │   │
│  │ Total: 25    │ H3: 2 (8%)   │ None: 10     │              │   │
│  └──────────────┴──────────────┴──────────────┴──────────────┘   │
│                                                                     │
│  [View: Explore ▼] [Filter ▼]                     [Export] [Help] │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    EXPLORE PORTFOLIO MAP                     │  │
│  │                                                              │  │
│  │  Breakthrough │                                              │  │
│  │               │                   ⬤ (Acceleration)          │  │
│  │               │                                              │  │
│  │  High         │           ⬤                                 │  │
│  │               │      ⬤        ⬤  (Validation)              │  │
│  │               │                                              │  │
│  │  Medium       │   ⬤    ⬤                                    │  │
│  │               │  ⬤  (Discovery)                             │  │
│  │               │                                              │  │
│  │  Low          │⬤ ⬤                                          │  │
│  │               │(Ideation)                                    │  │
│  │               └──────┬────────┬────────┬────────             │  │
│  │                     None    Weak   Moderate  Strong          │  │
│  │                          Evidence Strength                   │  │
│  │                                                              │  │
│  │  ⬤ Project bubble sized by investment                       │  │
│  │  Color: Gray=Ideation, Blue=Discovery, Yellow=Validation,   │  │
│  │         Green=Acceleration                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Projects in view: 12                   [Switch to Table View]     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Project Detail Panel (Slide-out)

```
┌──────────────────────────────────────┐
│ ← Project: AI Design Tool            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                      │
│ Portfolio: Explore                   │
│ Stage: Validation                    │
│ Evidence: Moderate                   │
│ Investment: $75K                     │
│                                      │
│ ━━━ Evidence Summary ━━━             │
│                                      │
│ Hypotheses: 5 total                  │
│   ✓ 3 validated                      │
│   ✗ 1 invalidated                    │
│   ⏳ 1 testing                        │
│                                      │
│ Experiments: 6 total                 │
│   ✓ 4 successful                     │
│   ✗ 2 failed                         │
│                                      │
│ Value Prop Canvas:                   │
│   Fit Score: 0.72 (Strong)           │
│   Confidence: High                   │
│                                      │
│ Business Model: 1 validated          │
│                                      │
│ ━━━ Suggested Action ━━━             │
│                                      │
│ ⚠️  Consider transition to           │
│    Acceleration stage                │
│                                      │
│    Rationale: Strong validation      │
│    evidence (VPC fit 0.72, 3/5      │
│    hypotheses validated, 4/6        │
│    successful experiments)           │
│                                      │
│ [Move to Acceleration]               │
│ [Schedule Review]                    │
│ [Record Decision]                    │
│                                      │
│ ━━━ Recent Activity ━━━              │
│                                      │
│ • 2 days ago: Experiment E6 success  │
│ • 5 days ago: Hypothesis H3 validated│
│ • 1 week ago: Portfolio review       │
│                                      │
│ ━━━ Decision History ━━━             │
│                                      │
│ • 2024-12-15: Persevere              │
│   "Strong customer interest"         │
│                                      │
│ • 2024-11-01: Pivot                  │
│   "Changed target segment to SMBs"   │
│                                      │
│ [View Full Project] [Edit]           │
│                                      │
└──────────────────────────────────────┘
```

---

## Success Criteria

### Phase 1 (Database Foundation)
- [ ] All portfolio dimension columns added to projects table
- [ ] `portfolio_evidence_summary` view returns data for all projects
- [ ] Evidence strength computes accurately from linked entities
- [ ] Stage transition suggestions work for Explore portfolio
- [ ] TypeScript types updated and compile without errors
- [ ] Existing projects seeded with initial classifications

### Phase 2 (Dashboard Foundation)
- [ ] Portfolio dashboard accessible at `/admin/portfolio`
- [ ] Table view shows all portfolio dimensions
- [ ] Metrics bar displays accurate portfolio balance
- [ ] Filters work: portfolio type, stage, horizon, risk
- [ ] Can view evidence summary inline in table
- [ ] Performance: Dashboard loads in <2 seconds with 100 projects

### Phase 3 (Portfolio Map)
- [ ] Explore portfolio map visualizes projects correctly on 2D plot
- [ ] Exploit portfolio map visualizes projects correctly on 2D plot
- [ ] Project bubbles sized proportionally to investment
- [ ] Hover tooltips show evidence summary
- [ ] View switcher allows toggling between Explore/Exploit/Both/Table
- [ ] Responsive design works on mobile (stacked maps)
- [ ] Stage zones marked clearly with visual dividers

### Phase 4 (Polish & Interactivity)
- [ ] Project detail panel shows full evidence chain
- [ ] Can record portfolio decisions with rationale
- [ ] Stage transition suggestions appear automatically
- [ ] Dashboard highlights projects needing review
- [ ] Can export portfolio data to CSV
- [ ] Performance: All interactions feel snappy (<200ms)

### Overall Success (Portfolio Management)
- [ ] Portfolio manager can see explore vs exploit balance at a glance
- [ ] Can identify projects lacking evidence (risk management)
- [ ] Can track stage progression over time
- [ ] Decisions documented with clear rationale
- [ ] Evidence-based stage transitions reduce subjective bias
- [ ] Portfolio reviews happen regularly (tracked via next_review_due_at)

---

## Rollout Plan

### Week 1: Database Foundation
- Create migration
- Build evidence aggregation view
- Seed existing projects
- Update types
- **Milestone:** Can query portfolio data via SQL

### Week 2: Dashboard Table View
- Build dashboard page
- Implement table view with filters
- Add metrics summary
- **Milestone:** Can view and filter portfolio in table

### Week 3: Portfolio Map Visualization
- Implement 2D scatter plots
- Build Explore and Exploit maps
- Add view switcher
- **Milestone:** Can visualize portfolio on 2D maps

### Week 4: Polish & Launch
- Build project detail panel
- Add decision recording
- Implement stage suggestions
- Add export functionality
- **Milestone:** Production-ready portfolio dashboard

### Post-Launch
- Gather feedback from portfolio reviews
- Iterate on evidence scoring algorithm
- Add drag-and-drop stage transitions
- Implement real-time updates
- Build portfolio reporting (PDF export)

---

## Open Questions

1. **Projects vs Studio Projects:**
   - Are these meant to be the same entities or different?
   - Should we merge tables or keep separate?
   - What's the semantic distinction?

2. **Portfolio Classification:**
   - Should we auto-classify based on rules or require manual?
   - What % of existing projects can be auto-classified?
   - Who owns portfolio classification decisions?

3. **Evidence Scoring Algorithm:**
   - Current formula: `validated_hypos * 10 + successful_experiments * 15 + vpc_fit * 50`
   - Should we weight differently?
   - Should customer profiles factor in?

4. **Review Cadence:**
   - How often should projects be reviewed? (Default: 90 days)
   - Different cadence for different stages?
   - Who is responsible for reviews?

5. **Investment Tracking:**
   - How to populate current_investment and total_investment?
   - Manual entry or integration with financial system?
   - Track by time or dollars?

6. **Horizon Allocation:**
   - Should we enforce 70-20-10 rule or just recommend?
   - Show warnings when out of balance?
   - Industry-specific targets (tech vs consumer)?

---

## Dependencies

### New NPM Packages
```json
{
  "@visx/scale": "^3.5.0",
  "@visx/axis": "^3.10.0",
  "@visx/grid": "^3.5.0",
  "@visx/group": "^3.3.0",
  "@visx/shape": "^3.5.0",
  "@visx/tooltip": "^3.3.0",
  "@visx/responsive": "^3.10.0"
}
```

### Database Requirements
- PostgreSQL 14+ (for JSONB enhancements)
- Existing tables: projects, studio_projects, studio_hypotheses, studio_experiments, business_model_canvases, value_proposition_canvases, log_entries

---

## Conclusion

This implementation transforms portfolio management from basic project tracking to **evidence-based innovation portfolio management** following Strategyzer's proven methodology.

**Key Benefits:**
1. **Visual Portfolio Balance** - See explore vs exploit distribution at a glance
2. **Evidence-Based Decisions** - Stage transitions backed by hypothesis validation
3. **Risk Management** - Identify high-risk projects lacking evidence
4. **Resource Optimization** - Ensure horizon balance aligns with strategy
5. **Decision Accountability** - Every stage transition documented with rationale
6. **Integration** - Leverages existing BMC, VPC, hypotheses, experiments infrastructure

**Next Steps:**
1. Review and approve this plan
2. Answer open questions (especially projects ↔ studio_projects relationship)
3. Create Phase 1 migration
4. Begin implementation

**Timeline:** 3-4 weeks for MVP, 6 weeks for fully polished dashboard

---

**Ready to proceed?**
