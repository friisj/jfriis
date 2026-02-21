---
name: generate-boundary-objects
description: Generate boundary objects (BMC, VPC, customer profile, assumptions) from a studio project and link them via entity_links. Use after /studio-project-setup.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
argument-hint: <project-slug>
---

# Generate Boundary Objects

You are generating strategic boundary objects for a studio project. This creates the strategic context needed for targeted experiment generation.

## Input

The user has provided: `$ARGUMENTS`

This should be a studio project slug (e.g., `chalk`, `putt`).

---

## JSONB Block Format

All canvas JSONB block columns (jobs, pains, gains, products_services, pain_relievers, gain_creators, key_partners, etc.) use this structure:

```json
{
  "items": [
    {
      "id": "<unique-id>",
      "content": "<item text>",
      "priority": "high|medium|low",
      "created_at": "<ISO 8601 timestamp>"
    }
  ],
  "assumptions": [],
  "validation_status": "untested"
}
```

For customer profile items, also include `metadata`:
```json
{
  "id": "<unique-id>",
  "content": "<item text>",
  "metadata": { "type": "functional|social|emotional" },
  "priority": "high|medium|low",
  "created_at": "<ISO 8601 timestamp>"
}
```

Generate unique IDs using a prefix + sequence pattern (e.g., `job-001`, `pain-001`, `ps-001`). Use `new Date().toISOString()` for timestamps.

**CRITICAL**: Do NOT store plain string arrays. The admin UI canvas views will not render them.

---

## Required Fields by Table

### `business_model_canvases`
Required: `slug`, `name`, `status`
Optional: `description`, `studio_project_id`, all 9 block columns (JSONB format above)

### `customer_profiles`
Required: `slug`, `name`, `status`
Optional: `description`, `studio_project_id`, `profile_type`, `demographics`, `jobs` (JSONB), `pains` (JSONB), `gains` (JSONB)

### `value_maps`
Required: `slug`, `name`, `status`
Optional: `description`, `studio_project_id`, `customer_profile_id`, `business_model_canvas_id`, `products_services` (JSONB), `pain_relievers` (JSONB), `gain_creators` (JSONB)

### `value_proposition_canvases`
Required: `slug`, `name`, `status`, `value_map_id`
Optional: `description`, `studio_project_id`, `customer_profile_id`, `addressed_jobs`, `addressed_pains`, `addressed_gains`

### `assumptions`
Required: `slug`, `statement`, `status` (use `identified`), `importance` (`critical`|`high`|`medium`|`low`)
Optional: `studio_project_id`, `category`, `is_leap_of_faith`, `notes`, `validation_criteria`

### `user_journeys`
Required: `slug`, `name`, `status`
Optional: `description`, `studio_project_id`, `customer_profile_id`, `journey_type` (use `end_to_end`), `goal`

### `journey_stages`
Required: `user_journey_id`, `name`, `sequence`
Optional: `description`, `stage_type` (pre_purchase|purchase|post_purchase|ongoing), `customer_emotion`, `customer_mindset`, `customer_goal`, `drop_off_risk` (low|medium|high)

### `touchpoints`
Required: `journey_stage_id`, `name`, `sequence`
Optional: `description`, `channel_type` (web|mobile_app|phone|email|in_person|chat|social|physical_location|mail|other), `interaction_type` (browse|search|read|watch|listen|form|transaction|conversation|notification|passive), `importance` (critical|high|medium|low), `pain_level` (none|minor|moderate|major|critical), `delight_potential` (low|medium|high)

### `service_blueprints`
Required: `slug`, `name`, `status`
Optional: `description`, `studio_project_id`, `blueprint_type` (service|product|hybrid|digital|physical), `service_scope`, `service_duration`

### `blueprint_steps`
Required: `service_blueprint_id`, `name`, `sequence`
Optional: `description`, `layers` (JSONB with keys: customer_action, frontstage, backstage, support_process), `cost_implication` (none|low|medium|high), `customer_value_delivery` (none|low|medium|high), `failure_risk` (low|medium|high|critical), `failure_impact`

### `story_maps`
Required: `slug`, `name`, `status`
Optional: `description`, `studio_project_id`, `map_type` (feature|product|release|discovery)

