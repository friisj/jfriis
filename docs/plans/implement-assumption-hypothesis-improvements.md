# Implementation Plan: Assumptions & Hypotheses Improvements

**Date:** 2026-01-09
**Author:** Claude
**Status:** Planning
**Related:** `docs/analysis/assumptions-hypotheses-critical-review.md`

## Overview

Implement recommendations #2 and #3 from the critical assessment:
- **Suggestion 2:** Create conceptual documentation explaining assumptions vs hypotheses
- **Suggestion 3:** Add validation constraints for status/evidence consistency

## Architectural Context

### Existing Patterns Discovered

**Documentation:**
- Location: `/docs/` with subdirectories for `infrastructure/`, `specs/`, `analysis/`
- Format: Markdown with TypeScript/SQL examples, Mermaid diagrams, clear section hierarchy
- Best model: `docs/infrastructure/RELATIONSHIP_SIMPLIFICATION_SPEC.md`

**Validation:**
- Database: CHECK constraints in migration files
- Forms: Visual feedback banners, helper text, computed state indicators
- Example: Leap of Faith indicator in `assumption-form.tsx:245-257`

**Key Discovery:**
- entity_links M:N relationship already exists and is validated
- No status/evidence validation currently exists (gap to fill)
- Critical review doc contains theoretical content to extract

---

## Implementation: Suggestion 2 - Conceptual Documentation

### Objective

Create user-friendly documentation that explains:
- What assumptions and hypotheses are
- How they differ conceptually
- Both workflow approaches (assumption-first vs hypothesis-first)
- How entity_links enables M:N relationships
- Practical examples

### File to Create

**`/home/user/jfriis/docs/concepts/assumptions-vs-hypotheses.md`**

### Content Structure

```markdown
# Understanding Assumptions and Hypotheses

## Quick Reference
[TL;DR decision matrix]

## Core Concepts

### Assumptions
- Definition: Unvalidated beliefs that must be true for success
- Example: "Users will pay $29/month for this tool"
- Prioritization: Importance × Evidence matrix
- Categories: Desirability, Viability, Feasibility, Usability, Ethical

### Hypotheses
- Definition: Testable statements about strategic initiatives
- Example: "If we add feature X, then conversion will increase by 20%"
- Purpose: Validate one or more assumptions
- Ordering: Sequenced in validation roadmap

### Key Differences
[Table comparing assumptions vs hypotheses]

## Relationships

### M:N Architecture via entity_links
- One assumption can be tested by many hypotheses
- One hypothesis can test many assumptions
- Bidirectional linking supported
- Uses established entity_links pattern

[Mermaid diagram showing relationship]

## Workflows

### Workflow 1: Assumption-First (David Bland Method)
**When to use:** Risk-first approach, canvas-based extraction

1. Extract assumptions from canvases
2. Categorize by type (D/V/F/U/E)
3. Prioritize by Importance × Evidence
4. Identify "Leap of Faith" assumptions
5. Create hypotheses to test priority assumptions
6. Link via entity_links (link_type: 'tests')
7. Design experiments
8. Collect evidence
9. Update assumption evidence level

### Workflow 2: Hypothesis-First (Strategy Method)
**When to use:** Strategy-first approach, initiative planning

1. Define strategic hypotheses
2. Order in validation roadmap (sequence)
3. Break down into testable assumptions
4. Link via entity_links (link_type: 'tested_by')
5. Design experiments
6. Collect evidence
7. Validate or invalidate hypothesis

## UI Guide

### Creating Assumptions
**Form location:** `/admin/assumptions/new`

**Key fields:**
- Statement: What must be true
- Category: D/V/F/U/E
- Importance: Critical/High/Medium/Low
- Evidence Level: None/Weak/Moderate/Strong

**Relationships:**
- "Tested By Hypotheses" sidebar card
- Uses EntityLinkField with link_type='tested_by'
- Multi-select, shows all linked hypotheses

**Visual Indicators:**
- "Leap of Faith" banner: High importance + Low evidence

### Creating Hypotheses
**Form location:** `/admin/hypotheses/new`

**Key fields:**
- Statement: "If we X, then Y because Z"
- Validation Criteria: How to measure success
- Sequence: Order in roadmap
- Status: Proposed/Testing/Validated/Invalidated

**Relationships:**
- "Assumptions Tested" sidebar card
- Uses EntityLinkField with link_type='tests'
- Multi-select, shows all linked assumptions

### Linking Strategies

**From Hypothesis → Assumption:**
1. Open hypothesis form
2. Scroll to "Assumptions Tested" sidebar
3. Select assumptions from dropdown
4. Links created with link_type='tests'

**From Assumption → Hypothesis:**
1. Open assumption form
2. Scroll to "Tested By Hypotheses" sidebar
3. Select hypotheses from dropdown
4. Links created with link_type='tested_by'

## Examples

### Example 1: SaaS Billing Tool (Assumption-First)

**Context:** Building automated invoicing tool for small businesses

**Step 1: Extract Assumption from Business Model Canvas**
```
Canvas: Business Model Canvas
Block: Customer Segments → Value Proposition
Assumption: "Small businesses struggle with manual invoice management"
Category: Desirability
Importance: Critical
Evidence: None → Leap of Faith!
```

**Step 2: Create Hypotheses to Test**

Hypothesis 1:
```
Statement: "If we interview 20 small business owners,
           then at least 60% will report invoice pain points"
