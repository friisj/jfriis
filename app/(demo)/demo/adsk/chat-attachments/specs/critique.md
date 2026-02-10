# Chat Attachments — UX Critique

## Summary

The foundations for chat attachments are promising but very inconsistent. The architecture supports 5 attachment types with feature flags, state management, and message part conversion — all working. However, the UX varies wildly across types, creating unnecessary cognitive load.

**Biggest opportunity**: Normalize and upgrade the basic flow, interactions, and affordances. Type-specific complexity (Theme, Deep Research) is secondary — fix the shared patterns first.

See also: [feedback.md](./feedback.md) for detailed sticky-note feedback per type.

---

## Core Issues

### 1. Message Composition Unclear

Users don't understand that attachments augment text input.

- No affordance communicating "you can add a message with your attachment"
- Appears in ALL 5 attachment types
- D4.1 now documents composition rules, but UI doesn't reflect them

**Impact**: Users either skip text or don't realize attachments are additive.

### 2. No Expectation Management on Submit

Users don't know what happens when they submit.

- What will the LLM receive?
- How will the attachment be used?
- Will mode switch (e.g., discretionary for Deep Research)?

**Impact**: Blind submission, mismatched expectations.

### 3. Missing Intent Prefixes

Submitted messages lack context about attachment purpose.

- No prefix like "Start a deep research..." or "Add a new theme..."
- Attachment appears as data blob, not user intent
- "Expert View" label is ambiguous

**Impact**: Message history doesn't communicate what user was trying to do.

### 4. Discoverability Gaps

Users can't learn when/why to use each attachment type.

- Menu shows types with icons — no description or context
- No onboarding or hints for new users
- No indication of what each type adds to the conversation
- Feature flag gating means types appear/disappear without explanation

**Impact**: Attachments feel like hidden power features, not natural workflow.

### 5. Inconsistent Interaction Patterns

Each type requires a different mental model:

| Type | Pattern |
|------|---------|
| Ticker | Search → multi-select chips |
| Theme | Inline edit + sketch + sub-theme management |
| Expert | Wizard with topic → browse → select |
| Deep Research | Card + modal hybrid with 6 config sections |
| Index | Browse/search → single-select |

**Impact**: Users must learn 5 different flows.

### 6. Asymmetric Cardinality

- Tickers: multiple allowed
- All others: singular
- No explanation why

**Impact**: "Why can't I select multiple experts/indices?"

### 7. Inconsistent Affordances

| Issue | Types Affected |
|-------|----------------|
| No "ready/done" signal | Expert, Theme |
| Ambiguous buttons ("Use this", "Back") | Theme, Expert |
| Can't undo selection without restart | Expert |
| Cancel button meaning unclear | Index |
| Search requires exact matches | Expert, Index |

**Impact**: Users unsure when configuration is complete or how to recover.

### 8. Undisclosed Mutual Exclusivity

- Theme ↔ Deep Research are mutually exclusive (R2.5, R3.5)
- No warning before selection
- Silent replacement

**Impact**: Unexpected data loss.

---

## Type-Specific Complexity

These are real but secondary to core issues above.

### Theme (most problematic)
- 824 lines, complex state machine
- Sketch → tweak → select workflow crammed into small card
- Tweak controls (more/less consensus) have poor usability
- Can't manually add sub-themes
- Full theme card in message is overwhelming

### Deep Research
- 6 configuration sections in modal
- Default vs custom config unclear
- Period/scope/sources meanings unclear
- Switch toggle states visually ambiguous

### Expert
- 548 lines, multi-step wizard
- Topic search exact-match only, limited to ~10 results
- Ambiguous relevance metric
- Generated perspective bloats user message

---

## Priority Recommendations

### Immediate: Normalize the Basics
1. Add "supplement with message" affordance to all types
2. Add intent prefix to submitted messages
3. Add submit expectation hint (what happens next)
4. Standardize "done/ready" signal across all types
5. Add mutual exclusivity warning

### Near-term: Improve Discoverability
6. Add type descriptions to attachment menu
7. Add contextual hints for first-time use
8. Improve search (fuzzy matching, browse all)

### Later: Reduce Complexity
9. Simplify Theme card (extract sub-components)
10. Add LLM context preview
11. Add attachment persistence/reuse

---

## Lifecycle Gaps

| Stage | Current | Gap |
|-------|---------|-----|
| Discovery | Menu with icons | No context on when/why to use |
| Selection | Type-specific | No unified pattern |
| Configuration | Varies wildly | No consistent "done" signal |
| Composition | Text + attachments | No affordance showing combination |
| Preview | None | Can't see what LLM receives |
| Submission | Works | No expectation management |
| History | Read-only display | No intent prefix, no re-use |
