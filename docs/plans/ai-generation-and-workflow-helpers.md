# Implementation Plan: AI Generation & Workflow Helpers

**Date:** 2026-01-09
**Status:** Planning
**Enhancements:** Suggestions 2 & 3 from critical review

---

## Overview

Implement two workflow improvements for assumptions-hypotheses:

1. **AI Generation Enhancement:** Update hypothesis generation to include assumption context and auto-link
2. **Workflow Helper:** Add "Create hypothesis from assumption" button with pre-fill and auto-linking

---

## Enhancement 1: AI Generation with Assumption Context

### Current State

**Hypothesis generation currently:**
- Generates from project context only (name, description, problem_statement, etc.)
- No awareness of existing assumptions
- No automatic linking to assumptions
- Located in: `lib/ai/prompts/entity-generation.ts:37-65`

**Current prompt:**
```typescript
systemPrompt: `Generate testable hypotheses for product development.
Format: "We believe [action/change] will [result] for [audience] because [rationale]"`
```

### Enhancement Strategy

**Two-phase approach:**

**Phase 1: URL-based Pre-fill** (Simple, Immediate Value)
- When creating hypothesis from assumption, pass `?assumption=id` in URL
- Fetch assumption data and pre-fill form
- Auto-link assumption via `pendingAssumptionLinks`
- Provide assumption context to AI generation

**Phase 2: Project-wide Assumption Awareness** (Future Enhancement)
- Include all project assumptions in AI context
- AI suggests which assumptions each hypothesis tests
- Auto-generate entity_links on creation

### Implementation: Phase 1

#### File: `components/admin/hypothesis-form.tsx`

**Location: After line 40 (after `projectFromUrl`)**

```typescript
const assumptionFromUrl = searchParams.get('assumption')
const [assumptionData, setAssumptionData] = useState<{
  id: string
  statement: string
  category: string
  validation_criteria: string | null
} | null>(null)

// Load assumption if provided in URL
useEffect(() => {
  if (assumptionFromUrl && mode === 'create') {
    async function loadAssumption() {
      const { data, error } = await supabase
        .from('assumptions')
        .select('id, statement, category, validation_criteria, importance')
        .eq('id', assumptionFromUrl)
        .single()

      if (data && !error) {
        setAssumptionData(data)

        // Pre-fill form with assumption context
        setFormData(prev => ({
          ...prev,
          statement: `If we [action to address assumption], then [expected outcome] because [rationale related to: ${data.statement.slice(0, 60)}...]`,
          validation_criteria: data.validation_criteria || ''
        }))

        // Auto-link the assumption
        setPendingAssumptionLinks([{
          targetId: data.id,
          targetLabel: data.statement,
          linkType: 'tests',
          notes: `Generated to test ${data.category} assumption`
        }])
      }
    }
    loadAssumption()
  }
}, [assumptionFromUrl, mode])
```

**Location: Line 143 (in FormFieldWithAI for statement)**

Update context to include assumption data:

```typescript
<FormFieldWithAI
  label="Hypothesis Statement *"
  fieldName="statement"
  entityType="studio_hypotheses"
  context={{
    project_id: formData.project_id,
    status: formData.status,
    // NEW: Include assumption context if present
    ...(assumptionData && {
      testing_assumption: assumptionData.statement,
      assumption_category: assumptionData.category,
      assumption_importance: assumptionData.importance
    })
  }}
  currentValue={formData.statement}
  onGenerate={(content) => setFormData({ ...formData, statement: content })}
  disabled={saving}
  description={assumptionData
    ? `Hypothesis to test: "${assumptionData.statement}"`
    : 'Use "If we... then... because..." format'
  }
>
  <textarea
    value={formData.statement}
    onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
    className="w-full px-3 py-2 rounded-lg border bg-background"
    rows={4}
    required
    placeholder="If we [do X], then [Y will happen] because [rationale]..."
  />
</FormFieldWithAI>
```

**Location: After line 238 (in sidebar, before Assumptions Tested card)**

Add visual indicator when creating from assumption:

```typescript
{assumptionData && (
  <SidebarCard title="Testing Assumption">
    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
      <div className="flex items-start gap-2">
        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
            This hypothesis will test:
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-400/80 mt-1">
            "{assumptionData.statement}"
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Category: {assumptionData.category} | Will be auto-linked
          </p>
        </div>
      </div>
    </div>
  </SidebarCard>
)}

<SidebarCard title="Assumptions Tested">
  {/* existing EntityLinkField */}
</SidebarCard>
```

#### File: `lib/ai/prompts/entity-generation.ts`

**Location: Lines 38-46 (system prompt)**

Update to handle assumption context:

```typescript
systemPrompt: `Generate testable hypotheses for product development.

Each hypothesis should:
- Be specific, falsifiable, and testable
- Follow the format: "We believe [action/change] will [result/outcome] for [audience] because [rationale]"
- Be grounded in the project context provided
- **If testing an assumption:** Design a hypothesis that directly validates or tests that assumption
- **If assumption context provided:** Align the hypothesis to test the specific risk/belief
- Be meaningfully different from existing and pending hypotheses

