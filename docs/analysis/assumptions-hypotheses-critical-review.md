# Critical Assessment: Assumptions and Hypotheses Implementation

**Date:** 2026-01-06
**Reviewer:** Claude
**Scope:** Comparative analysis of codebase implementation against David Bland and Teresa Torres methodologies

---

## Executive Summary

This codebase implements **assumptions** and **hypotheses** as distinct but interrelated entities for product validation. The implementation draws from David Bland, Teresa Torres, and Strategyzer methodologies but reveals **conceptual drift** from their original definitions. While the technical implementation is sophisticated, there are fundamental misalignments between theory and practice that could lead to confusion and misuse.

**Key Finding:** The codebase has **inverted the relationship hierarchy** compared to David Bland's framework, treating assumptions as subordinate to hypotheses rather than the foundation from which hypotheses are derived.

---

## Part 1: David Bland's Framework (Theory)

### Definitions

**David Bland** (co-author of "Testing Business Ideas" with Alexander Osterwalder) defines:

1. **Assumptions** = Unvalidated beliefs about your business model
   - These are implicit beliefs we hold that may or may not be true
   - They exist in every business model, whether articulated or not
   - Examples: "Customers want a faster checkout process", "We can acquire users for under $5", "Our API can handle 10k requests/second"

2. **Hypotheses** = Testable statements derived from assumptions
   - Format: "We believe [assumption] because [rationale]. We will test this by [experiment] and measure [criteria]."
   - A hypothesis makes an assumption explicit and testable
   - Multiple hypotheses can test different aspects of a single assumption

### Relationship Hierarchy (Bland's Framework)

```
Business Model
    ↓
Assumptions (implicit beliefs)
    ↓
Hypotheses (testable statements)
    ↓
Experiments (validation activities)
    ↓
Evidence (data collected)
    ↓
Learning (insights gained)
```

### Key Principles

1. **Assumptions come first** - They exist whether you document them or not
2. **Prioritization Matrix**: Importance (x-axis) × Evidence (y-axis)
   - High Importance + Low Evidence = **"Leap of Faith"** assumptions (test these first!)
   - High Importance + High Evidence = Keep monitoring
   - Low Importance + Low Evidence = Ignore for now
   - Low Importance + High Evidence = Already validated
3. **Risk Categories**:
   - **Desirability**: Do customers want this?
   - **Viability**: Can we make money?
   - **Feasibility**: Can we build it?
4. **Test-Learn-Adapt Loop**: Assumptions → Hypotheses → Experiments → Evidence → Decision (Persevere/Pivot/Kill)

---

## Part 2: Teresa Torres' Framework (Theory)

**Teresa Torres** (author of "Continuous Discovery Habits") focuses on:

1. **Opportunity Solution Trees** - Visual representation of problem space
2. **Assumption Mapping** - Identifying assumptions embedded in opportunities and solutions
3. **Continuous Testing** - Weekly customer interviews, rapid experimentation
4. **Additional Categories**:
   - **Usability**: Can customers use it effectively?
   - **Ethical**: Could this cause harm?

### Key Differences from Bland

- Torres emphasizes **continuous discovery** vs. Bland's **validation checkpoints**
- Torres focuses on **opportunity-solution fit** vs. Bland's **business model validation**
- Torres adds **usability** and **ethical** risk categories
- Both agree: Assumptions → Testing → Learning cycle

---

## Part 3: Current Codebase Implementation (Practice)

### Data Model Structure

#### Assumptions Table
```typescript
interface Assumption {
  // Identity
  id: UUID
  slug: string
  statement: string

  // Classification (Torres + Bland)
  category: 'desirability' | 'viability' | 'feasibility' | 'usability' | 'ethical'

  // Prioritization (Bland's 2x2 matrix)
  importance: 'critical' | 'high' | 'medium' | 'low'
  evidence_level: 'none' | 'weak' | 'moderate' | 'strong'
  is_leap_of_faith: boolean  // auto-computed

  // Status (Strategyzer)
  status: 'identified' | 'prioritized' | 'testing' | 'validated' | 'invalidated' | 'archived'

  // RELATIONSHIPS (⚠️ Critical divergence)
  studio_project_id?: UUID       // Parent project
  hypothesis_id?: UUID           // ⚠️ "Belongs to" a hypothesis

  // Source tracking
  source_type?: 'business_model_canvas' | 'value_map' | ...
  source_id?: UUID
  source_block?: string

  // Validation
  validation_criteria?: string
  decision?: 'persevere' | 'pivot' | 'kill'

  // Evidence links
  → assumption_experiments (N:M junction)
  → assumption_evidence (1:N)
}
```

