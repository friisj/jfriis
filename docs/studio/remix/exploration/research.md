# Remix — Initial Research

> Landscape survey and foundational research for the project.

---

## Problem Space

Most AI music generation tools operate in one of two modes:

1. **Blank-slate generation** — Given a text prompt, generate audio from noise (MusicGen, Suno, Udio). The output is novel but disconnected from any source material. The producer has no control over *what* the system draws from.

2. **Style transfer** — Apply the style of one piece to the content of another. Useful but coarse — it captures texture and timbre, not structure.

Neither mirrors how human producers actually work. A producer sampling a record doesn't generate from scratch — they *listen*, identify interesting moments, extract them, transform them, and sequence them into new arrangements. The source material is both raw material and creative constraint.

Remix explores the space between these two modes: **source-aware recomposition**. The pipeline takes real audio as input, decomposes it, and reassembles fragments into something new — maintaining a traceable relationship to the source while producing a genuinely original composition.

---

## Prior Art

### Stem Separation

| Approach | Strengths | Weaknesses | Relevance |
|----------|-----------|------------|-----------|
| **Demucs (Meta)** | State-of-the-art quality, open-source, 4 or 6 stems, available on Replicate | Slow (5–30s per minute of audio), GPU required | Primary candidate for stage 1 |
| **Spleeter (Deezer)** | Fast, well-documented, 2–5 stems | Lower quality, older model | Fallback / faster iteration |
| **MDX-Net** | Competition-winning architecture, very high quality | Less accessible, not easily available via API | Research reference |
| **Demucs htdemucs_6s** | 6-stem variant (drums, bass, other, vocals, guitar, piano) | Even slower | Useful for melodically complex sources |

**Current assessment**: Start with Demucs via Replicate. The quality/accessibility tradeoff is best for prototyping.

---

### Beat Detection & Analysis

| Approach | Strengths | Weaknesses | Relevance |
|----------|-----------|------------|-----------|
| **Librosa (Python)** | Comprehensive audio analysis, BPM, onset detection, key estimation, spectral features | Requires Python runtime | Strong candidate for analysis stage |
| **essentia (MTG)** | Professional-grade audio analysis library, rhythm and tonal analysis | Heavier dependency, more complex | Potential upgrade from librosa |
| **Web Audio API** | Browser-native, no backend needed | Limited analysis depth, no ML | Useful for real-time playback but not analysis |
| **Replicate (various)** | Pre-built BPM/key models via API | Additional API calls, latency | Possible if we avoid Python entirely |

**Current assessment**: Librosa for analysis if we're OK with a Python stage. Otherwise Replicate-based analysis endpoints.

---

### Chopping & Sample Extraction

No dominant library for this — typically custom code using onset detection output. Key decisions:

- **Transient-based chopping**: Slice at amplitude onsets (best for drums)
- **Bar-based chopping**: Slice at bar boundaries (better for melodic/harmonic material)
- **Hybrid**: Transient chopping within a bar grid

---

### Pattern Generation

| Approach | Strengths | Weaknesses | Relevance |
|----------|-----------|------------|-----------|
| **LLM-as-arranger** | Flexible, can follow genre descriptions and narrative instructions | No intrinsic understanding of rhythm or audio | Interesting for high-level structure (song sections, variation) |
| **Rule-based genre templates** | Predictable, genre-accurate, fast | Rigid, doesn't adapt to source material character | Good baseline, especially for techno |
| **Probabilistic/Markov models** | Can learn patterns from existing sequences | Requires training data, output can be random-feeling | Research direction |
| **Constraint solvers** | Can encode music theory rules | Complex to set up, may over-constrain | Long-term direction |

**Current assessment**: Start with rule-based genre templates (JSON or YAML) for the first prototype. Layer in LLM-as-arranger for higher-level decisions (section ordering, variation triggers). Evaluate Markov approaches later.

---

### Arrangement & Sequencing

The arrangement layer is the least explored by existing tools. Most stem-based tools stop at the sample extraction level and expect a human to sequence in a DAW.

Interesting precedents:
- **Arrangement AI in commercial DAWs** (Logic Pro's AI arrangement feature) — Exists but closed/proprietary
- **MusicLM / AudioCraft's MusicGen** — Conditioned generation, not arrangement of existing stems
- **Landr Stem Splitter + AI Mastering** — Commercial tool that separates stems but leaves arrangement to user

No clear open-source or API precedent for arrangement from stem banks. This is the most novel part of the pipeline.

---

### Mixdown & Post-processing

| Approach | Strengths | Weaknesses | Relevance |
|----------|-----------|------------|-----------|
| **Web Audio API** | Browser-native, real-time, familiar from Sampler | Limited to what's available in-browser | Good for a browser-based prototype |
| **FFmpeg (server-side)** | Full professional audio processing | Complex, requires server infrastructure | For production quality |
| **Tone.js** | Already used in Sampler, expressive API | Not designed for multi-stem mixdown | Maybe for pattern playback layer |
| **DDSP / neural audio effects** | Learnable audio effects | Overkill at this stage | Future direction |

**Current assessment**: Web Audio API + existing Sampler engine patterns for initial prototype. Server-side FFmpeg when quality demands it.

---

## Key Questions

1. What's the right runtime environment for the analysis/chopping stage? (Python + librosa vs. Replicate API only vs. browser-only)
2. How do we represent patterns — as note/step sequences (MIDI-like), as audio regions with timing offsets, or as something new?
3. Can genre conditioning be entirely prompt-driven, or do we need curated pattern template libraries?
4. What does "done" look like for a track — a rendered WAV, a sequence the user can further edit, or a live-playable arrangement?
5. How tightly do we couple this to the Sampler tool vs. keeping it fully independent?

---

## Relationship to Sampler Tool

Remix shares conceptual DNA with the Sampler tool already in the codebase:
- Both work with audio buffers and Web Audio API playback
- Sampler already has chop/trim primitives, effects chains, and pad sequencing
- Sampler's `sampler-engine.ts` and `sampler-synth.ts` may be reusable or at least reference implementations

However, Remix operates at a higher level of abstraction — it's a *pipeline* that produces something Sampler-like as output, rather than a pad-based performance instrument. The relationship is:

> **Sampler** = instrument (trigger pads, perform live)
> **Remix** = composer (process source, generate arrangement)

They may share a data layer (sounds, audio buffers) but serve different creative roles.

---

## Initial Findings

*(Populated as research progresses)*

---

*This document captures the initial research phase. Update as exploration proceeds.*
