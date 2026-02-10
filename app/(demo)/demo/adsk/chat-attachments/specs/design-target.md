# Chat Attachments — Target Technical Design

This document describes the **target** architecture aligned with [prd.md](./prd.md). For current implementation, see [design-current.md](./design-current.md).

Code snippets are illustrative, not prescriptive.

---

## Gap Analysis: Current → Target

| Area | Current | Target |
|------|---------|--------|
| Cardinality | Tickers: multiple; Others: singular | All types: single-select per flow with auto-close; repeat to add more |
| Mutual Exclusivity | Theme ↔ Deep Research enforced | No UI enforcement (R8.3) |
| Attachment Modes | Single mode (always visible) | Two modes: Preparing → Ready (R3) |
| Textarea Behavior | Always visible | Preparing replaces textarea; Ready shows textarea with attachments below |
| Starter Text | None | Singular/plural starter text per type, syncs on add/remove (R2) |
| Expert Search | Topics only | Unified search: topics + experts together (E1.2) |
| Index Selection | Basic list | List with filters + detail panel with YTD (I1.3-I1.8) |

---

## D1 Two-Mode Architecture (satisfies R3)

Attachments exist in distinct states with different UI treatments.

### D1.1 States

| State | Description | UI Treatment |
|-------|-------------|--------------|
| **Preparing** | User configuring | Config UI replaces textarea |
| **Ready** | Confirmed, submittable | Compact display above textarea |
| **Submitted** | In message history | Read-only display |
| **Error** | Validation issue | Inline error on attachment |

### D1.2 Transitions

```
Simple types (Ticker, Expert, Index):
[Menu Select] → Preparing → [Select Item] → Ready (auto-close)

Complex types (Theme, Deep Research):
[Menu Select] → Preparing → [Done/Confirm] → Ready

All types:
[Close/Cancel] → Previous state restored
```

- Simple types: Selection auto-closes Preparing → Ready (R3.2)
- Complex types: Explicit Done/confirm action required (R3.3)
- Close in Preparing cancels without saving (R3.8)

**Returning to edit (type-specific):**
- **Theme**: Click compact card → opens unified edit panel with title, thesis, sub-themes (R3.5)
- **Ticker, Expert, Index**: Use [+] menu to add more items; each selection auto-closes (R3.6)
- **Deep Research**: Config button in Ready mode triggers config modal (R3.7)

### D1.3 Textarea Behavior

The textarea has three possible states:
- **Normal**: Visible, no attachment activity
- **Replaced**: Hidden while attachment is being configured
- **Prefixed**: Visible with pre-populated starter text after attachment confirmed

---

## D2 State Management (satisfies R1-R5, R7)

### D2.1 Attachment State Shape

Each attachment type tracks:
- **Items**: Confirmed selections (ready to submit)
- **Preparing**: Item currently being configured (if any)
- **Mode**: idle | preparing | ready

The existing `usePromptInputAttachments` hook manages this state. Key changes from current:
- Themes, Experts become arrays (not singular)
- Remove mutual exclusivity clearing logic
- Add starter text/placeholder state for textarea

### D2.2 No Mutual Exclusivity Enforcement (satisfies R8.3)

Current behavior clears Deep Research when Theme opens (and vice versa). Target behavior: allow both. Model resolves conflicts (R8.2).

### D2.3 Cardinality Limits (satisfies R5)

All simple types use single-select with auto-close. Users repeat the flow to add more:
- Tickers: single per flow, repeat to add more (e.g., 10 total limit)
- Experts: single per flow, repeat to add more (e.g., 3 total limit)
- Themes: single per flow, repeat to add more (e.g., 3 total limit)
- Indices: single per flow, repeat to add more (e.g., 3 total limit)
- Deep Research: 1 (config only)

Hard limits TBD per Q3 in prd.md.

---

## D3 Starter Text System (satisfies R2)

### D3.1 Starter Text per Type

Each attachment type has singular and plural variants:
- **Starter Text**: Pre-populated text based on count (e.g., "Add this ticker" vs "Add these tickers")
- **Placeholder**: Hint text based on count (e.g., "Ask about this ticker..." vs "Ask about these tickers...")

See prd.md R2 table for specific values.

### D3.2 Sync Behavior

Starter text syncs automatically when attachments change:
1. Attachment added → starter text updates to match new count/type
2. Attachment removed → starter text updates (may revert to singular, or clear if empty)
3. User-edited text (not matching any starter text) → preserved, never overwritten
4. Placeholder always updates based on current attachment state

### D3.3 Detection of User Edits

The system tracks whether input is "starter text" or "user-edited":
- Input is considered starter text if it exactly matches any singular/plural starter text (with trailing space)
- Any other non-empty input is considered user-edited and is preserved