#### Hypotheses Table
```typescript
interface StudioHypothesis {
  id: UUID
  project_id: UUID  // Required parent
  statement: string
  rationale?: string
  validation_criteria?: string
  sequence: number  // Roadmap ordering
  status: 'proposed' | 'testing' | 'validated' | 'invalidated'

  // RELATIONSHIPS (⚠️ Critical divergence)
  → assumptions (1:N via hypothesis_id on assumption)  // "Has many" assumptions
  → experiments (1:N via hypothesis_id on experiment)
}
```

### Relationship Model (Current Implementation)

```
Studio Project (1)
    ↓
    ├─→ Hypotheses (N) ← PRIMARY ENTITY
    │       │
    │       ├─→ Assumptions (N) ← SUBORDINATE to hypothesis
    │       │       └─→ Evidence (N)
    │       │
    │       └─→ Experiments (N) ← Can link to hypothesis
    │
    └─→ Standalone Assumptions (N) ← Can exist without hypothesis
            └─→ Evidence (N)
```

### AI Generation Patterns

**Hypothesis Generation** (`lib/ai/prompts/entity-generation.ts:47-65`):
```
System Prompt: "Generate testable hypotheses in format:
'We believe [action/change] will [result] for [audience] because [rationale]'"

Context: project name, description, problem_statement, success_criteria
```

**Experiment Generation** (`lib/ai/prompts/entity-generation.ts:67-96`):
```
System Prompt: "Design experiments to test hypotheses and assumptions."
```

**No dedicated Assumption Generation prompt** - Assumptions are generated as part of survey tool completion from canvas artifacts.

---

## Part 4: Critical Analysis - Theory vs. Practice

### ✅ What's Aligned

1. **Prioritization Matrix** - Correctly implements Bland's Importance × Evidence 2x2
2. **Leap of Faith Detection** - Auto-computed flag for high-importance, low-evidence items
3. **Risk Categories** - Properly combines Bland (D/V/F) + Torres (U/E) categories
4. **Status Lifecycle** - Follows Strategyzer's design-test loop
5. **Source Tracking** - Excellent provenance from canvas blocks (not in original frameworks)
6. **Evidence Management** - Rich evidence types and confidence scoring
7. **Decision Framework** - Persevere/Pivot/Kill aligns with Lean Startup principles

### ⚠️ Critical Divergences

#### 1. **Inverted Relationship Hierarchy** (MAJOR ISSUE)

**Bland's Theory:**
```
Assumptions (foundation)
    ↓ generates
Hypotheses (testable statements)
```

**Current Implementation:**
```
Hypotheses (primary entity)
    ↓ contains
Assumptions (subordinate)
```

**Problem:** The `hypothesis_id` foreign key on `assumptions` table suggests assumptions "belong to" hypotheses. This is backwards. A single assumption can spawn multiple hypotheses testing different aspects.

**Example of the Issue:**

**Bland's Approach:**
- **Assumption:** "Users want a faster checkout"
- **Hypothesis 1:** "We believe reducing checkout steps from 5 to 3 will increase conversion by 15%"
- **Hypothesis 2:** "We believe adding guest checkout will increase conversion by 20%"
- **Hypothesis 3:** "We believe pre-filling address data will reduce cart abandonment by 10%"

**Current Schema Limitation:**
The assumption can only link to ONE hypothesis via `hypothesis_id`, forcing artificial choices about which hypothesis "owns" the assumption.

#### 2. **Hypothesis as Primary Entry Point** (CONCEPTUAL)

**AI Generation Order:**
1. Generate hypotheses from project context
2. Generate experiments to test hypotheses
3. Generate assumptions from canvas artifacts (separate flow)

