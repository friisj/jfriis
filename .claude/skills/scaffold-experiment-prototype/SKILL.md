---
name: scaffold-experiment-prototype
description: Scaffold a new prototype experiment with DB record, component file, and registry entry. Use when adding a new prototype to an existing studio project.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
argument-hint: <project-slug> <experiment-name>
---

# Scaffold Experiment Prototype

You are scaffolding a new prototype experiment for an existing studio project. This creates the DB record, component file, and registry entry in one step.

## Input

The user has provided: `$ARGUMENTS`

Parse as: `<project-slug> <experiment-name>`

Derive:
- **project-slug**: First argument (kebab-case, e.g., `putt`)
- **experiment-name**: Remaining arguments as the human-readable name (e.g., `Physics Engine`)
- **experiment-slug**: Derived from experiment-name via kebab-case (e.g., `physics-engine`)
- **prototype_key**: `{project-slug}/{experiment-slug}`
- **PascalCaseName**: For the component function name (e.g., `PhysicsEngine`)

If the input is ambiguous or missing, ask for clarification before proceeding.

---

## Procedure

### Step 1: Validate Project

Query `studio_projects` to confirm the project exists:

```
mcp__jfriis__db_query({
  table: "studio_projects",
  filters: [{ field: "slug", operator: "eq", value: "<project-slug>" }]
})
```

- If not found: Stop and tell the user. Suggest running `/studio-project-setup` first.
- If found: Save the project `id` and `name` for later steps.

### Step 2: Check for Existing Experiment

Query `studio_experiments` for a matching slug under this project:

```
mcp__jfriis__db_query({
  table: "studio_experiments",
  filters: [
    { field: "project_id", operator: "eq", value: "<project-id>" },
    { field: "slug", operator: "eq", value: "<experiment-slug>" }
  ]
})
```

- If found: Show the existing record. Ask the user if they want to:
  - **Update it** to add/change `prototype_key` and ensure the component exists
  - **Abort** and choose a different name
- If not found: Proceed to create.

### Step 3: Create/Update DB Record

**Creating new:**
```
mcp__jfriis__db_create({
  table: "studio_experiments",
  data: {
    project_id: "<project-id>",
    slug: "<experiment-slug>",
    name: "<experiment-name>",
    description: "Prototype experiment for <project-name>",
    type: "prototype",
    status: "planned",
    prototype_key: "<project-slug>/<experiment-slug>"
  }
})
```

**Updating existing:**
```
mcp__jfriis__db_update({
  table: "studio_experiments",
  id: "<experiment-id>",
  data: {
    type: "prototype",
    prototype_key: "<project-slug>/<experiment-slug>"
  }
})
```

### Step 4: Create Component File

Create `components/studio/prototypes/<project-slug>/<experiment-slug>.tsx`:

```tsx
'use client'

/**
 * <Experiment Name> Prototype
 *
 * Part of the <Project Name> studio project.
 * Status: Scaffold - not yet implemented
 */
export default function <PascalCaseName>() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg max-w-md">
        <h3 className="text-lg font-bold mb-2"><Experiment Name></h3>
        <p className="text-gray-500 text-sm">
          Prototype scaffold. Replace this with your implementation.
        </p>
      </div>
    </div>
  )
}
```

Ensure the directory exists first (`mkdir -p` if needed).

### Step 5: Register in Prototype Renderer

Edit `components/studio/prototype-renderer.tsx`:

1. Read the current file
2. Add a new entry to the `registry` Record:
   ```ts
   '<project-slug>/<experiment-slug>': dynamic(() => import('@/components/studio/prototypes/<project-slug>/<experiment-slug>'), { ssr: false }),
   ```
3. Insert alphabetically by key within the registry

### Step 6: Verify

1. Read back the DB record to confirm `prototype_key` is set:
   ```
   mcp__jfriis__db_query({
     table: "studio_experiments",
     filters: [
       { field: "project_id", operator: "eq", value: "<project-id>" },
       { field: "slug", operator: "eq", value: "<experiment-slug>" }
     ]
   })
   ```
2. Confirm the component file exists at the expected path
3. Confirm the registry entry exists in `prototype-renderer.tsx`

### Step 7: Summary

Present a summary:

```
## Prototype Scaffolded

**<Experiment Name>** (<project-slug>/<experiment-slug>)

### Created:
- DB record: studio_experiments (prototype_key: <project-slug>/<experiment-slug>)
- Component: components/studio/prototypes/<project-slug>/<experiment-slug>.tsx
- Registry: Added to prototype-renderer.tsx

### View at:
- Prototype: /studio/<project-slug>/<experiment-slug>
- Edit: /admin/experiments/<id>/edit

### Next Steps:
1. Implement the prototype component
2. Update experiment status to `in_progress` when work begins
```

---

## Important Notes

- **Always validate the project exists** before creating anything.
- **The registry requires static import paths** — dynamic imports in `prototype-renderer.tsx` must use string literals, not variables.
- **prototype_key format** is always `{project-slug}/{experiment-slug}`.
- **Component files use default exports** — this is required by `next/dynamic`.
- **Don't create hypothesis records** — this skill only creates experiment records. Link to an existing hypothesis manually if needed.
