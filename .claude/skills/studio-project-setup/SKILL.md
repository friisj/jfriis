---
name: studio-project-setup
description: Set up a new studio project with database record, documentation scaffolding, and initial prototype structure. Use when starting a new studio R&D project.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
argument-hint: [project-name-or-description]
---

# Studio Project Setup

You are setting up a new studio project in this repository. Follow this procedure exactly.

## Input

The user has provided: `$ARGUMENTS`

This may be a project name, a description, or a rough idea. You will need to extract or derive:
- **slug**: kebab-case URL identifier (e.g., `my-project`)
- **name**: Display name (e.g., "My Project")
- **description**: Brief overview of the idea
- **problem_statement**: What problem or opportunity this explores
- **hypothesis**: Core thesis being investigated

If the input is ambiguous, ask clarifying questions before proceeding.

---

## Procedure

### Step 1: Check for Existing Project

Before creating anything, check if this project already exists:

1. **Query the database** via MCP to search `studio_projects` for matching slug or similar name:
   ```
   mcp__supabase__db_query({ table: "studio_projects" })
   ```
2. **Check the filesystem** for existing docs:
   ```
   ls docs/studio/
   ```
3. If a matching project exists:
   - Show the user what was found (name, status, description)
   - Ask if they want to resume/update the existing project or create a new one
   - If resuming, skip to Step 4 (scaffold only what's missing)

### Step 2: Create Database Record

Create the `studio_projects` record via MCP:

```
mcp__supabase__db_create({
  table: "studio_projects",
  data: {
    slug: "<derived-slug>",
    name: "<derived-name>",
    description: "<description>",
    status: "draft",
    temperature: "warm",
    problem_statement: "<problem_statement>",
    hypothesis: "<hypothesis>",
    current_focus: "Initial setup and exploration"
  }
})
```

Save the returned project `id` for use in subsequent steps.

### Step 3: Create Initial Hypothesis

Create at least one hypothesis record:

```
mcp__supabase__db_create({
  table: "studio_hypotheses",
  data: {
    project_id: "<project-id>",
    statement: "<core hypothesis statement>",
    validation_criteria: "<how we'll know if this is true>",
    sequence: 1,
    status: "proposed"
  }
})
```

### Step 4: Scaffold Documentation

Create the following directory structure and files under `docs/studio/<slug>/`:

#### 4a. `docs/studio/<slug>/README.md`

```markdown
# <Name>

> <One-line description>

## Status

- **Phase:** Exploration
- **Temperature:** Warm
- **Started:** <today's date>

## Overview

<2-3 paragraph description of what this project explores, why it matters, and what success looks like>

## Hypotheses

- **H1:** <hypothesis statement>
  - **Validation:** <criteria>

## Project Structure

### Documentation
- `/docs/studio/<slug>/README.md` - This file
- `/docs/studio/<slug>/exploration/` - Research and conceptual docs
- `/docs/studio/<slug>/exploration/definitions.md` - Glossary

### Code (when prototype phase begins)
- `/components/studio/prototypes/<slug>/` - Prototype components

## Next Steps

1. Complete initial research and exploration
2. Define key terms and concepts
3. Validate hypothesis through exploration
4. Design first experiment/prototype

---

**Started:** <today's date>
**Status:** Exploration
```

#### 4b. `docs/studio/<slug>/exploration/definitions.md`

```markdown
# <Name> - Definitions

> Glossary of terms specific to this project. Maintain as concepts evolve.

---

## Core Terms

| Term | Definition | Example |
|------|-----------|---------|
| | | |

---

## Related Concepts

| Concept | Relationship to This Project |
|---------|------------------------------|
| | |

---

*Add terms as they emerge during exploration. Precise definitions prevent confusion in later phases.*
```

#### 4c. `docs/studio/<slug>/exploration/research.md`

```markdown
# <Name> - Initial Research

> Landscape survey and foundational research for the project.

---

## Problem Space

<What problem or opportunity does this project address?>

## Prior Art

<What existing solutions, frameworks, or approaches exist in this space?>

| Approach | Strengths | Weaknesses | Relevance |
|----------|-----------|------------|-----------|
| | | | |

## Key Questions

1. <Open questions to investigate>

## Initial Findings

<Populated as research progresses>

---

*This document captures the initial research phase. Update as exploration proceeds.*
```

### Step 5: Scaffold First Prototype

Create a minimal prototype component scaffold:

#### 5a. Create prototype directory

```bash
mkdir -p components/studio/prototypes/<slug>
```

#### 5b. Create placeholder component

Create `components/studio/prototypes/<slug>/index.tsx`:

```tsx
'use client'

/**
 * <Name> - Prototype
 *
 * <Brief description of what this prototype demonstrates>
 *
 * Status: Scaffold - not yet implemented
 */
export default function <PascalCaseName>Prototype() {
  return (
    <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg">
      <h3 className="text-lg font-bold mb-2"><Name> Prototype</h3>
      <p className="text-gray-500">
        Prototype scaffold. Implementation pending exploration phase completion.
      </p>
    </div>
  )
}
```

### Step 6: Create First Experiment Record

Create a `studio_experiments` record for the initial prototype:

```
mcp__supabase__db_create({
  table: "studio_experiments",
  data: {
    project_id: "<project-id>",
    hypothesis_id: "<hypothesis-id>",
    slug: "<slug>-prototype",
    name: "<Name> Prototype",
    description: "Initial prototype exploring core concept",
    type: "prototype",
    status: "planned"
  }
})
```

### Step 7: Update Studio README

Add the new project to `docs/studio/README.md` under the "Active Studio Projects" section. Follow the format of existing entries.

### Step 8: Summary

After completing all steps, present a summary:

```
## Project Setup Complete

**<Name>** (<slug>)

### Created:
- Database record: studio_projects (id: <id>)
- Hypothesis: H1 - <statement>
- Experiment: <slug>-prototype (planned)

### Scaffolded:
- docs/studio/<slug>/README.md
- docs/studio/<slug>/exploration/definitions.md
- docs/studio/<slug>/exploration/research.md
- components/studio/prototypes/<slug>/index.tsx

### Next Steps:
1. Fill in exploration/research.md with initial findings
2. Define key terms in exploration/definitions.md
3. Begin validating H1
4. When ready, implement the prototype component
```

---

## Important Notes

- **Database is source of truth** for project metadata. Docs supplement with detailed exploration artifacts.
- **Don't skip the duplicate check** (Step 1). The user may be resuming an existing project.
- **Exploration before implementation.** The prototype scaffold is intentionally minimal - it's a placeholder until exploration validates the concept.
- **Follow existing patterns.** Look at `docs/studio/trux/` and `docs/studio/design-system-tool/` for reference.
- **Temperature defaults to "warm"** unless the user specifies otherwise.
- **Status starts as "draft"** - it moves to "active" when real work begins.