**Should Be:**
1. Extract assumptions from business model/canvases
2. Prioritize assumptions by importance × evidence
3. Formulate hypotheses to test high-priority assumptions
4. Design experiments to test hypotheses

The current flow treats hypotheses as the strategic starting point, when assumptions should be the foundation.

#### 3. **Hypothesis Definition Drift** (SEMANTIC)

**Current Hypothesis Prompt:**
```
"We believe [action/change] will [result] for [audience] because [rationale]"
```

**Problem:** This is actually closer to a **testable assumption** statement than a hypothesis in Bland's framework.

**Bland's Hypothesis Format:**
```
"We believe [assumption is true].
We will test this by [experiment].
We will measure [criteria].
We will know we're right when [threshold]."
```

The current implementation conflates the assumption statement with the hypothesis structure.

#### 4. **Missing Explicit Assumption → Hypothesis Flow** (WORKFLOW)

**Current User Journey:**
1. Create Studio Project
2. Optionally create Hypotheses (AI-generated or manual)
3. Optionally create Assumptions (from canvases or manual)
4. Optionally link assumption to hypothesis via `hypothesis_id`
5. Create Experiments linked to hypothesis
6. Link experiments to assumptions via junction table

**Bland's Recommended Flow:**
1. Document Business Model (canvases)
2. Extract all assumptions from business model
3. Prioritize assumptions (Importance × Evidence matrix)
4. Select "Leap of Faith" assumptions to test first
5. Formulate hypotheses for each priority assumption
6. Design experiments to test each hypothesis
7. Run experiments, collect evidence
8. Update assumption evidence level
9. Make decision (Persevere/Pivot/Kill)

**Gap:** No workflow enforcement or UI guidance pushing users through the correct sequence.

#### 5. **Standalone Assumptions Are Second-Class** (UX)

**Evidence:**
- Hypotheses are "first-class" with dedicated admin UI, AI generation, validation roadmap
- Assumptions can exist standalone (`hypothesis_id` is nullable) but:
  - No clear workflow for assumption-first discovery
  - AI generation is canvas-derived, not hypothesis-derived
  - Prioritization UI exists (good!) but not integrated into hypothesis creation flow

**Result:** Users likely create hypotheses first (because prominent in UI and AI-assisted), then struggle to link assumptions retroactively.

#### 6. **Evidence Level Semantics** (MINOR)

**Bland's Framework:**
- Evidence level measures "confidence in assumption truth"
- Start at "none" (pure belief)
- Increase as experiments support the assumption
- The assumption itself doesn't change; our confidence does

**Current Implementation:**
```typescript
evidence_level: 'none' | 'weak' | 'moderate' | 'strong'
```

This is correct! But the status field creates ambiguity:

```typescript
status: 'identified' | 'prioritized' | 'testing' | 'validated' | 'invalidated' | 'archived'
```

**Confusion:** What's the difference between:
- `evidence_level: 'strong'` + `status: 'validated'`
- `evidence_level: 'strong'` + `status: 'testing'`

**Recommendation:** `status` should track workflow state, `evidence_level` tracks confidence. They're orthogonal but the UI doesn't make this clear.

---

## Part 5: Detailed Comparison Matrix

| Aspect | David Bland | Current Implementation | Assessment |
|--------|-------------|------------------------|------------|
| **Primary Entity** | Assumption | Hypothesis | ❌ Inverted |
| **Relationship** | Assumption → Hypothesis | Hypothesis → Assumption | ❌ Backwards |
| **Entry Point** | Extract assumptions from business model | Generate hypotheses from project | ❌ Inverted |
| **Prioritization** | Importance × Evidence (2x2) | Same | ✅ Correct |
| **Leap of Faith** | High importance + Low evidence | Auto-computed flag | ✅ Correct |
| **Categories** | D/V/F | D/V/F/U/E (+ Torres) | ✅ Enhanced |
| **Evidence Tracking** | Experiment results update assumption | assumption_evidence + assumption_experiments | ✅ Correct |
| **Decision Framework** | Persevere/Pivot/Kill | Same | ✅ Correct |
| **Source Tracking** | Not in original | Canvas block provenance | ✅ Added value |
| **Hypothesis Format** | Multi-part (belief-test-measure) | Single statement | ⚠️ Simplified |
| **Validation Criteria** | Part of hypothesis | Optional on both | ⚠️ Inconsistent |
| **Many:Many Assumption:Hypothesis** | Yes (one assumption, many hypotheses) | No (assumption has single hypothesis_id) | ❌ Limited |

