---
name: studio-log
description: Draft a log entry from raw studio material — external insights, WIP observations, design patterns, engineering discoveries, or philosophical commentary. Produces elaborated, publishable-quality prose and links to relevant studio project(s). Use from studio project sessions or whenever raw material is worth turning into a real entry.
allowed-tools: Read, Bash, Glob, Grep, Task
argument-hint: [paste raw material, insights, or notes — optionally reference a studio project by slug]
---

# Studio Log Draft

You are translating raw studio material into a publishable-quality log entry draft. Unlike idea-capture (which is fast and minimal), this skill produces **elaborated prose** — the kind of entry that could appear on jonfriis.com after light editing.

## Input

The user has provided: `$ARGUMENTS`

This may be:
- External insights from the world (articles, conversations, observations) as they relate to a studio project
- WIP notes from active development — design decisions, engineering patterns, discoveries
- Loose observations that could seed or inform a studio project
- Philosophical, social, or technology commentary rooted in studio work

The user may reference a studio project by slug or name (e.g., "re: chalk", "for the putt project", "chalk:").

---

## Procedure

### Step 1: Detect Studio Project Reference

Scan `$ARGUMENTS` for a studio project slug or name:
- Explicit slug prefix (e.g., "chalk:", "putt —")
- Natural reference (e.g., "the chalk project", "working on cognitron")
- Slug that matches a known project pattern (`[a-z0-9-]+`)

If a slug or name is found, query for the project:

```bash
scripts/sb query studio_projects "slug=eq.<detected-slug>"
```

If only a name is found and no exact slug match is clear, query without filters and scan names for a match:

```bash
scripts/sb query studio_projects "select=id,slug,name,description,problem_statement,current_focus,hypothesis"
```

Save: `id`, `name`, `description`, `problem_statement`, `current_focus`, `hypothesis`.

If no project is mentioned, proceed without linking. Do not ask.

### Step 2: Classify the Material

From the raw input, identify:

- **Subject**: The core insight or observation
- **Angle**: The lens through which it's told
  - `design` — visual, UX, interaction, or systems design patterns
  - `engineering` — code architecture, technical patterns, implementation discoveries
  - `user-insight` — novel observations about users, customers, or behavior
  - `philosophy` — conceptual, theoretical, or paradigm-level thinking
  - `commentary` — social, technology, or industry observation with a perspective

Use the angle to inform the prose texture and tags. A single entry typically has one dominant angle, occasionally two.

### Step 3: Draft the Log Entry

Draft a **full, elaborated log entry** in markdown. This is the core of the skill — produce actual prose, not a stub or bullet list.

**Quality standards:**

- **Voice**: First-person, direct, intellectually honest. Not academic — conversational but substantive.
- **Structure**: An opening that states the insight clearly, a body that develops it with specificity and examples, and a closing that points somewhere (a question, implication, or tension worth sitting with).
- **Length**: 200–600 words. Tight enough to be readable, long enough to be genuinely useful.
- **Grounded in the project**: Where a project is linked, reference its problem statement, hypothesis, or current focus concretely — not just as a tag.
- **Publishable**: Write as if this will be lightly edited and published. Not a note to self.

If the raw material is thin, extrapolate intelligently from the project context and make the inference explicit ("This suggests...").

Draft a title: concise, specific, not click-bait. Under 80 characters. Avoid "Thoughts on..." or "Reflections about..." patterns.

### Step 4: Create the Log Entry

```bash
scripts/sb create log_entries '{
  "title": "<drafted title>",
  "slug": "<kebab-case-title>",
  "content": {"markdown": "<full drafted prose>"},
  "entry_date": "<today YYYY-MM-DD>",
  "type": "research",
  "published": false,
  "is_private": true,
  "tags": ["studio", "<angle>", "<project-slug if applicable>"]
}'
```

Save the returned entry `id`.

**Slug conflicts**: If a duplicate key error occurs, append `-2` (or increment until unique).

### Step 5: Create the Log Entry Draft

Record this as a tracked first draft in `log_entry_drafts`:

```bash
scripts/sb create log_entry_drafts '{
  "log_entry_id": "<entry-id>",
  "content": "<full drafted prose>",
  "is_primary": true,
  "label": "initial-draft",
  "generation_instructions": "<first 500 chars of raw user input>",
  "generation_model": "claude-sonnet-4-6",
  "generation_mode": "rewrite"
}'
```

### Step 6: Link to Studio Project

If a project was identified in Step 1, create an entity link:

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

### Step 7: Confirmation

Print the full drafted entry so the user can evaluate it:

```
Log entry drafted: "<title>"
Type: research | Angle: <angle> | Tags: <tags>
Linked to: <project name> or "no project linked"
Edit: /admin/log/<id>/edit

---

<full drafted prose>

---
```

---

## Important Notes

- **Elaborate, don't summarize.** The output is a genuine draft, not a compressed capture. If the raw material is rough, the prose should be the upgrade.
- **Private by default.** `published: false`, `is_private: true`. Publishing is always a deliberate act.
- **Project context enriches the prose.** If a project is linked, use its `problem_statement`, `hypothesis`, and `current_focus` actively in the writing — not just as metadata.
- **Angle is texture, not taxonomy.** The angle (design / engineering / user-insight / philosophy / commentary) should be visible in how the entry is argued and structured, not just reflected in tags.
- **Subheadings only when earned.** If the entry is a single sustained argument, don't break it into sections. Only use `##` subheadings if the material genuinely has distinct components.
- **Don't conflate with idea-capture.** If the user's input is a quick capture of a not-yet-formed thought, suggest `/idea-capture` instead. Studio log is for material with enough substance to draft against.
- **If scripts/sb is unavailable**, output the full drafted prose to the user with a note, then provide the SQL INSERT statement for manual entry.
