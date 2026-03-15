# Luv Chat Context Features — Implementation Plan

Three phases addressing conversation lifecycle management: agent scanning of past conversations, user visibility into context pressure, and agent-assisted compaction + branching.

Branch: `claude/luv-chat-context-features-CfKlN`

---

## Current State

- `luv_conversations` + `luv_messages` tables store all sessions
- Chat auto-saves after each exchange via `use-luv-chat-session.ts`
- `turnCount` already computed in `/api/luv/chat/route.ts` and injected into system prompt via `processState`
- `getLuvConversationsServer()` + `getLuvMessagesServer()` already exist in `lib/luv-server.ts`
- No agent tools for reading past conversations
- No user-visible context pressure indicator
- No compaction or branching capability

---

## Phase 1 — Agent Conversation Scanning

**Goal:** Give the agent tools to scan and read saved conversations, enabling cross-session continuity reasoning.

### What to build

Two new tools added to `lib/luv-tools.ts`, registered in the `luvTools` export:

**`list_conversations`**
- Calls existing `getLuvConversationsServer()`
- Returns: `id`, `title`, `model`, `created_at`, `updated_at`, `is_compacted` (once Phase 3 lands), `message_count` (approximated via message query with `.count()`)
- Optional `limit` param (default 20) to avoid bloating context
- Use case: agent surveys recent sessions to understand what has already been explored

**`read_conversation`**
- Takes `conversationId` + optional `messageLimit` (default 40, max 100)
- Calls `getLuvConversationServer()` + `getLuvMessagesServer()`
- When truncating (message count > limit), returns the most recent messages with a `truncated: true` flag and `total_messages` count — recency is most material
- Returns conversation metadata + formatted message array `[{role, content}]`
- Use case: agent reads a specific past conversation to extract context, decisions, or established facts

### Files changed

- `lib/luv-tools.ts` — add `listConversations`, `readConversation` tools; register in `luvTools`

### Commits

1. `feat: add list_conversations and read_conversation tools to luvTools`

---

## Phase 2 — Context Pressure Indicator

**Goal:** Make visible to the user when the active conversation is approaching the model's practical context limit.

### What to build

A lightweight estimate computed client-side from message content length. No API call needed.

**Pressure heuristic:**
- Sum character lengths of all messages in the current conversation
- Claude Sonnet practical limit: ~150k tokens ≈ ~600k characters for messages (system prompt occupies the rest)
- Pressure levels: `low` < 40%, `medium` 40–65%, `high` 65–85%, `critical` > 85%
- Pressure value exposed from `useLuvChatSession` as `contextPressure: { ratio: number; level: 'low' | 'medium' | 'high' | 'critical' }`

**UI — `ContextPressureBar` in `chat-drawer.tsx`:**
- Shown only when level ≥ `medium`
- Thin bar (h-0.5) at the top of the input area, colored by level: amber at medium, orange at high, red at critical
- On hover or at `critical`: tooltip or inline label — e.g. `"~80% context used · consider compacting"` (Phase 3 compact button lands here too)
- Minimal visual footprint — doesn't clutter the input; just visible enough to prompt action

### Files changed

- `app/(private)/tools/luv/components/use-luv-chat-session.ts` — add `contextPressure` computed from `messages`
- `app/(private)/tools/luv/components/chat-drawer.tsx` — add `ContextPressureBar` component, shown at `medium`+

### Commits

2. `feat: add context pressure indicator to luv chat drawer`

---

## Phase 3 — Agent-Assisted Compaction + Branching

**Goal:** Let the user compact a conversation using the agent to identify what's salient, then branch into a new conversation seeded with that compact context.

### DB changes (migration first)

New columns on `luv_conversations`:
```sql
ALTER TABLE luv_conversations
  ADD COLUMN compact_summary  text,
  ADD COLUMN parent_conversation_id uuid REFERENCES luv_conversations(id),
  ADD COLUMN is_compacted     boolean NOT NULL DEFAULT false;
```

`compact_summary` stores a JSON string with structured agent output (see below). `parent_conversation_id` links a branch to its source. `is_compacted` flags the original conversation for UI treatment.

### Agent compaction design

Compaction is NOT a chat turn. It's a dedicated `generateObject` call (Vercel AI SDK structured output) to the model — separate from the chat route, invoked via a new API route `/api/luv/compact-conversation`.

**Request:** `POST { conversationId, modelKey? }`

**Route logic:**
1. Auth check
2. Load conversation + all messages from DB
3. Load soul data (for goal context — the agent knows what Luv is being built toward)
4. Call `generateObject` with Zod schema using `claude-opus` (or user-specified model):