### `activities`
Required: `story_map_id`, `name`, `sequence`
Optional: `description`, `user_goal`

### `user_stories`
Required: `activity_id`, `title`
Optional: `description`, `acceptance_criteria`, `story_type` (feature|enhancement|bug|tech_debt|spike), `priority` (critical|high|medium|low), `status` (default: backlog), `story_points`

### `entity_links`
Required: `source_type`, `source_id`, `target_type`, `target_id`
Optional: `link_type` (default: 'related'), `strength` (strong|moderate|weak|tentative), `notes`, `metadata`, `position`

---

## Procedure

### Step 1: Validate Project

Query `studio_projects` via MCP for the given slug:

```
mcp__jfriis__db_query({
  table: "studio_projects",
  filters: { slug: "<slug>" }
})
```

If not found, abort with: "No studio project found with slug '<slug>'. Check `studio_projects` table."

Save the project `id`, `name`, `description`, `problem_statement`, `hypothesis`, `success_criteria`, `current_focus`, `scope_out`.

### Step 2: Check Existing Links

Query entity_links for existing outbound links from this project:

```
mcp__jfriis__db_query({
  table: "entity_links",
  filters: {
    source_type: "studio_project",
    source_id: "<project-id>"
  }
})
```

Show what's already linked. **Skip types that already have links** to keep this idempotent. Report which types are being skipped and why.

### Step 3: Read Project Context

Also query `studio_hypotheses` for this project:

```
mcp__jfriis__db_query({
  table: "studio_hypotheses",
  filters: { project_id: "<project-id>" }
})
```

Gather all available context: name, description, problem_statement, hypothesis, success_criteria, current_focus, scope_out, plus hypothesis statements.

### Step 4: Generate Business Model Canvas

**Skip if** an entity_link to `business_model_canvas` already exists.

Create a `business_model_canvases` record via MCP. Populate ALL 9 blocks with initial items derived from project context:

```
mcp__jfriis__db_create({
  table: "business_model_canvases",
  data: {
    slug: "<project-slug>-business-model",
    name: "<Project Name> - Business Model",
    description: "<1-2 sentences grounded in project context>",
    studio_project_id: "<project-id>",
    status: "draft",
    key_partners: {
      "items": [
        { "id": "kp-001", "content": "<partner>", "priority": "high", "created_at": "<now>" },
        ...
      ],
      "assumptions": [],
      "validation_status": "untested"
    },
    key_activities: { "items": [...], "assumptions": [], "validation_status": "untested" },
    key_resources: { "items": [...], "assumptions": [], "validation_status": "untested" },
    value_propositions: { "items": [...], "assumptions": [], "validation_status": "untested" },
    customer_segments: { "items": [...], "assumptions": [], "validation_status": "untested" },
    customer_relationships: { "items": [...], "assumptions": [], "validation_status": "untested" },
    channels: { "items": [...], "assumptions": [], "validation_status": "untested" },
    cost_structure: { "items": [...], "assumptions": [], "validation_status": "untested" },
    revenue_streams: { "items": [...], "assumptions": [], "validation_status": "untested" }
  }
})
```

Generate 2-4 items per block, grounded in the project's problem statement and description. Then create the entity_link:

```
mcp__jfriis__db_create({
  table: "entity_links",
  data: {
    source_type: "studio_project",
    source_id: "<project-id>",
    target_type: "business_model_canvas",
    target_id: "<bmc-id>",
    link_type: "explores",
    metadata: {}
  }
})
```

### Step 5: Generate Customer Profile

**Skip if** an entity_link to `customer_profile` already exists.

Create a `customer_profiles` record via MCP. Use the JSONB block format for jobs, pains, and gains:

```
mcp__jfriis__db_create({
  table: "customer_profiles",
  data: {
    slug: "<project-slug>-primary-customer",
    name: "<Project Name> - Primary Customer",
    description: "<2-3 sentences describing the target customer>",
    studio_project_id: "<project-id>",
    profile_type: "persona",
    demographics: "<Age range, income, role, technical level, etc.>",
    jobs: {
      "items": [
        { "id": "job-001", "content": "<job-to-be-done>", "metadata": { "type": "functional" }, "priority": "high", "created_at": "<now>" },
        ...
      ],
      "assumptions": [],
      "validation_status": "untested"
    },
    pains: {
      "items": [
        { "id": "pain-001", "content": "<pain point>", "priority": "high", "created_at": "<now>" },
        ...
      ],
      "assumptions": [],
      "validation_status": "untested"
    },
    gains: {
      "items": [
        { "id": "gain-001", "content": "<desired gain>", "priority": "high", "created_at": "<now>" },
        ...
      ],
      "assumptions": [],
      "validation_status": "untested"
    },
    status: "draft"
  }
})
```

