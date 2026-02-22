# ARIS

> RTS-style strategic command layer for multi-agent AI workflows

## Status

- **Phase:** Exploration
- **Temperature:** Warm
- **Started:** 2026-02-22

## Overview

ARIS is an investigation into a fundamentally different interface paradigm for AI agent orchestration. Instead of chat threads, linear prompt flows, or invisible background agents, ARIS surfaces AI agents as named, visible strategic assets managed through a command-and-control interface inspired by real-time strategy (RTS) game mechanics.

The core thesis is that the problems of modern multi-agent AI — runaway autonomy, invisible state, poor delegation, ad-hoc governance — are fundamentally interface problems. RTS games solved analogous problems for complex unit coordination decades ago. ARIS asks: what does that solution look like when applied to knowledge work?

ARIS treats humans as commanders, not prompters. Agents have persistent identities, specialized roles, and live status. Orchestration happens through strategic delegation — control groups, hierarchical command structures, real-time interruption — not through writing longer prompts.

## Hypotheses

- **H1:** If AI agents are surfaced as named, visible strategic assets with persistent roles and real-time status — managed through a command-and-control interface inspired by RTS game mechanics — then humans can more effectively orchestrate complex multi-agent workflows with appropriate oversight and governance.
  - **Validation:** Build a prototype interface; measure whether users can successfully delegate, interrupt, and redirect agents without losing context or control. Qualitative measure: does it feel like commanding versus prompting?

## Project Structure

### Documentation
- `/docs/studio/aris/README.md` — This file
- `/docs/studio/aris/exploration/definitions.md` — Glossary
- `/docs/studio/aris/exploration/research.md` — Landscape survey

### Code (when prototype phase begins)
- `/components/studio/prototypes/aris/` — Prototype components

## Next Steps

1. Define core terminology (agent, control group, mission, command layer, fog of war)
2. Survey existing multi-agent frameworks and orchestration UIs
3. Map RTS mechanics → knowledge work equivalents
4. Design agent data model (identity, role, memory, status)
5. Sketch command interface wireframes
6. Validate H1 with a minimal working prototype

---

**Started:** 2026-02-22
**Status:** Exploration