---

## Part 6: Consequences of Current Design

### Positive Outcomes

1. **Rich Data Model** - Captures more context than minimal frameworks (source tracking, evidence types, tags)
2. **Leap of Faith Detection** - Auto-flagging high-priority items is valuable
3. **Integration with Strategy Tools** - Canvas → Assumptions link is powerful
4. **Evidence Provenance** - Multiple evidence types with confidence scoring
5. **Flexible Status Tracking** - Can track assumptions through entire lifecycle

### Negative Outcomes

1. **Conceptual Confusion** - Users may not understand the difference between assumptions and hypotheses
2. **Backwards Workflow** - Users create hypotheses before identifying assumptions
3. **Relationship Constraints** - Can't properly model one assumption → many hypotheses
4. **Orphaned Assumptions** - Standalone assumptions feel like "lesser" entities
5. **AI Generation Gap** - AI generates hypotheses but not assumption-hypothesis links
6. **Learning Curve** - Requires understanding both entities and their subtle differences
7. **Redundancy Risk** - Users might duplicate information across assumption and hypothesis statements

### Real-World Scenario: How This Plays Out

**User Story:** Product manager for a SaaS billing tool

**What Should Happen (Bland):**
1. Document business model in canvas
2. Extract assumption: "Small businesses will pay $29/month for automated invoicing"
3. Categorize: Viability, Critical importance, No evidence → **Leap of Faith!**
4. Formulate hypotheses:
   - H1: "Landing page with pricing will get 500 signups in 2 weeks"
   - H2: "Survey of 20 target customers shows 60%+ willing to pay $29"
   - H3: "Beta cohort of 10 users has 70%+ conversion to paid"
5. Design experiments for each hypothesis
6. Run experiments, collect evidence
7. Update assumption evidence level based on results

**What Actually Happens (Current System):**
1. Create Studio Project for "SaaS Billing Tool"
2. Click "Generate Hypotheses" (AI suggests):
   - "We believe small businesses will pay for invoicing automation"
3. Separately, create assumption from canvas:
   - Statement: "Small businesses will pay $29/month"
   - Category: Viability
   - Importance: Critical
   - Evidence: None
   - Hypothesis ID: ??? (which hypothesis does this link to?)
4. Create experiments linked to hypothesis
5. Try to link assumption to experiment via junction table
6. Confusion: Is the hypothesis and assumption saying the same thing?

**Result:** Duplicate information, unclear relationships, workflow doesn't guide user through Bland's process.

---

## Part 7: Recommendations

### Option A: Align with Bland (Breaking Change)

**Restructure to make Assumptions primary:**

```typescript
// NEW: Assumption is primary
interface Assumption {
  id: UUID
  studio_project_id: UUID  // Direct link to project
  statement: string
  category: ...
  importance: ...
  evidence_level: ...
  is_leap_of_faith: boolean
  status: 'identified' | 'prioritized' | 'testing' | 'validated' | 'invalidated'

  // Remove hypothesis_id (wrong direction)
}

// NEW: Hypothesis becomes a testing plan for an assumption
interface AssumptionHypothesis {
  id: UUID
  assumption_id: UUID  // FK to assumption (correct direction)
  statement: string
  test_method: string  // How we'll test this
  validation_criteria: string  // How we'll measure
  success_threshold: string  // What "validated" means
  sequence: number
  status: 'proposed' | 'testing' | 'validated' | 'invalidated'
}

// Junction: Many experiments can test many hypotheses
interface HypothesisExperiment {
  hypothesis_id: UUID
  experiment_id: UUID
  result: 'supports' | 'refutes' | 'inconclusive'
}
```