Generate 3-5 items per block. Link with `explores`.

### Step 6: Generate Value Map + Value Proposition Canvas

**Skip if** an entity_link to `value_proposition_canvas` already exists.

The VPC requires a `value_map_id`, so create the value map first:

```
mcp__jfriis__db_create({
  table: "value_maps",
  data: {
    slug: "<project-slug>-value-map",
    name: "<Project Name> - Value Map",
    description: "<1-2 sentences>",
    studio_project_id: "<project-id>",
    customer_profile_id: "<profile-id>",
    business_model_canvas_id: "<bmc-id>",
    products_services: {
      "items": [
        { "id": "ps-001", "content": "<product/service>", "priority": "high", "created_at": "<now>" },
        ...
      ],
      "assumptions": [],
      "validation_status": "untested"
    },
    pain_relievers: {
      "items": [
        { "id": "pr-001", "content": "<how we relieve a pain>", "priority": "high", "created_at": "<now>" },
        ...
      ],
      "assumptions": [],
      "validation_status": "untested"
    },
    gain_creators: {
      "items": [
        { "id": "gc-001", "content": "<how we create a gain>", "priority": "high", "created_at": "<now>" },
        ...
      ],
      "assumptions": [],
      "validation_status": "untested"
    },
    status: "draft"
  }
})
```

Then create the VPC linked to the value map:

```
mcp__jfriis__db_create({
  table: "value_proposition_canvases",
  data: {
    slug: "<project-slug>-value-proposition",
    name: "<Project Name> - Value Proposition",
    description: "<Value prop description>",
    studio_project_id: "<project-id>",
    customer_profile_id: "<profile-id>",
    value_map_id: "<value-map-id>",
    addressed_jobs: ["<job-001 content>", "<job-002 content>"],
    addressed_pains: ["<pain-001 content>", "<pain-002 content>"],
    addressed_gains: ["<gain-001 content>", "<gain-002 content>"],
    status: "draft"
  }
})
```

Link the VPC with `explores`.

### Step 7: Generate Assumptions

**Skip if** entity_links to `assumption` already exist (3+ links).

Create 3-5 `assumptions` records via MCP. Distribute across risk categories (desirability, viability, feasibility, usability):

```
mcp__jfriis__db_create({
  table: "assumptions",
  data: {
    slug: "<project-slug>-<short-name>",
    statement: "We assume that <specific belief>",
    status: "identified",
    importance: "critical|high|medium|low",
    category: "desirability|viability|feasibility|usability",
    is_leap_of_faith: true|false,
    studio_project_id: "<project-id>",
    notes: "<Why this matters and what happens if wrong>"
  }
})
```

Link each with `tests`.

### Step 8: Generate User Journey + Stages + Touchpoints

**Skip if** an entity_link to `user_journey` already exists.

Create the full journey cascade — journey record, stages, and touchpoints:

**8a. Create the journey:**

```
mcp__jfriis__db_create({
  table: "user_journeys",
  data: {
    slug: "<project-slug>-core-journey",
    name: "<Project Name> - Core Journey",
    description: "<Journey description grounded in project context>",
    studio_project_id: "<project-id>",
    customer_profile_id: "<profile-id>",
    journey_type: "end_to_end",
    goal: "<What success looks like for this journey>",
    status: "draft"
  }
})
```

**8b. Create 4-5 journey stages** distributed across stage types:

```
mcp__jfriis__db_create({
  table: "journey_stages",
  data: {
    user_journey_id: "<journey-id>",
    name: "<Stage Name>",
    description: "<What happens at this stage>",
    sequence: 1,
    stage_type: "pre_purchase|purchase|post_purchase|ongoing",
    customer_emotion: "<How the customer feels>",
    customer_mindset: "<What the customer is thinking>",
    customer_goal: "<What they want to achieve>",
    drop_off_risk: "low|medium|high"
  }
})
```

