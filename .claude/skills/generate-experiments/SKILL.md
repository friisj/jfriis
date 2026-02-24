---
name: generate-experiments
description: Generate context-aware hypotheses and experiments from a studio project's linked boundary objects. Use when a project has strategic context and needs experiments.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
argument-hint: <project-slug>
---

# Generate Context-Aware Experiments

You are generating hypotheses and experiments for a studio project, grounded in its linked boundary objects. This produces targeted experiments rather than generic ones.

## Input

The user has provided: `$ARGUMENTS`

This should be a studio project slug (e.g., `chalk`, `putt`).

---

## Procedure

### Step 1: Validate Project

```bash
scripts/sb query studio_projects "slug=eq.<slug>"
```

If not found, abort with: "No studio project found with slug '<slug>'."

Save the project fields: `id`, `name`, `description`, `problem_statement`, `hypothesis`, `success_criteria`, `current_focus`, `scope_out`.

### Step 2: Gather Full Context

#### 2a. Get Entity Links

Query all outbound links from the studio project:

```bash
scripts/sb query entity_links "source_type=eq.studio_project&source_id=eq.<project-id>"
```

#### 2b. Fetch Linked Entities

For each linked target, fetch the full entity:

```bash
# Fetch each linked entity by ID — run these in parallel
scripts/sb get business_model_canvases <bmc-id>
scripts/sb get customer_profiles <profile-id>
scripts/sb get value_proposition_canvases <vpc-id>
scripts/sb get assumptions <assumption-id>
scripts/sb get user_journeys <journey-id>
scripts/sb get service_blueprints <blueprint-id>
scripts/sb get story_maps <story-map-id>
```

| target_type | table |
|---|---|
| `business_model_canvas` | `business_model_canvases` |
| `value_proposition_canvas` | `value_proposition_canvases` |
| `customer_profile` | `customer_profiles` |
| `assumption` | `assumptions` |
| `user_journey` | `user_journeys` |
| `service_blueprint` | `service_blueprints` |
| `story_map` | `story_maps` |

Collect all data for use in gap analysis.

#### 2c. Get Existing Hypotheses and Experiments

```bash
# Run in parallel
scripts/sb query studio_hypotheses "project_id=eq.<project-id>"
scripts/sb query studio_experiments "project_id=eq.<project-id>"
```

### Step 3: Check for Boundary Objects

**If no boundary objects are linked** (no BMC, VPC, customer profile, or assumptions):
- Inform the user: "This project has no linked boundary objects. Context will be limited to PRD fields only."
- Suggest: "Run `/generate-boundary-objects <slug>` first for richer experiment generation."
- Ask: "Proceed with PRD-only context, or run boundary objects first?"
- If user wants to proceed, continue with only project fields as context.

### Step 4: Assess Gaps

Analyze the gathered context to identify validation gaps:

1. **Untested assumptions** — Any assumption with `status = 'untested'` that doesn't have a corresponding hypothesis
2. **Risk categories not covered** — Check which categories (desirability, viability, feasibility, usability) have no hypotheses
3. **BMC blocks without validation** — If BMC exists, check which blocks (revenue_streams, channels, key_activities, etc.) have no experiments testing them
4. **Customer pains/gains without evidence** — Customer profile pains/gains that aren't addressed by any experiment
5. **Journey stages without experiments** — If user journey exists, stages that have no usability testing

Present the gap analysis to the user before generating.

### Step 5: Generate Hypotheses

For each identified gap, propose a hypothesis. **Present each for user review before creating.**

Determine the next available sequence number from existing hypotheses.

For each approved hypothesis:

```bash
scripts/sb create studio_hypotheses '{
  "project_id": "<project-id>",
  "statement": "We believe that [action/change] will [result/outcome] for [audience] because [rationale]",
  "validation_criteria": "<Specific, measurable criteria>",
  "status": "proposed",
  "sequence": <next-sequence>
}'
```

### Step 6: Generate Experiments

For each hypothesis (newly created + existing unvalidated ones), propose experiments. Choose the experiment type based on risk source:

| Risk Source | Risk Category | Experiment Type |
|---|---|---|
| Customer profile pains/gains, VPC | Desirability | `prototype`, `interview` |
| BMC revenue/cost, channels | Viability | `smoke_test` |
| BMC key_activities/resources | Feasibility | `spike` |
| Journey stages, touchpoints | Usability | `prototype` |

For each approved experiment:

```bash
scripts/sb create studio_experiments '{
  "project_id": "<project-id>",
  "hypothesis_id": "<hypothesis-id>",
  "name": "<Descriptive experiment name>",
  "slug": "<kebab-case-slug>",
  "description": "<What we are testing and how, grounded in specific boundary object findings>",
  "type": "<spike|experiment|prototype|interview|smoke_test>",
  "status": "planned",
  "expected_outcome": "<What we expect to learn>"
}'
```

### Step 7: Propose Asset Scaffolding

For experiments of type `spike` or `prototype`, recommend running:

```
/scaffold-experiment-prototype <slug> <experiment-name>
```

List all experiments that could use scaffolding.

### Step 8: Summary

Present a summary table:

```
## Experiments Generated for <Name>

### Gap Analysis:
- Untested assumptions: <count>
- Uncovered risk categories: <list>
- BMC blocks without validation: <list>

### Hypotheses Created: <count>
| # | Statement | Risk Category | Status |
|---|-----------|---------------|--------|
| H<n> | <statement> | <category> | proposed |

### Experiments Created: <count>
| Name | Type | Hypothesis | Risk Source |
|------|------|-----------|-------------|
| <name> | <type> | H<n> | <what boundary object finding it tests> |

### Recommended Next Steps:
1. Review hypotheses and experiments in admin UI
2. Scaffold prototypes: <list /scaffold-experiment-prototype commands>
3. Start with highest-risk experiments first
```

---

## Error Handling

### API Failures

If any `scripts/sb` call fails:

1. **Report the error**: Show the exact error message and which step failed
2. **Don't continue blindly**: If a hypothesis creation fails, skip creating its linked experiments
3. **Partial success is OK**: Report what was created successfully alongside any failures
4. **Common errors**:
   - `duplicate key value violates unique constraint` — an experiment with that slug already exists. Suggest a different slug.
   - `violates check constraint` — a field value is invalid (e.g., wrong experiment type). Check allowed values.
   - `violates foreign key constraint` — a referenced hypothesis or project doesn't exist. Verify the ID.

### Reporting

After completion, always present a clear summary showing:
- What was created successfully (with IDs and linked hypotheses)
- What was skipped (already existed)
- What failed (with error details)

---

## Schema Reference

> **Schema source of truth:** `lib/mcp/schemas/*.ts`
> If any field documentation here conflicts with the Zod schemas, the schemas are correct.
> Last synced: 2026-02-21

## Important Notes

- **Context is king**: The whole point of this skill is that experiments are grounded in boundary objects. Reference specific findings (e.g., "tests the assumption that <specific belief>" not "tests user engagement").
- **Present before creating**: Always show proposed hypotheses/experiments for user approval before creating.
- **Use scripts/sb**: All database operations go through `scripts/sb` commands via the Bash tool.
- **Experiment types matter**: Match experiment type to risk category as specified in the table above.
- **Idempotent**: Check for existing experiments with similar names/slugs before creating duplicates.
- **Sequence matters**: Hypotheses have a `sequence` field. Always calculate the next available number.