Validation Criteria: ≥12/20 report frustration
Linked Assumptions: [assumption above]
```

Hypothesis 2:
```
Statement: "If we build an MVP landing page,
           then we'll get 100 signups in 2 weeks"
Validation Criteria: ≥100 email signups
Linked Assumptions: [assumption above]
```

**Step 3: Run Experiments**
- Conduct interviews → Result: 15/20 (75%) confirmed pain
- Launch landing page → Result: 143 signups

**Step 4: Update Evidence**
- Assumption evidence level: None → Moderate
- Hypothesis 1 status: Validated
- Hypothesis 2 status: Validated
- Decision: Persevere

**Entity Links Created:**
```
hypothesis[h1] --tests--> assumption[a1]
hypothesis[h2] --tests--> assumption[a1]
```

### Example 2: Feature Initiative (Hypothesis-First)

**Context:** Adding dark mode to existing app

**Step 1: Define Strategic Hypothesis**
```
Statement: "If we add dark mode toggle,
           then user engagement will increase by 10%"
Rationale: Users request it, modern expectation
Sequence: 1 (top priority)
Status: Proposed
```

**Step 2: Identify Assumptions**

Assumption 1:
```
Statement: "Users actually want dark mode (not just vocal minority)"
Category: Desirability
Importance: High
Evidence: None
```

Assumption 2:
```
Statement: "Dark mode will increase usage time"
Category: Desirability
Importance: Medium
Evidence: None
```

Assumption 3:
```
Statement: "We can implement dark mode in 1 sprint"
Category: Feasibility
Importance: Medium
Evidence: Weak (team estimate)
```

**Step 3: Link and Prioritize**
- All assumptions linked to hypothesis
- Assumption 1 flagged as Leap of Faith
- Test order: A1 → A2 → A3

**Step 4: Design Experiments**
- Survey existing users (test A1)
- A/B test with beta users (test A2)
- Technical spike (test A3)

**Entity Links Created:**
```
assumption[a1] --tested_by--> hypothesis[h1]
assumption[a2] --tested_by--> hypothesis[h1]
assumption[a3] --tested_by--> hypothesis[h1]
```

## Technical Implementation

### Database Schema

**Assumptions Table:**
```sql
CREATE TABLE assumptions (
  id UUID PRIMARY KEY,
  statement TEXT NOT NULL,
  category TEXT CHECK (category IN ('desirability', ...)),
  importance TEXT CHECK (importance IN ('critical', ...)),
  evidence_level TEXT CHECK (evidence_level IN ('none', ...)),
  status TEXT CHECK (status IN ('identified', ...)),
  is_leap_of_faith BOOLEAN,
  hypothesis_id UUID REFERENCES studio_hypotheses(id),  -- Legacy FK
  -- ... other fields
);
```

**Hypotheses Table:**
```sql
CREATE TABLE studio_hypotheses (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES studio_projects(id),
  statement TEXT NOT NULL,
  validation_criteria TEXT,
  sequence INTEGER,
  status TEXT CHECK (status IN ('proposed', ...)),
  -- ... other fields
);
```

**Entity Links Table (M:N):**
```sql
CREATE TABLE entity_links (
  id UUID PRIMARY KEY,
  source_type TEXT NOT NULL,  -- 'hypothesis' or 'assumption'
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL,  -- 'assumption' or 'hypothesis'
  target_id UUID NOT NULL,
  link_type TEXT NOT NULL,    -- 'tests' or 'tested_by'
  strength TEXT,              -- 'strong', 'moderate', 'weak'
  notes TEXT,
  UNIQUE(source_type, source_id, target_type, target_id, link_type)
);
```

### TypeScript Types

```typescript
import type { LinkableEntityType, LinkType } from '@/lib/types/entity-relationships'