Create stages for: Awareness/Discovery (pre_purchase), Evaluation (pre_purchase), Commitment/Action (purchase), First Use/Onboarding (post_purchase), and Ongoing Usage (ongoing). Adapt names to match the project domain.

**8c. Create 2-3 touchpoints per stage:**

```
mcp__jfriis__db_create({
  table: "touchpoints",
  data: {
    journey_stage_id: "<stage-id>",
    name: "<Touchpoint Name>",
    description: "<What happens at this touchpoint>",
    sequence: 1,
    channel_type: "web|mobile_app|phone|email|in_person|chat|social|physical_location|mail|other",
    interaction_type: "browse|search|read|watch|listen|form|transaction|conversation|notification|passive",
    importance: "critical|high|medium|low",
    pain_level: "none|minor|moderate|major|critical",
    delight_potential: "low|medium|high"
  }
})
```

**8d. Create entity_link:**

```
mcp__jfriis__db_create({
  table: "entity_links",
  data: {
    source_type: "studio_project",
    source_id: "<project-id>",
    target_type: "user_journey",
    target_id: "<journey-id>",
    link_type: "explores",
    metadata: {}
  }
})
```

### Step 9: Generate Service Blueprint + Steps

**Skip if** an entity_link to `service_blueprint` already exists.

The service blueprint mirrors the journey stages, mapping what happens behind the scenes.

**9a. Create the blueprint:**

```
mcp__jfriis__db_create({
  table: "service_blueprints",
  data: {
    slug: "<project-slug>-service-blueprint",
    name: "<Project Name> - Service Blueprint",
    description: "<How the service is delivered>",
    studio_project_id: "<project-id>",
    blueprint_type: "service|product|hybrid|digital|physical",
    status: "draft"
  }
})
```

**9b. Create one blueprint_step per journey stage** (mirror the stage names):

```
mcp__jfriis__db_create({
  table: "blueprint_steps",
  data: {
    service_blueprint_id: "<blueprint-id>",
    name: "<Matching Stage Name>",
    description: "<Step description>",
    sequence: 1,
    layers: {
      "customer_action": "<What the customer does>",
      "frontstage": "<Visible service interactions>",
      "backstage": "<Behind-the-scenes processes>",
      "support_process": "<Technical/infrastructure support>"
    },
    cost_implication: "none|low|medium|high",
    customer_value_delivery: "none|low|medium|high",
    failure_risk: "low|medium|high|critical"
  }
})
```

Populate all 4 layer keys with project-specific content derived from the journey stages and project context.

**9c. Create entity_links:**

```
// studio_project → service_blueprint
mcp__jfriis__db_create({
  table: "entity_links",
  data: {
    source_type: "studio_project",
    source_id: "<project-id>",
    target_type: "service_blueprint",
    target_id: "<blueprint-id>",
    link_type: "prototypes",
    metadata: {}
  }
})

// service_blueprint → user_journey
mcp__jfriis__db_create({
  table: "entity_links",
  data: {
    source_type: "service_blueprint",
    source_id: "<blueprint-id>",
    target_type: "user_journey",
    target_id: "<journey-id>",
    link_type: "implements",
    metadata: {}
  }
})
```

### Step 10: Generate Story Map + Activities + Stories

**Skip if** an entity_link to `story_map` already exists.

The story map translates the journey into development work.

**10a. Create the story map:**

```
mcp__jfriis__db_create({
  table: "story_maps",
  data: {
    slug: "<project-slug>-story-map",
    name: "<Project Name> - Story Map",
    description: "<Dev planning for the project>",
    studio_project_id: "<project-id>",
    map_type: "feature",
    status: "draft"
  }
})
```

**10b. Create one activity per journey stage** (backbone mirrors stage names):

```
mcp__jfriis__db_create({
  table: "activities",
  data: {
    story_map_id: "<story-map-id>",
    name: "<Matching Stage Name>",
    description: "<What this activity covers>",
    sequence: 1,
    user_goal: "<User's goal at this stage>"
  }
})
```

**10c. Create 2-3 user stories per activity:**