When testing an assumption, ensure your hypothesis:
- Addresses the same category of risk (desirability/viability/feasibility/usability/ethical)
- Provides a measurable way to validate or invalidate the assumption
- Proposes a specific action or test to gather evidence

Return a complete hypothesis object with all required fields.`,
```

**Location: Line 54 (contextFields)**

Add assumption context fields:

```typescript
contextFields: [
  'name',
  'description',
  'problem_statement',
  'success_criteria',
  'current_focus',
  'testing_assumption',        // NEW: Assumption being tested
  'assumption_category',       // NEW: Risk category
  'assumption_importance'      // NEW: Priority level
],
```

---

## Enhancement 2: Workflow Helper Button

### Current State

**No quick way to create hypothesis from assumption:**
- Users must manually navigate to hypotheses page
- Must manually link to assumption after creating hypothesis
- No pre-filled context from assumption

**Desired workflow:**
1. User viewing assumption in list or form
2. Clicks "Create Hypothesis to Test This"
3. Redirects to hypothesis form with `?assumption=id`
4. Form pre-fills and auto-links (via Enhancement 1)

### Implementation

#### File: `components/admin/views/assumptions-list-view.tsx`

**Location: Line 164 (Actions column cell)**

Add "Test" button before "Edit" button:

```typescript
cell: (assumption) => (
  <div className="flex items-center gap-2 justify-end">
    <Link
      href={`/admin/hypotheses/new?assumption=${assumption.id}`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-primary bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
      title="Create hypothesis to test this assumption"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      Test
    </Link>
    <Link
      href={`/admin/assumptions/${assumption.id}/edit`}
      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      Edit
    </Link>
  </div>
),
```

**Alternative styling (more prominent):**

```typescript
<Link
  href={`/admin/hypotheses/new?assumption=${assumption.id}`}
  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
  title="Create hypothesis to test this assumption"
>
  ✨ Create Hypothesis
</Link>
```

#### File: `components/admin/assumption-form.tsx`

**Location: After line 590 (inside "Tested By Hypotheses" SidebarCard)**

Add button below EntityLinkField:

```typescript
<SidebarCard title="Tested By Hypotheses">
  <EntityLinkField
    label=""
    sourceType="assumption"
    sourceId={assumption?.id}
    targetType="hypothesis"
    targetTableName="studio_hypotheses"
    targetDisplayField="statement"
    linkType="tested_by"
    allowMultiple={true}
    pendingLinks={pendingHypothesisLinks}
    onPendingLinksChange={setPendingHypothesisLinks}
    helperText="Which hypotheses test this assumption?"
  />

  {/* NEW: Quick-create button */}
  {assumption?.id && (
    <div className="mt-4 pt-4 border-t">
      <Link
        href={`/admin/hypotheses/new?assumption=${assumption.id}`}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Create Hypothesis to Test This
      </Link>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Pre-fills form and auto-links this assumption
      </p>
    </div>
  )}

  {/* Show placeholder for create mode */}
  {!assumption?.id && (
    <p className="mt-3 text-sm text-muted-foreground text-center italic">
      Save assumption first to create testing hypotheses
    </p>
  )}
</SidebarCard>
```

#### Import Addition

**Location: Top of both files (line 4)**

Add Next.js Link import:

```typescript
import Link from 'next/link'
```

---

## Visual Design

### Button Styles

**In List View (compact):**
- Icon + "Test" text
- Primary color with light background
- Border for distinction
- Lightning bolt icon (⚡) or sparkles (✨)

**In Form Sidebar (prominent):**
- Full-width button
- Primary solid background
- Plus icon
- Helper text below explaining behavior

### User Feedback

**When creating hypothesis from assumption:**
1. **Blue info card** shows which assumption is being tested
2. **Statement field** pre-filled with assumption context
3. **EntityLinkField** pre-populated with assumption
4. **Description text** updates to show testing context

---

## Testing Strategy

### Manual Testing Checklist

**Workflow Helper:**
- [ ] Click "Test" button in assumptions list view
- [ ] Verify redirect to `/admin/hypotheses/new?assumption={id}`
- [ ] Verify assumption data loads
- [ ] Verify form pre-fills with assumption context
- [ ] Verify assumption appears in "Assumptions Tested" field
- [ ] Save hypothesis and verify entity_link created

**AI Generation:**
- [ ] Create hypothesis with assumption context
- [ ] Click AI sparkles button (✨)
- [ ] Verify generated hypothesis addresses the assumption
- [ ] Verify hypothesis aligns with assumption category
- [ ] Compare generation with vs without assumption context

