# LLM Admin Forms Implementation Plan

> Comprehensive plan to extend AI-assisted field generation to all admin CRUD forms

**Status:** Planning Phase
**Created:** 2025-12-30
**Branch:** `claude/review-llm-admin-forms-0cepP`

---

## Executive Summary

Extend the current LLM implementation (currently only in `studio-project-form.tsx`) to all 11 admin forms. The implementation will follow a DRY approach using reusable components to avoid code duplication.

### Current State
- ✅ **Implemented:** `studio-project-form.tsx` (6 fields with AI)
- ❌ **Not Implemented:** 12 other admin forms

### Goals
1. Create reusable form field wrapper component
2. Extend field prompts for all entity types
3. Add AI controls to all forms systematically
4. Maintain consistent UX across all forms
5. Avoid code duplication (~13 forms × average 5 fields = 60 field integrations)

---

## Architecture: DRY Approach

### Problem
Naive approach: Add `<AIFieldControls>` to each field in each form = ~55+ manual integrations with lots of duplication.

### Solution: Reusable Components

#### 1. Create `FormFieldWithAI` Wrapper Component

Location: `components/forms/form-field-with-ai.tsx`

```tsx
interface FormFieldWithAIProps {
  label: string
  fieldName: string
  entityType: string
  context: Record<string, unknown>
  currentValue?: string
  onGenerate: (value: string) => void
  disabled?: boolean
  children: React.ReactNode  // The actual input/textarea
  enableAI?: boolean  // Optional flag to enable/disable AI per field
}

export function FormFieldWithAI({
  label,
  fieldName,
  entityType,
  context,
  currentValue,
  onGenerate,
  disabled,
  children,
  enableAI = true,
}: FormFieldWithAIProps) {
  return (
    <div>
      <label className="flex items-center justify-between text-sm font-medium mb-1">
        <span>{label}</span>
        {enableAI && (
          <AIFieldControls
            fieldName={fieldName}
            entityType={entityType}
            context={context}
            currentValue={currentValue}
            onGenerate={onGenerate}
            disabled={disabled}
          />
        )}
      </label>
      {children}
    </div>
  )
}
```

**Benefits:**
- Single component handles AI integration pattern
- Consistent label + controls layout
- Easy to enable/disable AI per field
- Reduces code duplication by ~90%

#### 2. Create Specialized Variants (Optional)

For specific input types:
- `TextFieldWithAI` - wraps `<input type="text">`
- `TextAreaWithAI` - wraps `<textarea>`
- `TagFieldWithAI` - wraps tag input

---

## Field Inventory by Entity Type

### 1. Studio Projects ✅ (Already Implemented)
**Entity:** `studio_projects`
**Form:** `components/admin/studio-project-form.tsx`
**AI Fields:**
- `description` - Brief overview
- `current_focus` - Current priority
- `problem_statement` - Problem being solved
- `hypothesis` - Testable hypothesis
- `success_criteria` - Measurable success
- `scope_out` - Out of scope items

**Status:** ✅ Complete (reference implementation)

---

### 2. Studio Hypotheses
**Entity:** `studio_hypotheses`
**Form:** `components/admin/hypothesis-form.tsx`
**AI Fields:**
- `statement` - Testable hypothesis statement (line 183)
- `validation_criteria` - How to validate (line 197)

**Context considerations:**
- Project context helps frame hypothesis
- Status (proposed/testing/validated/invalidated) affects tone
- Format: "If we... then... because..."

**Priority:** Very High (core to studio methodology)

---

### 3. Studio Experiments
**Entity:** `studio_experiments`
**Form:** `components/admin/experiment-form.tsx`
**AI Fields:**
- `name` - Experiment name (line 240)
- `description` - What we're testing (line 267)
- `learnings` - Key insights (line 353)

**Context considerations:**
- Type (spike/experiment/prototype) affects scope
- Linked hypothesis provides context
- Status and outcome inform learnings generation

