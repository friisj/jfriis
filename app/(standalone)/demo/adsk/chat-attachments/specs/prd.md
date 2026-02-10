# Chat Attachments — Product Requirements Document

## Overview

Chat attachments allow users to add structured context to messages. Users annotate their input by pinning specific context (tickers, themes, experts, indices, research configs) for the AI to reference. The model infers appropriate actions from the structured context combined with user text.

**Core principle**: Attachments enrich user input; the model decides what to do. Unstructured natural language remains fully supported — attachments offer precision, speed, discoverability, and reliability for users who want them.

---

## Problem Statement

The attachment system's foundations are sound (feature flags, state management, message parts), but the UX is inconsistent across 5 types, creating unnecessary cognitive load.

**Key issues** (see [critique.md](./critique.md), [feedback.md](./feedback.md)):
- No expectation management on submit
- Inconsistent message (if no user message) in message history
- Discoverability gaps
- Inconsistent interaction patterns, affordances, and visual language
- Type-specific complexity (Theme, Deep Research)

**Biggest opportunity**: Normalize and upgrade the basic flow, interactions, and affordances. Fix shared patterns before tackling type-specific complexity.

---

## Goals

1. Establish consistent attachment UX foundation across all types
2. Make message composition (text + attachments) clear
3. Standardize visual language and interaction patterns
4. Reduce cognitive load through predictable behaviors

**Non-goals**:
- Addressing discoverability of attachment feature
- New attachment types
- Deep Research config redesign (separate project)
- Persistence/templates (future phase)
- Backend API changes (frontend focus; backend recommendations acceptable)

---

## User Mental Model

### Annotation Mode
Users can think of attachments as highlighting/pinning context for the AI to notice. They are not switching into a "query builder" mode — attachments feel like a natural extension of their messages in the chat UI.

### Model Inference
The model infers the appropriate tool from the attachment type:
- Ticker → add stock context
- Theme → add theme / create theme
- Expert → use expert data for exploration
- Index → add as rule parameter
- Deep Research → trigger research run

**Text always provides intent**. If user attaches a ticker but types "remove this from my index," the model uses judgment to interpret combined intent. No preview or confirmation needed — trust the model.

### Structured vs. Unstructured
Users who don't know about attachments can accomplish the same things via natural language ("add AAPL to my index"). Attachments are an optional structured layer for users who want precision. This is a feature, not a limitation.

---

## Requirements

### R1: Message Composition

R1.1: UI should communicate that attachments augment text input (not replace it).
R1.2: Submit MUST be enabled when text OR attachment is present (Ready mode).
R1.3: Submit MUST be disabled during Preparing mode and when both text and attachments are empty.
R1.4: Text input should be restored with pre-populated starter text when attachment is confirmed (Ready mode).
R1.5: UI should not show preview or confirmation of what LLM will receive — trust the model.

### R2: Starter Text

R2.1: Text input MUST be pre-populated with starter text when attachment enters Ready mode.
R2.2: Starter text MUST use singular/plural form based on attachment count.
R2.3: Pre-populated starter text MUST be editable — user can modify, extend, or delete.
R2.4: Placeholder text MUST update based on active attachment type and count.
R2.5: When multiple attachment types are mixed, starter text MUST be cleared and placeholder MUST use generic prompt.
R2.6: Starter text MUST update when attachments are added OR removed.
R2.7: Starter text MUST NOT overwrite user-edited text (text that differs from any starter text).

| Type | Count | Starter Text | Placeholder |
|------|-------|--------------|-------------|
| Ticker | 1 | "Add this ticker" | "Ask about this ticker..." |
| Ticker | 2+ | "Add these tickers" | "Ask about these tickers..." |
| Theme | 1 | "Use this theme" | "Ask about this theme..." |
| Theme | 2+ | "Use these themes" | "Ask about these themes..." |
| Expert | 1 | "Use this expert" | "Ask with this perspective..." |
| Expert | 2+ | "Use these experts" | "Ask with these perspectives..." |
| Index | 1 | "Use this index" | "Ask about this index..." |
| Index | 2+ | "Use these indices" | "Ask about these indices..." |
| Deep Research | — | "Start a deep research run" | "What should we research?" |
| *(Mixed types)* | — | *(none)* | "Add context to your message..." |

### R3: Attachment Lifecycle

