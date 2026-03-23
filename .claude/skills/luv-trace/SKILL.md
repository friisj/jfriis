---
name: luv-trace
description: Retrieve Luv conversation traces — recent conversations, keyword search, or full trace by conversation/message ID. Use when the user shares a trace ID from Luv's chat UI or when you need to review what Luv discussed.
allowed-tools: Bash
argument-hint: [conversation-id | message-id | keyword | "today" | "recent"]
---

# Luv Trace Retrieval

Retrieve conversation traces from Luv's chat database. The user may share a conversation or message ID copied from Luv's chat UI, or ask you to search by keyword or timeframe.

## Input

The user has provided: `$ARGUMENTS`

This may be:
- **Empty or "recent"** → list the 10 most recent conversations
- **"today"** → conversations from today
- **A UUID** → could be a conversation ID or message ID — try both
- **A keyword** → full-text search across message content

---

## Procedure

### If empty, "recent", or "today"

List recent conversations:

```bash
# Recent conversations (default)
scripts/sb query luv_conversations "select=id,title,model,turn_count,created_at,updated_at&order=updated_at.desc&limit=10"

# Today's conversations
scripts/sb query luv_conversations "select=id,title,model,turn_count,created_at,updated_at&created_at=gte.$(date -u +%Y-%m-%dT00:00:00Z)&order=created_at.desc"
```

Present the list to the user with titles, dates, and turn counts.

### If a UUID

Try conversation first, then message:

```bash
# Try as conversation ID
scripts/sb get luv_conversations <uuid>
```

If found, load the full message trace:

```bash
# Get all messages in the conversation with full parts
scripts/sb query luv_messages "conversation_id=eq.<uuid>&select=id,role,content,parts,created_at&order=created_at.asc"
```

If not found as a conversation, try as a message ID:

```bash
# Try as message ID
scripts/sb get luv_messages <uuid>
```

If found, also load the parent conversation and surrounding messages for context:

```bash
scripts/sb get luv_conversations <conversation_id>
scripts/sb query luv_messages "conversation_id=eq.<conversation_id>&select=id,role,content,parts,created_at&order=created_at.asc"
```

### If a keyword

Search message content:

```bash
scripts/sb query luv_messages "content=ilike.*<keyword>*&select=id,conversation_id,role,content,created_at&order=created_at.desc&limit=20"
```

Then load the parent conversations for context:

```bash
# For each unique conversation_id found
scripts/sb get luv_conversations <conversation_id>
```

---

## Output Format

### For conversation listings

Present as a table:
- Title (truncated)
- Model used
- Turn count
- Date
- Conversation ID (for copy/reference)

### For full traces

Present the trace as a structured timeline:
1. **Conversation metadata**: title, model, turn count, created/updated
2. **Messages in order**, for each message:
   - Role (user/assistant)
   - Text content (summarized if long)
   - **Tool calls** with tool name, inputs (summarized), and outputs (summarized)
   - **Reasoning** content if present (summarized)
   - Message ID
   - Timestamp

Focus on making tool calls and reasoning visible — these are the trace elements the user cares about for engineering follow-up.

### For keyword search

Group results by conversation, showing:
- Conversation title and date
- Matching message snippets with context
- Conversation ID for deeper retrieval

---

## Notes

- The `parts` column is JSONB containing structured message parts (text, tool calls with inputs/outputs, reasoning)
- Tool call parts have type `tool-{name}`, with `input` and `output` fields
- Reasoning parts have type `reasoning` with a `text` or `reasoning` field
- Message IDs are UUIDs — the chat UI lets users right-click to copy these
- Conversation IDs are also UUIDs — available from the dots menu in chat
