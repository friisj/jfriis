---
name: idea-capture
description: Quickly capture a new idea as a log entry with type='idea'. Optimized for speed — capture first, elaborate later. Use from any context when an idea strikes.
allowed-tools: Read, Bash, Glob, Grep, Task
argument-hint: [idea title or description]
---

# Idea Capture

You are capturing a new idea for the user. This should be **fast** — the goal is to get the idea recorded before it's lost. Elaboration happens later.

## Input

The user has provided: `$ARGUMENTS`

This may be:
- A short title (e.g., "audio visualizer for studio")
- A longer description (e.g., "what if we built a tool that converts design tokens to CSS custom properties with live preview")
- A question-shaped idea (e.g., "could entity_links support weighted relationships?")

## Procedure

### Step 1: Parse the Input

From the input, derive:
- **title**: A concise, descriptive title (< 80 chars). If the input is already short, use it as-is.
- **slug**: kebab-case version of the title
- **description**: If the input is longer than a title, use the full text as the content body. If it's short, the content can be minimal.
- **tags**: Infer 1-3 relevant tags from the content (e.g., "studio", "tooling", "design-system", "infrastructure")

Do NOT ask clarifying questions unless the input is truly unintelligible. Default to capturing what was given.

### Step 2: Create the Log Entry

```bash
scripts/sb create log_entries '{
  "title": "<title>",
  "slug": "<slug>",
  "content": {"markdown": "<description or empty string>"},
  "entry_date": "<today YYYY-MM-DD>",
  "type": "idea",
  "idea_stage": "captured",
  "published": false,
  "is_private": true,
  "tags": ["<tag1>", "<tag2>"]
}'
```

**Important**: If the slug already exists (duplicate key error), append a numeric suffix (e.g., `audio-visualizer-2`).

Save the returned entry `id`. Check whether `_queued` is `true` in the response — this means Supabase was unreachable (sandbox proxy) and the operation was queued to `.local/sb-queue.jsonl` for later sync.

### Step 3: Optional — Link to Context

If the user is currently working in a studio project context (check for recent mentions of studio projects or check the current working directory for `/docs/studio/<project>/`):

1. Ask briefly: "Link this to [project name]?"
2. If yes, create an entity link:

```bash
scripts/sb create entity_links '{
  "source_type": "log_entry",
  "source_id": "<entry-id>",
  "target_type": "studio_project",
  "target_id": "<project-id>",
  "link_type": "related",
  "metadata": {}
}'
```

If no obvious context, skip this step entirely. Speed is more important than completeness.

### Step 4: Confirmation

If the response has `_queued: true` (offline/sandbox):

```
Idea queued: "<title>"
Stage: captured | Tags: <tags>
Status: queued — run `scripts/sb sync` locally to push to DB
```

If the response was live (normal):

```
Idea captured: "<title>"
Stage: captured | Tags: <tags>
View: /admin/ideas
Edit: /admin/log/<id>/edit
```

That's it. Do not offer to elaborate, create studio projects, or do anything else unless the user asks.

---

## Important Notes

- **Speed over completeness.** The whole point is frictionless capture. Don't over-think the title or tags.
- **Private by default.** All ideas start as `is_private: true` and `published: false`.
- **Stage is always 'captured'.** Progression happens later in the /admin/ideas UI.
- **Don't create drafts.** The initial content is stored directly in the log entry content field.
- **Don't conflate with studio-log.** If the user's input has enough substance to argue from — an articulated insight, a pattern with examples, a commentary with a point of view — suggest `/studio-log` instead. Idea capture is for seeds; studio-log is for material ready to become prose.
- **If scripts/sb is unavailable** (missing, `.env.local` absent, etc.), inform the user and provide the SQL INSERT statement they can run manually. This is different from the offline/proxy case — when Supabase is blocked by a sandbox proxy, `scripts/sb` handles it automatically by queuing to `.local/sb-queue.jsonl`.