**New Workflow:**
1. Extract assumptions from canvases → Assumptions table
2. Prioritize assumptions by matrix → Flag leap of faith
3. For each priority assumption → Create one or more hypotheses
4. For each hypothesis → Design experiments
5. Run experiments → Collect evidence
6. Evidence rolls up: Experiments → Hypotheses → Assumption evidence level

**Migration Path:**
- Create `assumption_hypotheses` table
- Migrate existing `studio_hypotheses` where `hypothesis_id` is set on assumptions
- For standalone hypotheses, create generic assumptions like "This initiative will succeed"
- Update UI to show Assumption → Hypotheses → Experiments hierarchy

**Pros:**
- Theoretically correct
- Proper separation of concerns
- One assumption → many hypotheses works correctly
- Workflow guides users through Bland's process

**Cons:**
- Breaking change requiring migration
- Existing users have to relearn
- More complex data model (3 entities instead of 2)

---

### Option B: Rename for Clarity (Non-Breaking)

**Keep current structure but rename entities to match actual usage:**

```typescript
// Rename: Hypothesis → Strategic Bet or Initiative
interface StrategicBet {
  id: UUID
  project_id: UUID
  statement: string  // What we believe will work
  rationale: string  // Why we believe it
  validation_criteria: string
  sequence: number
  status: ...
}

// Rename: Assumption → Risk or Test
interface ValidationTest {
  id: UUID
  strategic_bet_id?: UUID  // Optional link to bet
  statement: string  // What needs to be true
  category: 'desirability' | ...
  importance: ...
  evidence_level: ...
  is_high_risk: boolean  // Rename from leap_of_faith
}
```

**Rationale:** The current "hypotheses" are actually high-level strategic bets or initiatives. The current "assumptions" are actually testable risks or validation tests.

**Pros:**
- No data migration required
- Names match actual usage patterns
- Clearer for users who aren't familiar with Lean Startup jargon

**Cons:**
- Moves further from Bland's framework
- Loses connection to established methodologies
- May confuse users familiar with "assumptions" and "hypotheses" terms

---

### Option C: Keep Current + Add Guidance (Minimal Change)

**Keep current implementation but:**

1. **Add documentation** explaining the intentional difference from Bland
2. **Make `hypothesis_id` M:N** - Create `assumption_hypotheses` junction table (non-breaking, additive)
3. **Improve UI workflow:**
   - Add "Create hypothesis from assumption" button on assumption detail page
   - Add "Link existing hypothesis" on assumption form
   - Show all linked hypotheses (not just one) on assumption detail
4. **Add AI prompt** for assumption generation:
   ```
   "Extract assumptions from this business model canvas block.
   For each assumption, identify:
   - What must be true
   - Category (D/V/F/U/E)
   - Why this is important
   - Current evidence level"
   ```
5. **Add workflow guide** in UI:
   - "Getting Started with Assumptions"
   - "When to Create Hypotheses"
   - "Designing Experiments"

**Pros:**
- Minimal code changes
- Non-breaking for existing users
- Improves usability incrementally

**Cons:**
- Doesn't fix fundamental relationship inversion
- Band-aid over conceptual issues
- Tech debt accumulates

---

### Option D: Embrace Hybrid Model (Pragmatic)

**Acknowledge that both workflows are valid:**

**Workflow 1: Hypothesis-First (Current default)**
- Generate hypotheses from project vision/strategy
- Break down hypotheses into testable assumptions
- Design experiments to validate assumptions
- Evidence updates assumption → rolls up to hypothesis