**Priority:** Very High (paired with hypotheses)

---

### 4. Business Model Canvas
**Entity:** `business_model_canvases`
**Form:** `components/admin/business-model-canvas-form.tsx`
**AI Fields:**
- `description` - Canvas description (line 372)
- `tags` - Suggested tags (line 414)

**Special consideration:** Canvas blocks are handled by `CanvasItemSelector` - items themselves are separate entities (see Canvas Items below).

**Priority:** High (key strategic planning tool)

---

### 3. Customer Profile
**Entity:** `customer_profiles`
**Form:** `components/admin/customer-profile-form.tsx`
**AI Fields:**
- `description` - Profile description
- `tags` - Suggested tags

**Block items:** Jobs, Pains, Gains are separate canvas items.

**Priority:** High (paired with Value Map)

---

### 4. Value Map
**Entity:** `value_maps`
**Form:** `components/admin/value-map-form.tsx`
**AI Fields:**
- `description` - Map description
- `tags` - Suggested tags

**Block items:** Products/Services, Pain Relievers, Gain Creators are separate canvas items.

**Priority:** High (paired with Customer Profile)

---

### 5. Canvas Items
**Entity:** `canvas_items`
**Form:** `components/admin/canvas-item-form.tsx`
**AI Fields:**
- `title` - Item title (line 94)
- `description` - Item description (line 95)
- `job_context` - Context for jobs (line 100)
- `notes` - Additional notes (line 103)
- `tags` - Suggested tags

**Priority:** Very High (reusable across all canvas types)

---

### 6. Assumptions
**Entity:** `assumptions`
**Form:** `components/admin/assumption-form.tsx`
**AI Fields:**
- `statement` - Assumption statement (line 96)
- `validation_criteria` - How to validate (line 104)
- `decision_notes` - Decision reasoning (line 106)
- `notes` - Additional notes (line 107)
- `tags` - Suggested tags (line 108)

**Context considerations:**
- Category affects prompt (desirability/viability/feasibility/usability/ethical)
- Importance level (critical/high/medium/low)
- Related to studio project if linked

**Priority:** High (core to assumption tracking methodology)

---

### 7. Projects
**Entity:** `projects`
**Form:** `components/admin/project-form.tsx`
**AI Fields:**
- `title` - Project title (line 36)
- `description` - Brief description (line 38)
- `content` - Full content/markdown (line 39)
- `tags` - Suggested tags (line 45)

**Special:** Has MDX editor for content field - may need special handling.

**Priority:** Medium (portfolio projects, less structured than studio projects)

---

### 8. Log Entries
**Entity:** `log_entries`
**Form:** `components/admin/log-entry-form.tsx`
**AI Fields:**
- `title` - Entry title (line 33)
- `content` - Entry content/markdown (line 35)
- `tags` - Suggested tags (line 39)

**Special:** MDX editor for content, has entry_date and type fields for context.

**Priority:** Medium (daily logging, benefits from quick AI)

---

### 9. Specimens
**Entity:** `specimens`
**Form:** `components/admin/specimen-form.tsx`
**AI Fields:**
- `title` - Specimen title (line 34)
- `description` - What it demonstrates (line 36)
- `tags` - Suggested tags (line 40)

**Context:** Component ID and type help guide generation.

**Priority:** Low (mainly metadata wrapper for components)

---

### 10. Backlog Items
**Entity:** `backlog_items`
**Form:** `components/admin/backlog-item-form.tsx`
**AI Fields:**
- `title` - Item title (line 26)
- `content` - Item content (line 27)
- `tags` - Suggested tags (line 29)

**Context:** Status (inbox/in-progress/shaped/archived) affects tone.

**Priority:** Low (simple capture tool)

---

### 11. Value Proposition Canvas
**Entity:** `value_proposition_canvases`
**Form:** `components/admin/value-proposition-canvas-form.tsx`
**AI Fields:**
- `description` - Canvas description
- `tags` - Suggested tags

