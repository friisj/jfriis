---
name: chat-attachments
description: Chat attachment architecture and UX patterns. Use when adding, modifying, or debugging chat attachments — the structured data parts users attach to messages in the edit chat.
user-invocable: true
---

## Architecture

Attachments are structured data, not file uploads. Each attachment has three representations:

1. **Data part** — JSON stored in `index_messages.content.parts[]` alongside text parts
2. **Display** — read-only chip or card rendered in chat history via `renderMessagePart()`
3. **Agent context** — text block injected into the LLM prompt via `convertDataPartToText()`

The agent context is the most important layer. It carries the full structured data plus behavioral instructions that tell the model what to do with the attachment. A ticker chip becomes `[Tickers: AAPL (Apple Inc.)]`. An expert chip becomes a multi-paragraph prompt with the expert's perspective, recent posts, and step-by-step instructions.

## UX principles

These principles govern all attachment design decisions. Violating them creates UX debt.

1. **Attachments annotate, they don't replace.** Text and attachments are peers — either can be submitted alone, both work together. Never design an attachment that makes text feel unnecessary.
2. **Trust the model.** The model infers intent from the attachment's agent context and decides which tool to call. No confirmation dialogs, no action previews before submit. The model resolves conflicts between text and attachment intent.
3. **Unstructured is valid.** Natural language ("add AAPL") is first-class. Attachments are a structured shortcut, never a requirement. Never interrupt flow to suggest using an attachment instead of text.
4. **Two modes: Preparing → Ready.** Users always know which state they're in. Preparing replaces the textarea with configuration UI. Ready shows compact chips above the textarea. Transition requires explicit user action.
5. **Phased complexity.** Complex configuration breaks into discrete steps. One thing at a time. Multi-step flows show clear progression ("Step x of y") and support back navigation.
6. **Standardized controls.** All types use `AttachmentShell` (PreparingShell) and `AttachmentChip`. No per-type inventions for search, select, close, back, or done interactions.
7. **Visible intent.** The attachment type informs default message framing via starter text. History shows what the user meant. The user can always edit before sending.
8. **Literal icons, short descriptions.** Menu items show an icon for what the attachment is and a description for when to use it. Recognition over recall.
9. **Errors inline, not blocking.** Problems surface on the affected chip via the `error` prop. Submit remains available. Never silently remove or block for recoverable issues.
10. **Discoverable, not interruptive.** Features are visible and labeled. Never interrupt user flow with suggestions or modals.

## Two-mode architecture

Attachments exist in distinct states with different UI treatments:

| State | UI treatment | Textarea |
|-------|-------------|----------|
| **Preparing** | Config UI (InputCard inside `AttachmentShell`) | Hidden — Preparing replaces it |
| **Ready** | Compact chips (`AttachmentChip`) | Visible — chips sit above it |
| **Submitted** | Read-only chips in message history | N/A |

**Preparing replaces the textarea.** This is a hard constraint — when a card is open, the user cannot type a message. This focuses attention on the configuration task and conserves space.

**AttachmentShell** (`attachments/shared/AttachmentShell.tsx`) is the mandatory wrapper for all Preparing UIs. It provides:
- Title bar: icon + type label + close button (or back button for multi-step)
- Content area: type-specific UI
- Action bar (optional): only for complex types that need explicit confirmation

### Simple vs complex types

This is the key design decision for any new attachment type:

| Classification | Types | Selection model | Preparing → Ready |
|---------------|-------|----------------|-------------------|
| **Simple** | Ticker, Expert, Index | Single-select per flow | Auto-close on selection |
| **Complex** | Theme, Deep Research | Multi-step or config | Explicit Done/confirm |

**Simple types** auto-close Preparing as soon as the user selects an item. Users repeat the flow to add more (open menu again, select next item). This reduces cognitive load — no "Done" step for straightforward picks.

**Complex types** require an explicit confirm action because the user needs to review or configure before committing (editing sub-themes, setting research parameters).

**Cardinality:** all types use single-select per flow. Deep Research is capped at one per message. Other types allow multiples — user repeats the flow.

**No mutual exclusivity.** Allow all attachment type combinations. The model resolves conflicts (principle 2).

### Returning to edit