```ts
schema: z.object({
  goals: z.array(z.string()).describe('Primary goals the user was pursuing in this conversation'),
  decisions: z.array(z.string()).describe('Key decisions or conclusions reached'),
  important_context: z.array(z.string()).describe('Facts established about Luv (chassis, soul, appearance, behavior) that should persist'),
  open_threads: z.array(z.string()).describe('Unresolved questions or work-in-progress items'),
  carry_forward_summary: z.string().describe('A 2–4 paragraph narrative summary of the conversation optimized as seed context for a continuation — written as if orienting a fresh session'),
})
```

**System prompt to agent:**
> You are analyzing a conversation between Jon (the user) and Luv (an AI character workbench) to produce a compact context summary. Your task is to identify what was most material to the goals being pursued. Focus on: what was being built or refined, what was decided, what facts about Luv were established or changed, and what remains open. The carry_forward_summary should read as context a fresh conversation would benefit from knowing — not a transcript summary, but a useful orientation.

5. Save `compact_summary = JSON.stringify(result)` + `is_compacted = true` to `luv_conversations`
6. Return the structured summary

### Branch design

**`POST /api/luv/branch-conversation` (or server action):**
1. Load source conversation (must have `compact_summary`)
2. Create new `luv_conversation` with:
   - `soul_snapshot` copied from source
   - `parent_conversation_id` = source ID
   - `compact_summary` = same compact summary (so the new conversation carries it as seed)
   - `title` = `"Branch: {source.title}"`
   - `model` = source model
3. Return new `conversationId`

### Seed context injection

The client needs to pass the compact summary to the chat API route when the active conversation has one.

**Flow:**
- `use-luv-chat-session.ts`: when loading a conversation (on `activeConversationId` change), check for `compact_summary` on the conversation record. Store it as `seedContext: string | null` in hook state.
- `DefaultChatTransport` body: add `seedContext` alongside `modelKey`, `pageContext`, `thinking`
- `/api/luv/chat/route.ts`: if `seedContext` is present, inject it into the system prompt as a dedicated section:

```
## Conversation Context (from prior session)

{carry_forward_summary}

Goals carried forward: ...
Open threads: ...
```

This section is placed after the soul/chassis section and before process protocols — it's authoritative context, not a chat message.

### UI changes

**`chat-drawer.tsx`:**
- Add "Compact conversation" menu item in the dots dropdown (visible when `messages.length > 20`)
- Loading state during compaction: spinner + "Analyzing conversation..." label
- After compaction: replace "Compact" with a summary card showing `goals` + `open_threads` (collapsed by default, expandable) and a "Branch to new conversation" button
- "Branch" button: calls branch API → on success calls `resumeConversation(newConvId)` + `handleClear()` — the new conversation loads with seed context injected

**`conversation-history.tsx`:**
- Show `COMPACTED` badge on compacted conversations
- Show `BRANCH` badge on conversations with `parent_conversation_id`
- Expand section shows `carry_forward_summary` preview when `compact_summary` present
- Branch button visible on any compacted conversation (not just the current one)

**`LuvConversation` type + `lib/luv.ts` + `lib/luv-server.ts`:**
- Extend `LuvConversation` with `compact_summary: string | null`, `parent_conversation_id: string | null`, `is_compacted: boolean`
- No new server functions needed beyond the API routes handling DB writes inline

### Files changed

- `supabase/migrations/<timestamp>_luv_conversation_compact_branch.sql`
- `lib/types/luv.ts` — extend `LuvConversation`
- `app/api/luv/compact-conversation/route.ts` — new route
- `app/api/luv/branch-conversation/route.ts` — new route
- `app/api/luv/chat/route.ts` — accept + inject `seedContext`
- `app/(private)/tools/luv/components/use-luv-chat-session.ts` — `seedContext` state, pass via transport
- `app/(private)/tools/luv/components/chat-drawer.tsx` — compact + branch UI
- `app/(private)/tools/luv/components/conversation-history.tsx` — badges + summary preview + branch button

### Commits

3. `feat: add compact_summary, parent_conversation_id, is_compacted to luv_conversations`
4. `feat: add /api/luv/compact-conversation — agent-driven conversation compaction`
5. `feat: add /api/luv/branch-conversation and seed context injection in chat route`
6. `feat: compact and branch UI in chat drawer and conversation history`

---

## Summary

| Phase | Commits | Net new files | DB changes |
|-------|---------|---------------|------------|
| 1 | 1 | 0 | none |
| 2 | 1 | 0 | none |
| 3 | 4 | 2 API routes + 1 migration | 3 columns on luv_conversations |

Total: 6 commits, 2 new API routes, 1 migration, changes to 7 existing files.
