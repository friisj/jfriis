# Remix

> A multi-model pipeline that decomposes provided audio into stems, then chops and sequences those stems into new original compositions.

## Status

- **Phase:** Exploration
- **Temperature:** Warm
- **Started:** 2026-03-08

## Overview

Remix explores whether a pipeline of specialized models can act as a creative co-author for music — not by generating audio from scratch, but by *recomposing* existing material. Given a source audio file (a record, a sample, a field recording), the pipeline separates it into constituent stems (drums, bass, melodic material, vocals/texture), applies intelligent chopping and quantization, then reassembles those fragments into new instrumental compositions in a target genre (techno, ambient, dub, etc.).

The central hypothesis is that stem-aware decomposition followed by model-guided arrangement produces compositions that feel rooted in the source material while being genuinely novel — something closer to how human producers actually work, rather than the blank-slate generative approach of most AI music tools.

This is a heavily pipeline-based project: each stage (separation, analysis, chopping, pattern generation, arrangement, mixdown) is a distinct concern that may involve different models, different APIs, and different data representations. Part of the R&D challenge is designing the interfaces between stages so the pipeline is modular, inspectable, and improvable.

## Hypotheses

- **H1:** A source-separation → chop → sequence pipeline can produce coherent instrumental tracks that are recognizably derived from (but distinct from) the source material.
  - **Validation:** Blind listening test — can a listener identify the genre intent and identify source material traces without being told?

- **H2:** Genre conditioning (techno, ambient, etc.) can be applied at the arrangement stage without retraining or fine-tuning any model — purely through prompt engineering and pattern templates.
  - **Validation:** Generate 5 tracks per genre from the same stems. Do outputs feel genre-distinct?

## Project Structure

### Documentation
- `/docs/studio/remix/README.md` — This file
- `/docs/studio/remix/exploration/definitions.md` — Glossary of pipeline terms
- `/docs/studio/remix/exploration/research.md` — Landscape survey and prior art
- `/docs/studio/remix/exploration/pipeline.md` — Pipeline architecture and stage design *(to be created)*
- `/docs/studio/remix/exploration/genre-templates.md` — Genre conditioning patterns *(to be created)*

### Code (when prototype phase begins)
- `/components/studio/prototypes/remix/` — Prototype UI and pipeline runner
- `/app/(private)/apps/remix/` — Admin route for the tool *(if elevated to full app)*

## Pipeline Stages (Initial Sketch)

```
[Source Audio]
      │
      ▼
[1. Stem Separation]      — Demucs (or similar) → drums, bass, melody, other
      │
      ▼
[2. Analysis]             — BPM detection, key estimation, transient marking
      │
      ▼
[3. Chopping]             — Slice stems at transients or bar boundaries → sample bank
      │
      ▼
[4. Pattern Generation]   — LLM or rule engine → rhythmic/melodic patterns per genre
      │
      ▼
[5. Arrangement]          — Sequence patterns across time → song structure
      │
      ▼
[6. Mixdown]              — Level balancing, EQ, glue effects → output audio
      │
      ▼
[Output Track]
```

## Open Questions

1. Which stem separation model to use? (Demucs via Replicate, Spleeter, MDX-Net, etc.)
2. How to represent a "chop" — sample bank with metadata, or something richer?
3. How much can genre conditioning be done via prompting vs. requiring pattern templates?
4. What's the right output format — WAV, MIDI+samples, or something else?
5. How do we evaluate "goodness" of a generated track? Human listening? Spectral metrics?
6. Is there a real-time or near-real-time path, or is this purely batch?

## Next Steps

1. Research existing stem separation APIs and models (Replicate catalog, open-source options)
2. Define the data schema for each pipeline stage (what flows between stages)
3. Identify genre template sources (rhythm patterns, arrangement structures)
4. Prototype stage 1: get Demucs running on a sample file, inspect output
5. Define validation criteria for H1 and H2

---

**Started:** 2026-03-08
**Status:** Exploration