- **Theme**: click chip → opens unified edit panel (same format as manual creation)
- **Ticker, Expert, Index**: use [+] menu to add more; remove via [x] on chip
- **Deep Research**: config button in Ready mode reopens config modal

## Starter text design

Starter text auto-fills the prompt when attachments are added, making the attachment self-sufficient if the user sends without typing.

**Rules:**
- Each type defines singular and plural variants ("Add this ticker" / "Add these tickers")
- Text syncs automatically when attachments are added or removed
- User-edited text (anything not matching a known starter) is NEVER overwritten
- Mixed attachment types (e.g., ticker + theme) → clear starter text, show generic placeholder ("Add context to your message...")

**Detection:** `isStarterText(text)` checks if input exactly matches any singular/plural starter. Anything else is considered user-edited and preserved across attachment changes.

## Data part convention

Type format: `data-{name}-add` (e.g., `data-ticker-add`, `data-expert-add`).

The type key minus the `data-` prefix must match the schema key in `data-schemas.ts`:

```
data part type:  "data-ticker-add"
schema key:      "ticker-add"
```

## File structure per attachment type

```
attachments/{name}/
├── index.ts              # Barrel exports
├── {name}-types.ts       # TypeScript type + factory function
├── {name}-schema.ts      # Zod schema (runtime validation + AI SDK dataSchemas)
├── {Name}InputCard.tsx   # Composing UI (opened from attachment menu)
├── {Name}Display.tsx     # Read-only display in message history
└── {Name}AttachmentChip.tsx  # Shared chip used by both InputCard and Display
```

## Integration points (checklist for new types)

Adding a new attachment type touches these files in order:

1. **Type + schema** — `attachments/{name}/{name}-types.ts` and `{name}-schema.ts`
2. **InputCard** — composing UI in `attachments/{name}/`, wrapped in `AttachmentShell`
3. **Display** — read-only UI in `attachments/{name}/`, using `AttachmentChip`
4. **Barrel** — `attachments/{name}/index.ts` and `attachments/index.ts`
5. **Schema registry** — `src/app/api/edit/chat/data-schemas.ts` (add schema key)
6. **State hook** — `src/components/edit/prompt-input-control-cluster/use-prompt-input-attachments.ts` (add state + actions)
7. **Card handlers** — `use-card-handlers.ts` (open/close/add/remove handlers)
8. **Menu item** — `use-attachment-menu-items.tsx` (add to dropdown with icon + description)
9. **Feature flag** — `use-attachment-feature-flags.ts` (gate behind PostHog flag `chat-attachment-{name}`)
10. **Message parts** — `src/app/edit/buildMessageParts.ts` (serialize to data part)
11. **Render** — `src/components/query-builder/chat-message/render-helpers.tsx` (display in history)
12. **LLM conversion** — `src/app/api/edit/chat/message-converters.ts` (text for agent)
13. **Start page** — `src/app/edit/GAContent.tsx` (hasAttachments check + prompt generation — easy to miss)
14. **Starter text** — `starter-text.ts` (singular + plural variants, placeholder text)

## LLM conversion pattern

Every attachment MUST have a `convertDataPartToText` case in `message-converters.ts`. This is how the model understands the attachment — and it's where "trust the model" (principle 2) is operationalized.

The agent context encodes **the intent the user expressed by choosing that attachment type**. An expert attachment doesn't just pass expert data — it encodes "build an index inspired by this perspective" because that's the intent of attaching an expert. The model needs enough context to act autonomously without asking clarifying questions.

**Design the conversion by asking:** if a user attaches this with no text, what should the model do? The answer belongs in the agent context.

Rules:
- Wrap in a bracketed label: `[Tickers: AAPL (Apple Inc.)]`
- Include ALL semantically meaningful data (sub-themes, expert posts, perspective quotes)
- Include behavioral instructions that encode the implied action (expert → "Search for recent statements... Propose theme expressions...", marketplace asset → "Use: index(\"Name\")")
- Scale instructions to autonomy granted: tickers are data (1 line), experts are intent (20+ lines with RECOMMENDED NEXT STEPS and DO NOT blocks)
- Return `{ type: "text", text: "..." }` — the AI SDK substitutes this for the data part in model messages

## Display patterns