// Creating links
import { syncEntityLinks } from '@/lib/entity-links'

// From hypothesis to assumptions
await syncEntityLinks(
  { type: 'hypothesis', id: hypothesisId },
  'assumption',
  'tests',
  [assumptionId1, assumptionId2]
)

// From assumption to hypotheses
await syncEntityLinks(
  { type: 'assumption', id: assumptionId },
  'hypothesis',
  'tested_by',
  [hypothesisId1, hypothesisId2]
)
```

### React Components

```typescript
import { EntityLinkField } from '@/components/admin/entity-link-field'

// In hypothesis form
<EntityLinkField
  sourceType="hypothesis"
  sourceId={hypothesis?.id}
  targetType="assumption"
  targetTableName="assumptions"
  targetDisplayField="statement"
  linkType="tests"
  allowMultiple={true}
  helperText="Select assumptions this hypothesis tests"
/>

// In assumption form
<EntityLinkField
  sourceType="assumption"
  sourceId={assumption?.id}
  targetType="hypothesis"
  targetTableName="studio_hypotheses"
  targetDisplayField="statement"
  linkType="tested_by"
  allowMultiple={true}
  helperText="Which hypotheses test this assumption?"
/>
```

## Theoretical Foundations

### David Bland's Framework

**Source:** "Testing Business Ideas" (Strategyzer, 2019)

**Key Principles:**
1. Assumptions exist whether documented or not
2. Prioritize by Importance × Evidence matrix
3. Test "Leap of Faith" assumptions first
4. Use Persevere/Pivot/Kill decision framework

**Risk Categories:**
- Desirability: Do customers want this?
- Viability: Can we make money?
- Feasibility: Can we build it?

### Teresa Torres' Framework

**Source:** "Continuous Discovery Habits" (2021)

**Additional Categories:**
- Usability: Can customers use it effectively?
- Ethical: Could this cause harm?

**Key Principles:**
1. Continuous testing (weekly cadence)
2. Opportunity solution trees
3. Assumption mapping embedded in solutions

### Our Implementation vs Standard Frameworks

**Differences:**
- Supports both assumption-first AND hypothesis-first workflows
- Uses entity_links for flexible M:N relationships
- Keeps legacy `hypothesis_id` FK for backward compatibility

**Advantages:**
- Flexibility for different team workflows
- Consistent architectural patterns
- Rich evidence tracking
- Source provenance from canvases

**Trade-offs:**
- Requires understanding both workflows
- Dual relationship pattern (FK + entity_links)
- Need to document when to use each approach

## Common Questions

### Q: Should I create assumptions or hypotheses first?

**A:** Either approach works! Choose based on your situation:

- **Start with assumptions if:** You're using canvases (BMC, VPC), doing risk analysis, or following Bland's methodology
- **Start with hypotheses if:** You're planning strategic initiatives, have clear product vision, or doing roadmap planning

### Q: Can an assumption be tested by multiple hypotheses?

**A:** Yes! This is the power of M:N relationships. Example:

```
Assumption: "Users will pay for premium features"

