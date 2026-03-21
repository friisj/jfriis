---
name: probe-experiment
description: Evaluate and probe a studio experiment. Synthesizes existing probe responses and feedback, then generates follow-up probes. Single entry point for the experiment evaluation cycle.
allowed-tools: Read, Bash, Glob, Grep
argument-hint: <project-slug> [experiment-slug]
---

# Experiment Evaluation Cycle

You are the single entry point for experiment evaluation. Each invocation:
1. Reads existing signal (probe responses + feedback)
2. Synthesizes findings if there's unprocessed signal
3. Generates new or follow-up probes if appropriate

## Input

The user has provided: `$ARGUMENTS`

Parse as: `<project-slug> [experiment-slug]`

- If only project-slug is given, list experiments and ask which one(s) to evaluate.
- If experiment-slug is given, run the evaluation cycle for that experiment.

## Procedure

### 1. Gather Context

```bash
# Get project
scripts/sb query studio_projects "slug=eq.<project-slug>&select=id,name,slug"

# Get experiment
scripts/sb query studio_experiments "project_id=eq.<project-id>&slug=eq.<experiment-slug>&select=*"

# Get hypothesis
scripts/sb query studio_hypotheses "id=eq.<hypothesis-id>&select=*"

# Get linked spikes
scripts/sb query entity_links "source_type=eq.experiment&source_id=eq.<experiment-id>&target_type=eq.asset_spike&select=target_id"
scripts/sb query studio_asset_spikes "id=in.(<ids>)&select=name,description,component_key"
```

If the experiment has a spike component, read the component file to understand features and interactions.

### 2. Read Existing Signal

Fetch **all** existing probes (answered and unanswered):
```bash
scripts/sb query studio_experiment_probes "experiment_id=eq.<experiment-id>&select=*&order=sequence"
```

Fetch **all** feedback/evidence:
```bash
scripts/sb query feedback "entity_type=eq.experiment&entity_id=eq.<experiment-id>&select=*&order=created_at"
```

### 3. Triage: Which Mode?

Based on what exists, enter one of three modes:

#### Mode A: Fresh Experiment (no probes, no feedback)
→ Go to **Step 4: Generate Initial Probes**

#### Mode B: Signal Exists (answered probes and/or feedback present)
→ Go to **Step 5: Synthesize Signal**, then optionally **Step 6: Generate Follow-Up Probes**

#### Mode C: Probes Exist but Unanswered (probes generated, none answered yet)
→ Report the unanswered probe count and remind the user to test the spike and answer probes. Do not generate more probes. Show the link: `/studio/<project>/<experiment>/<spike-slug>`

### 4. Generate Initial Probes (Mode A)

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

**Response type guidelines:**
- `rating` — subjective quality assessments (1-5 scale with labels)
- `choice` — categorical questions with known options
- `boolean` — yes/no pass/fail checks
- `text` — open-ended observations and reasoning

**Critical rules:**
- Probes must be specific to this experiment, not generic
- Reference actual features, controls, and interactions from the spike
- Questions should generate signal about the hypothesis, not just the implementation
- Include at least one probe that directly addresses the hypothesis validation criteria
- Provide `context` for probes where the question alone might be ambiguous

Create probes individually (bulk insert can hit shell limits):
```bash
scripts/sb create studio_experiment_probes '{"experiment_id":"<id>","question":"...","context":"...","response_type":"rating","rating_min":1,"rating_max":5,"rating_labels":{"1":"Poor","5":"Excellent"},"sequence":1,"phase":"pre","generated_by":"auto"}'
```

### 5. Synthesize Signal (Mode B)

Present a structured synthesis to the user:

**5a. Probe Response Summary**

For each answered probe, show:
- The question
- The response
- What signal it provides about the hypothesis

Group by phase (pre → during → post).

**5b. Feedback Summary**

For each feedback record, show:
- Hat type (with color/emoji: white=📊, black=⚠️, yellow=✅, red=💭, green=💡, blue=🔵)
- Title and content
- Whether it supports or refutes the hypothesis

**5c. Overall Assessment**

Based on all signal, provide:
- **Direction**: Does the evidence lean toward validating, invalidating, or is it inconclusive?
- **Confidence**: How strong is the signal? (weak/moderate/strong)
- **Key findings**: 2-3 bullet points summarizing the most important learnings
- **Gaps**: What questions remain unanswered? What areas lack evidence?
- **Recommendation**: Should the experiment be concluded (with what outcome), or does it need more testing?

**5d. Update Experiment Learnings**

If the user agrees, update the experiment's `learnings` field with the synthesis:
```bash
scripts/sb update studio_experiments <experiment-id> '{"learnings":"<synthesized learnings>"}'
```

### 6. Generate Follow-Up Probes (Mode B, optional)

After synthesis, ask the user if they want follow-up probes. If yes:

- Generate 3-6 probes that address the **gaps** identified in the synthesis
- Focus on areas where signal is weak or contradictory
- Reference specific probe responses or feedback that raised new questions
- Use `phase: "during"` for probes that need more testing, `phase: "post"` for reflective follow-ups
- Set `sequence` to continue from the highest existing sequence number

### 7. Recommend Experiment Conclusion

If the signal is strong enough (most probes answered, consistent direction), recommend closing the experiment:

```bash
# Update experiment outcome and status
scripts/sb update studio_experiments <experiment-id> '{"status":"completed","outcome":"<success|failure|inconclusive>","learnings":"<final synthesis>"}'

# Update hypothesis status if this is the deciding experiment
scripts/sb update studio_hypotheses <hypothesis-id> '{"status":"<validated|invalidated>"}'
```

Only recommend this — never auto-close. The user makes the call.

## Example Synthesis Output

```
## Signal Summary: shape-deform

### Probe Responses (8/13 answered)

**Pre:**
- Planned to build: "A house with a pitched roof" → establishes baseline
- Expected box-first to feel natural: "Yes, more natural"

**During:**
- Vertex dragging feel: "Mostly sculpting" ✅ positive signal
- Axis inference accuracy: 4/5 ✅ strong
- Grid snap feel: "Mostly assistive" ✅ validates H2
- Subdivide usefulness: 5/5 ✅ essential
- Bounding box ghost useful: Yes ✅
- Multi-select adequate: "Workable but want more" ⚠️ gap

**Post:**
- Created planned form: "Partially" ⚠️ mixed
- Hypothesis verdict: "Leans validating" ✅

### Feedback (2 records)
- 💭 Red: "This feels more like sculpting than CAD" → supports
- ⚠️ Black: "Hard to select specific vertices after 2 subdivisions" → risk

### Assessment
- **Direction**: Leans validating
- **Confidence**: Moderate — core interaction works but selection UX needs iteration
- **Gaps**: No feedback on performance with complex meshes; multi-select needs improvement
- **Recommendation**: Keep experiment open, generate follow-up probes on selection UX
```

## Example Probe

```json
{
  "question": "Does axis inference consistently lock to the axis you intended?",
  "context": "The line tool infers the drawing axis from cursor movement direction.",
  "response_type": "rating",
  "rating_min": 1,
  "rating_max": 5,
  "rating_labels": {"1": "Rarely correct", "3": "Usually correct", "5": "Always correct"},
  "phase": "during",
  "sequence": 4,
  "generated_by": "auto"
}
```
