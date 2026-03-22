# Sub-Prompt

> Nested prompt resolution — a notation system for embedding sub-queries that execute before the parent prompt.

## Status

- **Phase:** Exploration
- **Temperature:** Warm
- **Started:** 2026-03-21

## Overview

Sub-Prompt explores a fundamental interaction pattern for AI chat: the ability to embed inline sub-queries within a conventional text prompt using bracket notation (e.g., `[what's the term for X?]`). These sub-prompts resolve first, and their results replace the bracket expression in the parent prompt before primary inference runs.

The core insight is that prompt precision directly shapes inference quality. When a user has an embedded knowledge gap — they know *what* they mean but not the exact term, concept, or framing — leaving it vague causes the model's attention to diffuse across possible interpretations. A pre-resolution pass concentrates inference on the right target.

### Extended Vision

Beyond simple terminology lookup, sub-prompts can:
- **Route to specialist models**: `[@gemini-pro: summarize this long document]` — user-controlled dispatch
- **Invoke specialist agents**: `[@terminology: the technical name for X]` — agents with persistent system prompts and tools
- **Nest compositionally**: `[the mitigation for [@term: catastrophic forgetting]]` — innermost resolves first
- **Yield complete traces**: every resolution is logged with model, latency, tokens, and confidence

This creates a transparent, user-controlled multi-model orchestration layer *within* a conventional chat interface.

## Hypotheses

| # | Statement | Validation |
|---|-----------|-----------|
| **H1** | Inline sub-prompts that resolve before the parent prompt yield significantly more precise responses than equivalent vague prompts | A/B comparison: resolved vs. vague prompts on relevance, terminology precision, user satisfaction |
| **H2** | Directing sub-prompts to specialist models/agents via @-notation produces higher-quality resolutions than a single default resolver | Resolution quality comparison across terminology, summarization, and fact-checking tasks |
| **H3** | Resolution traces alongside chat responses increase user trust and prompt literacy vs. opaque resolution | Comprehension test + trust survey |
| **H4** | Streaming resolution with optional intervention is the optimal interaction model (between fully automatic and fully interactive) | Task completion time, friction, and output quality across eager, interactive, and streaming modes |
| **H5** | Square brackets outperform alternatives on learnability/speed, but @-function notation is preferred for model routing | Typing speed, error rate, and preference across notation styles |

## Experiments

| # | Slug | Name | Hypothesis | Type | Status |
|---|------|------|-----------|------|--------|
| E1 | `sub-prompt-prototype` | Core Parser & Single-Model Resolution | H1 | prototype | planned |
| E2 | `multi-model-router` | Multi-Model Router & Agent Dispatch | H2 | prototype | planned |
| E3 | `trace-viewer` | Resolution Trace Viewer | H3 | prototype | planned |
| E4 | `interaction-modes` | Interaction Mode Playground | H4 | prototype | planned |
| E5 | `notation-playground` | Notation Style Playground | H5 | prototype | planned |
| E6 | `sub-prompt-chat` | Sub-Prompt Chat — Full Integration | H1+H2 | prototype | planned |

### Experiment Details

**E1 — Core Parser & Single-Model Resolution**
Foundational spike. Bracket notation parser, single-model resolution engine (Haiku for speed), basic chat client. Parses `[...]` expressions, resolves via LLM, replaces brackets, sends expanded prompt to parent model. Complete resolution trace alongside response.

**E2 — Multi-Model Router & Agent Dispatch**
Extends E1 with `@-notation` for model routing. `[@claude-opus: deep reasoning]`, `[@gemini-pro: long context]`, `[@terminology: precise term]`. Includes built-in specialist agents with dedicated system prompts: `@terminology`, `@fact-checker`, `@code-expert`, `@summarizer`. Per-resolution metrics in trace.

**E3 — Resolution Trace Viewer**
Split-pane UI: chat left, trace right. Expandable resolution cards (expression, resolved value, model, latency, tokens, confidence). Prompt diff view: original vs. expanded. Interactive traces — re-resolve with different model, edit manually, pin for reuse.

**E4 — Interaction Mode Playground**
Tabbed comparison of 4 interaction models using the same backend:
- **Eager**: Resolve all → show trace → execute parent
- **Interactive**: Resolve each → confirmation card (accept/edit/re-resolve) → execute
- **Streaming**: Real-time animated bracket-to-value transitions → auto-execute
- **Ghost Text**: Live resolution preview as user types → Tab to accept

**E5 — Notation Style Playground**
Side-by-side notation comparison with real-time syntax highlighting and parse tree visualization. Tests: `[query]`, `{{query}}`, `@resolve(query)`, `<sub>query</sub>`. Challenge mode with pre-written prompts. Model routing notation comparison: `[@model: query]` vs `@model(query)` vs `{model|query}`.

**E6 — Sub-Prompt Chat (Full Integration)**
The definitive demo combining validated mechanics. Full chat with bracket + @routing, streaming resolution, split-pane trace, model selector, conversation history with persisted traces. Real multi-provider LLM calls. Nested sub-prompts, resolution caching, confidence-based auto-accept, and a "prompt anatomy" view showing the resolution graph.

### Suggested Build Order

```
E1 (core parser) → E5 (notation) → E2 (multi-model) → E3 (trace viewer) → E4 (interaction modes) → E6 (full integration)
```

E1 and E5 can run in parallel (parser mechanics vs. notation UX). E2 and E3 build on E1. E4 needs all resolution mechanics working. E6 is the capstone.

## Project Structure

### Documentation
- `docs/studio/sub-prompt/README.md` — This file
- `docs/studio/sub-prompt/exploration/definitions.md` — Glossary
- `docs/studio/sub-prompt/exploration/research.md` — Prior art, design space, interaction models

### Code (when prototype phase begins)
- `components/studio/prototypes/sub-prompt/` — Spike components

## Key Design Decisions (Pending)

1. **Primary notation**: Square brackets `[...]` (leading candidate) — but E5 will validate
2. **Default resolver model**: Claude Haiku (fast, cheap) — but configurable
3. **Resolution strategy**: Streaming with optional intervention (H4 prediction)
4. **Nesting depth**: Unlimited but with a practical max (3-4 levels)
5. **Sub-prompt context**: Sub-prompts see conversation history but not other sub-prompts' resolutions (isolation)

---

**Started:** 2026-03-21
**Status:** Exploration