R3.1: Preparing mode MUST replace textarea with attachment configuration UI.
R3.2: Simple types (Ticker, Expert, Index) MUST use single-select with auto-close — selection immediately transitions to Ready mode.
R3.3: Complex types (Theme, Deep Research) MUST require explicit confirmation action to transition to Ready mode.
R3.4: Ready mode MUST show compact attachment below textarea, above control bar.
R3.5: Theme attachments MUST be editable by clicking compact chip to return to edit mode. Edit mode MUST show unified panel (title, thesis, sub-themes) regardless of original creation method. Remove MUST be available in edit mode via explicit Remove button.
R3.6: Ticker, Expert, and Index attachments MUST be removable in Ready mode via remove control. User adds more by repeating the flow via [+] menu.
R3.7: Deep Research attachment MUST show config button and remove control in Ready mode.
R3.8: Close action in Preparing mode MUST cancel and restore previous state.
R3.9: Complex attachments (Theme, Deep Research) MUST use stepped flows within Preparing mode.
R3.10: Attachments in message history MUST be read-only, using same chip components as Ready mode.

### R4: Visual Consistency

R4.1: All attachment types MUST share common sub-components for:
- Shell/frame (PreparingShell)
- Title bar with type label and icon
- Close/cancel button
- Search input (where applicable)
- Selection list (where applicable)
- Back navigation (for multi-step flows)
- Confirm/done action (complex types only)

R4.2: Visual weight MUST be contextual:
- Simple attachments (ticker chip) → subtle/compact
- Complex attachments (theme card) → more prominent

R4.3: Icons MUST be literal/representational for immediate recognition.
R4.4: Position below user message textarea MUST be consistent signal for "this is an attachment."

### R5: Cardinality

R5.1: Tickers MUST use single-select per Preparing flow with auto-close. Multiple tickers MAY be attached by repeating the flow.
R5.2: Experts MUST use single-select per Preparing flow with auto-close. Multiple experts MAY be attached by repeating the flow.
R5.3: Themes MUST be added one at a time (single theme per Preparing flow), but multiple themes MAY be attached to a message by repeating the flow.
R5.4: Index MUST be single selection per flow with auto-close. Multiple indices MAY be attached by repeating the flow.
R5.5: Deep Research is an option with default or custom configuration options (no item selection).

### R6: Error Handling

R6.1: Invalid attachments (e.g., ticker not found) MUST show inline error state.
R6.2: User MUST be able to fix or remove errored attachments.
R6.3: Errored attachments SHOULD NOT block submit (warn but allow).

### R7: Discoverability

R7.1: Attachment menu MUST include short description under each type label.
R7.2: Users should see contextual tooltip explaining [+] button when control is hovered.
R7.3: Empty chat state MAY suggest "Try attaching context..." prompt.
R7.4: Feature announcements MAY introduce attachments to existing users.
R7.5: User flow should not be interrupted with proactive suggestions.

### R8: Mutual Exclusivity

R8.1: Theme and Deep Research MAY be attached together (defer troubleshooting related potential conflicts).
R8.2: Model MUST resolve any conflicts between attachment types.
R8.3: UI MUST NOT enforce mutual exclusivity constraints.

---

## Type-Specific Requirements

### Ticker

T1.1: Display MUST show symbol + company name.
T1.2: Display MUST include link to stock detail page.
T1.3: Search MUST support partial/fuzzy matching.

### Theme

TH1.1: Flow MUST support two creation paths: AI-generated sketches OR manual entry.
TH1.2: AI path MUST use two phases: Define → Select. Each phase MUST have clear completion state.
TH1.3: Manual path MUST allow user to create theme with title, thesis, and sub-themes (each with title and thesis).
TH1.4: Confirmed theme MUST collapse to compact chip with theme name and sub-theme count.
TH1.5: Clicking theme chip in Ready mode MUST return to unified edit panel.
TH1.6: Edit panel MUST use same format for both manual and AI-generated themes (title, thesis, sub-themes).
TH1.7: Edit mode MUST include Remove button to discard theme.
TH1.8: AI-generated themes MUST be converted to editable format (sub-theme titles preserved, thesis fields empty).

### Expert