**Note:** Combines Customer Profile + Value Map.

**Priority:** High (strategic tool)

---

## Implementation Strategy

### Phase 1: Foundation (1-2 hours)
**Tasks:**
1. ✅ Create `FormFieldWithAI` wrapper component
2. ✅ Extend `generate-field.ts` field prompts for all entity types
3. ✅ Test wrapper component in studio-project-form
4. ✅ Document usage pattern

**Deliverables:**
- `components/forms/form-field-with-ai.tsx`
- Updated `lib/ai/actions/generate-field.ts` with prompts for all entities
- Example integration showing before/after

### Phase 2: High Priority Forms (2-3 hours)
**Order:**
1. Canvas Items (reusable, high leverage)
2. Assumptions (core methodology)
3. Business Model Canvas
4. Customer Profile
5. Value Map
6. Value Proposition Canvas

**Per-form process:**
1. Import `FormFieldWithAI`
2. Identify AI-augmentable fields
3. Wrap fields with component
4. Test generation with various contexts
5. Document any special cases

### Phase 3: Medium Priority Forms (1-2 hours)
**Order:**
1. Projects
2. Log Entries

**Special handling:**
- MDX editor integration for content fields
- Consider streaming for long-form content (future)

### Phase 4: Low Priority Forms (0.5-1 hour)
**Order:**
1. Specimens
2. Backlog Items

**Simple implementations, minimal context needed**

### Phase 5: Testing & Polish (1-2 hours)
1. Test each form's AI generation
2. Verify context propagation
3. Test error states
4. Check disabled states
5. Verify consistent UX
6. Performance check (avoid unnecessary re-renders)

---

## Field Prompt Definitions

Location: `lib/ai/actions/generate-field.ts:12-41`

### Additions Needed

```typescript
const fieldPrompts: Record<string, Record<string, string>> = {
  // ... existing studio_projects prompts ...

  studio_hypotheses: {
    statement: 'A clear, testable hypothesis statement. Format: "If we [action], then [result] because [rationale]."',
    validation_criteria: 'Specific, measurable criteria that would validate or invalidate this hypothesis.',
  },

  studio_experiments: {
    name: 'A clear, descriptive name for this experiment or spike.',
    description: 'What are we testing, how, and what success looks like.',
    learnings: 'Key insights and lessons learned from running this experiment, regardless of outcome.',
  },

  business_model_canvases: {
    description: 'A brief description of this business model canvas and what it explores.',
    tags: 'Relevant tags for categorizing this canvas (e.g., b2b, saas, marketplace).',
  },

  customer_profiles: {
    description: 'Description of the customer segment this profile represents.',
    tags: 'Tags describing this customer segment (e.g., enterprise, early-adopter, developer).',
  },

  value_maps: {
    description: 'Description of the value proposition being mapped.',
    tags: 'Tags for this value map (e.g., onboarding, retention, acquisition).',
  },

  value_proposition_canvases: {
    description: 'Overview of what value proposition fit is being explored.',
    tags: 'Tags for categorizing this canvas.',
  },

  canvas_items: {
    title: 'A clear, concise title for this canvas item.',
    description: 'Detailed description of this item and its significance.',
    job_context: 'Context about when and why the customer performs this job.',
    notes: 'Additional observations, insights, or considerations about this item.',
    tags: 'Relevant tags for this item.',
  },

  assumptions: {
    statement: 'A clear, testable assumption statement. Format: "We believe [assumption]."',
    validation_criteria: 'Specific criteria that would validate or invalidate this assumption.',
    decision_notes: 'Reasoning behind the decision (persevere/pivot/kill) based on validation.',
    notes: 'Additional context, observations, or related insights.',
    tags: 'Tags for categorizing this assumption.',
  },

  projects: {
    title: 'A clear, descriptive title for this project.',
    description: 'Brief overview of what this project is and its goals.',
    content: 'Detailed project content, background, process, or learnings.',
    tags: 'Relevant tags for categorizing this project.',
  },

  log_entries: {
    title: 'A descriptive title for this log entry.',
    content: 'The main content of this log entry - observations, learnings, or notes.',
    tags: 'Tags for categorizing this entry (e.g., learning, decision, experiment).',
  },

  specimens: {
    title: 'A descriptive title for this specimen.',
    description: 'What this specimen demonstrates or explores.',
    tags: 'Tags describing this specimen (e.g., interaction, animation, layout).',
  },

  backlog_items: {
    title: 'A clear title for this backlog item.',
    content: 'Description of what needs to be done or explored.',
    tags: 'Tags for categorizing this item.',
  },
}
```

