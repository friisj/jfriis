# Arena

> A design system gym — train agent skills through reinforced feedback to shape a complete, coherent design system.

## Status

- **Phase:** Exploration
- **Temperature:** Hot
- **Started:** 2026-02-22

## Overview

Arena applies reinforcement learning patterns to design system creation. Instead of configuring a design system top-down or assembling one ad hoc, users *train* it through iterative feedback sessions with an agent. Each session focuses on a specific dimension (color tokens, typography, spacing, components, voice/tone) and produces reinforced decisions that accumulate into agent skills.

Skills are the primary artifact — structured specifications that any LLM agent can use to make design-consistent decisions. Deployable artifacts (Tailwind themes, CSS custom properties, Figma tokens, npm packages) are derived exports. Arena also serves as an evaluation environment, testing whether coding agents can reliably apply trained skills to produce design-consistent output.

The system operates at two levels:
- **Training** (the gym) — human shapes skills through structured feedback (approve/reject with reasons, De Bono hat feedback, visual annotations)
- **Evaluation** (the arena) — agent attempts to apply skills, output is evaluated for compliance and coherence

## Core Concepts

- **Skills** — the trained artifact; accumulated rules, decisions, constraints, and exemplars for a specific design dimension
- **Levels of Play** — dependency hierarchy where foundational skills (tokens) must be hardened before higher-level skills (components) can be trained
- **Skill Status** — drafting → reinforcing → hardened (human approval + agent evaluation + automated checks)
- **Sessions** — focused training interactions on a single dimension or sub-dimension
- **Feedback Signals** — approve/reject + reasons, De Bono hat structured feedback, visual annotations (red pen on screenshots)
- **Derived Artifacts** — Tailwind config, CSS custom properties, Figma tokens, npm package — all generated from skills

## Hypotheses

- **H1:** If we apply reinforcement learning patterns (propose, feedback, accumulate) to design system creation, users can incrementally train a complete, coherent design system through focused sessions — and the resulting agent skills will reliably guide coding agents to produce design-consistent output.
  - **Validation:** 1) Single session produces usable artifact. 2) Each session measurably improves the system. 3) Agent output passes token compliance and human aesthetic review.

## Levels of Play (Dependency Hierarchy)

```
Level 0: Design philosophy, brand intent, aesthetic direction
Level 1: Primitive tokens (color, type scale, spacing, radii, shadows)
Level 2: Semantic tokens, rules (how primitives compose, when to use what)
Level 3: Component patterns (buttons, inputs, cards — applying L1+L2)
Level 4: Composition patterns, layouts, responsive behavior
Level 5: Voice/tone, copy, media guidelines, UX principles
```

## Output Layers

| Layer | What it is | Who consumes it |
|-------|-----------|----------------|
| **Skills** | Trained spec — rules, decisions, rationale, exemplars | Agents (Claude, Cursor, Copilot) |
| **Tokens** | Derived platform artifacts — Tailwind, CSS, W3C tokens, Figma | Build tools, designers |
| **Package** | Installable bundle for a specific platform | Developers via npm |

## Project Structure

### Documentation
- `/docs/studio/arena/README.md` — This file
- `/docs/studio/arena/exploration/` — Research and conceptual docs
- `/docs/studio/arena/exploration/definitions.md` — Glossary
- `/docs/studio/arena/exploration/research.md` — Initial research

### Code (when prototype phase begins)
- `/components/studio/prototypes/arena/` — Prototype components

## Next Steps

1. Complete initial research and exploration
2. Define key terms precisely in definitions.md
3. Design the skill data model
4. Validate the core training loop through a spike
5. Run `/generate-boundary-objects arena` to build strategic context

---

**Started:** 2026-02-22
**Status:** Exploration