### D3.4 Mixed Type Behavior (satisfies R2.5)

When user has multiple attachment types ready (e.g., Ticker + Theme):
- **Starter Text**: Cleared (no auto-generated text)
- **Placeholder**: Generic prompt ("Add context to your message...")

Rationale: Mixed attachments = custom use case. User writes their own intent rather than receiving potentially misleading auto-generated text.

---

## D4 Component Architecture (satisfies R4)

### D4.1 Shared Shell (PreparingShell)

All attachment types in Preparing mode share a common wrapper providing:
- **Title bar**: Icon + type label + close button
- **Content area**: Type-specific UI (search, select, detail views)
- **Action bar**: Optional — only shown for complex types (Theme, Deep Research) that need confirmation

Props:
- `title`: String shown in title bar
- `icon`: React node for title bar icon
- `onClose`: Handler for close button
- `onDone?`: Optional handler for Done button (if provided, shows action bar with Done)
- `hideActions?`: Force hide action bar (used in detail views)
- `doneDisabled?`: Disable Done button conditionally
- `customActions?`: Custom action bar content (replaces default Done button)

### D4.2 Compact Displays (AttachmentChip)

All attachment types in Ready mode and message history use the same `AttachmentChip` component:

```
[Icon] Primary Text | Secondary Text [×]
```

Props:
- `icon`: React node (colored circle for tickers, semantic icons for others)
- `primary`: Main text (ticker symbol, expert name, theme name, etc.)
- `secondary?`: Optional secondary text (company name, topic, publisher)
- `tooltip?`: Hover tooltip for additional info
- `onRemove?`: Optional remove handler (omit for read-only in messages)
- `onClick?`: Optional click handler (for theme cards that return to Preparing)
- `error?`: Error message to display with warning styling

**Edit/remove behaviors vary by type:**
- **Theme**: Click chip to open unified edit panel (title, thesis, sub-themes). Remove via button in edit mode.
- **Ticker, Expert, Index**: Remove via [×] in Ready mode. Add more via [+] menu.
- **Deep Research**: Config button and remove control in Ready mode.

### D4.3 Component Organization

Each attachment type has:
- **Preparing component**: Config UI using PreparingShell (e.g., TickerPreparing, ExpertPreparing)
- **Chips component**: Collection renderer for Ready mode (e.g., TickerChips, ExpertChips)
- **Display component**: Reuses AttachmentChip, read-only for message history

### D4.4 Message Display

Submitted messages show user text + attachments using the same AttachmentChip component:
- Chips rendered without `onRemove` (read-only)
- Same visual styling as Ready mode for consistency
- User text displayed above attachment chips

---

## D5 Attachment Menu (satisfies R7.1)

Menu items include icon + label + short description to aid discoverability.

