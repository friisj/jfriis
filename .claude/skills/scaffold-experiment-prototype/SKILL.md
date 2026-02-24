---
name: scaffold-experiment-prototype
description: Scaffold a new spike asset with DB record, component file, registry entry, and entity link. Use when adding a new spike to an existing studio project experiment.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
argument-hint: <project-slug> <experiment-name>
---

# Scaffold Experiment Spike Asset

You are scaffolding a new spike asset for an existing studio project. This creates the spike DB record, entity link, component file, and registry entry in one step.

## Input

The user has provided: `$ARGUMENTS`

Parse as: `<project-slug> <experiment-name>`

Derive:
- **project-slug**: First argument (kebab-case, e.g., `putt`)
- **experiment-name**: Remaining arguments as the human-readable name (e.g., `Physics Engine`)
- **experiment-slug**: Derived from experiment-name via kebab-case (e.g., `physics-engine`)
- **component_key**: `{project-slug}/{experiment-slug}`
- **PascalCaseName**: For the component function name (e.g., `PhysicsEngine`)

If the input is ambiguous or missing, ask for clarification before proceeding.

---

## Procedure

### Step 1: Validate Project

Query `studio_projects` to confirm the project exists:

```bash
scripts/sb query studio_projects "slug=eq.<project-slug>"
```

- If not found: Stop and tell the user. Suggest running `/studio-project-setup` first.
- If found: Save the project `id` and `name` for later steps.

### Step 2: Check for Existing Experiment

Query `studio_experiments` for a matching slug under this project:

```bash
scripts/sb query studio_experiments "project_id=eq.<project-id>&slug=eq.<experiment-slug>"
```

- If found: Use the existing experiment. Proceed to create the spike asset linked to it.
- If not found: Create a new experiment record first (Step 3a), then create the spike asset.

### Step 3a: Create Experiment (if needed)

```bash
scripts/sb create studio_experiments '{
  "project_id": "<project-id>",
  "slug": "<experiment-slug>",
  "name": "<experiment-name>",
  "description": "Spike experiment for <project-name>",
  "type": "spike",
  "status": "planned"
}'
```

### Step 3b: Create Spike Asset Record

```bash
scripts/sb create studio_asset_spikes '{
  "project_id": "<project-id>",
  "slug": "<experiment-slug>",
  "name": "<experiment-name>",
  "description": "Spike component for <project-name>",
  "component_key": "<project-slug>/<experiment-slug>"
}'
```

### Step 3c: Create Entity Link

Link the experiment to the spike asset:

```bash
scripts/sb create entity_links '{
  "source_type": "experiment",
  "source_id": "<experiment-id>",
  "target_type": "asset_spike",
  "target_id": "<spike-id>",
  "link_type": "contains",
  "metadata": {}
}'
```

### Step 4: Create Component File

Create `components/studio/prototypes/<project-slug>/<experiment-slug>.tsx`:

```tsx
'use client'

/**
 * <Experiment Name> Spike
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
          Spike scaffold. Replace this with your implementation.
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

1. Read back the spike asset record to confirm it exists
2. Confirm the entity link exists between experiment and spike
3. Confirm the component file exists at the expected path
4. Confirm the registry entry exists in `prototype-renderer.tsx`

### Step 7: Summary

Present a summary:

```
## Spike Asset Scaffolded

**<Experiment Name>** (<project-slug>/<experiment-slug>)

### Created:
- Spike asset: studio_asset_spikes (component_key: <project-slug>/<experiment-slug>)
- Entity link: experiment → asset_spike (contains)
- Component: components/studio/prototypes/<project-slug>/<experiment-slug>.tsx
- Registry: Added to prototype-renderer.tsx

### View at:
- Spike: /studio/<project-slug>/<experiment-slug>/<experiment-slug>
- Experiment: /studio/<project-slug>/<experiment-slug>
- Edit: /admin/experiments/<id>/edit

### Next Steps:
1. Implement the spike component
2. Update experiment status to `in_progress` when work begins
```

---

## Important Notes

- **Always validate the project exists** before creating anything.
- **The registry requires static import paths** — dynamic imports in `prototype-renderer.tsx` must use string literals, not variables.
- **component_key format** is always `{project-slug}/{experiment-slug}`.
- **Component files use default exports** — this is required by `next/dynamic`.
- **Don't create hypothesis records** — this skill only creates experiment and spike records. Link to an existing hypothesis manually if needed.