All display components render as `AttachmentChip` (shared pill component) except Theme which renders as a collapsible `Card` with `ToolHeader`.

### Chip content hierarchy

The chip is deliberately minimal. Users see a compact pill; the model sees the full context. Follow this hierarchy:

- `primary` — the identifier you'd say aloud: ticker symbol, expert name, index name
- `secondary` — one contextual detail, not all of them: first topic (not all topics), issuer (not description)
- `tooltip` — the richer thing you'd want on hover: full company name, description, perspective quote

**Same chip in Ready and Submitted.** The only difference is Ready has `onRemove`; Submitted omits it. Visual consistency between composing and history (principle 6).

### Error display

When an attachment has a validation issue, set the `error` prop on `AttachmentChip`:
- Warning icon replaces normal icon
- Destructive color styling
- Error message shown in tooltip
- Submit remains available — errors are informational, not blocking (principle 9)

## InputCard UX patterns

Cards open in place of the prompt input via `AttachmentShell`. Deciding which pattern to use:

| Classification | Pattern | Used by | Preparing → Ready |
|---------------|---------|---------|-------------------|
| Simple | Search → select → auto-close | Ticker, Expert, Index | Selection triggers close |
| Complex | Multi-step wizard or config | Theme, Deep Research | Explicit Done/confirm |

**Choose simple** when selection is unambiguous (picking a known item from a list).
**Choose complex** when the user needs to configure, review, or build something before committing.

Simple types may include a detail view before selection (Expert, Index) when the item is complex enough that users need context for an informed choice. The detail view still auto-closes on the confirm button — it doesn't make the type "complex."

**Dual selection paths** (Index): quick-add [+] on list row for fast selection, or click row → detail view for informed selection. Two paths serve different user needs.

## Common pitfalls

- **Missing start page handler** — `GAContent.tsx` has its own `handleSubmit` that runs before the chat route. If you don't update `hasAttachments` and prompt generation there, submitting an attachment-only message from `/edit` silently fails.
- **Skipping AttachmentShell** — all Preparing UIs must use `AttachmentShell`. Building custom card chrome violates principle 6 and breaks keyboard/close behavior.
- **Sparse agent context** — if a user attaches something with no text and the model asks a clarifying question, the agent context is too thin. Design it to be self-sufficient.
- **Overstuffed chips** — chips show one secondary detail, not all. Multiple topic tags, full descriptions, or multi-line content don't belong in a chip.
- **Blocking on errors** — errors display inline on the chip. Never disable submit or show a blocking dialog for attachment validation issues.
- **Backward compatibility** — existing messages may have the old single-item format (`{ theme: {...} }`) vs the current array format (`{ themes: [...] }`). All `convertDataPartToText` and `renderMessagePart` cases handle both.
- **Feature flag gating** — all attachment types are behind PostHog flags (`chat-attachment-{name}`). The flag must be enabled before the menu item appears.
- **Deduplication** — `use-prompt-input-attachments.ts` deduplicates by a unique key per type (tilt_asset_id for tickers, id for themes/experts, uuid for marketplace assets). Deep research is a single slot, not an array.

## Key files reference

- Attachment components: `apps/web/src/components/edit/attachments/`
- Shared shell: `attachments/shared/AttachmentShell.tsx`
- Shared chip: `attachments/shared/AttachmentChip.tsx`
- State management: `src/components/edit/prompt-input-control-cluster/use-prompt-input-attachments.ts`
- Card handlers: `src/components/edit/prompt-input-control-cluster/use-card-handlers.ts`
- Menu items: `src/components/edit/prompt-input-control-cluster/use-attachment-menu-items.tsx`
- Starter text: `src/components/edit/prompt-input-control-cluster/starter-text.ts`
- Message building: `src/app/edit/buildMessageParts.ts`
- LLM conversion: `src/app/api/edit/chat/message-converters.ts`
- Schema registry: `src/app/api/edit/chat/data-schemas.ts`
- Chat history rendering: `src/components/query-builder/chat-message/render-helpers.tsx`
- Start page: `src/app/edit/GAContent.tsx`
- UX principles: `docs/specs/attachment-skill/` (design-target and principles specs)
- README: `apps/web/src/components/edit/attachments/README.md`