---

## Context Guidelines by Entity

### Progressive Context Enrichment

Follow the studio-project-form pattern: later fields get more context from earlier fields.

**Example (Assumptions):**
```tsx
// Statement field - basic context
<FormFieldWithAI
  context={{ category: formData.category }}
  {...}
/>

// Validation criteria - gets statement
<FormFieldWithAI
  context={{
    category: formData.category,
    statement: formData.statement,
    importance: formData.importance,
  }}
  {...}
/>

// Decision notes - gets full context
<FormFieldWithAI
  context={{
    statement: formData.statement,
    validation_criteria: formData.validation_criteria,
    status: formData.status,
    evidence_level: formData.evidence_level,
  }}
  {...}
/>
```

### Entity-Specific Context

**Canvas Items:** Include `item_type` (job/pain/gain/etc.) to guide tone and structure.

**Assumptions:** Include `category` (desirability/viability/etc.) and `importance` to guide specificity.

**Log Entries:** Include `entry_date` and `type` for temporal context.

**Projects/Specimens:** Include `type` if available.

---

## Migration Pattern

### Before (Manual Integration)
```tsx
<div>
  <label className="flex items-center justify-between text-sm font-medium mb-1">
    <span>Description</span>
    <AIFieldControls
      fieldName="description"
      entityType="studio_projects"
      context={{ name: formData.name }}
      currentValue={formData.description}
      onGenerate={(content) => setFormData({ ...formData, description: content })}
      disabled={saving}
    />
  </label>
  <textarea
    value={formData.description}
    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
    className="w-full px-3 py-2 rounded-lg border bg-background"
    rows={2}
  />
</div>
```

### After (Using Wrapper)
```tsx
<FormFieldWithAI
  label="Description"
  fieldName="description"
  entityType="studio_projects"
  context={{ name: formData.name }}
  currentValue={formData.description}
  onGenerate={(content) => setFormData({ ...formData, description: content })}
  disabled={saving}
>
  <textarea
    value={formData.description}
    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
    className="w-full px-3 py-2 rounded-lg border bg-background"
    rows={2}
  />
</FormFieldWithAI>
```

**Reduction:** ~13 lines → ~11 lines, but more importantly: consistent pattern, less duplication across forms.

---

## Special Cases

### 1. MDX Editor Fields (Projects, Log Entries)
The `MdxEditor` component handles content editing. AI integration options:
- **Option A:** Generate markdown into the editor
- **Option B:** Separate AI controls outside the MDX editor
- **Decision:** Option A - pass generated content to MDX editor's onChange

### 2. Tag Fields
Tags are currently comma-separated strings. AI generation should:
- Return comma-separated list
- Avoid duplicates with existing tags
- Consider project/entity context for relevance

### 3. Canvas Blocks
Canvas blocks (BMC, VPC) contain item references, not direct content.
- AI at canvas level: description and tags only
- AI for items: use canvas-item-form pattern
- Don't generate item content in canvas form

### 4. Relationships/Foreign Keys
Don't generate IDs or relationships - only descriptive content fields.

---

## Testing Checklist