**Workflow 2: Assumption-First (Bland's approach)**
- Extract assumptions from business model canvases
- Prioritize by importance × evidence matrix
- Formulate hypotheses to test priority assumptions
- Design experiments, collect evidence

**Implementation:**
1. **Make relationship bidirectional:**
   - Keep `hypothesis_id` on `assumptions` (supports Workflow 1)
   - Add `assumption_hypotheses` junction table (supports Workflow 2)
   - UI shows both "parent hypothesis" and "related hypotheses"

2. **Add workflow selector in UI:**
   ```
   "How do you want to work?"

   [ ] Strategy-First: Start with strategic hypotheses, break into assumptions
   [ ] Risk-First: Identify assumptions from canvases, formulate hypotheses
   ```

3. **Dual AI generation:**
   - Hypothesis generation (current): Uses project context
   - Assumption generation (new): Uses canvas blocks, existing hypotheses

4. **Update documentation** to explain both approaches

**Pros:**
- Supports different team workflows
- Doesn't force "one true way"
- Acknowledges reality: teams work differently
- Backward compatible

**Cons:**
- Complexity: two ways to do everything
- Potential confusion about "right" way
- More UI/UX to maintain

---

## Part 8: Specific Code Issues

### Issue 1: Nullable Hypothesis ID Creates Ambiguity

**Location:** `lib/types/database.ts:574`
```typescript
interface Assumption {
  hypothesis_id?: string  // Optional
}
```

**Problem:** Assumptions can exist with or without a parent hypothesis. This creates two classes of assumptions:
1. "Hypothesis assumptions" - Linked to a hypothesis
2. "Standalone assumptions" - Not linked to anything

**Questions:**
- Should standalone assumptions be allowed?
- If yes, how do they get prioritized vs. hypothesis-linked ones?
- Do they appear in the same UI/lists?

**Current Behavior:** Assumptions list view (`components/admin/views/assumptions-list-view.tsx:194`) shows all assumptions regardless of hypothesis link, which is good. But the relationship isn't clear in the UI.

### Issue 2: Validation Criteria Duplication

**Hypotheses have:**
```typescript
interface StudioHypothesis {
  validation_criteria?: string
}
```

**Assumptions have:**
```typescript
interface Assumption {
  validation_criteria?: string
}
```

**Problem:** If an assumption is linked to a hypothesis, which validation criteria applies? Are they meant to be different? This isn't documented.

**Expected:**
- Hypothesis validation criteria = "What proves the strategic bet works?"
- Assumption validation criteria = "What proves this specific risk is mitigated?"

But users might just copy-paste between them.

### Issue 3: Status vs. Evidence Level Confusion

**Both track "validation" but differently:**
```typescript
evidence_level: 'none' | 'weak' | 'moderate' | 'strong'  // How much data
status: 'identified' | 'prioritized' | 'testing' | 'validated' | 'invalidated' | 'archived'  // Workflow state
```

**Problem:** An assumption can be `status: 'validated'` with `evidence_level: 'weak'`. Is that valid? The trigger only updates `is_leap_of_faith`, not `status`.

**Recommendation:** Add validation:
```sql
CHECK (
  NOT (status = 'validated' AND evidence_level IN ('none', 'weak')) AND
  NOT (status = 'invalidated' AND evidence_level IN ('none', 'weak'))
)
```

Or auto-update status based on evidence level + experiment results.

### Issue 4: Experiment Junction Table Asymmetry

**Experiments link to Assumptions via junction:**
```typescript
assumption_experiments {
  assumption_id
  experiment_id
  result: 'supports' | 'refutes' | 'inconclusive'
}
```

**Experiments link to Hypotheses via FK:**
```typescript
studio_experiments {
  hypothesis_id?: UUID  // Optional FK
}
```

**Problem:** Inconsistent relationship modeling. Should be symmetric:
- Either both use junction tables (M:N)
- Or both use foreign keys (N:1)

**Recommendation:** Create `hypothesis_experiments` junction table for symmetry and to allow one experiment to test multiple hypotheses.

### Issue 5: AI Hypothesis Generation Doesn't Link to Assumptions

**Location:** `lib/ai/prompts/entity-generation.ts:47-65`

**Current:** Hypothesis generation uses project context (name, description, problem_statement, success_criteria).

**Missing:** No context about existing assumptions. AI can't say "Here's a hypothesis to test assumption X".

**Recommendation:** Update prompt:
```typescript
contextFields: [
  'name',
  'description',
  'problem_statement',
  'success_criteria',
  'assumptions'  // NEW: Include existing assumptions
]

systemPrompt: `Generate testable hypotheses for this project.

If assumptions are provided, formulate hypotheses that test those assumptions.
If no assumptions, generate strategic hypotheses that can later be broken down.

Format: "We believe [action/change] will [result] for [audience] because [rationale]"

For each hypothesis, indicate which assumption(s) it tests (if applicable).`
```

### Issue 6: No "Create Hypothesis from Assumption" Workflow

**Current:** Users can link an assumption to a hypothesis via dropdown. But there's no "quick create" flow.

**Recommendation:** Add button on assumption detail page:
```tsx
<Button onClick={() => router.push(`/admin/hypotheses/new?assumption=${assumption.id}`)}>
  Create Hypothesis to Test This
</Button>
```

In `hypothesis-form.tsx`, pre-fill from assumption:
```typescript
const assumptionFromUrl = searchParams.get('assumption')
if (assumptionFromUrl) {
  // Fetch assumption
  // Pre-fill hypothesis statement based on assumption
  // Auto-link assumption to hypothesis
}
```

---

## Part 9: Documentation Gaps

### What's Missing from Docs

1. **Conceptual explanation** of assumptions vs. hypotheses
   - Current docs are implementation-focused (schema, migrations, components)
   - Missing: "What is an assumption? What is a hypothesis? How are they different?"

2. **Workflow guidance**
   - No documented "getting started" path
   - Which to create first?
   - How to link them?

3. **Relationship diagram with explanations**
   - The entity relationship diagram exists but lacks "why" explanations
   - Need: "Why can an assumption link to a hypothesis but not vice versa?"

4. **Examples**
   - Seed data in migration is good start
   - Need: End-to-end example showing assumption → hypothesis → experiment → evidence → decision

5. **Methodology attribution**
   - Code comments mention Bland/Torres but don't explain what parts come from where
   - Users familiar with "Testing Business Ideas" might be confused by differences

### Recommended New Documentation

**File: `docs/concepts/assumptions-vs-hypotheses.md`**
```markdown
# Understanding Assumptions and Hypotheses

## Overview
This system implements a hybrid approach to product validation, drawing from
David Bland's "Testing Business Ideas" and Teresa Torres' "Continuous Discovery Habits".

## Key Differences

**Assumption** = An unvalidated belief that must be true for your product to succeed
- Example: "Design teams struggle with manual design token management"
- Categorized by risk type (Desirability, Viability, Feasibility, Usability, Ethical)
- Prioritized by Importance × Evidence matrix
- Tracked through validation lifecycle

**Hypothesis** = A testable statement about a strategic initiative
- Example: "Providing a visual token editor will reduce setup time by 50%"
- Links to assumptions it helps validate
- Ordered in validation roadmap
- Proven/disproven through experiments

## When to Use Each

Use **Assumptions** when:
- Extracting risks from business model canvases
- Identifying "Leap of Faith" beliefs to test first
- Tracking evidence for specific claims
- Bottom-up risk analysis

Use **Hypotheses** when:
- Planning strategic initiatives
- Defining validation roadmaps
- Testing multiple assumptions together
- Top-down strategy validation

## Relationship
- Hypotheses can link to multiple assumptions they validate
- Assumptions can be tested by multiple hypotheses
- Experiments collect evidence that updates assumption confidence

## Our Implementation vs. Standard Frameworks
Our system allows both assumption-first and hypothesis-first workflows,
whereas Bland's framework prescribes assumption-first. This flexibility
supports different team workflows but requires understanding both approaches.
```

---

## Part 10: Recommendations Summary

### Immediate Actions (Low Effort, High Impact)

1. **Add `assumption_hypotheses` junction table** (M:N relationship)
   - Non-breaking: Keep `hypothesis_id` for backward compat
   - Allows one assumption → many hypotheses (correct relationship)
   - Update UI to show all linked hypotheses, not just one

2. **Create conceptual documentation** (`docs/concepts/assumptions-vs-hypotheses.md`)
   - Explain the difference clearly
   - Document both workflows (hypothesis-first vs. assumption-first)
   - Provide end-to-end examples

3. **Add validation constraints**
   - Prevent `validated`/`invalidated` status with `none`/`weak` evidence
   - Add help text in UI explaining status vs. evidence_level

4. **Improve AI generation**
   - Add assumption context to hypothesis generation prompt
   - Create assumption generation prompt that suggests linking to hypotheses

5. **Add workflow helpers in UI**
   - "Create hypothesis from assumption" button
   - "Link to hypothesis" context from assumption detail page
   - Visual flow diagram showing assumption → hypothesis → experiment → evidence

### Medium-Term Improvements (Moderate Effort)

6. **Create `hypothesis_experiments` junction table** for symmetry
   - Allows one experiment to test multiple hypotheses
   - Consistent relationship modeling

7. **Add guided onboarding flow**
   - "Getting Started" wizard in UI
   - Choose workflow: assumption-first or hypothesis-first
   - Step-by-step creation with explanations

8. **Enhance assumptions list view**
   - Add column showing linked hypotheses count
   - Filter by "standalone" vs. "hypothesis-linked"
   - Quick-create hypothesis action from row

9. **Add rollup calculations**
   - Hypothesis confidence = aggregate of linked assumption evidence
   - Project risk score = count of unvalidated leap-of-faith assumptions
   - Dashboard showing validation progress

### Long-Term Considerations (Strategic)

10. **Decide on canonical model**
    - Option A: Fully align with Bland (breaking change)
    - Option D: Embrace hybrid (document both workflows)
    - Recommendation: **Option D** - Pragmatic and backward-compatible

11. **Add workflow templates**
    - "Bland Method" template (assumption-first)
    - "Torres Method" template (opportunity-first)
    - "Sprint Hypothesis" template (hypothesis-first)

12. **Integration with decision-making**
    - Auto-suggest decisions based on evidence
    - Block project progression if leap-of-faith assumptions unvalidated
    - Generate validation reports for stakeholders

---

## Conclusion

The current implementation is **technically sophisticated** with rich data modeling, excellent source tracking, and proper prioritization mechanics. However, there's **conceptual drift** from David Bland's framework due to:

1. **Inverted relationship hierarchy** (hypothesis → assumption vs. assumption → hypothesis)
2. **Hypothesis-first default workflow** (vs. assumption-first in Bland)
3. **Semantic drift** in what constitutes a "hypothesis" vs. "assumption"

This doesn't make the implementation "wrong"—it reflects a **pragmatic hybrid approach** that supports both strategy-first and risk-first workflows. However, this hybrid nature is **undocumented and implicit**, leading to potential user confusion.

### Final Recommendation

**Embrace the hybrid model explicitly:**
1. Document both workflows clearly
2. Add M:N relationship support (junction table)
3. Improve AI generation to bridge assumptions ↔ hypotheses
4. Add UI guidance for both paths
5. Create examples showing both approaches

This preserves backward compatibility, supports diverse team workflows, and provides clarity through documentation rather than forcing a single "correct" way.

### Assessment Rating

| Criterion | Rating | Notes |
|-----------|--------|-------|
| **Technical Implementation** | ⭐⭐⭐⭐⭐ | Excellent schema, indexes, triggers, evidence tracking |
| **Theoretical Alignment** | ⭐⭐⭐ | Hybrid approach works but diverges from Bland |
| **User Clarity** | ⭐⭐ | Confusing relationship, unclear workflow |
| **Flexibility** | ⭐⭐⭐⭐⭐ | Supports multiple workflows (even if unintentionally) |
| **Documentation** | ⭐⭐ | Implementation docs good, conceptual docs missing |
| **Practical Utility** | ⭐⭐⭐⭐ | Works well once users understand it |

**Overall:** A powerful system that needs clearer conceptual documentation and explicit acknowledgment of its hybrid nature.

---

## Appendix: Key File References

- **Schema:** `supabase/migrations/20251229170000_create_assumptions.sql`
- **Types:** `lib/types/database.ts` (lines 562-650)
- **Schemas:** `lib/mcp/schemas/assumptions.ts`, `lib/mcp/schemas/studio.ts`
- **Forms:** `components/admin/assumption-form.tsx`, `components/admin/hypothesis-form.tsx`
- **Lists:** `components/admin/views/assumptions-list-view.tsx`, `components/admin/views/hypotheses-list-view.tsx`
- **AI:** `lib/ai/prompts/entity-generation.ts` (lines 47-96)
- **Spec:** `docs/specs/hypotheses-experiments-admin-ui.md`

---

**Report Complete**