E1.1: Display MUST show expert name and primary topic.
E1.2: Search MUST be unified — single search input returns both matching topics AND matching experts.
E1.3: Search results MUST be grouped by type (Topics section, Experts section).
E1.4: Browse view MUST show topics with expert counts; clicking topic drills into topic detail view.
E1.5: Expert detail view MUST show: name, bio, quote, authority/influence/overall scores with ranks, and topic pills.
E1.6: Expert detail view MUST include "Select Expert" button to confirm selection.
E1.7: Selected expert MUST be removable in Ready mode via remove control.

### Index

I1.1: Selection MUST include marketplace indices.
I1.2: Selection MUST include user's own created indices.
I1.3: List view should support search AND filters (All, My Indices, Thematic, Sector, Strategy, Geographic). Filters may be deferred if implementation is blocked. Opportunities for more sophisticated, contextual filters based on current tilt may be explored in the future.
I1.4: List items MUST show: name, publisher, category badge, YTD performance with color coding (green positive, red negative).
I1.5: List items MUST have quick-add button ([+]) for immediate selection.
I1.6: Clicking list item (not quick-add) MUST open index detail view.
I1.7: Detail view MUST show: name with external link, YTD performance with sparkline, description, publisher, category, inception date, creator.
I1.8: Detail view MUST include "Select Index" button to confirm selection.
I1.9: Selected index MUST be removable in Ready mode via remove control on index chip.

### Deep Research

DR1.1: Attachment MUST show configuration state (default vs. custom).
DR1.2: Configuration modal UX improvements are OUT OF SCOPE (separate project).
DR1.3: Confirmed config MUST collapse to summary representation on deep research detail (Prepare mode).
DR1.4: All 6 config sections remain available (user opted in to configure).

---

## Design Specifications

See [design-target.md](./design-target.md) for technical architecture, wireframes, and component specifications.

Key concepts:

- **Preparing mode**: Attachment config UI replaces textarea; simple types auto-close on selection
- **Ready mode**: Textarea visible with compact attachments below, starter text with singular/plural
- **Shared shell**: All types use PreparingShell (title bar, content area, optional action bar)
- **Compact representations**: AttachmentChip component for all types (same in Ready and message history)
- **Detail views**: Expert and Index have detail panels with rich information before selection. Ticker detail may be added in the future. Ticker detail option was tabled in favour of simplified UX. Simplification is based on assumption that supplementary tickers are already known to user and user may chat with agent to learn more about specific securities.

---

## Non-Functional Requirements

N1: Attachment chip interactions SHOULD feel responsive (<100ms feedback).
N2: Attachment data SHOULD be minimal to avoid crowding UI. For types like themes, additional context may be passed to model beyond what's visible to user in attachment chips.
N3: Theme sketch generation SHOULD complete in less than 5 seconds.
N4: Attachment state SHOULD persist across component re-renders.

---

## Acceptance Criteria

A1: User can add tickers one at a time (each selection auto-closes), see compact chips in Ready mode, and remove individually.
A2: User can attach a theme via AI-generated or manual flow, see compact chip with sub-theme count, and edit by clicking chip.
A3: User can configure deep research and see summary representation.
A4: User can search experts and topics together, view expert detail with scores, and select (auto-closes).
A5: User can browse indices with filters, view detail with YTD performance, and select (auto-closes).
A6: Attachment menu shows types with descriptions, only enabled flags visible.
A7: Preparing mode replaces textarea; Ready mode shows textarea with attachments below.
A8: Submitted messages display user text + read-only attachment chips (same style as Ready mode).
A9: Submit is disabled when both text and attachments are empty.
A10: Starter text uses singular/plural based on count and is fully editable.
A11: Starter text updates on add/remove but preserves user-edited text.
A12: No preview/confirmation dialog shown before submit.

---

## Open Questions

Q1: Can attachment selections in chat panel's PromptInput persist if user navigates away and returns?
Q2: What analytics events should track attachment usage patterns?
Q3: What are the specific hard limits per attachment type? (referenced by R5.6)

---

## References

- [principles.md](./principles.md) — UX principles (read first)
- [design-target.md](./design-target.md) — Target technical architecture
- [design-current.md](./design-current.md) — Current implementation reference
- [critique.md](./critique.md) — UX critique and recommendations
- [feedback.md](./feedback.md) — FigJam sticky-note feedback
- [FigJam Board](https://www.figma.com/board/DQuIlB4boOyABiUAicAtUI/tilt-chat-attachments) — Visual artifacts
