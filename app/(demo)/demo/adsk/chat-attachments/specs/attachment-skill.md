# Chat Attachments — Claude Coding Skill

> Use this skill when implementing, extending, or modifying the chat attachment capability.
> It encodes UX principles, architectural patterns, and known pitfalls so distributed work stays coherent.

---

## When to Activate

Activate this skill when your task involves:
- Adding a new attachment type
- Modifying an existing attachment type's UI or behavior
- Changing the attachment lifecycle (Preparing, Ready, Submitted)
- Touching shared components (PreparingShell, AttachmentChip, AttachmentMenu)
- Working on message composition (textarea, starter text, placeholders)
- Modifying how attachments are serialized to message parts or converted for the LLM

---

## Principles (Non-Negotiable)

These are the UX principles that govern all attachment work. Violating them creates the inconsistencies this system was designed to eliminate.

| # | Principle | What It Means for Code |
|---|-----------|----------------------|
| 1 | **Annotate, don't replace** | Attachments augment user text. Never hide, disable, or deprioritize the textarea when attachments are present in Ready mode. |
| 2 | **Trust the model** | No confirmation dialogs, no previews of "what the LLM will receive." Submit sends. The model infers intent from structured context + user text. |
| 3 | **Unstructured is valid** | Natural language always works. Never gate functionality behind attachments. Never interrupt flow to suggest using an attachment. |
| 4 | **Two modes: Preparing → Ready** | Every attachment has exactly two composition states. Preparing replaces the textarea with config UI. Ready shows compact representation below the textarea. These are visually and functionally distinct. |
| 5 | **Phased complexity** | Multi-step flows show one thing at a time. Back navigation between steps. Never cram a complex config into a single dense view. |
| 6 | **Standardized controls** | Use shared components for search, select, close, back, done. No per-type inventions for standard interactions. |
| 7 | **Visible intent** | Starter text and placeholders communicate what the attachment does. User always sees and controls the framing before submit. |
| 8 | **Literal icons, short descriptions** | Icons represent what the attachment is. Menu items include a description explaining when to use the type. |
| 9 | **Errors inline, not blocking** | Errors appear on the affected attachment. Submit remains available. Never silently remove or block for recoverable issues. |
| 10 | **Discoverable, not interruptive** | Features are visible and labeled. Never interrupt user flow with proactive suggestions or modals. |

---

## Architecture at a Glance

```
User composes message
├── [+] Menu → selects attachment type
├── Preparing mode → type-specific config UI (replaces textarea)
├── Selection/confirmation → transitions to Ready mode
├── Ready mode → compact chips below textarea + starter text
├── Submit → attachments serialized as message parts
│   ├── Frontend: PromptPayload with typed data parts
│   ├── Backend: Zod validation → convertDataPart → text for LLM
│   └── History: read-only AttachmentChip (same component, no onRemove)
└── Attachments cleared after send
```

### Key Files (Current Structure)

```
src/components/edit/attachments/{type}/
├── {type}-types.ts         # TypeScript types + factory functions
├── {type}-schema.ts        # Zod validation schema
├── {Type}InputCard.tsx      # Preparing UI
└── {Type}Display.tsx        # Read-only display in message history
```

### State Management

Hook: `usePromptInputAttachments` manages all attachment state.

```typescript
// State shape per type
{
  items: TypeAttachment[]     // Confirmed selections (Ready)
  preparing: TypeAttachment | null  // Currently configuring
  mode: 'idle' | 'preparing' | 'ready'
}
```

**Important constraints:**
- No mutual exclusivity enforcement in UI (model resolves conflicts)
- All types use single-select per Preparing flow with repeat-to-add-more
- Feature flags gate visibility per type in the menu

---

## Shared Components

### PreparingShell

Wrapper for all Preparing mode UIs. Every attachment type MUST use this.

```
┌──────────────────────────────────────────┐
│ [Icon] Type Label                    [×] │  ← Title bar (always)
├──────────────────────────────────────────┤
│                                          │
│   Type-specific content area             │  ← Your UI goes here
│                                          │
├──────────────────────────────────────────┤
│                              [Done]      │  ← Action bar (complex types only)
└──────────────────────────────────────────┘
```