Hypothesis 1: "Pricing page converts at 20%"
Hypothesis 2: "Free trial converts at 30%"
Hypothesis 3: "Survey shows 50% willing to pay"
```

All three hypotheses test the same assumption from different angles.

### Q: When should I update evidence_level?

**A:** Update as you collect evidence:

- **None → Weak:** Initial data (survey, small sample)
- **Weak → Moderate:** Multiple sources, larger sample
- **Moderate → Strong:** Experiments confirm, high confidence
- **Validated/Invalidated:** Requires moderate or strong evidence

### Q: What's the difference between status and evidence_level?

**A:** They track different things:

- **status:** Workflow state (identified → testing → validated)
- **evidence_level:** Data confidence (none → weak → moderate → strong)

An assumption can be `status: 'testing'` with `evidence_level: 'weak'`.

### Q: Should I use the hypothesis_id FK or entity_links?

**A:** Prefer entity_links for new features:

- **hypothesis_id FK:** Legacy, 1:N only, kept for backward compatibility
- **entity_links:** Modern, M:N, bidirectional, recommended

## References

### Internal Documentation
- `/docs/analysis/assumptions-hypotheses-critical-review.md` - Critical assessment
- `/docs/infrastructure/RELATIONSHIP_SIMPLIFICATION_SPEC.md` - Entity links pattern
- `/docs/specs/hypotheses-experiments-admin-ui.md` - UI specifications

### External Resources
- David Bland & Alexander Osterwalder, "Testing Business Ideas" (2019)
- Teresa Torres, "Continuous Discovery Habits" (2021)
- Strategyzer.com - Business Model Canvas resources

### Related Code
- `/lib/entity-links.ts` - Helper functions
- `/lib/entity-links-validation.ts` - Validation rules
- `/components/admin/entity-link-field.tsx` - UI component
- `/components/admin/assumption-form.tsx` - Assumption form
- `/components/admin/hypothesis-form.tsx` - Hypothesis form

---

**Document Version:** 1.0
**Last Updated:** 2026-01-09
**Maintainer:** Product Team
```

### Content Sources

**Extract from critical review:**
- Part 1-2: David Bland and Teresa Torres frameworks
- Part 3: Current implementation details
- Part 7: Entity links architecture explanation
- Part 8: Recommendations and workflows

**New content to write:**
- Practical UI guide
- Step-by-step examples
- Common questions section
- Quick reference table

### Effort Estimate

- Content extraction: 30 minutes
- New examples: 45 minutes
- Diagrams: 30 minutes
- Review/polish: 15 minutes
- **Total: ~2 hours**

---

## Implementation: Suggestion 3 - Validation Constraints

### Objective

Prevent users from marking assumptions as validated/invalidated without sufficient evidence.

### Problem Statement

Current behavior allows:
```
status: 'validated'
evidence_level: 'none'
```

This is logically inconsistent. You can't validate something you have no evidence for!

### Solution: Two-Layer Validation

**Layer 1: Database CHECK Constraint** (enforcement)
**Layer 2: Form Validation Warning** (user guidance)

---

### Part A: Database Migration

#### File to Create

**`/home/user/jfriis/supabase/migrations/20260109000000_add_status_evidence_validation.sql`**

#### Content

