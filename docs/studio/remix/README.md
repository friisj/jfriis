# Remix

> Source-aware audio recomposition — a parameterized pipeline that decomposes real audio into stems, chops them intelligently, and sequences fragments into new compositions in a target aesthetic.

## Status

- **Phase:** Exploration → first prototype
- **Temperature:** Warm
- **Started:** 2026-03-08

## Overview

Remix sits between blank-slate AI generation and manual DAW production. Given source audio (a full track, a loop, a field recording), the pipeline separates it into stems, analyzes musical properties, chops stems into a sample bank, generates patterns, arranges them into a song structure, and renders a mixdown — all guided by a **recipe** that encodes creative intent as pipeline parameters.

The core insight: each pipeline stage has tunable parameters (how aggressively to separate, what counts as "interesting," chop granularity, pattern density, arrangement shape). A **recipe** is a coordinated setting of all those knobs — it represents a creative intent like "make this ambient" or "make this lo-fi." The pipeline isn't just linear processing; it's parameterized creative transformation.

### What Remix Is

- A hybrid tool: can run end-to-end automatically, but the value is in intervening at any stage
- Source-aware: the output maintains a traceable relationship to the input
- Recipe-driven: creative intent is expressed as pipeline configuration, not just a text prompt
- A composer, not an instrument (the Sampler is the instrument)

### What Remix Is Not

- Not a DAW replacement — it produces material you might further refine
- Not blank-slate generation — it always works from source audio
- Not style transfer — it decomposes and recomposes, not filters

## First Demo Target

**Input:** An 80s synth-heavy track (recorded/provided by Jon)
**Output:** An ambient recomposition — stretched, layered, atmospheric
**Recipe:** "Synth-to-ambient" — emphasizes melodic/harmonic stems, deprioritizes percussion, favors long phrases, slow evolution, textural layering

This proves the full pipeline concept: real source → genuinely transformed output.

## Pipeline Stages

```
[Source Audio]
      │
      ▼
[1. Stem Separation]      — Demucs (Python microservice) → drums, bass, melody, other, vocals
      │
      ▼
[2. Analysis]             — librosa → BPM, key, transients, spectral features, energy map
      │
      ▼
[3. Chopping]             — Slice stems into sample bank (transient-based, bar-based, or hybrid)
      │                      Recipe controls: granularity, sensitivity, minimum length
      ▼
[4. Pattern Generation]   — Rule-based templates + LLM for higher-level decisions
      │                      Recipe controls: density, swing, repetition, variation rate
      ▼
[5. Arrangement]          — Sequence patterns into song structure
      │                      Recipe controls: section lengths, energy curve, stem layering
      ▼
[6. Mixdown]              — Level balance, EQ, effects, render
      │                      Recipe controls: reverb depth, compression, stereo width
      ▼
[Output Track]
```

Each stage produces inspectable output. The UI (DAW-like timeline, evolving toward node graph) lets you view, edit, and re-run any stage before proceeding.

## Recipes

A recipe is a JSON configuration that parameterizes the entire pipeline for a creative intent:

```
Recipe: "synth-to-ambient"
  separation:  { model: "htdemucs", stems: 6 }
  analysis:    { detect_key: true, energy_resolution: "bar" }
  chopping:    { strategy: "bar", min_length_ms: 2000, prefer_sustained: true }
  patterns:    { density: 0.2, swing: 0, variation_rate: 0.1 }
  arrangement: { sections: ["intro", "drift", "peak", "dissolve"], phrase_length: 8 }
  mixdown:     { reverb: 0.7, compression: 0.2, stereo_width: 1.4 }
```

Recipes are presets but editable — you can start from "synth-to-ambient" and tweak any parameter. They're the primary UX for expressing "what kind of remix do I want?"

## Architecture

### Runtime Boundary

- **Browser (Next.js/React):** UI, playback, effects, arrangement editing
- **Python microservice:** Demucs stem separation, librosa analysis, chopping
- **Shared with Sampler:** Web Audio engine, buffer management, effects chain infrastructure (not Sampler's UI or pad model)

### Target Genres (Initial)

1. **Ambient / textural** — long pads, drones, sparse percussion, slow evolution
2. **Lo-fi / downtempo** — chopped samples, dusty drums, swing, warmth

Not optimizing for techno or four-on-the-floor initially — those are structurally simpler but less interesting for the first demo.

### Related Projects

- **Sampler** (`/tools/sampler`): Shares audio engine. Sampler = instrument (trigger pads, perform). Remix = composer (process source, generate arrangement). Separate tools, shared infrastructure.
- **Onder** (`studio/onder`): Generative synthesis from scratch. Distinct domain (generation vs. recomposition). Some Onder tech (ambient synthesis, texture generation) may fold into Remix in later iterations.

## Hypotheses

- **H1:** A source-separation → chop → sequence pipeline can produce coherent instrumental tracks that are recognizably derived from (but distinct from) the source material.
  - **Validation:** Blind listening test — can a listener identify the genre intent and source material traces?

- **H2:** Genre conditioning can be applied through recipe parameters (pipeline configuration) without retraining or fine-tuning any model.
  - **Validation:** Same source, two recipes → outputs feel genre-distinct.

## Project Structure

```
docs/studio/remix/
  README.md                    — This file
  exploration/
    definitions.md             — Glossary of project-specific terms
    research.md                — Landscape survey, prior art, technical options
    pipeline.md                — Pipeline architecture and stage interfaces (TBD)
    recipes.md                 — Recipe schema and initial presets (TBD)

components/studio/prototypes/remix/
  index.tsx                    — Prototype component (scaffold)

lib/studio/remix/              — Pipeline logic, types, engine (TBD)
app/(private)/apps/remix/      — App route (TBD, if elevated from studio prototype)
```

## Open Questions

1. How to represent a "chop" — sample bank with metadata, or something richer (e.g., musical context, relationship to neighboring chops)?
2. What's the right data format between pipeline stages? (Stage interfaces)
3. How does the recipe schema evolve — strict typed config vs. freeform JSON vs. hybrid?
4. What does the Python microservice look like — containerized, local-only, or deployable?
5. How do we evaluate output quality beyond subjective listening?

---

**Started:** 2026-03-08
**Status:** Exploration → first prototype
