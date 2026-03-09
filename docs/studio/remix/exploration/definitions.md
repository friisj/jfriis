# Remix — Definitions

> Glossary of terms specific to this project. Maintain as concepts evolve.

---

## Core Concepts

| Term | Definition |
|------|-----------|
| **Source audio** | The original audio file provided as input. Can be a full track, an isolated loop, or a field recording. |
| **Stem** | An isolated audio layer produced by separation — e.g., drums, bass, melody, vocals, other. |
| **Chop** | A discrete audio segment extracted from a stem, bounded by transients, bar lines, or other markers. Carries metadata (BPM, key, position, energy). |
| **Sample bank** | The full collection of chops from all stems of a source, with metadata. The raw material for pattern generation. |
| **Pattern** | A time-based arrangement of chops within a single stem lane — a sequenced row of triggers, like a MIDI clip or step sequence. |
| **Arrangement** | The full song structure — how patterns are stacked across lanes, ordered in sections, and varied over time. |
| **Recipe** | A JSON configuration that parameterizes the entire pipeline for a creative intent. Controls how each stage behaves — separation aggression, chop granularity, pattern density, arrangement shape, mixdown character. Recipes are presets but editable. |
| **Pipeline** | The sequential process from source audio to output track: separation → analysis → chopping → pattern gen → arrangement → mixdown. Each stage is independently inspectable and re-runnable. |
| **Mixdown** | The final render — all pattern outputs balanced, processed with effects, and rendered to a stereo file. |

---

## Pipeline Stage Terms

| Term | Definition |
|------|-----------|
| **Stem separation** | Decomposing a mixed audio signal into constituent stems using a neural model (Demucs). |
| **BPM detection** | Estimating the tempo of the source audio in beats per minute. |
| **Key estimation** | Estimating the musical key of melodic content. |
| **Transient** | A sudden amplitude peak marking the onset of a sound event — used as a chopping boundary. |
| **Energy map** | A per-bar or per-beat measure of spectral energy across stems — used to guide arrangement decisions (where the source is "hot" vs. "sparse"). |
| **Quantization** | Snapping chop boundaries and pattern timing to a musical grid. |
| **Bar boundary** | A chopping strategy that slices at musical measure intervals rather than transient onsets. Better for sustained/melodic material. |
| **Stage interface** | The defined data format passed between two pipeline stages — the contract between stages. |
| **Stem lane** | One logical track in the arrangement timeline, corresponding to one stem type (drums lane, melody lane, etc.). |

---

## Recipe Terms

| Term | Definition |
|------|-----------|
| **Density** | How many chops per unit time a pattern contains. Low density = sparse/ambient. High density = busy/rhythmic. |
| **Variation rate** | How frequently the pattern introduces new chops or changes. Low = repetitive/hypnotic. High = constantly evolving. |
| **Phrase length** | The bar count of a repeating structural unit. 4-bar phrases for tight loops, 8–16 bars for ambient drift. |
| **Energy curve** | The macro shape of the arrangement's intensity over time — e.g., slow build → peak → dissolve. |
| **Prefer sustained** | A chopping heuristic that favors long, held sounds over short transient hits. Useful for ambient recipes. |

---

## Infrastructure Terms

| Term | Definition |
|------|-----------|
| **Demucs** | Meta's neural network for music source separation. `htdemucs` (4 stems) or `htdemucs_6s` (6 stems: drums, bass, other, vocals, guitar, piano). Run via Python microservice. |
| **librosa** | Python library for audio analysis — BPM detection, onset detection, key estimation, spectral features. |
| **Python microservice** | A small Python service handling Demucs and librosa work. Keeps the main Next.js stack JS/TS-only while leveraging Python's audio ML ecosystem. |
| **Web Audio API** | Browser-native audio processing. Shared with the Sampler tool — handles playback, effects chains, buffer management. |
| **Tone.js** | Audio synthesis library. Used in Sampler for procedural sounds. May be used in Remix for pattern playback. |

---

## Music Production Terms

| Term | Definition |
|------|-----------|
| **Drone** | A sustained single pitch or narrow frequency band — fundamental to ambient music. |
| **Pad** | A long, sustained chord or textural element providing atmosphere. |
| **Texture** | Non-rhythmic, non-melodic audio material that creates space or mood. |
| **Swing** | A timing offset applied to even-numbered steps in a pattern, creating a "human" or "shuffled" feel. |
| **Sidechain** | A compression technique where one signal (often kick) ducks another (bass, pad) — creates a pumping effect. |
| **Glue compression** | Gentle compression on the full mix for cohesion. |

---

*Add terms as they emerge during exploration. Precise definitions prevent confusion in later phases.*