```sql
-- ============================================================================
-- STATUS/EVIDENCE VALIDATION CONSTRAINT
-- ============================================================================
-- Prevents marking assumptions as validated/invalidated without sufficient evidence
-- Created: 2026-01-09
-- Related: docs/analysis/assumptions-hypotheses-critical-review.md (Part 8, Issue 3)

-- Add CHECK constraint to assumptions table
ALTER TABLE assumptions
ADD CONSTRAINT consistent_status_evidence CHECK (
  -- Case 1: Validated status requires moderate or strong evidence
  (status = 'validated' AND evidence_level IN ('moderate', 'strong'))
  OR
  -- Case 2: Invalidated status requires moderate or strong evidence
  (status = 'invalidated' AND evidence_level IN ('moderate', 'strong'))
  OR
  -- Case 3: All other statuses allowed with any evidence level
  (status NOT IN ('validated', 'invalidated'))
);

-- Add helpful comment
COMMENT ON CONSTRAINT consistent_status_evidence ON assumptions IS
  'Ensures assumptions can only be validated/invalidated with moderate or strong evidence. '
  'This prevents marking beliefs as proven without sufficient data.';

-- ============================================================================
-- VALIDATION EXAMPLES
-- ============================================================================

-- These will PASS validation:
-- ✓ status='identified', evidence_level='none'     (not claiming validation)
-- ✓ status='testing', evidence_level='weak'        (in progress)
-- ✓ status='validated', evidence_level='moderate'  (sufficient evidence)
-- ✓ status='validated', evidence_level='strong'    (strong evidence)
-- ✓ status='invalidated', evidence_level='strong'  (proven wrong)

-- These will FAIL validation:
-- ✗ status='validated', evidence_level='none'      (can't validate with no evidence)
-- ✗ status='validated', evidence_level='weak'      (insufficient evidence)
-- ✗ status='invalidated', evidence_level='none'    (can't invalidate without evidence)
-- ✗ status='invalidated', evidence_level='weak'    (insufficient evidence)
```

#### Validation Logic

```
Allowed Combinations Matrix:

                  | none | weak | moderate | strong |
------------------|------|------|----------|--------|
identified        |  ✓   |  ✓   |    ✓     |   ✓    |
prioritized       |  ✓   |  ✓   |    ✓     |   ✓    |
testing           |  ✓   |  ✓   |    ✓     |   ✓    |
validated         |  ✗   |  ✗   |    ✓     |   ✓    |
invalidated       |  ✗   |  ✗   |    ✓     |   ✓    |
archived          |  ✓   |  ✓   |    ✓     |   ✓    |
```

#### Backward Compatibility

- **Non-breaking:** Constraint only affects new INSERT/UPDATE operations
- **Existing data:** Query existing data to check for violations:
  ```sql
  SELECT id, statement, status, evidence_level
  FROM assumptions
  WHERE status IN ('validated', 'invalidated')
    AND evidence_level IN ('none', 'weak');
  ```
- **Migration strategy:** If violations exist, either:
  - Update status to 'testing'
  - Update evidence_level to 'moderate'
  - Document exceptions

---

### Part B: Form Validation & UI Guidance

#### File to Modify

**`/home/user/jfriis/components/admin/assumption-form.tsx`**

#### Changes Overview

1. Add computed validation state
2. Add visual warning banner
3. Add helper text to status field
4. Add helper text to evidence field

#### Implementation Details

**Location 1: After line 115 (computed state)**

```typescript
// Compute leap of faith status
const isLeapOfFaith =
  (formData.importance === 'critical' || formData.importance === 'high') &&
  (formData.evidence_level === 'none' || formData.evidence_level === 'weak')

// NEW: Compute status/evidence validation
const hasValidationConflict =
  (formData.status === 'validated' || formData.status === 'invalidated') &&
  (formData.evidence_level === 'none' || formData.evidence_level === 'weak')
```

**Location 2: After line 257 (warning banner)**

```tsx
{/* Leap of Faith Banner */}
{isLeapOfFaith && (
  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
    {/* ... existing leap of faith content ... */}
  </div>
)}

{/* NEW: Status/Evidence Validation Warning */}
{hasValidationConflict && (
  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span className="font-medium">Validation Constraint Violation</span>
    </div>
    <p className="text-sm text-red-600 dark:text-red-400/80 mt-1">
      Assumptions cannot be marked as <strong>"{formData.status}"</strong> with
      <strong> "{formData.evidence_level}"</strong> evidence.
      Please collect more evidence (moderate or strong) before validating/invalidating,
      or change the status to "testing".
    </p>
  </div>
)}
```