**Props:**
- `title` — contextual title (changes per step in multi-step flows)
- `icon` — React node for title bar
- `onClose` — cancel handler (restores previous state)
- `onDone?` — shows action bar with Done button (complex types only)
- `hideActions?` — force-hide action bar (e.g., in detail views)
- `doneDisabled?` — conditional disable for Done
- `customActions?` — override default Done with custom action bar content

**Rules:**
- Simple types (Ticker, Expert, Index): NO action bar. Selection auto-closes.
- Complex types (Theme, Deep Research): action bar with explicit Done/Confirm.
- Close always cancels without saving.

### AttachmentChip

Used in Ready mode AND message history. Same component, different props.

```
[Icon] Primary Text | Secondary Text [×]
```

**Props:**
- `icon` — colored circle, semantic icon, etc.
- `primary` — main text (ticker symbol, expert name, theme name)
- `secondary?` — supporting text (company name, topic, publisher)
- `tooltip?` — hover info
- `onRemove?` — remove handler (omit for read-only in history)
- `onClick?` — click handler (Theme uses this to return to edit mode)
- `error?` — inline error message with warning styling

**Rules:**
- Ready mode: include `onRemove` (and `onClick` for Theme)
- Message history: omit `onRemove` and `onClick` (read-only)
- Visual weight varies: simple types are compact, complex types more prominent

---

## Adding a New Attachment Type

Follow this checklist exactly. Skipping steps creates the inconsistencies.

### 1. Define the Type

```
src/components/edit/attachments/{new-type}/
├── {new-type}-types.ts      # TypeAttachment interface + factory
├── {new-type}-schema.ts     # Zod schema for validation
├── {NewType}Preparing.tsx   # Preparing mode UI (uses PreparingShell)
├── {NewType}Chips.tsx       # Ready mode renderer (uses AttachmentChip)
└── {NewType}Display.tsx     # Message history renderer (uses AttachmentChip, read-only)
```

### 2. Classify: Simple or Complex

| Classification | Behavior | Examples |
|---------------|----------|---------|
| **Simple** | Single-select with auto-close. No Done button. Repeat flow to add more. | Ticker, Expert, Index |
| **Complex** | Multi-step or config flow. Explicit Done/Confirm. May have edit mode. | Theme, Deep Research |

This classification determines:
- Whether PreparingShell shows an action bar
- Whether transition to Ready is automatic or explicit
- Whether the chip is clickable to return to edit mode

### 3. Implement Preparing Mode

**Simple type template:**
```
PreparingShell (no onDone)
└── Search input (auto-focus)
    └── Results list
        └── Click item → confirm selection → auto-close to Ready
```

**Complex type template:**
```
PreparingShell (with onDone)
└── Step 1: Define/Configure
    └── Step 2: Select/Confirm (if multi-step)
        └── Done button → transition to Ready
```

### 4. Implement Ready Mode Chips

Use AttachmentChip. Include:
- Type-appropriate icon
- Primary label (name/symbol/title)
- Secondary label if useful (company, topic, publisher)
- `onRemove` for removal
- `onClick` only if type supports inline editing (like Theme)

### 5. Implement Starter Text

Add entries to the starter text system:

| Field | Singular | Plural |
|-------|----------|--------|
| Starter text | "Add this {type}" | "Add these {types}" |
| Placeholder | "Ask about this {type}..." | "Ask about these {types}..." |

**Rules:**
- Starter text updates on add/remove
- Never overwrites user-edited text
- Mixed types → clear starter text, use generic placeholder

### 6. Register

- Add to `usePromptInputAttachments` state
- Add to AttachmentMenu with icon + label + description
- Add feature flag: `chat-attachment-{new-type}`
- Add data part type: `data-{new-type}-add`
- Add Zod schema to `queryBuilderDataSchemas`
- Add `convertDataPart` case in route.ts
- Add Display component mapping in ChatMessage.tsx

### 7. Validate Against Principles

Before shipping, verify:

- [ ] Preparing mode replaces textarea (Principle 4)
- [ ] Ready mode shows compact chip below textarea (Principle 4)
- [ ] Uses PreparingShell with correct action bar behavior (Principle 6)
- [ ] Uses AttachmentChip for Ready and history (Principle 6)
- [ ] Starter text populates and syncs correctly (Principle 7)
- [ ] Menu item has icon + description (Principle 8)
- [ ] No confirmation dialog before submit (Principle 2)
- [ ] Errors inline on chip, don't block submit (Principle 9)
- [ ] Textarea never hidden in Ready mode (Principle 1)
- [ ] No proactive suggestions or interruptions (Principle 10)

---

## Modifying Existing Types

### Common Modification Patterns

**Adding a detail view to a simple type:**
- Use `hideActions` on PreparingShell in the detail view
- Add back navigation via icon in title bar
- Keep auto-close on final selection (don't add a Done button)
- See Expert and Index types for reference

**Adding a step to a complex type:**
- Update step indicator text ("Step x of y")
- Ensure back navigation works for all steps
- Update title bar text per step
- Keep Done button only on final step (or use `customActions` for step-specific actions)

**Changing cardinality:**
- All types use single-select per flow. Users repeat to add more.
- If you need to change this, update starter text singular/plural logic
- Update the cardinality limit constant

---

## Known Anti-Patterns (Avoid These)

These are documented issues from critique and feedback. Code that reintroduces them will be flagged.

| Anti-Pattern | Why It's Bad | What to Do Instead |
|-------------|-------------|-------------------|
| Hiding textarea when attachment is in Ready mode | Breaks Principle 1 — user can't add context | Textarea always visible in Ready mode |
| Confirmation dialog before submit | Breaks Principle 2 — we trust the model | Just submit. No preview, no confirmation. |
| Silently clearing one attachment when another is added | Undisclosed mutual exclusivity causes data loss | Allow coexistence. Model resolves conflicts. |
| Custom interaction patterns for standard actions | 5 types × 5 patterns = cognitive overload | Use PreparingShell and AttachmentChip consistently |
| No starter text or placeholder on attachment confirm | User doesn't know what to do next | Always populate starter text per the table in PRD R2 |
| Exact-match-only search | Users don't know exact names | Support partial/fuzzy matching |
| Dense single-view config for complex types | Overwhelming, high error rate | Break into steps with clear progression |
| Generated content bloating the user message | Expert perspectives, theme details overwhelming history | Keep message display compact. Pass rich context to model separately. |
| Missing description in attachment menu | Users don't know when/why to use a type | Every menu item needs icon + label + description |
| No error state on chips | Invalid attachments silently fail | Use AttachmentChip `error` prop for inline warnings |

---

## Message Part Contract

When attachments are submitted, they become typed message parts:

```typescript
// Frontend serialization
{ type: "data-{type}-add", data: { ...typePayload } }

// Backend validation
queryBuilderDataSchemas["{type}-add"] // Zod schema

// LLM conversion
convertDataPart(part) → { type: "text", text: "[Context: ...]" }
```

**Rules:**
- Text always precedes attachment context in the message
- Attachments appear in deterministic order
- Keep structured data in parts for UI; convert to text for LLM
- Zod schemas validate on the backend — don't skip validation

---

## Testing Checklist

When touching attachment code, verify:

1. **Lifecycle**: Menu → Preparing → Ready → Submit → History (full round-trip)
2. **Cancel**: Close in Preparing restores previous state exactly
3. **Starter text**: Populates on confirm, updates on add/remove, preserves user edits
4. **Mixed types**: Adding a second type clears starter text, uses generic placeholder
5. **Submit states**: Disabled during Preparing, enabled when text OR attachments present
6. **History**: Submitted message shows text + read-only chips (same visual as Ready)
7. **Feature flags**: Type hidden when flag is off, no errors or broken state
8. **Error states**: Invalid attachment shows inline error, doesn't block submit
9. **Keyboard**: Arrow keys, Enter, Escape work in search/select flows
10. **Responsiveness**: Chip interactions feel immediate (<100ms feedback)
