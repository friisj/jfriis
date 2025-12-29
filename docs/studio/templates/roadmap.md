# {project_name} - Roadmap

> Hypothesis-driven roadmap. Each hypothesis spawns experiments to validate it.

---

## Hypotheses

{#each hypotheses}
### H{sequence}: {statement}

**Status:** {status}
**Validation criteria:** {validation_criteria}

**Experiments:**
{#each experiments}
- [{name}](/studio/{project_slug}/{experiment_slug}) - {status} {#if outcome}({outcome}){/if}
{/each}

---
{/each}

## Validated Learnings

{#each validated_hypotheses}
- **H{sequence}:** {statement} - {outcome_summary}
{/each}

---

## Invalidated / Pivoted

{#each invalidated_hypotheses}
- **H{sequence}:** {statement} - {learnings}
{/each}

---

*This roadmap is generated from `studio_hypotheses` and `studio_experiments` database records.*