**Location 3: Line 488 (status field helper text)**

```tsx
<select
  value={formData.status}
  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
  className="w-full px-3 py-2 rounded-lg border bg-background"
  disabled={saving}
>
  {statuses.map((s) => (
    <option key={s.value} value={s.value}>
      {s.label}
    </option>
  ))}
</select>
{/* NEW: Helper text */}
<p className="text-xs text-muted-foreground mt-1">
  <strong>Note:</strong> "Validated" and "Invalidated" statuses require
  moderate or strong evidence.
</p>
```

**Location 4: Evidence Level field (around line 385)**

```tsx
<div>
  <label className="block text-sm font-medium mb-1">Evidence Level *</label>
  <select
    value={formData.evidence_level}
    onChange={(e) => setFormData({ ...formData, evidence_level: e.target.value })}
    className="w-full px-3 py-2 rounded-lg border bg-background"
    required
  >
    {evidenceLevels.map((level) => (
      <option key={level.value} value={level.value}>
        {level.label}
      </option>
    ))}
  </select>
  {/* NEW: Helper text with validation note */}
  <p className="text-xs text-muted-foreground mt-1">
    {evidenceLevels.find(l => l.value === formData.evidence_level)?.description}
    {(formData.evidence_level === 'none' || formData.evidence_level === 'weak') && (
      <span className="block mt-1 text-amber-600 dark:text-amber-400">
        ⚠️ Cannot mark as validated/invalidated with {formData.evidence_level} evidence
      </span>
    )}
  </p>
</div>
```

#### Form Submission Behavior

**Current:** Form submits, database rejects with constraint error

**Improved:** Prevent submission and show clear error

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  // NEW: Pre-submission validation
  if (hasValidationConflict) {
    setError(
      'Cannot save: Validated/invalidated status requires moderate or strong evidence. ' +
      'Please adjust status or evidence level.'
    )
    return
  }

  setSaving(true)
  setError(null)

  try {
    // ... existing submission logic
  } catch (err) {
    // ... existing error handling
  }
}
```

---

### Visual Design

#### Warning Banner Style

Matches existing Leap of Faith banner but uses red color scheme:

```tsx
className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
```

**Colors:**
- Background: `bg-red-500/10` (10% opacity red)
- Border: `border-red-500/20` (20% opacity red)
- Text: `text-red-700 dark:text-red-400`
- Icon: Alert triangle (from Heroicons)

#### Helper Text Style

Follows existing patterns:

```tsx
className="text-xs text-muted-foreground mt-1"
```

For warnings within helper text:

```tsx
className="text-amber-600 dark:text-amber-400"
```

---

### Testing Strategy

#### Manual Testing Checklist

**Test Case 1: Valid Combinations**
- [ ] Create assumption with status='identified', evidence='none' → Should save
- [ ] Create assumption with status='testing', evidence='weak' → Should save
- [ ] Create assumption with status='validated', evidence='moderate' → Should save
- [ ] Create assumption with status='validated', evidence='strong' → Should save
- [ ] Create assumption with status='invalidated', evidence='strong' → Should save

**Test Case 2: Invalid Combinations**
- [ ] Try status='validated', evidence='none' → Should show warning, prevent save
- [ ] Try status='validated', evidence='weak' → Should show warning, prevent save
- [ ] Try status='invalidated', evidence='none' → Should show warning, prevent save
- [ ] Try status='invalidated', evidence='weak' → Should show warning, prevent save

**Test Case 3: UI Behavior**
- [ ] Warning banner appears when selecting invalid combination
- [ ] Warning banner disappears when fixing combination
- [ ] Helper text updates dynamically
- [ ] Form submission blocked with clear error message

**Test Case 4: Existing Data**
- [ ] Query existing assumptions for violations
- [ ] Test editing assumption with valid status/evidence
- [ ] Verify migration doesn't break existing valid data

#### Database Testing

```sql
-- Test valid inserts
INSERT INTO assumptions (slug, statement, category, importance, evidence_level, status)
VALUES ('test-valid-1', 'Test', 'desirability', 'high', 'moderate', 'validated');
-- Expected: SUCCESS

