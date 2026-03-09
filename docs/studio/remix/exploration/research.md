# Remix — Research

> Landscape survey, prior art, and technical decisions.

---

## Problem Space

Most AI music tools operate in two modes:

1. **Blank-slate generation** (MusicGen, Suno, Udio) — generate from noise given a text prompt. Novel output but disconnected from any source material. No control over what the system draws from.

2. **Style transfer** — apply the style of one piece to another. Useful but coarse — captures texture and timbre, not structure.

Neither mirrors how human producers actually work. A producer sampling a record *listens*, identifies interesting moments, *extracts* them, *transforms* them, and *sequences* them into new arrangements. The source material is both raw material and creative constraint.

**Remix explores the space between:** source-aware recomposition. Take real audio, decompose it, and reassemble fragments into something new — maintaining a traceable relationship to the source while producing a genuinely original composition. Crucially, this is parameterized via **recipes** that encode creative intent as pipeline configuration.

---

## Technical Landscape

### Stem Separation

| Approach | Quality | Speed | Access | Decision |
|----------|---------|-------|--------|----------|
| **Demucs htdemucs** (Meta) | State-of-the-art | 5–30s/min | Open-source, Replicate | **Primary choice** |
| **Demucs htdemucs_6s** | Best for complex sources | Slower | Same | Use for melodically rich input |
| **Spleeter** (Deezer) | Adequate | Fast | Open-source | Fallback for fast iteration |
| **MDX-Net** | Competition-winning | Variable | Less accessible | Research reference only |

**Decision:** Demucs via Python microservice. `htdemucs` default, `htdemucs_6s` when recipe requests 6-stem separation (guitar + piano isolation useful for the 80s synth demo).

### Analysis

| Approach | Capabilities | Runtime | Decision |
|----------|-------------|---------|----------|
| **librosa** | BPM, onset detection, key, spectral, chromagram | Python | **Primary — runs in same microservice as Demucs** |
| **essentia** (MTG) | Professional-grade rhythm + tonal analysis | Python (heavier) | Future upgrade path |
| **Web Audio API** | Basic frequency analysis | Browser | For real-time playback visualization only |

**Decision:** librosa in the Python microservice. Colocated with Demucs so analysis runs server-side without another round trip.

### Chopping

No dominant library — custom implementation using librosa's onset detection output. Three strategies, selectable per-stem via recipe:

- **Transient-based:** Slice at amplitude onsets. Best for drums and percussive material.
- **Bar-based:** Slice at bar boundaries. Better for sustained/melodic/harmonic material.
- **Hybrid:** Transient chopping within a bar grid. Best general-purpose approach.

The recipe's `prefer_sustained` flag biases toward bar-based chopping and longer minimum chop lengths — critical for ambient output.

### Pattern Generation

| Approach | Strengths | Weaknesses | Role in Remix |
|----------|-----------|------------|---------------|
| **Rule-based templates** | Predictable, genre-accurate | Rigid | Baseline — genre structure rules |
| **LLM-as-arranger** | Flexible, can follow narrative | No intrinsic rhythm sense | Higher-level decisions (section ordering, variation triggers) |
| **Probabilistic/Markov** | Can learn from sequences | Needs training data | Future exploration |

**Decision:** Rule-based templates for rhythmic structure (what goes where in a bar). LLM for macro-arrangement decisions (section order, where to introduce variation, energy curve shaping). Recipe parameters control the balance.

### Arrangement

The least-explored domain. No clear open-source or API precedent for arrangement from stem banks — most tools stop at sample extraction and expect a human DAW workflow.

This is the most novel part of Remix and the highest-risk stage. The recipe's arrangement parameters (section definitions, phrase length, energy curve) are the primary control surface.

### Mixdown & Playback

| Approach | Role | Decision |
|----------|------|----------|
| **Web Audio API** | Browser playback, real-time effects | Primary — shared with Sampler engine |
| **Tone.js** | Pattern playback, scheduling | Use for sequenced playback in browser |
| **FFmpeg (server)** | Final render to file | For export/download |

**Decision:** Web Audio API + Sampler's existing engine patterns for browser playback and effects. Server-side FFmpeg for final file render when needed.

---

## Relationship to Sampler

Remix and Sampler share conceptual DNA and audio infrastructure:

| | Sampler | Remix |
|---|---------|-------|
| **Role** | Instrument — trigger pads, perform live | Composer — process source, generate arrangement |
| **Input** | Individual sounds (uploaded, generated, recorded) | Full audio files (tracks, loops, recordings) |
| **Output** | Live performance / sound design | New compositions derived from source |
| **UI** | Pad grid | DAW-like timeline (→ node graph) |

**Shared infrastructure:**
- Web Audio API playback engine (`sampler-engine.ts` patterns)
- Audio buffer management and caching
- Effects chain architecture (per-channel effects)
- WAV encoding (`sampler-wav.ts`)

**Not shared:**
- UI components (pad grid vs. timeline)
- Data model (pads/collections vs. pipeline stages/recipes)
- Sound sourcing (upload/generate vs. stem separation)

---

## Relationship to Onder

Onder is generative ambient synthesis from scratch — no source material. Distinct creative domain:

- **Onder:** Generation from noise/synthesis parameters
- **Remix:** Recomposition from real audio

However, Onder's ambient synthesis tech (texture generation, drone engines, spatial audio) may fold into Remix in later iterations — specifically as additional processing options in the mixdown stage or as "fill" generators that augment sparse stem material.

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Stem separation runtime | Python microservice (not Replicate API) | More control, lower per-run cost, can colocate analysis |
| Analysis library | librosa | Comprehensive, colocated with Demucs in Python service |
| Initial UI paradigm | DAW-like timeline | Familiar, intuitive for stem/lane visualization |
| Future UI exploration | Node graph | More flexible for non-linear pipeline editing |
| Target genres (first) | Ambient, lo-fi/downtempo | More interesting transformation challenge than techno |
| Pattern generation | Rule-based + LLM hybrid | Templates for structure, LLM for macro decisions |
| Audio engine | Shared with Sampler (Web Audio) | Avoid duplication, leverage existing quality code |

---

## Open Research Questions

1. **Stage interfaces:** What's the right data format between pipeline stages? Need contracts that are inspectable, serializable, and editable.
2. **Recipe schema:** Strict typed config vs. freeform JSON vs. hybrid? How do recipes compose or inherit?
3. **Chop representation:** Just audio + metadata, or richer (musical context, relationship to neighbors, source position)?
4. **Python microservice design:** Containerized? Local-only? FastAPI? How does it communicate with Next.js?
5. **Quality evaluation:** Beyond subjective listening — spectral similarity metrics? Structural analysis of output?
6. **Intervention UX:** When a user edits a chop or pattern mid-pipeline, how does that propagate to downstream stages?

---

*Update as research progresses and decisions are validated.*