**Edge Cases:**
- [ ] Invalid assumption ID in URL (should handle gracefully)
- [ ] Assumption deleted between click and form load
- [ ] Multiple assumptions linked (ensure doesn't override)
- [ ] Creating hypothesis without assumption context (should work as before)

### Integration Testing

**Test the complete flow:**
1. Create assumption (e.g., "Users want dark mode")
2. Click "Create Hypothesis to Test This"
3. Observe pre-filled form
4. Use AI generation to refine
5. Save hypothesis
6. Verify entity_link exists in database:
   ```sql
   SELECT * FROM entity_links
   WHERE source_type = 'hypothesis'
     AND target_type = 'assumption'
     AND link_type = 'tests'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
7. Return to assumption form
8. Verify hypothesis appears in "Tested By Hypotheses" field

---

## Implementation Order

### Phase 1: Workflow Helper (~1 hour)
1. Add Link import to both files (5 min)
2. Add "Test" button to assumptions list view (15 min)
3. Add "Create Hypothesis" button to assumption form (15 min)
4. Test navigation and URL parameters (15 min)
5. Commit: "Add workflow helper buttons for creating hypotheses from assumptions"

### Phase 2: Form Pre-fill (~45 min)
1. Add `assumptionFromUrl` search params handling (10 min)
2. Add assumption data loading effect (15 min)
3. Add form pre-fill logic (10 min)
4. Add auto-linking logic (10 min)
5. Test and commit: "Add assumption context pre-fill to hypothesis form"

### Phase 3: AI Enhancement (~45 min)
1. Update entity-generation.ts prompt (10 min)
2. Add context fields to hypothesis config (5 min)
3. Update FormFieldWithAI context in hypothesis form (15 min)
4. Add visual indicator card (10 min)
5. Test AI generation with assumption context (5 min)
6. Commit: "Enhance AI hypothesis generation with assumption context"

### Phase 4: Polish & Test (~30 min)
1. Test complete workflow end-to-end (15 min)
2. Verify edge cases (10 min)
3. Update plan document with results (5 min)

**Total Effort: ~3 hours**

---

## Success Criteria

### Workflow Helper Success
- [ ] "Test" button visible on all assumptions in list view
- [ ] "Create Hypothesis" button visible in assumption edit form
- [ ] Buttons route to correct URL with assumption parameter
- [ ] Visual design matches existing patterns
- [ ] Mobile-responsive

### AI Enhancement Success
- [ ] Form detects `?assumption=id` parameter
- [ ] Assumption data loads successfully
- [ ] Statement field pre-fills with helpful template
- [ ] Assumption auto-linked in EntityLinkField
- [ ] Visual indicator shows assumption context
- [ ] AI generation prompt includes assumption data
- [ ] Generated hypotheses reference assumption appropriately
- [ ] Saved hypothesis has correct entity_link

### Quality Criteria
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] No duplicate code
- [ ] Follows existing patterns
- [ ] Clear user feedback at each step
- [ ] Backward compatible (works without assumption parameter)

---

## Files Modified

### Files to Create
- None (all modifications to existing files)

### Files to Modify
1. `/home/user/jfriis/components/admin/hypothesis-form.tsx` - Add assumption pre-fill logic
2. `/home/user/jfriis/components/admin/views/assumptions-list-view.tsx` - Add "Test" button
3. `/home/user/jfriis/components/admin/assumption-form.tsx` - Add "Create Hypothesis" button
4. `/home/user/jfriis/lib/ai/prompts/entity-generation.ts` - Update hypothesis generation config

### Files to Reference
- `/home/user/jfriis/lib/entity-links.ts` - Entity linking helpers (already in use)
- `/home/user/jfriis/components/forms/form-field-with-ai.tsx` - AI generation component
- `/home/user/jfriis/components/admin/entity-link-field.tsx` - Linking UI component

---

## Risk Mitigation

### Potential Issues

**Issue 1: Assumption data fails to load**
- **Mitigation:** Add error handling and fallback UI
- **Fallback:** Allow form to work without pre-fill

**Issue 2: AI generation doesn't improve with context**
- **Mitigation:** Test prompt changes iteratively
- **Fallback:** Prompt can be refined post-deployment

**Issue 3: Button placement unclear to users**
- **Mitigation:** Use clear icons and labels
- **Fallback:** Add tooltip or help text

### Rollback Plan

Each phase is independently deployable:
- Phase 1 (buttons): Can revert without affecting other code
- Phase 2 (pre-fill): Gracefully degrades if assumption not found
- Phase 3 (AI): Non-breaking enhancement to existing generation

---

## Future Enhancements

### Post-Launch Improvements

1. **Batch Hypothesis Creation**
   - Create multiple hypotheses from one assumption
   - "Generate 3 test hypotheses" button

2. **Assumption-First Onboarding**
   - Guided workflow: Extract assumptions → Prioritize → Generate hypotheses
   - Dashboard widget showing untested high-priority assumptions

3. **AI Quality Improvements**
   - Include project-wide assumption context (not just one)
   - Suggest which assumptions to test first
   - Auto-generate validation criteria from assumption

4. **Reverse Flow**
   - "Create Assumption from Hypothesis" button
   - Break down hypotheses into underlying assumptions

---

**Plan Status:** Ready for Implementation
**Next Step:** Begin Phase 1 (Workflow Helper Buttons)