```
mcp__jfriis__db_create({
  table: "user_stories",
  data: {
    activity_id: "<activity-id>",
    title: "As a <persona>, I want to <action> so that <benefit>",
    description: "<More detail about the story>",
    story_type: "feature|enhancement|spike",
    priority: "critical|high|medium|low",
    status: "backlog"
  }
})
```

Use the user story format: "As a [persona], I want to [action] so that [benefit]". Ground stories in the customer profile and journey touchpoints.

**10d. Create entity_links:**

```
// studio_project → story_map
mcp__jfriis__db_create({
  table: "entity_links",
  data: {
    source_type: "studio_project",
    source_id: "<project-id>",
    target_type: "story_map",
    target_id: "<story-map-id>",
    link_type: "informs",
    metadata: {}
  }
})

// story_map → user_journey
mcp__jfriis__db_create({
  table: "entity_links",
  data: {
    source_type: "story_map",
    source_id: "<story-map-id>",
    target_type: "user_journey",
    target_id: "<journey-id>",
    link_type: "implements",
    metadata: {}
  }
})

// story_map → service_blueprint
mcp__jfriis__db_create({
  table: "entity_links",
  data: {
    source_type: "story_map",
    source_id: "<story-map-id>",
    target_type: "service_blueprint",
    target_id: "<blueprint-id>",
    link_type: "implements",
    metadata: {}
  }
})
```

### Step 11: Summary

Present a summary of everything created:

```
## Boundary Objects Generated for <Name>

### Created:
- Business Model Canvas: "<name>" (id: <id>) — 9 blocks populated
- Customer Profile: "<name>" (id: <id>) — jobs/pains/gains populated
- Value Map: "<name>" (id: <id>) — products/relievers/creators populated
- Value Proposition Canvas: "<name>" (id: <id>)
- Assumptions: <count> created
  - <statement summary> (<category>, <importance>)
  - ...
- User Journey: "<name>" (id: <id>) — <N> stages, <M> touchpoints
- Service Blueprint: "<name>" (id: <id>) — <N> steps with 4-layer structure
- Story Map: "<name>" (id: <id>) — <N> activities, <M> user stories

### Cascade:
Journey → Blueprint → Story Map (all cross-linked via entity_links)

### Skipped (already linked):
- <list any types that were skipped>

### Next Steps:
1. Review boundary objects in admin UI
2. Run `/generate-experiments <slug>` to create context-aware experiments
3. Refine BMC blocks and canvas items as understanding deepens
```

---

## Error Handling

### MCP Tool Failures

If any `mcp__jfriis__db_*` call fails:

1. **Report the error**: Show the exact error message and which step failed
2. **Don't continue blindly**: If a dependency fails (e.g., BMC creation fails), skip steps that depend on it (e.g., don't create entity_link for BMC)
3. **Partial success is OK**: If 3 of 5 assumptions succeed, report what worked and what didn't
4. **Common errors**:
   - `duplicate key value violates unique constraint` — a record with that slug already exists. Suggest a different slug or offer to link the existing record instead.
   - `violates check constraint` — a field value is invalid. Check the "Required Fields by Table" section for valid enum values.
   - `violates foreign key constraint` — a referenced record doesn't exist. Verify the ID is correct.

### Reporting

After completion, always present a clear summary showing:
- What was created successfully (with IDs)
- What was skipped (already existed)
- What failed (with error details and suggested fixes)

---

## Important Notes

- **Idempotent**: Always check existing links before creating. Never duplicate boundary objects.
- **Use MCP tools**: All database operations go through `mcp__jfriis__db_*` tools.
- **Draft status**: All generated objects start as `draft` — they need human review.
- **JSONB block format**: All canvas block columns MUST use `{ items: [...], assumptions: [], validation_status: "untested" }` format. Plain arrays will not render in the admin UI.
- **Context-grounded**: Every generated object should be grounded in the project's actual problem_statement, hypothesis, and description. Don't generate generic content.
- **Entity link validation**: The `studio_project` source type is registered in `lib/entity-links-validation.ts` with valid link types: `explores`, `improves`, `prototypes`, `informs`, `tests`, `validates`, `spin_off`, `inspired_by`, `evolved_from`.
- **Required fields**: Every table requires `slug`. Assumptions use `status: 'identified'` (not `untested`). User journeys use `journey_type: 'end_to_end'`. VPCs require `value_map_id`.
