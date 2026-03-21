---
name: observe
description: Quickly capture an observation/evidence record against an experiment using the feedback system. Infers De Bono hat type from content. Use during or after spike testing.
allowed-tools: Bash
argument-hint: <project-slug> <experiment-slug> <observation text>
---

# Capture Experiment Observation

You are capturing an observation or piece of evidence against a studio experiment, using the existing `feedback` table with De Bono thinking hat typing.

## Input

The user has provided: `$ARGUMENTS`

Parse as: `<project-slug> <experiment-slug> <observation text>`

- project-slug: first argument
- experiment-slug: second argument
- observation: everything after the second argument

If input is incomplete, ask for what's missing.

## Procedure

### 1. Resolve Experiment

```bash
scripts/sb query studio_projects "slug=eq.<project-slug>&select=id"
scripts/sb query studio_experiments "project_id=eq.<project-id>&slug=eq.<experiment-slug>&select=id,name"
```

### 2. Infer Hat Type and Supports

Analyze the observation text to determine the best De Bono hat type:

| Hat | When to use | `supports` |
|-----|-------------|------------|
| **white** | Factual observation, measurement, data point | `true` or `false` based on content |
| **black** | Risk, problem, friction, something broken | `false` |
| **yellow** | Positive signal, something that worked well | `true` |
| **red** | Gut feeling, emotional reaction, intuition | `null` |
| **green** | New idea, alternative approach, creative suggestion | `null` |
| **blue** | Process observation, meta-commentary about the experiment itself | `null` |

Default to `white` (objective observation) if unclear.

Infer `feedback_type` from the content:
- Testing a spike → `prototype` or `user_test`
- Reporting measurements → `metrics`
- Gut feeling → `observation`
- Idea/suggestion → `team_discussion`
- Default: `observation`

### 3. Create Feedback Record

```bash
scripts/sb create feedback '{
  "entity_type": "experiment",
  "entity_id": "<experiment-id>",
  "hat_type": "<inferred-hat>",
  "feedback_type": "<inferred-type>",
  "title": "<short summary - first ~60 chars or generated>",
  "content": "<full observation text>",
  "confidence": <0.0-1.0 based on certainty of observation>,
  "supports": <true|false|null>,
  "collected_at": "<current ISO timestamp>",
  "tags": ["<project-slug>", "<experiment-slug>"],
  "metadata": {}
}'
```

### 4. Report

Output:
- Hat type badge (with color) and supports direction
- The observation as recorded
- Link to experiment page: `/studio/<project>/<experiment>`
- Running count of feedback for this experiment

```bash
scripts/sb query feedback "entity_type=eq.experiment&entity_id=eq.<experiment-id>&select=id" | jq length
```

## Examples

**Input:** `isotope snap-iso-draw vertex snapping works perfectly when zoomed in but becomes unreliable at low zoom levels`
- Hat: **white** (objective observation about behavior)
- Supports: `false` (identifies a limitation)
- Type: `prototype`
- Confidence: 0.8

**Input:** `isotope shape-deform this feels more like sculpting than CAD — really promising direction`
- Hat: **red** (gut feeling / emotional reaction)
- Supports: `null` (soft hat)
- Type: `observation`
- Confidence: 0.7

**Input:** `isotope snap-iso-draw what if we added a tape measure tool to show distances between vertices`
- Hat: **green** (creative suggestion)
- Supports: `null`
- Type: `team_discussion`
- Confidence: 0.5