Per form:
- [ ] All AI-enabled fields generate appropriately
- [ ] Context from earlier fields enriches later field generation
- [ ] Empty field generation works
- [ ] Improve existing content works
- [ ] Custom instructions work
- [ ] Error states display correctly
- [ ] Stop/cancel works
- [ ] Disabled state propagates correctly
- [ ] No console errors
- [ ] Form submission includes AI-generated content
- [ ] Generated content parses correctly (tags, etc.)

---

## Estimated Effort

| Phase | Task | Time | Priority |
|-------|------|------|----------|
| 1 | Foundation (wrapper + prompts) | 1-2h | P0 |
| 2a | Canvas Items | 30m | P0 |
| 2b | Assumptions | 30m | P0 |
| 2c | Canvas Forms (BMC, CP, VM, VPC) | 1.5h | P0 |
| 3 | Projects + Log Entries | 1h | P1 |
| 4 | Specimens + Backlog | 30m | P2 |
| 5 | Testing & Polish | 1-2h | P0 |
| **Total** | | **6-8 hours** | |

---

## Success Metrics

1. **Coverage:** AI controls available on all 11 forms
2. **Consistency:** All forms use `FormFieldWithAI` pattern
3. **Quality:** Generated content is contextually appropriate
4. **Maintainability:** Adding AI to new fields takes <5 minutes
5. **UX:** Consistent experience across all admin forms

---

## Rollout Plan

### Development
1. Create feature branch ✅ (already on `claude/review-llm-admin-forms-0cepP`)
2. Implement in phases (1-5 above)
3. Test thoroughly
4. Document any deviations or learnings

### Review
1. Self-review all changes
2. Test each form end-to-end
3. Check for regressions in existing studio-project-form

### Merge
1. Create PR with comprehensive description
2. Include before/after screenshots
3. Document new patterns in README or docs

---

## Future Enhancements

**Not in scope for this implementation, but documented for later:**

1. **Streaming for long content** - Real-time generation for blog posts, project content
2. **Batch generation** - Generate all empty fields at once
3. **Smart defaults** - Auto-enable AI for certain field types
4. **Generation presets** - Save and reuse custom instructions per field
5. **Cross-entity context** - Pull context from related entities (e.g., project details when creating assumption)
6. **Prompt refinement** - A/B test prompts, gather feedback
7. **Cost tracking** - Show usage per form/entity type
8. **Keyboard shortcuts** - Quick generation triggers

---

## Files Modified

### New Files
- `components/forms/form-field-with-ai.tsx` - Wrapper component

### Modified Files
- `lib/ai/actions/generate-field.ts` - Extended field prompts
- `components/admin/business-model-canvas-form.tsx`
- `components/admin/customer-profile-form.tsx`
- `components/admin/value-map-form.tsx`
- `components/admin/value-proposition-canvas-form.tsx`
- `components/admin/canvas-item-form.tsx`
- `components/admin/assumption-form.tsx`
- `components/admin/project-form.tsx`
- `components/admin/log-entry-form.tsx`
- `components/admin/specimen-form.tsx`
- `components/admin/backlog-item-form.tsx`

**Total:** 1 new file, 11 modified files

---

## Notes & Decisions

### Why Wrapper Component?
- **DRY:** Avoid duplicating label + controls layout 55+ times
- **Consistency:** Guaranteed same UX across all forms
- **Maintainability:** Change once, apply everywhere
- **Flexibility:** Easy to disable AI per field with `enableAI` prop

### Why Not Auto-Generation?
Following LLM_UI_PATTERNS.md spec:
- Manual triggers respect user control
- Prevents unexpected API costs
- Users can review before accepting
- Aligns with "Explicit over Magic" principle

### Why Progressive Context?
- Earlier fields provide context for later fields
- Improves generation quality
- Mirrors natural form-filling flow
- Example: hypothesis benefits from knowing problem_statement

---

*Plan version: 1.0*
*Ready for implementation*
