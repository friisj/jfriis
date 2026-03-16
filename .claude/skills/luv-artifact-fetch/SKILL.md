---
name: luv-artifact-fetch
description: Fetch a Luv artifact by keyword or recency and load its content as session context. Optionally seed a requirements-driven session plan and/or translate into Linear issues via isq. Use when starting a Luv-related session or when an artifact should drive implementation.
allowed-tools: Bash, AskUserQuestion, TodoWrite
argument-hint: [optional keyword]
---

# Luv Artifact Fetch

You are loading a Luv artifact into the current Claude Code session as active context. The goal is to retrieve a specific document that Luv's agent has drafted, confirm the selection with the user, and make that content available as a foundation for planning, implementation, or issue creation.

## Input

The user has provided: `$ARGUMENTS`

This may be:
- **Empty** → fetch the 5 most recently updated non-archived artifacts for the user to choose from
- **A keyword** → search artifacts by title or tag match

---

## Procedure

### Step 1: Query Artifacts

**If keyword provided**, run both queries in parallel:

```bash
# Search by title (case-insensitive substring)
scripts/sb query luv_artifacts "title=ilike.*<keyword>*&status=neq.archived&order=updated_at.desc&limit=10"

# Search by tag membership
scripts/sb query luv_artifacts "tags=cs.{<keyword>}&status=neq.archived&order=updated_at.desc&limit=10"
```

Merge the two result arrays and deduplicate by `id`. Present up to 10 combined results.

**If no keyword:**

```bash
scripts/sb query luv_artifacts "status=neq.archived&order=updated_at.desc&limit=5"
```

If zero artifacts are returned, tell the user: "No artifacts found." For keyword searches, suggest retrying without a keyword. Stop here.

---

### Step 2: Present and Confirm Selection

Use `AskUserQuestion` to present the artifact list.

- `header`: "Select artifact"
- `question`: "Which artifact should I load as session context?"
- Each `option.label`: `<title>`
- Each `option.description`: `v<version> · <tags joined with ", "> · updated <updated_at formatted as YYYY-MM-DD>`

If only one result was found, skip the question and proceed — confirm with a short line:

```
Loading: "<title>" (v<version>)
```

Save the selected artifact's `id`.

---

### Step 3: Fetch Full Content

```bash
scripts/sb get luv_artifacts <selected-id>
```

Save the full record: `id`, `title`, `slug`, `content`, `tags`, `version`, `updated_at`.

---

### Step 4: Inject as Session Context

Print the artifact in full using this structure — this makes it visible in the conversation and available for all subsequent steps:

```
---
## Luv Artifact: <title>
**Slug**: <slug> | **Version**: v<version> | **Tags**: <tags> | **Updated**: <updated_at date>
---

<content verbatim>

---
*Artifact loaded. Ready to plan, implement, or create issues.*
---
```

---

### Step 5: Offer Downstream Actions

Immediately after printing the artifact, use `AskUserQuestion` to offer next steps:

- `header`: "Next step"
- `question`: "What should we do with this artifact?"
- Options:
  1. **Seed a session plan** — Extract requirements and draft a structured implementation plan
  2. **Create Linear issues** — Translate the artifact into `isq` issues for the Luv project
  3. **Both** — Draft the plan first, then create issues from it
  4. **Done** — Artifact is context, no further action needed

Handle each selection as described below.

---

## Downstream: Seed a Session Plan

Analyze the artifact content. Identify objectives, requirements, constraints, and open questions. Produce a session plan:

```
## Session Plan — <artifact title>

### Objective
<1-2 sentence summary of what this session aims to accomplish>

### Context
<Key facts and constraints from the artifact that frame the work>

### Tasks
1. [ ] <specific, actionable, implementable task>
2. [ ] <specific, actionable, implementable task>
3. [ ] ...

### Out of Scope
<Anything the artifact explicitly defers or excludes, or that you're excluding for this session>

### Open Questions
<Anything requiring clarification before starting — leave blank if none>
```

After printing the plan, use `TodoWrite` to register the task list so progress is tracked in this session.

**Rules:**
- Tasks must be discrete and buildable — not "implement the feature" but specific sub-steps
- Derive tasks from artifact content only — don't invent scope
- Aim for 3–8 tasks; break larger items into sub-tasks rather than keeping them vague

---

## Downstream: Create Linear Issues

Parse the artifact for discrete, actionable work items. Each issue should map to a single buildable unit of work — not an epic.

**Before running any commands, present the issue list for review:**

Use `AskUserQuestion`:
- `header`: "Confirm issues"
- `question`: "Create these <N> issues in Linear?"
- Show a preview of each issue as `label: "<title>"` and `description: "<1-sentence description>"`
- Options: **Create all** / **Cancel**

If confirmed, run for each issue:

```bash
isq issue create --title "<issue title>" --description "<description>"
```

If `isq issue create` fails or the syntax is rejected, fall back: print the full issue list as Markdown and instruct the user to create them manually or with `gh issue create`.

After creation (or fallback), print:

```
<N> issues queued for the Luv project.
```

---

## Downstream: Both

1. Run "Seed a session plan" first.
2. After the plan is produced, offer "Create Linear issues" — but derive issues from the **plan tasks** (which are already structured) rather than re-parsing the raw artifact. This produces tighter, better-scoped issues.

---

## Notes

- **Context is the primary outcome.** Even if the user selects "Done", the artifact content is now visible and Claude can reference it for the rest of the session.
- **Never surface archived artifacts** unless the user explicitly requests them (e.g., `$ARGUMENTS` contains "archived").
- **Don't paraphrase or embellish artifact content.** In the plan and issues, extract and structure — don't rewrite.
- **isq integration is best-effort.** The CLI may not be in PATH in all environments. If unavailable, output the issue list as Markdown so the user can act on it manually.
- **If scripts/sb is unavailable**, fall back to: `mcp__jfriis__db_query` with `table: "luv_artifacts"` and appropriate filters.
- **Tag search note**: PostgREST `cs` (contains) operator on `text[]` requires exact tag match, not substring. If tag results are sparse, prefer title search results.
