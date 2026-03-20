---
name: probe-experiment
description: Generate structured probes for a studio experiment. Reads the experiment context (hypothesis, description, linked spikes) and creates phase-appropriate probes with varied response types.
allowed-tools: Read, Bash, Glob, Grep
argument-hint: <project-slug> [experiment-slug]
---

# Generate Experiment Probes

You are generating structured probes (evaluation questions) for a studio experiment. Probes capture what we want to learn — they're answered during testing and their responses help determine experiment outcome.

## Input

The user has provided: `$ARGUMENTS`

Parse as: `<project-slug> [experiment-slug]`

- If only project-slug is given, list experiments and ask which one(s) to probe.
- If experiment-slug is given, generate probes for that specific experiment.

## Procedure

### 1. Gather Context

```bash
# Get project
scripts/sb query studio_projects "slug=eq.<project-slug>&select=id,name,slug"

# Get experiment(s)
scripts/sb query studio_experiments "project_id=eq.<project-id>&slug=eq.<experiment-slug>&select=*"

# Get hypothesis
scripts/sb query studio_hypotheses "id=eq.<hypothesis-id>&select=*"

# Get linked spikes
scripts/sb query entity_links "source_type=eq.experiment&source_id=eq.<experiment-id>&target_type=eq.asset_spike&select=target_id"
scripts/sb query studio_asset_spikes "id=in.(<ids>)&select=name,description,component_key"
```

If the experiment has a spike component, read the component file to understand what the spike actually does (features, controls, interactions).

### 2. Check Existing Probes

```bash
scripts/sb query studio_experiment_probes "experiment_id=eq.<experiment-id>&select=id,question,phase,response_type"
```

If probes already exist, inform the user and ask whether to:
- Add more probes (append)
- Replace all probes (delete existing, create new)
- Cancel

### 3. Generate Probes

Generate 8-15 probes distributed across phases:

**Pre-phase (2-3 probes)** — expectations before testing:
- What do you expect to happen?
- What would success look like?
- What are you most uncertain about?

**During-phase (4-8 probes)** — observations while testing:
- Does the interaction feel [specific quality from hypothesis]?
- Rate the responsiveness of [specific feature]
- Which mode/tool felt most natural? (choice)
- Did you encounter any friction? (boolean + text)

**Post-phase (3-4 probes)** — reflection after testing:
- Does this validate or invalidate the hypothesis? (choice: validates/invalidates/inconclusive)
- What was the biggest surprise?
- Rate overall confidence in the approach (rating 1-5)
- What should the next spike explore?

**Response type selection guidelines:**
- `rating` — for subjective quality assessments (use 1-5 scale with labels)
- `choice` — for categorical questions with known options
- `boolean` — for yes/no pass/fail checks
- `text` — for open-ended observations and reasoning

**Critical rules:**
- Probes must be specific to this experiment, not generic
- Reference actual features, controls, and interactions from the spike
- Questions should generate signal about the hypothesis, not just the implementation
- Include at least one probe that directly addresses the hypothesis validation criteria
- Provide `context` for probes where the question alone might be ambiguous

### 4. Create Probes

```bash
scripts/sb create studio_experiment_probes '[
  {
    "experiment_id": "<experiment-id>",
    "question": "...",
    "context": "...",
    "response_type": "rating",
    "rating_min": 1,
    "rating_max": 5,
    "rating_labels": {"1": "Poor", "5": "Excellent"},
    "sequence": 1,
    "phase": "pre",
    "generated_by": "auto"
  },
  ...
]'
```

Use bulk insert (array) for efficiency.

### 5. Report

Output a summary:
- Number of probes created per phase
- List of questions with response types
- Remind the user to answer probes at `/studio/<project>/<experiment>`

## Example Probe for Isotope snap-iso-draw

```json
{
  "question": "Does axis inference consistently lock to the axis you intended?",
  "context": "The line tool infers the drawing axis from cursor movement direction. This probe tests whether the inference algorithm matches user intent.",
  "response_type": "rating",
  "rating_min": 1,
  "rating_max": 5,
  "rating_labels": {"1": "Rarely correct", "3": "Usually correct", "5": "Always correct"},
  "phase": "during",
  "sequence": 4,
  "generated_by": "auto"
}
```