```
┌─────────────────────────────────────┐
│  [+] Add Context                    │
│  ┌─────────────────────────────────┐│
│  │ 📊 Tickers                      ││
│  │    Add stocks for analysis      ││
│  ├─────────────────────────────────┤│
│  │ 🎯 Theme                        ││
│  │    Define an investment thesis  ││
│  │ ...                             ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

---

## D6 Message History (satisfies R3.10)

User message displays:
1. User's full text (including any starter text edits)
2. Compact read-only attachment chips (same AttachmentChip component, no onRemove)

```
┌───────────────────────────────────────────────┐
│ Add these tickers What are the key risks?     │
│                                               │
│ [AAPL] [NVDA] [Warren Buffett | Value...]     │
└───────────────────────────────────────────────┘
```

Message bubble styling matches existing Message component (right-aligned, rounded, bg-muted).

---

## D7 Expert Preparing (satisfies E1.1-E1.7)

### D7.1 Pattern Adherence

- **PreparingShell**: Yes, standard usage with `hideActions` in detail view
- **Selection model**: Single-select with auto-close (simple type)
- **Ready mode**: AttachmentChip with name + primary topic
- **Action bar**: None (no Done button — selection triggers close)

### D7.2 Type-Specific Behavior

**Multi-view navigation:**
- Browse → Topic Detail → Expert Detail (drill-down pattern)
- Back navigation via icon in title bar
- Search available in Browse and Topic Detail views

**Unified search (E1.2):**
- Single input returns both topics and experts
- Results grouped into "Topics" and "Experts" sections
- Topic results show name + expert count, click to drill in
- Expert results show name + authority score pill + short view description

**Detail view before selection:**
- Expert Detail shows rich info (bio, quote, scores, topics)
- "Select Expert" button confirms and auto-closes
- Differs from Ticker (no detail view) — experts need context for informed selection

### D7.3 Views

- **Browse**: Topics list with expert counts
- **Topic Detail**: Experts filtered by selected topic
- **Expert Detail**: Full expert profile with Select button

### D7.4 Expert Detail View

Shows rich expert information:
- Avatar placeholder + name + external link icon
- Bio and key quote
- Scores grid: Authority, Influence, Overall (rank + score)
- Topic pills (clickable to drill into that topic)
- "Select Expert" button to confirm selection (auto-closes)

### D7.5 Authority Score Display

Authority scores shown as colored pills:
- 90+: Green (high authority)
- 75-89: Blue (good authority)
- Below 75: Muted (standard)

---

## D8 Index Preparing (satisfies I1.1-I1.9)

### D8.1 Pattern Adherence

- **PreparingShell**: Yes, standard usage with `hideActions` in detail view
- **Selection model**: Single-select with auto-close (simple type)
- **Ready mode**: AttachmentChip with name + publisher
- **Action bar**: None (no Done button — selection triggers close)

### D8.2 Type-Specific Behavior

**Dual selection paths:**
- Quick-add [+] on list row → immediate selection, auto-closes
- Click row → detail view → "Select Index" button → auto-closes
- Two paths serve different needs: fast selection vs. informed decision

**Filter system:**
- Category filter chips: All, My Indices, Thematic, Sector, Strategy, Geographic
- Differs from Expert (topic drill-down) — indices use flat filtering

**Detail view before selection:**
- Shows YTD performance with sparkline, description, metadata
- "Select Index" button confirms and auto-closes
- Similar to Expert detail rationale — indices need context for informed selection

### D8.3 Views

- **List**: Searchable, filterable index list
- **Detail**: Full index information with Select button

### D8.4 List View

Features:
- Search input with clear button
- Filter chips: All, My Indices, Thematic, Sector, Strategy, Geographic
- List items show: name, publisher, category badge, YTD performance
- YTD performance color-coded (green positive, red negative)
- Quick-add [+] button on each row for immediate selection (auto-closes)
- Click row (not [+]) to open detail view

### D8.5 Detail View

Shows rich index information:
- Name with external link icon
- YTD performance with mini sparkline (SVG)
- Description paragraph
- Metadata row: Publisher | Category | Inception date | Creator
- "Select Index" button to confirm selection (auto-closes)

---

## D9 Ticker Preparing (satisfies T1.1-T1.3)

### D9.1 Pattern Adherence

- **PreparingShell**: Yes, standard usage without action bar
- **Selection model**: Single-select with auto-close (simple type)
- **Ready mode**: AttachmentChip with colored initial + symbol + company name
- **Action bar**: None (no Done button — selection triggers close)

### D9.2 Type-Specific Behavior

**Simplest attachment type:**
- Search-only interface, no browsing or categories
- No detail view — ticker info is self-explanatory
- Keyboard navigation: Arrow keys + Enter to select, Escape to close

**Visual identity:**
- Colored circle with first letter (deterministic color from symbol)
- Same color scheme in Preparing list and Ready chip

**Search behavior:**
- Partial/fuzzy matching on symbol and company name (T1.3)
- Results exclude already-selected tickers
- Auto-focus on mount for immediate typing

### D9.3 Preparing UI

- Search input with icon
- Scrollable results list (max-height constrained)
- Each row: colored initial + symbol (mono) + company name
- Click or Enter selects and auto-closes

---

## D10 Theme Preparing (satisfies TH1.1-TH1.8)

### D10.1 Pattern Adherence

- **PreparingShell**: Yes, with `customActions` for step-specific action bar
- **Selection model**: Multi-step flow with explicit Done (complex type)
- **Ready mode**: AttachmentChip with theme name + sub-theme count; clickable to return to edit mode
- **Action bar**: Yes, shows step indicator + step-specific action button

### D10.2 Type-Specific Behavior

**Dual creation paths (TH1.1):**
- AI-generated: Define → Select (2 steps)
- Manual: Create Theme (single panel)

**AI path — Define step:**
- Theme name input field
- Suggestion chips for quick theme ideas (clicking advances to Select step)
- "Generate Sketches" button (disabled until input has value)
- "or create manually" button to switch to manual path

**AI path — Select step:**
- Loading state with skeleton cards while generating
- Generated sketch cards with name, description, and sub-themes
- Single-select: clicking card selects it (can deselect by clicking again)
- Sub-theme toggles within selected card (can deselect individual sub-themes)
- "Select" button confirms and transitions to Ready mode

**Manual path — Create Theme:**
- Title field (required, placeholder: "Theme title*")
- Thesis field (required, placeholder: "Investment thesis*")
- Sub-themes section with count badge
- Each sub-theme: title + thesis fields, Remove button
- "Add sub-theme" button
- "Done" button (disabled until title and thesis have values)

**Step indicator:**
- Simple text: "Step x of y" (no interactive dots)
- Displayed in action bar

**Title bar behavior:**
- Contextual titles: "Define Theme" → "Select Sketch" (AI) or "Create Theme" (manual) or "Edit Theme" (edit)
- Back icon for navigation in multi-step flows

**Edit mode (TH1.5-TH1.8):**
- Click theme chip in Ready mode → opens unified edit panel
- Same format as manual creation: title, thesis, sub-themes
- AI-generated themes converted to editable format (sub-theme titles preserved, thesis fields empty)
- Remove button beside Done button in action bar
- Title: "Edit Theme"

### D10.3 Preparing UI

**Define step (AI path):**
- Theme name input with placeholder
- Suggestion chips row
- Action bar: "Generate Sketches" + "or create manually"

**Select step (AI path):**
- Loading: skeleton cards with animate-pulse
- Loaded: sketch cards (selectable, with toggleable sub-themes)
- Action bar: step indicator + "Select" button

**Create/Edit panel (Manual path and Edit mode):**
- Title input (rounded-t, border-x border-t)
- Thesis textarea (rounded-b, border-x border-b)
- Sub-themes section:
  - Header: "Sub-themes" label + count badge
  - Sub-theme cards: title input + thesis textarea + Remove button
  - "Add sub-theme" button
- Action bar: "Done" (+ "Remove" in edit mode)

---

## D11 Deep Research Preparing (satisfies DR1.1-DR1.4)

### D11.1 Pattern Adherence

- **PreparingShell**: Yes, standard usage with `onDone`
- **Selection model**: Config-only with explicit Done (complex type)
- **Ready mode**: AttachmentChip with "Deep Research" label + config button + remove control
- **Action bar**: Yes, shows Done button

### D11.2 Type-Specific Behavior

**No item selection:**
- Unlike other types, no search or list to select from
- Configuration only — defines parameters for research run
- Single attachment limit (only one Deep Research per message)

**Configuration summary:**
- Shows current config as bullet list (use existing themes, replace portfolio, etc.)
- "Configure" button opens config modal (modal UX out of scope per DR1.2)

**Ready mode affordances:**
- Config button to re-open configuration
- Remove control (×) to discard attachment
- Both affordances in Ready mode (differs from Theme which requires entering edit mode to remove)

### D11.3 Preparing UI

- Description text explaining Deep Research purpose
- Config summary panel (bulleted list of current settings)
- Configure button + timing note ("may take up to 10 minutes")
- Done button in action bar

---

## D12 Submit Logic (satisfies R1.2, R1.3)

Submit enabled when:
- NOT in Preparing mode, AND
- (has text OR has attachments)

Submit disabled when:
- In Preparing mode (attachment incomplete), OR
- No text AND no attachments

---

## D13 Error Handling (satisfies R6)

Errors display inline on the affected attachment via AttachmentChip `error` prop:
- Warning icon replaces normal icon
- Error message shown in tooltip
- Destructive color styling
- User can fix or remove
- Submit remains available with warning (R6.3)

---

## Design Rationale

1. **Single-select with auto-close for simple types.** Reduces cognitive load (no "Done" step), matches modern interaction patterns (emoji pickers, tag selectors). Users repeat flow to add more — simpler mental model than multi-select with confirmation.

2. **No UI-enforced mutual exclusivity.** Model resolves conflicts — simpler UX, more flexibility.

3. **Preparing replaces textarea.** Conserves space, reduces complexity, focuses attention.

4. **Singular/plural starter text with sync.** Sets clear expectation, adapts to context, respects user edits.

5. **Shared components (PreparingShell, AttachmentChip).** Consistent patterns reduce cognitive load; same chips in Ready mode and message history.

6. **Unified search for experts.** Users think in terms of topics OR names — supporting both in one search reduces friction.

7. **Detail views before selection.** For complex items (experts, indices), showing rich information helps users make informed choices without leaving the flow.

8. **Simple step indicator for multi-step flows.** "Step x of y" text provides clear progress without visual clutter. Simpler than interactive dots which could be confused with carousel indicators.

9. **Dual creation paths for themes.** AI-generated sketches offer speed and inspiration; manual entry offers control. Both paths converge to same editable format, allowing users to refine AI output or build from scratch.

10. **Unified edit panel for themes.** Same panel format regardless of creation method. AI-generated themes converted to manual format (titles preserved, thesis fields empty). Simplifies mental model — one way to edit any theme.

11. **Type-specific pattern deviations documented.** Each attachment type explicitly states what shared patterns it follows and where it deviates, with rationale. Reduces ambiguity for implementers.