-- Test invalid inserts
INSERT INTO assumptions (slug, statement, category, importance, evidence_level, status)
VALUES ('test-invalid-1', 'Test', 'desirability', 'high', 'none', 'validated');
-- Expected: ERROR - violates check constraint "consistent_status_evidence"

-- Test updates
UPDATE assumptions
SET status = 'validated', evidence_level = 'weak'
WHERE id = 'some-id';
-- Expected: ERROR - violates check constraint

-- Check for existing violations
SELECT COUNT(*) FROM assumptions
WHERE status IN ('validated', 'invalidated')
  AND evidence_level IN ('none', 'weak');
-- Expected: 0 (no violations)
```

---

### Rollback Plan

If issues arise:

**Rollback database constraint:**
```sql
ALTER TABLE assumptions
DROP CONSTRAINT IF EXISTS consistent_status_evidence;
```

**Rollback form changes:**
```bash
git revert <commit-hash>
```

**Gradual rollout option:**
- Deploy form changes first (warning only, no blocking)
- Monitor user feedback for 1 week
- Deploy database constraint after validation

---

### Effort Estimate

**Database migration:**
- Write SQL: 15 minutes
- Test locally: 15 minutes
- **Subtotal: 30 minutes**

**Form validation:**
- Add computed state: 5 minutes
- Add warning banner: 10 minutes
- Add helper text (2 locations): 10 minutes
- Update handleSubmit: 10 minutes
- **Subtotal: 35 minutes**

**Testing:**
- Manual testing: 15 minutes
- Database testing: 10 minutes
- **Subtotal: 25 minutes**

**Documentation:**
- Update migration comments: 5 minutes
- Add inline code comments: 5 minutes
- **Subtotal: 10 minutes**

**Total: ~1.5 hours**

---

## Implementation Order

### Phase 1: Documentation (Do First)
1. Create `/docs/concepts/` directory
2. Write `assumptions-vs-hypotheses.md` (~2 hours)
3. Add link from critical review document
4. Add to docs navigation/README

### Phase 2: Validation (Do Second)
1. Check for existing violations in database (~5 min)
2. Create database migration (~30 min)
3. Run migration locally (~5 min)
4. Add form validation logic (~35 min)
5. Test all cases (~25 min)
6. Commit and push (~10 min)

**Total Effort: ~3.5 hours**

---

## Success Criteria

### Documentation Success
- [ ] File exists at `/docs/concepts/assumptions-vs-hypotheses.md`
- [ ] All sections complete with examples
- [ ] Mermaid diagrams render correctly
- [ ] Code examples are syntactically correct
- [ ] Cross-references to other docs work
- [ ] User can understand difference between concepts
- [ ] Both workflows clearly explained

### Validation Success
- [ ] Database constraint prevents invalid combinations
- [ ] Form shows warning before save attempt
- [ ] Helper text guides users to fix issues
- [ ] No false positives (valid combos allowed)
- [ ] Existing data unaffected
- [ ] Error messages are clear and actionable
- [ ] Matches existing UI patterns

---

## Related Files

### To Create
- `/docs/concepts/assumptions-vs-hypotheses.md`
- `/supabase/migrations/20260109000000_add_status_evidence_validation.sql`

### To Modify
- `/components/admin/assumption-form.tsx`

### To Reference
- `/docs/analysis/assumptions-hypotheses-critical-review.md`
- `/docs/infrastructure/RELATIONSHIP_SIMPLIFICATION_SPEC.md`
- `/lib/entity-links-validation.ts`
- `/lib/types/entity-relationships.ts`

---

## Notes

- Documentation leverages existing critical review content
- Validation follows established CHECK constraint pattern
- UI follows Leap of Faith indicator pattern
- No breaking changes to existing functionality
- Can deploy documentation independently of validation
- Validation can be deployed form-first, then database constraint

---

**Plan Status:** Ready for Implementation
**Next Step:** Begin Phase 1 (Documentation)
